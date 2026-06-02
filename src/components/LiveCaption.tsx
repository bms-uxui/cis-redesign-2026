import { AnimatePresence, motion } from "framer-motion";
import {
  IconMicrophone,
  IconPlayerStopFilled,
  IconSparkles,
  IconX,
  IconWand,
  IconLoader2,
  IconArrowsDiagonalMinimize2,
  IconArrowsDiagonal,
} from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useTypewriter } from "../hooks/useTypewriter";
import type { DictationSegment } from "../hooks/useDictation";
import A2UIRenderer from "./a2ui/A2UIRenderer";
import type { A2UIActionEvent, A2UIResponse } from "../services/a2ui/types";
import AI_LISTENING from "../assets/figma/ai-listening.png";

interface LiveCaptionProps {
  visible: boolean;
  segments: DictationSegment[];
  status?: string;
  source?: "mic" | "tab";
  isProcessing?: boolean;
  onStop?: () => void;
  onClose?: () => void;
  onSummarize?: () => void;
  summaryUi?: A2UIResponse | null;
  onSummaryAction?: (event: A2UIActionEvent) => void;
  isSummarizing?: boolean;
  onSuggestIcd?: () => void;
  icdUi?: A2UIResponse | null;
  isIcdLoading?: boolean;
  /** When true, the modal collapses into a small floating pill so the user
   *  can navigate elsewhere while transcription continues. */
  minimized?: boolean;
  onMinimize?: () => void;
  onExpand?: () => void;
}

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

const SPEAKER_STYLES: Record<
  1 | 2,
  { label: string; pill: string; text: string; bar: string }
> = {
  1: {
    label: "Speaker 1",
    pill: "bg-[#3485ff] text-white",
    text: "text-white",
    bar: "bg-[#3485ff]",
  },
  2: {
    label: "Speaker 2",
    pill: "bg-[#ff9a3c] text-black",
    text: "text-[#ffd6a8]",
    bar: "bg-[#ff9a3c]",
  },
};

export default function LiveCaption({
  visible,
  segments,
  status,
  source = "mic",
  isProcessing,
  onStop,
  onClose,
  onSummarize,
  summaryUi,
  onSummaryAction,
  isSummarizing,
  onSuggestIcd,
  icdUi,
  isIcdLoading,
  minimized,
  onMinimize,
  onExpand,
}: LiveCaptionProps) {
  const listening = source === "tab" ? "ฟังเสียงจากแท็บ" : "ฟังจากไมโครโฟน";
  const hasAny = segments.length > 0;
  const showSkeleton = isProcessing && !hasAny;
  const showTailSkeleton = isProcessing && hasAny;

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [segments, showSkeleton, showTailSkeleton]);

  // When minimized, the modal stays MOUNTED but visually hides — the
  // DictationIsland pill next to the dock takes over the compact display.
  // Keeping the DOM around means scroll position, in-progress edits, and
  // any open A2UI summary stay intact across minimize/expand cycles.
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: minimized ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_TV }}
            style={{ pointerEvents: minimized ? "none" : "auto" }}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-md"
          />

          {/* modal — stays mounted across minimize so segments / scroll /
              field edits persist. Visibility & interactivity gated by the
              minimized prop. */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{
              opacity: minimized ? 0 : 1,
              y: minimized ? 12 : 0,
              scale: minimized ? 0.94 : 1,
            }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.4, ease: EASE_TV }}
            style={{ pointerEvents: minimized ? "none" : "auto" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div
              className="flex h-[min(80vh,720px)] w-full max-w-[860px] flex-col overflow-hidden rounded-[32px] bg-[#0d0d10] text-white shadow-[0_40px_120px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              {/* header */}
              <div className="flex items-center justify-between gap-4 border-b border-white/8 px-8 py-5">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#ff383c]">
                    <motion.span
                      className="absolute inset-0 rounded-full bg-[#ff383c]"
                      animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    />
                    <IconMicrophone className="relative h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold">Live Transcript</div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                      {status === "transcribing"
                        ? "กำลังประมวลผล"
                        : onStop
                          ? listening
                          : "พร้อมสรุป"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onSummarize && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSummarize();
                      }}
                      disabled={isSummarizing || segments.length === 0}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6a4cff] to-[#3485ff] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(106,76,255,0.35)] transition disabled:opacity-50"
                    >
                      {isSummarizing ? (
                        <IconLoader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <IconWand className="h-4 w-4" />
                      )}
                      สรุป
                    </button>
                  )}
                  {onSuggestIcd && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSuggestIcd();
                      }}
                      disabled={isIcdLoading || segments.length === 0}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(16,163,127,0.35)] transition disabled:opacity-50"
                    >
                      {isIcdLoading ? (
                        <IconLoader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <IconSparkles className="h-4 w-4" />
                      )}
                      ICD
                    </button>
                  )}
                  {onStop && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onStop();
                      }}
                      className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                      <IconPlayerStopFilled className="h-4 w-4 text-[#ff383c]" />
                      หยุด
                    </button>
                  )}
                  {onMinimize && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onMinimize();
                      }}
                      aria-label="minimize"
                      title="ย่อขนาด (ไปหน้าอื่นได้ขณะที่ระบบยังถอดเสียง)"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
                    >
                      <IconArrowsDiagonalMinimize2 className="h-4 w-4" />
                    </button>
                  )}
                  {onClose && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                      }}
                      aria-label="close"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* body */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-5 overflow-y-auto px-8 py-6"
                style={{
                  maskImage:
                    "linear-gradient(to bottom, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%)",
                }}
              >
                {!hasAny && !showSkeleton && (
                  <ListeningHero source={source} />
                )}
                {showSkeleton ? (
                  <Skeleton lines={4} />
                ) : (
                  <>
                    {segments.map((seg, i) => (
                      <SegmentBlock
                        key={i}
                        segment={seg}
                        isTail={i === segments.length - 1 && !showTailSkeleton}
                      />
                    ))}
                    {showTailSkeleton && <Skeleton lines={1} compact />}
                  </>
                )}

                {(isSummarizing || summaryUi) && (
                  <SummaryBlock
                    summaryUi={summaryUi ?? null}
                    isSummarizing={!!isSummarizing}
                    onAction={onSummaryAction}
                  />
                )}

                {(isIcdLoading || icdUi) && (
                  <IcdBlock
                    icdUi={icdUi ?? null}
                    isLoading={!!isIcdLoading}
                    onAction={onSummaryAction}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Empty-state hero — shown in the transcript modal before the first
// segment arrives. Uses the Figma "เมย์กำลังฟัง" mascot (node 876:467)
// with a soft 2px blur + violet glow halo so it reads as ambient rather
// than the foreground content.
function ListeningHero({ source }: { source?: "mic" | "tab" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: EASE_TV }}
      className="relative flex flex-col items-center gap-6 px-6 py-12 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 40%, rgba(106,76,255,0.25) 0%, rgba(106,76,255,0) 70%)",
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <img
          src={AI_LISTENING}
          alt="เมย์กำลังฟัง"
          decoding="async"
          className="h-[220px] w-auto object-contain drop-shadow-[0_18px_36px_rgba(106,76,255,0.45)]"
          style={{ filter: "blur(0.5px)" }}
        />
        {/* Pulsing red mic indicator overlapping the mascot's chest */}
        <span className="absolute -bottom-1 left-1/2 flex h-3 w-3 -translate-x-1/2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
        </span>
      </motion.div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-[13px] uppercase tracking-[0.2em] text-white/40">
          {source === "tab" ? "ฟังเสียงจากแท็บ" : "ฟังจากไมโครโฟน"}
        </p>
        <p className="text-[18px] font-medium text-white">
          เมย์กำลังฟังอยู่…
        </p>
        <p className="mt-1 max-w-[420px] text-[13px] leading-relaxed text-white/55">
          พูดได้เลย เมย์จะถอดเสียงและจัดเป็นบทสนทนาให้ทันทีที่คุณเริ่มพูด
        </p>
      </div>
    </motion.div>
  );
}

function SegmentBlock({ segment, isTail }: { segment: DictationSegment; isTail: boolean }) {
  const style = SPEAKER_STYLES[segment.speaker];
  const drip = useTypewriter(segment.text, { baseRate: 14, maxRate: 55, catchUpGain: 0.9 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_TV }}
      className="flex gap-4"
    >
      <div className="flex flex-col items-center gap-2 pt-1">
        <span
          className={`inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wider ${style.pill}`}
        >
          {style.label}
        </span>
        <span className={`w-[3px] flex-1 rounded-full opacity-30 ${style.bar}`} />
      </div>
      <div className={`min-w-0 flex-1 text-[22px] leading-[1.5] ${style.text}`}>
        {drip}
        {isTail && (
          <motion.span
            aria-hidden
            className="ml-1 inline-block h-[1em] w-[3px] translate-y-[4px] rounded-sm bg-white/70 align-middle"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
    </motion.div>
  );
}

function SummaryBlock({
  summaryUi,
  isSummarizing,
  onAction,
}: {
  summaryUi: A2UIResponse | null;
  isSummarizing: boolean;
  onAction?: (event: A2UIActionEvent) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_TV }}
      className="mt-4"
    >
      {isSummarizing && !summaryUi ? (
        <div className="rounded-[32px] border border-violet-300/20 bg-gradient-to-br from-violet-500/15 to-sky-500/10 p-5">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-violet-200">
            <IconSparkles className="h-4 w-4" />
            กำลังสรุป…
          </div>
          <Skeleton lines={5} />
        </div>
      ) : summaryUi ? (
        <A2UIRenderer response={summaryUi} onAction={onAction} theme="dark" />
      ) : null}
    </motion.div>
  );
}

function IcdBlock({
  icdUi,
  isLoading,
  onAction,
}: {
  icdUi: A2UIResponse | null;
  isLoading: boolean;
  onAction?: (event: A2UIActionEvent) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_TV }}
      className="mt-3"
    >
      {isLoading && !icdUi ? (
        <div className="rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-5">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
            <IconSparkles className="h-4 w-4" />
            กำลังวิเคราะห์รหัส ICD…
          </div>
          <Skeleton lines={3} />
        </div>
      ) : icdUi ? (
        <A2UIRenderer response={icdUi} onAction={onAction} theme="dark" />
      ) : null}
    </motion.div>
  );
}

function Skeleton({ lines = 4, compact = false }: { lines?: number; compact?: boolean }) {
  const widths = ["95%", "82%", "88%", "70%", "76%", "60%"];
  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      {!compact && (
        <div className="mb-1 flex items-center gap-2 text-[12px] font-medium text-violet-200/90">
          <IconSparkles className="h-4 w-4" />
          กำลังถอดเสียง…
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerBar key={i} width={widths[i % widths.length]} delay={i * 0.18} compact={compact} />
      ))}
    </div>
  );
}

function ShimmerBar({
  width,
  delay,
  compact,
}: {
  width: string;
  delay: number;
  compact?: boolean;
}) {
  return (
    <motion.div
      className="rounded-full"
      style={{
        width,
        height: compact ? 12 : 18,
        background:
          "linear-gradient(90deg, rgba(180,170,255,0.12) 0%, rgba(210,200,255,0.5) 45%, rgba(180,170,255,0.12) 100%)",
        backgroundSize: "200% 100%",
      }}
      animate={{ backgroundPositionX: ["120%", "-120%"] }}
      transition={{
        duration: 1.6,
        repeat: Infinity,
        ease: "linear",
        delay,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Compact floating pill — shown when the user minimizes the live      */
/* transcript modal. Stays draggable/clickable but doesn't block the   */
/* page so the user can keep working while transcription continues.    */

function CompactLiveCaption({
  segments,
  status,
  isProcessing,
  onStop,
  onExpand,
}: {
  segments: DictationSegment[];
  status?: string;
  isProcessing?: boolean;
  onStop?: () => void;
  onExpand?: () => void;
}) {
  const lastSegment = segments[segments.length - 1];
  const last = lastSegment?.text ?? "";
  const lastSpeaker = lastSegment?.speaker;
  const isRecording = !!onStop;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ duration: 0.35, ease: EASE_TV }}
      className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-32px)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-[28px] bg-[#0d0d10]/92 px-4 py-3 text-white shadow-[0_20px_48px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff383c]">
          {isRecording && (
            <motion.span
              className="absolute inset-0 rounded-full bg-[#ff383c]"
              animate={{ scale: [1, 1.7, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <IconMicrophone className="relative h-4 w-4" />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onExpand?.();
          }}
          className="flex min-w-0 flex-1 flex-col text-left"
          aria-label="ขยาย transcript"
          title="คลิกเพื่อขยาย"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
            {status === "transcribing"
              ? "กำลังประมวลผล"
              : isRecording
                ? "กำลังถอดเสียง"
                : "พร้อมสรุป"}
            {isProcessing && <IconLoader2 className="h-3 w-3 animate-spin" />}
          </div>
          <div className="mt-0.5 truncate text-[13px] text-white/90">
            {last ? (
              <>
                {lastSpeaker && (
                  <span className="mr-1.5 inline-block text-[10px] font-semibold tracking-wide text-white/55">
                    S{lastSpeaker}
                  </span>
                )}
                {last}
              </>
            ) : (
              <span className="text-white/40">พูดได้เลย…</span>
            )}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExpand?.();
            }}
            aria-label="expand"
            title="ขยาย"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
          >
            <IconArrowsDiagonal className="h-4 w-4" />
          </button>
          {onStop && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStop();
              }}
              aria-label="stop"
              title="หยุด"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff383c]/20 text-[#ff7a7d] transition hover:bg-[#ff383c]/30"
            >
              <IconPlayerStopFilled className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
