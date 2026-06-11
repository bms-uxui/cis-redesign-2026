import { useCallback, useEffect, useRef, useState } from "react";
import { transcribe } from "../services/ai/asr";
import { startPcmRecorder, type PcmRecorder, type PcmSource } from "../services/ai/pcmRecorder";

export type DictationStatus = "idle" | "requesting" | "recording" | "transcribing" | "error";
export type SpeakerId = 1 | 2;

export interface DictationSegment {
  speaker: SpeakerId;
  text: string;
  partial?: boolean;
}

export interface UseDictationOptions {
  language?: string;
  prompt?: string;
  onResult?: (fullText: string) => void;
  onPartial?: (chunkText: string, fullText: string) => void;
  onError?: (err: Error) => void;
}

// 2-speaker diarization driven primarily by inter-utterance pause
// (turn-taking gap) with pitch used only as a sanity check / override.
//
// Heuristic:
//   - First utterance is S1.
//   - Each subsequent utterance: decide based on the silence gap since the
//     previous utterance ended.
//     * SHORT gap (< shortPauseMs):  same speaker continues.
//     * LONG  gap (>= longPauseMs):  flip speakers by default (Q&A turn).
//     * MEDIUM gap:                  keep same speaker.
//   - Pitch sanity: when pitch evidence is strong enough (centroids
//     established and the new utterance's pitch matches the OTHER speaker
//     within a margin), override the gap decision. Prevents thinking
//     pauses by the same speaker from being mistaken for a turn.
class TwoSpeakerClusterer {
  private current: SpeakerId = 1;
  private hasFirst = false;
  private pitchOf: Record<SpeakerId, number | null> = { 1: null, 2: null };

  private readonly shortPauseMs = 350;
  private readonly longPauseMs = 700;
  private readonly pitchOverrideMargin = 18; // Hz — must be noticeably closer
  private readonly pitchAlpha = 0.35;

  assignOnStart(gapMs: number, pitchHint = 0): SpeakerId {
    if (!this.hasFirst) {
      this.hasFirst = true;
      this.current = 1;
      return 1;
    }

    let next: SpeakerId;
    if (gapMs >= this.longPauseMs) {
      next = this.current === 1 ? 2 : 1;
    } else {
      next = this.current; // short / medium pause → same speaker
    }

    if (pitchHint > 0) {
      const dCurrent = this.distance(this.current, pitchHint);
      const other: SpeakerId = this.current === 1 ? 2 : 1;
      const dOther = this.distance(other, pitchHint);
      if (
        dCurrent !== null &&
        dOther !== null &&
        Math.abs(dCurrent - dOther) > this.pitchOverrideMargin
      ) {
        next = dCurrent < dOther ? this.current : other;
      }
    }

    this.current = next;
    return next;
  }

  // Apply pitch evidence after assignment (refines the centroid for that
  // speaker). Called when the chunk's pitch becomes known.
  updatePitch(speaker: SpeakerId, pitch: number) {
    if (pitch <= 0) return;
    const prev = this.pitchOf[speaker];
    this.pitchOf[speaker] = prev === null ? pitch : prev * (1 - this.pitchAlpha) + pitch * this.pitchAlpha;
  }

  private distance(speaker: SpeakerId, pitch: number): number | null {
    const c = this.pitchOf[speaker];
    return c === null ? null : Math.abs(pitch - c);
  }

  reset() {
    this.current = 1;
    this.hasFirst = false;
    this.pitchOf = { 1: null, 2: null };
  }
}

export function useDictation(opts: UseDictationOptions = {}) {
  // Live RMS amplitude (0..1) updated on every audio buffer while the
  // recorder is running. Exposed as a ref (not state) so the UI can sample
  // it at the screen's refresh rate without forcing React re-renders at
  // ~23 fps.
  const levelRef = useRef(0);
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [segments, setSegments] = useState<DictationSegment[]>([]);
  const [inFlight, setInFlight] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const recRef = useRef<PcmRecorder | null>(null);
  const committedRef = useRef<DictationSegment[]>([]); // finalized utterances
  const pendingRef = useRef<DictationSegment | null>(null); // current in-progress utterance partial
  const pendingSeqRef = useRef(0);
  const lastAppliedSeqRef = useRef(0);
  const clustererRef = useRef(new TwoSpeakerClusterer());
  const speakerBySeqRef = useRef(new Map<number, SpeakerId>()); // locked speaker per utterance
  const finalQueueRef = useRef<Promise<void>>(Promise.resolve());
  const inFlightPartialsRef = useRef(new Set<AbortController>());

  const recompose = useCallback(() => {
    const all = [...committedRef.current];
    if (pendingRef.current) all.push(pendingRef.current);
    setSegments(all);
  }, []);

  const fullText = useCallback(
    () =>
      committedRef.current
        .map((s) => `[S${s.speaker}] ${s.text}`)
        .join("\n")
        .trim(),
    [],
  );

  const cleanup = useCallback(() => {
    inFlightPartialsRef.current.forEach((c) => c.abort());
    inFlightPartialsRef.current.clear();
    recRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const handleUtteranceStart = useCallback((seq: number, gapMs: number) => {
    // Decide speaker the moment speech starts, using the silence gap since
    // the previous utterance ended. Locked for the entire utterance so
    // partials and the final don't disagree mid-stream.
    const speaker = clustererRef.current.assignOnStart(gapMs, 0);
    speakerBySeqRef.current.set(seq, speaker);
  }, []);

  const handlePartial = useCallback(
    async (wav: Blob, _ms: number, pitch: number, seq: number) => {
      if (seq < lastAppliedSeqRef.current) return;
      const ctrl = new AbortController();
      inFlightPartialsRef.current.add(ctrl);
      setInFlight(inFlightPartialsRef.current.size);
      try {
        const tail = committedRef.current
          .slice(-2)
          .map((s) => s.text)
          .join(" ")
          .slice(-240);
        const composedPrompt = [opts.prompt, tail].filter(Boolean).join(" ");
        const result = await transcribe(wav, {
          language: opts.language,
          prompt: composedPrompt || undefined,
          signal: ctrl.signal,
        });
        if (seq < lastAppliedSeqRef.current) return;
        const piece = result.text.trim();
        if (!piece) return;
        const speaker = speakerBySeqRef.current.get(seq) ?? 1;
        clustererRef.current.updatePitch(speaker, pitch);

        // Monotonic update: only accept partials that extend (longer than)
        // what we already showed for this same utterance. Prevents the
        // visible transcript from jumping backwards as the ASR re-decodes
        // the in-progress audio.
        const prev = pendingRef.current;
        const isSameUtterance = prev && pendingSeqRef.current === seq;
        if (isSameUtterance && piece.length <= prev!.text.length) {
          return;
        }
        pendingRef.current = { speaker, text: piece, partial: true };
        pendingSeqRef.current = seq;
        lastAppliedSeqRef.current = Math.max(lastAppliedSeqRef.current, seq);
        recompose();
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") {
          console.warn("[dictation] partial transcribe failed", e);
        }
      } finally {
        inFlightPartialsRef.current.delete(ctrl);
        setInFlight(inFlightPartialsRef.current.size);
      }
    },
    [opts, recompose],
  );

  const handleFinal = useCallback(
    (wav: Blob, _ms: number, pitch: number, seq: number) => {
      finalQueueRef.current = finalQueueRef.current.then(async () => {
        try {
          const tail = committedRef.current
            .slice(-2)
            .map((s) => s.text)
            .join(" ")
            .slice(-240);
          const composedPrompt = [opts.prompt, tail].filter(Boolean).join(" ");
          const result = await transcribe(wav, {
            language: opts.language,
            prompt: composedPrompt || undefined,
          });
          const finalText = result.text.trim();
          const lastShown = pendingRef.current?.text ?? "";
          const piece = finalText.length >= lastShown.length ? finalText : lastShown;
          if (piece) {
            // Use the speaker locked at utterance start; refine pitch centroid.
            const speaker = speakerBySeqRef.current.get(seq) ?? 1;
            clustererRef.current.updatePitch(speaker, pitch);
            const last = committedRef.current[committedRef.current.length - 1];
            if (last && last.speaker === speaker) {
              last.text = `${last.text} ${piece}`;
            } else {
              committedRef.current.push({ speaker, text: piece });
            }
            opts.onPartial?.(piece, fullText());
          }
          speakerBySeqRef.current.delete(seq);
          pendingRef.current = null;
          lastAppliedSeqRef.current = Math.max(lastAppliedSeqRef.current, pendingSeqRef.current);
          recompose();
        } catch (e) {
          console.warn("[dictation] final transcribe failed for seq", seq, e);
        }
      });
    },
    [opts, recompose, fullText],
  );

  const start = useCallback(
    async (source: PcmSource = "mic") => {
      if (status === "recording" || status === "requesting") return;
      setError(null);
      committedRef.current = [];
      pendingRef.current = null;
      pendingSeqRef.current = 0;
      lastAppliedSeqRef.current = 0;
      clustererRef.current.reset();
      speakerBySeqRef.current.clear();
      finalQueueRef.current = Promise.resolve();
      setSegments([]);
      setStatus("requesting");
      try {
        const rec = await startPcmRecorder(source, {
          onUtteranceStart: handleUtteranceStart,
          onChunk: handleFinal,
          onPartial: handlePartial,
          onLevel: (rms) => {
            levelRef.current = rms;
          },
          partialIntervalMs: 800,
          partialMinMs: 500,
          // Slightly longer silence window so natural pauses don't end the
          // utterance prematurely.
          endSilenceMs: 600,
          maxUtteranceMs: 8000,
          minUtteranceMs: 250,
          // More forgiving thresholds — the previous 0.015 / 0.009 missed
          // quieter speech from typical built-in mics (especially the user
          // sits a meter or two away). 0.008 / 0.004 still rejects HVAC and
          // keyboard noise but captures normal conversational level reliably.
          startThreshold: 0.008,
          endThreshold: 0.004,
          preRollMs: 250,
        });
        recRef.current = rec;
        setStatus("recording");
      } catch (e) {
        const err = e as Error;
        setError(err);
        setStatus("error");
        cleanup();
        opts.onError?.(err);
      }
    },
    [status, opts, handleFinal, handlePartial, handleUtteranceStart, cleanup],
  );

  const stop = useCallback(async () => {
    const rec = recRef.current;
    if (!rec) return;
    setStatus("transcribing");
    try {
      inFlightPartialsRef.current.forEach((c) => c.abort());
      inFlightPartialsRef.current.clear();
      await rec.stop();
      await finalQueueRef.current;
      pendingRef.current = null;
      recompose();
      opts.onResult?.(fullText());
      setStatus("idle");
    } catch (e) {
      const err = e as Error;
      setError(err);
      setStatus("error");
      opts.onError?.(err);
    } finally {
      cleanup();
    }
  }, [opts, recompose, fullText, cleanup]);

  const toggle = useCallback(
    (source: PcmSource = "mic") => {
      if (status === "recording") void stop();
      else if (status === "idle" || status === "error") void start(source);
    },
    [status, start, stop],
  );

  const isProcessing =
    status === "transcribing" ||
    inFlight > 0 ||
    (status === "recording" && segments.length === 0);

  return {
    status,
    segments,
    error,
    start,
    stop,
    toggle,
    isActive: status === "recording",
    isProcessing,
    /** Number of ASR partials currently in flight against the server. */
    asrInFlight: inFlight,
    levelRef,
  };
}
