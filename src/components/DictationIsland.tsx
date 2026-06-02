import { AnimatePresence, motion } from "framer-motion";
import {
  IconMicrophone,
  IconLoader2,
  IconPlayerStopFilled,
  IconSparkles,
} from "@tabler/icons-react";
import { useDictationContext } from "../contexts/DictationContext";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * iOS Dynamic Island-style activity pill that lives next to the dock.
 *
 * When a dictation session is active or in review with the modal minimized,
 * a glass capsule appears alongside the dock items showing:
 *  - pulsing mic indicator (red while recording, blue while finalizing)
 *  - status label
 *  - live preview of the last segment
 *  - stop button (during recording)
 *  - whole pill is clickable → opens the full transcript modal
 *
 * Mounted by AppShell inside the dock's motion.nav so the pill and the dock
 * read as a single morphing top-of-screen surface — closer to iOS Dynamic
 * Island than a separate floating panel.
 */
export default function DictationIsland() {
  const {
    status,
    segments,
    isRecording,
    isProcessing,
    reviewing,
    minimized,
    setMinimized,
    stopSession,
  } = useDictationContext();

  // Only show the island when the modal is NOT taking up the screen and
  // there's an active session worth surfacing.
  const sessionActive = isRecording || reviewing || status === "transcribing";
  const visible = sessionActive && minimized;

  const last = segments[segments.length - 1];
  const lastText = last?.text ?? "";
  const lastSpeaker = last?.speaker;
  const finalizing = status === "transcribing" || status === "requesting";

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9, width: 0 }}
          animate={{ opacity: 1, scale: 1, width: "auto" }}
          exit={{ opacity: 0, scale: 0.9, width: 0 }}
          transition={{ duration: 0.45, ease: EASE_TV }}
          className="flex items-center"
          style={{ overflow: "hidden" }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMinimized(false);
            }}
            aria-label="ขยาย transcript"
            title="คลิกเพื่อขยาย transcript"
            className="ml-3 flex h-16 items-center gap-3 rounded-full border border-white/8 bg-[#0d0d10]/92 px-4 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:bg-[#15151a]/92"
          >
            {/* Indicator */}
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff383c]">
              {isRecording && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-[#ff383c]"
                  animate={{ scale: [1, 1.7, 1], opacity: [0.55, 0, 0.55] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              {finalizing ? (
                <IconLoader2 className="relative h-4 w-4 animate-spin" />
              ) : reviewing && !isRecording ? (
                <IconSparkles className="relative h-4 w-4" />
              ) : (
                <IconMicrophone className="relative h-4 w-4" />
              )}
            </div>

            {/* Caption */}
            <div className="flex min-w-0 flex-col text-left">
              <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/55">
                {finalizing
                  ? "กำลังประมวลผล"
                  : isRecording
                    ? "กำลังถอดเสียง"
                    : "พร้อมสรุป"}
                {isProcessing && !finalizing && (
                  <IconLoader2 className="h-3 w-3 animate-spin" />
                )}
              </div>
              <div className="mt-0.5 max-w-[240px] truncate text-[13px] leading-tight text-white/90">
                {lastText ? (
                  <>
                    {lastSpeaker && (
                      <span className="mr-1.5 text-[10px] font-semibold text-white/55">
                        S{lastSpeaker}
                      </span>
                    )}
                    {lastText}
                  </>
                ) : (
                  <span className="text-white/40">พูดได้เลย…</span>
                )}
              </div>
            </div>

            {/* Stop button (only while recording) */}
            {isRecording && (
              <span
                role="button"
                tabIndex={0}
                aria-label="stop"
                title="หยุดบันทึก"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void stopSession();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    void stopSession();
                  }
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff383c]/20 text-[#ff7a7d] transition hover:bg-[#ff383c]/30"
              >
                <IconPlayerStopFilled className="h-4 w-4" />
              </span>
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
