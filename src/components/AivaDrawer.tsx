import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  IconMicrophone,
  IconArrowUp,
  IconMinus,
  IconMessagePlus,
  IconLayoutSidebarRight,
  IconAppWindow,
  IconPlus,
  IconAdjustmentsHorizontal,
  IconFileText,
  IconNotes,
  IconStethoscope,
  IconMenu2,
  IconArrowLeft,
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
  IconMessage,
} from "@tabler/icons-react";
import { useNavigate } from "react-router";
import { useDictationContext } from "../contexts/DictationContext";
import { useAiva } from "../contexts/AivaContext";
import { useUser } from "../contexts/UserContext";
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
  /** Live "what Mae is doing now" line shown while status === "thinking". */
  thinking?: string;
}

/** One chat thread. Created on the first message; titled from that prompt. */
interface Conversation {
  id: string;
  title: string;
  turns: ChatTurn[];
}

/** Generic "still working" lines that cycle on a timer while Mae thinks, so
 *  the user always sees motion even during long gaps between tool calls.
 *  Specific tool-step labels (from the assistant) take priority when fresh. */
const THINKING_POOL = [
  "กำลังประมวลผลข้อมูล…",
  "กำลังเชื่อมโยงประวัติผู้ป่วย…",
  "กำลังตรวจสอบเวชระเบียน…",
  "กำลังวิเคราะห์อาการ…",
  "กำลังเทียบผลแล็บและสัญญาณชีพ…",
  "กำลังรวบรวมผลลัพธ์…",
  "กำลังเรียบเรียงคำตอบ…",
  "ใกล้เสร็จแล้ว…",
];

export default function AivaDrawer({ open, onClose }: AivaDrawerProps) {
  const { isRecording, startSession, stopSession, segments } = useDictationContext();
  const { initialPrompt, viewMode, toggleViewMode } = useAiva();
  const { user } = useUser();
  const firstName = user.name.replace(/^(นพ\.|พญ\.|นพ |พญ |ดร\.|Dr\.?)\s*/i, "").trim();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const boundaryRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  // Timestamp of the last tool-specific thinking label, so the rotating pool
  // pauses briefly and lets meaningful step labels stay readable.
  const lastToolLabelAt = useRef(0);
  const poolIdx = useRef(0);
  const activeIdRef = useRef<string | null>(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const turns = active?.turns ?? [];

  /** Patch the turns of a specific conversation id (stable across async). */
  const patchConv = (convId: string, updater: (prev: ChatTurn[]) => ChatTurn[]) =>
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, turns: updater(c.turns) } : c)),
    );

  const isThinking = turns.some((t) => t.status === "thinking");
  // Cycle generic "thinking" wording while any turn is pending. Specific
  // tool labels (set <1.8s ago) win; otherwise advance through the pool.
  useEffect(() => {
    if (!isThinking) return;
    const iv = setInterval(() => {
      if (Date.now() - lastToolLabelAt.current < 1800) return;
      poolIdx.current = (poolIdx.current + 1) % THINKING_POOL.length;
      const word = THINKING_POOL[poolIdx.current];
      const id = activeIdRef.current;
      if (!id) return;
      patchConv(id, (ts) =>
        ts.map((t) => (t.status === "thinking" ? { ...t, thinking: word } : t)),
      );
    }, 2000);
    return () => clearInterval(iv);
  }, [isThinking]);

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
  }, [turns, historyOpen]);

  const handleMic = () => {
    if (isRecording) void stopSession();
    else startSession("mic");
  };

  const handleSubmit = (textOverride?: string) => {
    const text = (textOverride ?? prompt).trim();
    if (!text) return;

    // Ensure a conversation to append to — create one lazily on first message,
    // titled from the prompt (YouTube-Studio style).
    let convId = activeId;
    const isNew = !convId || !conversations.some((c) => c.id === convId);
    if (isNew) convId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const turnId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const turn: ChatTurn = { id: turnId, prompt: text, status: "thinking" };

    // History = the active conversation's completed turns BEFORE this one.
    const history: ChatMessage[] = (active?.turns ?? []).flatMap((t) =>
      t.reply
        ? [
            { role: "user", content: t.prompt },
            { role: "assistant", content: t.reply },
          ]
        : [],
    );

    setConversations((prev) => {
      const base = isNew
        ? [{ id: convId!, title: text.slice(0, 48), turns: [] }, ...prev]
        : prev;
      return base.map((c) => (c.id === convId ? { ...c, turns: [...c.turns, turn] } : c));
    });
    setActiveId(convId);
    setHistoryOpen(false);
    setPrompt("");

    const cid = convId!;
    const onThinking = (label: string) => {
      lastToolLabelAt.current = Date.now();
      patchConv(cid, (ts) =>
        ts.map((t) => (t.id === turnId && t.status === "thinking" ? { ...t, thinking: label } : t)),
      );
    };
    // Stream partial reply: flip to "ready" on first token so the answer
    // renders live instead of after a long blank wait.
    const onDelta = (partial: string) =>
      patchConv(cid, (ts) =>
        ts.map((t) =>
          t.id === turnId && t.status !== "error"
            ? { ...t, status: "ready", reply: partial }
            : t,
        ),
      );
    void answerChatPrompt(text, history, onThinking, onDelta).then(
      (reply) =>
        patchConv(cid, (ts) =>
          ts.map((t) => (t.id === turnId ? { ...t, status: "ready", reply } : t)),
        ),
      (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        patchConv(cid, (ts) =>
          ts.map((t) => (t.id === turnId ? { ...t, status: "error", error: msg } : t)),
        );
      },
    );
  };

  // New chat → blank greeting; the conversation row is created on first send.
  const handleNewChat = () => {
    setPrompt("");
    setActiveId(null);
    setHistoryOpen(false);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const openConversation = (id: string) => {
    setActiveId(id);
    setHistoryOpen(false);
  };

  // Start a window drag from the header — but not when the press lands on a
  // button/interactive control (so the action icons stay clickable). Only in
  // floating mode (the sidebar rail isn't draggable).
  const startHeaderDrag = (e: React.PointerEvent) => {
    if (viewMode !== "floating") return;
    if ((e.target as HTMLElement).closest("button,textarea,a,input")) return;
    dragControls.start(e);
  };
  const dragCursor = viewMode === "floating" ? "cursor-grab active:cursor-grabbing" : "";
  const dragStyle = viewMode === "floating" ? ({ touchAction: "none" } as const) : undefined;

  // ── History (conversation list) view ──────────────────────────────────────
  const historyView = (
    <>
      <header
        onPointerDown={startHeaderDrag}
        style={dragStyle}
        className={`flex items-center gap-2 px-4 py-3 ${dragCursor}`}
      >
        <IconButton label="กลับไปแชท" onClick={() => setHistoryOpen(false)}>
          <IconArrowLeft className="h-4 w-4" stroke={1.75} />
        </IconButton>
        <span className="text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
          ประวัติการสนทนา
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4">
        {conversations.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <h3 className="text-[length:var(--theme-text-md)] font-semibold text-[var(--theme-neutral)]">
              ยังไม่มีการสนทนา
            </h3>
            <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/60">
              ประวัติการแชทจะแสดงที่นี่
            </p>
            <button
              type="button"
              onClick={handleNewChat}
              className="mt-1 rounded-full bg-[var(--theme-primary)] px-5 py-2 text-[length:var(--theme-text-sm)] font-medium text-white transition hover:opacity-90"
            >
              เริ่มการสนทนา
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5 pt-1">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openConversation(c.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--theme-base)] ${
                    c.id === activeId ? "bg-[var(--theme-base)]" : ""
                  }`}
                >
                  <IconMessage className="h-4 w-4 shrink-0 text-[var(--theme-neutral)]/55" stroke={1.75} />
                  <span className="min-w-0 flex-1 truncate text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/85">
                    {c.title}
                  </span>
                  <span className="shrink-0 text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/40">
                    {c.turns.length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  // ── Chat view (greeting + turns + composer) ───────────────────────────────
  const chatView = (
    <>
      <header
        onPointerDown={startHeaderDrag}
        style={dragStyle}
        className={`flex items-center justify-between px-3 py-3 ${dragCursor}`}
      >
        <div className="flex items-center gap-1">
          <IconButton label="ประวัติการสนทนา" onClick={() => setHistoryOpen(true)}>
            <IconMenu2 className="h-4 w-4" stroke={1.75} />
          </IconButton>
          <span className="px-1 text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
            เมย์ AI
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton label="แชทใหม่" onClick={handleNewChat}>
            <IconMessagePlus className="h-4 w-4" stroke={1.75} />
          </IconButton>
          {viewMode === "floating" && (
            <IconButton
              label={expanded ? "ย่อขนาด" : "ขยายเต็ม"}
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? (
                <IconArrowsDiagonalMinimize2 className="h-4 w-4" stroke={1.75} />
              ) : (
                <IconArrowsDiagonal className="h-4 w-4" stroke={1.75} />
              )}
            </IconButton>
          )}
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

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-3 pt-2"
      >
        {turns.length === 0 ? (
          <div className="flex min-h-full flex-col">
            {/* Greeting — name in white, the question in a purple→pink wash */}
            <div className="flex flex-col pt-1">
              <h2 className="text-[28px] font-bold leading-tight text-[var(--theme-neutral)]">
                สวัสดี, {firstName}
              </h2>
              <h2 className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-accent)] bg-clip-text text-[28px] font-bold leading-tight text-transparent">
                ให้เมย์ช่วยอะไรดีคะ?
              </h2>
            </div>
            {/* Push the suggestion chips to the bottom-right, above the composer */}
            <div className="flex-1" />
            <ul className="flex flex-col items-end gap-2.5 pb-1">
              {SUGGESTIONS.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={() => handleSubmit(s.prompt)}
                    className="rounded-full border border-[var(--theme-neutral)]/20 px-4 py-2 text-right text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/90 transition hover:bg-[var(--theme-base)]"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          turns.map((t) => (
            <div key={t.id} className="flex flex-col gap-2">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--theme-primary)] px-4 py-2 text-[length:var(--theme-text-sm)] text-white">
                {t.prompt}
              </div>
              <div className="mr-auto max-w-[90%] rounded-2xl rounded-tl-md border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)] px-4 py-2 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] whitespace-pre-wrap">
                {t.status === "thinking" && <TypingDots label={t.thinking} />}
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
        <p className="px-5 pb-2.5 text-center text-[11px] leading-snug text-[var(--theme-neutral)]/40">
          AI อาจมีข้อผิดพลาด — ตรวจสอบข้อมูลทางคลินิกที่สำคัญเสมอ
        </p>
      </div>
    </>
  );

  const body = historyOpen ? historyView : chatView;

  return (
    <AnimatePresence initial={false}>
      {open && viewMode === "floating" && (
        // Full-viewport drag boundary (no pointer events of its own) so the
        // panel can be dragged anywhere but never off-screen.
        <div
          key="aiva-floating-boundary"
          ref={boundaryRef}
          className="pointer-events-none fixed inset-3 z-[70]"
        >
          <motion.div
            key="aiva-floating"
            drag
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={boundaryRef}
            dragMomentum={false}
            dragElastic={0.04}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.28, ease: EASE_TV }}
            style={{
              width: expanded ? "min(820px, calc(100vw - 32px))" : 400,
              height: expanded ? "calc(100vh - 40px)" : 560,
              maxWidth: "calc(100vw - 24px)",
              maxHeight: "calc(100vh - 24px)",
            }}
            className="pointer-events-auto absolute bottom-0 right-0 flex origin-bottom-right flex-col overflow-hidden rounded-3xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)] transition-[width,height] duration-300 ease-out"
          >
            {body}
          </motion.div>
        </div>
      )}
      {open && viewMode === "sidebar" && (
        <motion.aside
          key="aiva-sidebar"
          initial={{ width: 0 }}
          animate={{ width: 400 }}
          exit={{ width: 0 }}
          transition={{ duration: 0.4, ease: EASE_TV }}
          className="relative z-[5] shrink-0 overflow-hidden"
          style={{ paddingTop: 80, height: "100vh" }}
        >
          <div className="flex h-full w-[400px] flex-col overflow-hidden rounded-l-3xl border-b border-l border-t border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] shadow-[-8px_0_24px_-8px_rgba(0,0,0,0.08)]">
            {body}
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

function TypingDots({ label }: { label?: string }) {
  return (
    <span
      aria-label={label ?? "กำลังคิด"}
      className="inline-flex items-center gap-2 align-middle text-[var(--theme-neutral)]/55"
    >
      <span className="inline-flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full bg-current"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </span>
      <AnimatePresence mode="wait">
        {label && (
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
            className="text-[length:var(--theme-text-xs)] italic"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
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
      // Stop the drag-handle underneath from hijacking the click.
      onPointerDown={(e) => e.stopPropagation()}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-base)] hover:text-[var(--theme-neutral)]"
    >
      {children}
    </button>
  );
}
