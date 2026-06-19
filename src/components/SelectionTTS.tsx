import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconVolume,
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconLoader2,
  IconX,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { speak, normalizeForSpeech } from "../services/ai/tts";
import { readTtsPrefs, PREFS_EVENT, TTS_SPEAK_EVENT } from "../services/ttsPrefs";
import { useToast } from "../contexts/ToastContext";

/** Thai text-to-speech for any selected text. Select text anywhere in the app
 *  → a small "ฟังเสียง" trigger appears above the selection → opens a floating
 *  player (เวลา / จำนวนคำ / progress / play) that synthesises via vox-cpm and
 *  plays it back. */

type Anchor = { left: number; top: number };
type Chunk = { text: string; weight: number; audio: HTMLAudioElement | null; url: string | null };

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, "0")}`;
}

/** Split text into speakable chunks. The first chunk is kept short so playback
 *  can start quickly; later chunks are larger. Breaks on sentence enders. */
function splitIntoChunks(text: string): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [];
  const chunks: string[] = [];
  let cur = "";
  let budget = 80; // small first chunk → fast start
  for (const w of words) {
    cur = cur ? `${cur} ${w}` : w;
    if (/[.!?…ฯ]$/.test(w) || cur.length >= budget) {
      chunks.push(cur);
      cur = "";
      budget = 170;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

export default function SelectionTTS() {
  const toast = useToast();
  const rootRef = useRef<HTMLDivElement>(null);

  // TTS preferences (edited on the Settings page). Kept in a ref so the
  // long-lived document listeners always read the latest without re-binding.
  const prefsRef = useRef(readTtsPrefs());
  useEffect(() => {
    const refresh = () => {
      prefsRef.current = readTtsPrefs();
    };
    window.addEventListener(PREFS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PREFS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Selection trigger (the small "ฟังเสียง" pill)
  const [trigger, setTrigger] = useState<{ text: string; at: Anchor } | null>(null);

  // Player state
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [current, setCurrent] = useState(0); // estimated elapsed seconds
  const [frac, setFrac] = useState(0); // 0..1 overall progress
  const [estTotal, setEstTotal] = useState(1); // estimated total seconds

  // Streaming chunk queue — synthesised in order, played back-to-back.
  const chunksRef = useRef<Chunk[]>([]);
  const idxRef = useRef(0);
  const totalWeightRef = useRef(1);
  const estTotalRef = useRef(1);
  const cancelRef = useRef(0);
  const wantPlayRef = useRef(false);

  const teardownAudio = useCallback(() => {
    cancelRef.current++; // invalidate any in-flight producer + stale handlers
    for (const c of chunksRef.current) {
      if (c.audio) {
        c.audio.pause();
        c.audio.src = "";
      }
      if (c.url) URL.revokeObjectURL(c.url);
    }
    chunksRef.current = [];
    idxRef.current = 0;
    wantPlayRef.current = false;
  }, []);

  const closePlayer = useCallback(() => {
    teardownAudio();
    setOpen(false);
    setPlaying(false);
    setLoading(false);
    setError(false);
    setCurrent(0);
    setFrac(0);
  }, [teardownAudio]);

  // Detect a text selection outside our own UI → show the trigger pill.
  useEffect(() => {
    const inOurUI = (node: Node | null) =>
      !!node && !!rootRef.current && rootRef.current.contains(node);

    const capture = () => {
      if (!prefsRef.current.enabled) {
        setTrigger(null);
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setTrigger(null);
        return;
      }
      const txt = sel.toString().trim();
      if (txt.length < 2 || inOurUI(sel.anchorNode)) {
        setTrigger(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        setTrigger(null);
        return;
      }
      setTrigger({
        text: txt,
        at: { left: rect.left + rect.width / 2, top: rect.top },
      });
    };

    // Wait until the user has settled on a selection before showing the pill,
    // so a quick drag-release doesn't pop a button under the cursor.
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      setTrigger(null);
      timer = window.setTimeout(capture, 650);
    };
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        window.clearTimeout(timer);
        setTrigger(null);
      }
    };

    document.addEventListener("mouseup", schedule);
    document.addEventListener("keyup", schedule);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseup", schedule);
      document.removeEventListener("keyup", schedule);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, []);

  useEffect(() => teardownAudio, [teardownAudio]);

  // Start reading `raw`: split into chunks and stream them. Chunk 0 plays as
  // soon as it's synthesised; the rest are produced in the background and
  // played back-to-back so there's no wait for the whole text up front.
  const startReading = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (!t) return;
      teardownAudio();
      const token = ++cancelRef.current;

      const chunks: Chunk[] = splitIntoChunks(t).map((s) => ({
        text: s,
        weight: Math.max(1, s.replace(/\s/g, "").length),
        audio: null,
        url: null,
      }));
      chunksRef.current = chunks;
      totalWeightRef.current = chunks.reduce((a, c) => a + c.weight, 0) || 1;
      estTotalRef.current = Math.max(1, Math.round(t.replace(/\s/g, "").length / 13));
      idxRef.current = 0;
      wantPlayRef.current = true;

      setOpen(true);
      setTrigger(null);
      setPlaying(false);
      setError(false);
      setCurrent(0);
      setFrac(0);
      setEstTotal(estTotalRef.current);
      setLoading(true);

      const updateProgress = () => {
        const i = idxRef.current;
        const c = chunks[i];
        let played = 0;
        for (let k = 0; k < i; k++) played += chunks[k].weight;
        if (c?.audio && c.audio.duration) {
          played += c.weight * (c.audio.currentTime / c.audio.duration);
        }
        const f = Math.min(played / totalWeightRef.current, 1);
        setFrac(f);
        setCurrent(f * estTotalRef.current);
      };

      const playChunk = (i: number) => {
        const c = chunks[i];
        if (!c?.audio) return; // not synthesised yet → producer autostarts later
        idxRef.current = i;
        void c.audio.play();
      };

      const onEnded = (i: number) => {
        if (cancelRef.current !== token) return;
        if (i + 1 < chunks.length) {
          idxRef.current = i + 1;
          updateProgress();
          playChunk(i + 1); // no-op if next chunk not ready; producer will start it
        } else {
          wantPlayRef.current = false;
          setPlaying(false);
          idxRef.current = 0;
          setFrac(0);
          setCurrent(0);
          for (const c of chunks) if (c.audio) c.audio.currentTime = 0;
        }
      };

      (async () => {
        for (let i = 0; i < chunks.length; i++) {
          try {
            const spoken = await normalizeForSpeech(chunks[i].text);
            if (cancelRef.current !== token) return;
            const blob = await speak(spoken, {
              voice: prefsRef.current.voice,
              speed: prefsRef.current.speed,
              format: "mp3",
            });
            if (cancelRef.current !== token) return;
            const url = URL.createObjectURL(blob);
            const a = new Audio(url);
            chunks[i].audio = a;
            chunks[i].url = url;
            a.addEventListener("timeupdate", () => {
              if (cancelRef.current === token) updateProgress();
            });
            a.addEventListener("play", () => {
              if (cancelRef.current === token) setPlaying(true);
            });
            a.addEventListener("pause", () => {
              if (cancelRef.current === token && !a.ended) setPlaying(false);
            });
            a.addEventListener("ended", () => onEnded(i));
            if (i === 0) setLoading(false);
            // start now if the consumer is waiting on this chunk
            if (idxRef.current === i && wantPlayRef.current) playChunk(i);
          } catch {
            if (cancelRef.current !== token) return;
            setError(true);
            setLoading(false);
            toast.error("อ่านออกเสียงไม่สำเร็จ", "ลองใหม่อีกครั้ง");
            return;
          }
        }
      })();
    },
    [toast, teardownAudio],
  );

  const toggle = () => {
    if (loading || error) return;
    const c = chunksRef.current[idxRef.current];
    if (!c) return;
    if (c.audio && !c.audio.paused) {
      wantPlayRef.current = false;
      c.audio.pause();
    } else {
      wantPlayRef.current = true;
      if (c.audio) void c.audio.play(); // else: autostarts when synthesised
    }
  };

  // Speaker buttons elsewhere → open the dock and start reading immediately.
  useEffect(() => {
    const onSpeak = (e: Event) => {
      const t = ((e as CustomEvent).detail?.text ?? "").toString();
      startReading(t);
    };
    window.addEventListener(TTS_SPEAK_EVENT, onSpeak);
    return () => window.removeEventListener(TTS_SPEAK_EVENT, onSpeak);
  }, [startReading]);

  const total = estTotal;
  const pct = frac * 100;

  return (
    <div ref={rootRef}>
      {/* Selection trigger pill */}
      <AnimatePresence>
        {trigger && !open && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => startReading(trigger.text)}
            style={{
              position: "fixed",
              left: trigger.at.left,
              top: trigger.at.top - 10,
              transform: "translate(-50%, -100%)",
            }}
            className="z-[60] flex items-center gap-1.5 rounded-full bg-[#3965e1] px-3 py-1.5 text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(57,101,225,0.30)]"
          >
            <IconVolume className="h-4 w-4" stroke={2.2} />
            ฟังเสียง
          </motion.button>
        )}
      </AnimatePresence>

      {/* Player */}
      <AnimatePresence>
        {open && (
          <>
            {/* transparent backdrop to catch outside clicks */}
            <div className="fixed inset-0 z-[55]" onClick={closePlayer} />
            {/* Bottom-center dock — flat */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 28 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed bottom-6 left-1/2 z-[60] flex w-[min(440px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-[20px] border border-black/[0.06] bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
            >
              {/* play / pause */}
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? "หยุดชั่วคราว" : "เล่น"}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#3965e1] text-white transition-colors hover:bg-[#2f55c8]"
              >
                {loading ? (
                  <IconLoader2 className="h-5 w-5 animate-spin" stroke={2.2} />
                ) : error ? (
                  <IconAlertTriangle className="h-5 w-5" stroke={2.2} />
                ) : playing ? (
                  <IconPlayerPauseFilled className="h-5 w-5" />
                ) : (
                  <IconPlayerPlayFilled className="ml-0.5 h-5 w-5" />
                )}
              </button>

              {/* progress + times */}
              <div className="flex min-w-0 flex-1 items-center gap-2.5 text-[11px] font-semibold tabular-nums text-black/45">
                <span className="shrink-0">{fmtTime(current)}</span>
                <div className="relative h-1.5 flex-1 rounded-full bg-black/[0.08]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[#3965e1]"
                    style={{ width: `${pct}%` }}
                  />
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3965e1]"
                    style={{ left: `${pct}%` }}
                  />
                </div>
                <span className="shrink-0">{fmtTime(total)}</span>
              </div>

              {/* close */}
              <button
                type="button"
                onClick={closePlayer}
                aria-label="ปิด"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-black/40 transition-colors hover:bg-black/5 hover:text-black/70"
              >
                <IconX className="h-4 w-4" stroke={2.2} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
