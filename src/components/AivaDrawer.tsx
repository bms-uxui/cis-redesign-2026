import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconMicrophone,
  IconArrowUp,
  IconX,
  IconSparkles,
  IconMessagePlus,
  IconSettings,
} from "@tabler/icons-react";
import { useNavigate } from "react-router";
import { useDictationContext } from "../contexts/DictationContext";
import { useAiva } from "../contexts/AivaContext";
import { answerChatPrompt, type ChatMessage } from "../services/chatAssistant";
import ChatMessageText from "./ChatMessageText";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

const QUICK_PROMPTS = ["สรุปผู้ป่วยรายนี้", "ช่วยเขียน SOAP"];

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
  const { initialPrompt } = useAiva();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mae suggests pages as markdown links — clicking should navigate AND
  // close the drawer so the doctor lands on the target page immediately.
  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  // Esc to close — standard drawer affordance
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus input + seed prompt when opening. If the caller passed an
  // initialPrompt via the context (e.g. "ถามหมอเมย์" from a search bar),
  // pre-fill it so the user can hit Enter immediately.
  useEffect(() => {
    if (!open) return;
    if (initialPrompt) setPrompt(initialPrompt);
    setTimeout(() => inputRef.current?.focus(), 280);
  }, [open, initialPrompt]);

  // Stream live transcript into the prompt while recording
  useEffect(() => {
    if (!isRecording) return;
    const text = segments.map((s) => s.text).join(" ").trim();
    if (text) setPrompt(text);
  }, [segments, isRecording]);

  // Auto-scroll to the latest message — fires when a turn is appended and
  // again when its assistant reply arrives, so the user always sees the
  // newest content without having to scroll manually.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const handleMic = () => {
    if (isRecording) void stopSession();
    else startSession("mic");
  };

  const handleSubmit = () => {
    const text = prompt.trim();
    if (!text) return;
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const turn: ChatTurn = { id, prompt: text, status: "thinking" };
    // Snapshot history BEFORE the new turn so the assistant has full context.
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

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 360, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE_TV }}
          className="relative z-0 shrink-0 overflow-hidden"
          style={{
            // Floating card slot: top aligns with banner row (80px topbar
            // reserve + 16px page padding). Right + bottom 16px gutter
            // matches the page's own gutters.
            marginTop: "calc(80px + var(--theme-space-md))",
            marginBottom: "var(--theme-space-md)",
            height:
              "calc(100vh - 80px - var(--theme-space-md) - var(--theme-space-md))",
          }}
        >
          <div className="flex h-full w-[360px] flex-col pr-[var(--theme-space-md)]">
            <div className="flex min-h-0 flex-1 flex-col rounded-[calc(var(--theme-radius-box)*1.5)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">

            {/* Header — sparkle on the left, action icons on the right.
                Subtle bottom border separates it from the chat body. */}
            <header className="flex items-center justify-between border-b border-[var(--theme-neutral)]/10 p-[var(--theme-space-md)]">
              <IconSparkles
                className="h-5 w-5 text-[var(--theme-primary)]"
                stroke={2}
              />
              <div className="flex items-center gap-1">
                <IconButton
                  label="แชทใหม่"
                  onClick={handleNewChat}
                >
                  <IconMessagePlus className="h-4 w-4" stroke={1.75} />
                </IconButton>
                <IconButton label="ตั้งค่า">
                  <IconSettings className="h-4 w-4" stroke={1.75} />
                </IconButton>
                <IconButton label="ปิด (Esc)" onClick={onClose}>
                  <IconX className="h-4 w-4" stroke={1.75} />
                </IconButton>
              </div>
            </header>

            {/* Chat body — greeting + quick chips when empty, conversation
                turns once the user has sent something. Each assistant turn
                is rendered as an inline A2UI dashboard generated from the
                user's prompt. */}
            <div
              ref={scrollRef}
              className="flex flex-1 flex-col gap-[var(--theme-space-md)] overflow-y-auto p-[var(--theme-space-md)]"
            >
              {turns.length === 0 ? (
                <>
                  <div className="flex flex-col gap-1 pt-2">
                    <p className="text-[length:var(--theme-text-lg)] font-medium text-[var(--theme-primary)]">
                      สวัสดี, คุณหมอ
                    </p>
                    <h2 className="text-[length:var(--theme-text-xl)] font-semibold text-[var(--theme-neutral)]">
                      ให้เมย์ช่วยอะไร?
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPrompt(p);
                          inputRef.current?.focus();
                        }}
                        className="rounded-full border border-[var(--theme-primary)]/50 bg-transparent px-4 py-2 text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
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

            {/* Input area — subtle filled bg, no thick border. Mic + send
                float at the bottom-right of the textarea. */}
            <div className="border-t border-[var(--theme-neutral)]/10 p-[var(--theme-space-md)]">
              <div
                className={`relative rounded-2xl bg-[var(--theme-base)] p-3 transition ${
                  isRecording ? "ring-2 ring-[var(--theme-primary)]/30" : ""
                }`}
              >
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
                  placeholder="ถามอะไรก็ได้..."
                  rows={2}
                  className="block min-h-[48px] max-h-[140px] w-full resize-none bg-transparent pr-20 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] placeholder:text-[var(--theme-neutral)]/45 focus:outline-none"
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleMic}
                    aria-label={isRecording ? "หยุดบันทึก" : "เริ่มบันทึกเสียง"}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                      isRecording
                        ? "bg-rose-500 text-white"
                        : "text-[var(--theme-neutral)]/65 hover:bg-[var(--theme-neutral)]/10 hover:text-[var(--theme-neutral)]"
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
                    onClick={handleSubmit}
                    disabled={!prompt.trim()}
                    aria-label="ส่ง"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--theme-neutral)]/45 transition hover:text-[var(--theme-neutral)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <IconArrowUp className="h-4 w-4" stroke={2} />
                  </button>
                </div>
              </div>
              <p className="mt-[var(--theme-space-md)] text-[length:var(--theme-text-xs)] leading-relaxed text-[var(--theme-neutral)]/55">
                เมย์เป็น AI ใช้ประกอบการตัดสินใจของแพทย์เท่านั้น — ตรวจสอบข้อมูลก่อนใช้งานทุกครั้ง
              </p>
            </div>
          </div>
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
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
    >
      {children}
    </button>
  );
}
