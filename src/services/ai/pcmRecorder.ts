// VAD-driven raw-PCM capture. Emits speech-bounded chunks as 16kHz mono WAV
// blobs via an onChunk callback. Chunks include a short pre-roll and post-roll
// so consonants at word boundaries aren't clipped.

import { estimateMeanPitch } from "./pitch";

export type PcmSource = "mic" | "tab";

export interface PcmRecorderOptions {
  // Fired the instant speech is detected (start of an utterance) along with
  // the silent gap since the previous utterance ended. First utterance has
  // gapMs = Infinity.
  onUtteranceStart?: (seq: number, gapMs: number) => void;
  // Fired when an utterance ends (silence detected) — finalized chunk.
  onChunk: (wav: Blob, durationMs: number, meanPitch: number, seq: number) => void;
  // Optional: fired periodically *while* an utterance is in progress with
  // the in-progress audio so partial transcripts can stream live.
  onPartial?: (wav: Blob, durationMs: number, meanPitch: number, seq: number) => void;
  partialIntervalMs?: number;
  partialMinMs?: number;
  // Speech is "started" once RMS exceeds startThreshold, "ended" after
  // endSilenceMs of contiguous RMS below endThreshold.
  startThreshold?: number;
  endThreshold?: number;
  endSilenceMs?: number;
  // Force a flush if a single utterance grows longer than this.
  maxUtteranceMs?: number;
  // Drop chunks shorter than this (still includes pre/post-roll).
  minUtteranceMs?: number;
  // Pre-roll prepended before the first frame above threshold.
  preRollMs?: number;
}

export interface PcmRecorder {
  stop: () => Promise<Blob | null>; // flushes any pending speech, returns full session WAV
}

const TARGET_RATE = 16000;

export async function startPcmRecorder(
  source: PcmSource = "mic",
  opts: PcmRecorderOptions,
): Promise<PcmRecorder> {
  let stream: MediaStream;
  if (source === "tab") {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("ไม่ได้รับสิทธิ์เสียงของแท็บ — เลือกแท็บแล้วเปิด 'Share tab audio'");
    }
    stream.getVideoTracks().forEach((t) => t.stop());
  } else {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  }

  const Ctx: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const srcNode = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(2048, 1, 1);

  const srcRate = ctx.sampleRate;
  const startThreshold = opts.startThreshold ?? 0.012;
  const endThreshold = opts.endThreshold ?? 0.008;
  const endSilenceMs = opts.endSilenceMs ?? 700;
  const maxUtteranceMs = opts.maxUtteranceMs ?? 12000;
  const minUtteranceMs = opts.minUtteranceMs ?? 350;
  const preRollMs = opts.preRollMs ?? 250;
  const partialIntervalMs = opts.partialIntervalMs ?? 900;
  const partialMinMs = opts.partialMinMs ?? 600;

  const preRollSamples = Math.floor((preRollMs / 1000) * srcRate);
  const ring: Float32Array = new Float32Array(preRollSamples);
  let ringWrite = 0;
  let ringFilled = 0;

  const utter: Float32Array[] = [];
  const session: Float32Array[] = [];
  let inSpeech = false;
  let silenceRunSamples = 0;
  let utterSamples = 0;
  let utterSeq = 0;
  let lastPartialAtSamples = 0;
  let totalSamples = 0; // running sample counter for the whole session
  let lastUtterEndAt = -1; // session-sample index where the previous utterance ended

  const samplesPerMs = srcRate / 1000;

  const flushUtterance = async (durationSamples: number, seq: number) => {
    if (durationSamples / samplesPerMs < minUtteranceMs) {
      utter.length = 0;
      return;
    }
    const merged = concat(utter);
    utter.length = 0;
    const resampled = await resampleTo(merged, srcRate, TARGET_RATE);
    const pitch = estimateMeanPitch(resampled, TARGET_RATE);
    const wav = encodeWav(resampled, TARGET_RATE);
    opts.onChunk(wav, (durationSamples / samplesPerMs) | 0, pitch, seq);
  };

  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    const copy = new Float32Array(input.length);
    copy.set(input);
    session.push(copy);
    totalSamples += copy.length;

    const rms = computeRms(copy);

    if (!inSpeech) {
      // keep filling pre-roll ring
      for (let i = 0; i < copy.length; i++) {
        ring[ringWrite] = copy[i];
        ringWrite = (ringWrite + 1) % preRollSamples;
      }
      ringFilled = Math.min(preRollSamples, ringFilled + copy.length);

      if (rms > startThreshold) {
        inSpeech = true;
        utterSeq++;
        lastPartialAtSamples = 0;
        // emit pre-roll first
        const pre = drainRing(ring, ringWrite, ringFilled);
        utter.push(pre);
        utter.push(copy);
        utterSamples = pre.length + copy.length;
        silenceRunSamples = 0;

        const gapMs =
          lastUtterEndAt < 0
            ? Infinity
            : ((totalSamples - copy.length - pre.length - lastUtterEndAt) / samplesPerMs) | 0;
        opts.onUtteranceStart?.(utterSeq, Math.max(0, gapMs));
      }
    } else {
      utter.push(copy);
      utterSamples += copy.length;

      if (rms < endThreshold) {
        silenceRunSamples += copy.length;
      } else {
        silenceRunSamples = 0;
      }

      const silenceMs = silenceRunSamples / samplesPerMs;
      const utterMs = utterSamples / samplesPerMs;

      // Emit a partial snapshot if enough time has elapsed since the last one.
      if (
        opts.onPartial &&
        utterMs >= partialMinMs &&
        (utterSamples - lastPartialAtSamples) / samplesPerMs >= partialIntervalMs
      ) {
        lastPartialAtSamples = utterSamples;
        const snapshot = concat(utter);
        const seq = utterSeq;
        void resampleTo(snapshot, srcRate, TARGET_RATE).then((rs) => {
          const pitch = estimateMeanPitch(rs, TARGET_RATE);
          opts.onPartial!(encodeWav(rs, TARGET_RATE), utterMs | 0, pitch, seq);
        });
      }

      if (silenceMs >= endSilenceMs || utterMs >= maxUtteranceMs) {
        inSpeech = false;
        const duration = utterSamples;
        const seq = utterSeq;
        // Mark utterance end (in session-sample space) before the silence run.
        lastUtterEndAt = totalSamples - silenceRunSamples;
        utterSamples = 0;
        silenceRunSamples = 0;
        ringFilled = 0;
        ringWrite = 0;
        void flushUtterance(duration, seq);
      }
    }
  };

  srcNode.connect(processor);
  processor.connect(ctx.destination);

  const stop = async (): Promise<Blob | null> => {
    try {
      processor.disconnect();
      srcNode.disconnect();
    } catch {
      /* ignore */
    }
    if (inSpeech && utterSamples > 0) {
      const duration = utterSamples;
      await flushUtterance(duration, utterSeq);
    }
    try {
      stream.getTracks().forEach((t) => t.stop());
      await ctx.close();
    } catch {
      /* ignore */
    }
    if (session.length === 0) return null;
    const all = concat(session);
    const resampled = await resampleTo(all, srcRate, TARGET_RATE);
    return encodeWav(resampled, TARGET_RATE);
  };

  return { stop };
}

function computeRms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

function drainRing(ring: Float32Array, write: number, filled: number): Float32Array {
  const out = new Float32Array(filled);
  if (filled < ring.length) {
    // ring not full yet — data lives in [0, write)
    out.set(ring.subarray(0, filled));
  } else {
    // ring is full; oldest = write, then wrap
    out.set(ring.subarray(write));
    out.set(ring.subarray(0, write), ring.length - write);
  }
  return out;
}

function concat(parts: Float32Array[]): Float32Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Float32Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

async function resampleTo(
  samples: Float32Array,
  from: number,
  to: number,
): Promise<Float32Array> {
  if (from === to) return samples;
  const length = Math.max(1, Math.ceil((samples.length / from) * to));
  const offline = new OfflineAudioContext(1, length, to);
  const buffer = offline.createBuffer(1, samples.length, from);
  buffer.getChannelData(0).set(samples);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([out], { type: "audio/wav" });
}

function writeStr(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}
