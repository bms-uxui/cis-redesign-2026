import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconMicrophone,
  IconArrowUp,
  IconX,
  IconSparkles,
  IconArrowsMaximize,
} from "@tabler/icons-react";
import { useNavigate } from "react-router";
import { useDictationContext } from "../contexts/DictationContext";
import AI_DOCTOR from "../assets/figma/ai-mode-doctor.png";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

const QUICK_PROMPTS = [
  "สรุปผู้ป่วยรายนี้",
  "ค้นแนวทาง Sepsis",
  "ช่วยเขียน SOAP",
  "ICD-10 จากอาการ",
];

interface AivaDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function AivaDrawer({ open, onClose }: AivaDrawerProps) {
  const navigate = useNavigate();
  const { isRecording, startSession, stopSession, segments } = useDictationContext();
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Esc to close — standard drawer affordance
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 280);
  }, [open]);

  // Stream live transcript into the prompt while recording
  useEffect(() => {
    if (!isRecording) return;
    const text = segments.map((s) => s.text).join(" ").trim();
    if (text) setPrompt(text);
  }, [segments, isRecording]);

  const handleMic = () => {
    if (isRecording) void stopSession();
    else startSession("mic");
  };

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    console.log("[aiva-drawer] submit", prompt);
  };

  const handleExpand = () => {
    onClose();
    navigate("/ai");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim — click to dismiss. Light so the underlying page still
              feels present (Aiva is *ambient*, not modal). */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-neutral-900/15 backdrop-blur-[2px]"
          />

          {/* Drawer panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: EASE_TV }}
            className="fixed bottom-4 right-4 top-4 z-[61] flex w-[420px] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_30px_70px_rgba(60,30,170,0.18),0_4px_12px_rgba(0,0,0,0.06)]"
            style={{
              isolation: "isolate",
              transform: "translateZ(0)",
              willChange: "transform",
            }}
          >
            {/* Soft inner gradient — keep visual continuity with /ai */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(60% 40% at 100% 0%, rgba(225,210,255,0.45) 0%, rgba(255,255,255,0) 60%)," +
                  "radial-gradient(50% 40% at 0% 100%, rgba(255,225,200,0.4) 0%, rgba(255,255,255,0) 60%)",
              }}
            />

            {/* Header */}
            <header className="flex items-start justify-between px-6 pt-6">
              <div className="flex items-center gap-3">
                <img
                  src={AI_DOCTOR}
                  alt="เมย์"
                  decoding="async"
                  className="h-14 w-auto object-contain drop-shadow-[0_4px_10px_rgba(120,90,220,0.25)]"
                />
                <div>
                  <p className="text-xs font-normal text-neutral-500">
                    ถามเมย์อะไรก็ได้
                  </p>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    สวัสดีค่ะ คุณหมอ
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleExpand}
                  aria-label="เปิดเต็มจอ"
                  title="เปิดเต็มจอ"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <IconArrowsMaximize className="h-4 w-4" stroke={1.75} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="ปิด"
                  title="ปิด (Esc)"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <IconX className="h-4 w-4" stroke={1.75} />
                </button>
              </div>
            </header>

            {/* Conversation/empty state — currently a hint area, will host
                message history once the LLM is wired. */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
                  <IconSparkles className="h-3.5 w-3.5" stroke={2} />
                  เริ่มต้นด่วน
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPrompt(p);
                        inputRef.current?.focus();
                      }}
                      className="rounded-full border border-white bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-[0_2px_6px_rgba(0,0,0,0.03)] transition hover:border-violet-200 hover:text-violet-700"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <p className="px-1 text-xs text-neutral-400">
                เมย์รู้บริบทของหน้าที่คุณกำลังเปิดอยู่ — ถามเกี่ยวกับผู้ป่วยรายนี้ได้เลย
              </p>
            </div>

            {/* Prompt bar — same affordances as /ai mode */}
            <div className="px-6 pb-6">
              <div
                className={`flex items-end gap-2 rounded-2xl border bg-white px-4 py-3 transition ${
                  isRecording ? "border-violet-400 ring-2 ring-violet-100" : "border-neutral-200"
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
                  placeholder="ถามอะไรก็ได้…"
                  rows={1}
                  className="min-h-[28px] max-h-[140px] flex-1 resize-none bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleMic}
                  aria-label={isRecording ? "หยุดบันทึก" : "เริ่มบันทึกเสียง"}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                    isRecording
                      ? "bg-rose-500 text-white shadow-[0_4px_12px_rgba(244,63,94,0.4)]"
                      : "text-neutral-500 hover:bg-neutral-100"
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <IconArrowUp className="h-4 w-4" stroke={2} />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-neutral-400">
                Cmd K เพื่อเรียกเมย์จากทุกหน้า · Esc เพื่อปิด
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
