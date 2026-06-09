import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconMicrophone,
  IconArrowUp,
  IconMinus,
  IconSparkles,
  IconMessagePlus,
  IconLayoutSidebarRight,
  IconAppWindow,
  IconChevronDown,
  IconPlus,
  IconAdjustmentsHorizontal,
  IconFileText,
  IconNotes,
  IconStethoscope,
} from "@tabler/icons-react";
import { useNavigate } from "react-router";
import { useDictationContext } from "../contexts/DictationContext";
import { useAiva } from "../contexts/AivaContext";
import { answerChatPrompt, type ChatMessage } from "../services/chatAssistant";
import ChatMessageText from "./ChatMessageText";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface Suggestion {
  Icon: typeof IconNotes;
  iconColor: string;
  label: string;
  prompt: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    Icon: IconNotes,
    iconColor: "text-amber-500",
    label: "สรุปผู้ป่วยรายนี้",
    prompt: "สรุปผู้ป่วยรายนี้",
  },
  {
    Icon: IconStethoscope,
    iconColor: "text-emerald-500",
    label: "ช่วยเขียน SOAP",
    prompt: "ช่วยเขียน SOAP",
  },
  {
    Icon: IconFileText,
    iconColor: "text-sky-500",
    label: "วิเคราะห์ผลแลป/ภาพ",
    prompt: "วิเคราะห์ผลแลปล่าสุด",
  },
];

interface AivaDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface ChatTurn {
  id: string;
  prompt: string;
  status: "thinking" | "ready" | "error";
  reply?: string;
  error?: string;
}

export default function AivaDrawer({ open, onClose }: AivaDrawerProps) {
  const { isRecording, startSession, stopSession, segments } = useDictationContext();
  const { initialPrompt, viewMode, toggleViewMode } = useAiva();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Markdown links in Mae's replies should navigate AND close the modal so
  // the doctor lands on the target page immediately.
  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  // Esc to close — standard modal affordance.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus + seed prompt on open. `initialPrompt` lets callers hand off a
  // query (e.g. from a search bar) and have it pre-filled.
  useEffect(() => {
    if (!open) return;
    if (initialPrompt) setPrompt(initialPrompt);
    setTimeout(() => inputRef.current?.focus(), 280);
  }, [open, initialPrompt]);

  // Stream live transcript into the prompt while recording.
  useEffect(() => {
    if (!isRecording) return;
    const text = segments.map((s) => s.text).join(" ").trim();
    if (text) setPrompt(text);
  }, [segments, isRecording]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const handleMic = () => {
    if (isRecording) void stopSession();
    else startSession("mic");
  };

  const handleSubmit = (textOverride?: string) => {
    const text = (textOverride ?? prompt).trim();
    if (!text) return;
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const turn: ChatTurn = { id, prompt: text, status: "thinking" };
    // Snapshot history before the new turn so the assistant has full context.
    const history: ChatMessage[] = turns.flatMap((t) =>
      t.reply
        ? [
            { role: "user", content: t.prompt },
            { role: "assistant", content: t.reply },
          ]
        : [],
    );
    setTurns((prev) => [...prev, turn]);
    setPrompt("");
    void answerChatPrompt(text, history).then(
      (reply) =>
        setTurns((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "ready", reply } : t)),
        ),
      (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setTurns((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "error", error: msg } : t)),
        );
      },
    );
  };

  const handleNewChat = () => {
    setPrompt("");
    setTurns([]);
  };

  // Shared chat chrome — header + body + composer. Used by both view modes
  // so they're guaranteed to stay in sync.
  const content = (
    <>
      {/* Header — title with dropdown caret on the left, action icons on
          the right. Mirrors the Notion AI modal chrome. */}
      <header className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-base)]"
            >
              เมย์ AI
              <IconChevronDown className="h-3.5 w-3.5" stroke={1.75} />
            </button>
            <div className="flex items-center gap-0.5">
              <IconButton label="แชทใหม่" onClick={handleNewChat}>
                <IconMessagePlus className="h-4 w-4" stroke={1.75} />
              </IconButton>
              <IconButton
                label={viewMode === "floating" ? "ย้ายไปด้านข้าง" : "ย่อเป็นการ์ดลอย"}
                onClick={toggleViewMode}
              >
                {viewMode === "floating" ? (
                  <IconLayoutSidebarRight className="h-4 w-4" stroke={1.75} />
                ) : (
                  <IconAppWindow className="h-4 w-4" stroke={1.75} />
                )}
              </IconButton>
              <IconButton label="ย่อ (Esc)" onClick={onClose}>
                <IconMinus className="h-4 w-4" stroke={1.75} />
              </IconButton>
            </div>
          </header>

          {/* Body — greeting block + suggestions when empty, conversation
              turns once the user has sent something. */}
          <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-3 pt-2"
          >
            {turns.length === 0 ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] shadow-sm">
                  <IconSparkles
                    className="h-5 w-5 text-[var(--theme-primary)]"
                    stroke={1.75}
                  />
                </div>
                <div className="flex flex-col gap-1 pt-2">
                  <h2 className="text-[length:var(--theme-text-xl)] font-bold text-[var(--theme-neutral)]">
                    หมอเมย์พร้อมช่วยคุณ
                  </h2>
                  <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/65">
                    นี่คือสิ่งที่ผมช่วยได้ — หรือพิมพ์ถามอะไรก็ได้!
                  </p>
                </div>
                <ul className="mt-1 flex flex-col">
                  {SUGGESTIONS.map((s) => (
                    <li key={s.label}>
                      <button
                        type="button"
                        onClick={() => handleSubmit(s.prompt)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/85 transition hover:bg-[var(--theme-base)]"
                      >
                        <s.Icon className={`h-4 w-4 ${s.iconColor}`} stroke={1.75} />
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              turns.map((t) => (
                <div key={t.id} className="flex flex-col gap-2">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--theme-primary)] px-4 py-2 text-[length:var(--theme-text-sm)] text-white">
                    {t.prompt}
                  </div>
                  <div className="mr-auto max-w-[90%] rounded-2xl rounded-tl-md border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)] px-4 py-2 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] whitespace-pre-wrap">
                    {t.status === "thinking" && <TypingDots />}
                    {t.status === "ready" && t.reply && (
                      <ChatMessageText text={t.reply} onNavigate={handleNavigate} />
                    )}
                    {t.status === "error" && (
                      <span className="text-[var(--theme-error)]">
                        ขออภัย เกิดข้อผิดพลาด: {t.error}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Composer — bordered card hugging the modal bottom. Context
              chip on top, textarea, then a row of icon controls + mic +
              send button (Notion's "Auto" label sits between the row's
              two halves). */}
          <div className="px-3 pb-3">
            <div
              className={`flex flex-col gap-2 rounded-2xl border bg-[var(--theme-surface)] p-3 transition ${
                isRecording
                  ? "border-[var(--theme-primary)]/60 ring-2 ring-[var(--theme-primary)]/20"
                  : "border-[var(--theme-primary)]/50"
              }`}
            >
              <button
                type="button"
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 py-1 text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/70 transition hover:bg-[var(--theme-base)]"
              >
                <IconFileText className="h-3.5 w-3.5" stroke={1.75} />
                ผู้ป่วยปัจจุบัน
              </button>

              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="ถามอะไรก็ได้ กับ AI…"
                rows={1}
                className="block min-h-[28px] max-h-[140px] w-full resize-none bg-transparent text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] placeholder:text-[var(--theme-neutral)]/45 focus:outline-none"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <IconButton label="แนบไฟล์">
                    <IconPlus className="h-4 w-4" stroke={1.75} />
                  </IconButton>
                  <IconButton label="ตัวเลือก">
                    <IconAdjustmentsHorizontal className="h-4 w-4" stroke={1.75} />
                  </IconButton>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                    Auto
                  </span>
                  <button
                    type="button"
                    onClick={handleMic}
                    aria-label={isRecording ? "หยุดบันทึก" : "เริ่มบันทึกเสียง"}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                      isRecording
                        ? "bg-rose-500 text-white"
                        : "text-[var(--theme-neutral)]/65 hover:bg-[var(--theme-base)] hover:text-[var(--theme-neutral)]"
                    }`}
                  >
                    {isRecording ? (
                      <span className="block h-2.5 w-2.5 rounded-sm bg-white" />
                    ) : (
                      <IconMicrophone className="h-4 w-4" stroke={1.75} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={!prompt.trim()}
                    aria-label="ส่ง"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--theme-neutral)]/15 text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-primary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--theme-neutral)]/15 disabled:hover:text-[var(--theme-neutral)]/55"
                  >
                    <IconArrowUp className="h-4 w-4" stroke={2} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
  );

  return (
    <AnimatePresence initial={false}>
      {open && viewMode === "floating" && (
        <motion.div
          key="aiva-floating"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.28, ease: EASE_TV }}
          // Compact card anchored to the bottom-right corner where the FAB
          // lives. Fixed positioning keeps it out of the page flow so
          // opening doesn't shift anything underneath.
          className="fixed bottom-4 right-4 z-[70] flex h-[560px] max-h-[calc(100vh-32px)] w-[400px] max-w-[calc(100vw-32px)] origin-bottom-right flex-col overflow-hidden rounded-3xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)]"
        >
          {content}
        </motion.div>
      )}
      {open && viewMode === "sidebar" && (
        <motion.aside
          key="aiva-sidebar"
          initial={{ width: 0 }}
          animate={{ width: 400 }}
          exit={{ width: 0 }}
          transition={{ duration: 0.4, ease: EASE_TV }}
          // Inline rail — takes width in the flex parent so the workspace
          // column shrinks to make room. Flush against the right viewport
          // edge, rounded on the left only.
          className="relative z-[5] shrink-0 overflow-hidden"
          style={{ paddingTop: 80, height: "100vh" }}
        >
          <div className="flex h-full w-[400px] flex-col overflow-hidden rounded-l-3xl border-b border-l border-t border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] shadow-[-8px_0_24px_-8px_rgba(0,0,0,0.08)]">
            {content}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

interface IconButtonProps {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}

function TypingDots() {
  return (
    <span
      aria-label="กำลังคิด"
      className="inline-flex items-center gap-1 align-middle text-[var(--theme-neutral)]/55"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-current"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

function IconButton({ label, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-base)] hover:text-[var(--theme-neutral)]"
    >
      {children}
    </button>
  );
}
