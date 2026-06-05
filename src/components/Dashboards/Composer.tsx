import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconSparkles,
  IconX,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";
import { generateDashboard } from "./generator";
import { saveDashboard } from "./store";
import type { Dashboard } from "./types";
import DashboardGrid from "./Grid";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

const SUGGESTIONS = [
  "ขอภาพรวม OPD วันนี้ พร้อมเวลารอเฉลี่ย และผู้ป่วย no-show",
  "ผู้ป่วยโรคเรื้อรัง — แยกตามกลุ่มโรค และดูแนวโน้มย้อนหลัง",
  "สรุปการส่งตรวจแลปและผลที่ผิดปกติ",
  "คิวผู้ป่วยต่อชั่วโมงของแต่ละคลินิก",
];

interface ComposerProps {
  open: boolean;
  onClose: () => void;
  onCreated: (d: Dashboard) => void;
}

export default function Composer({ open, onClose, onCreated }: ComposerProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<Dashboard | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setPrompt("");
      setPreview(null);
      setGenerating(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    try {
      const d = await generateDashboard(prompt);
      setPreview(d);
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = () => {
    if (!preview) return;
    saveDashboard(preview);
    onCreated(preview);
  };

  const handleRetry = () => {
    setPreview(null);
    handleGenerate();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="composer-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE_TV }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            key="composer-modal"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_TV }}
            role="dialog"
            aria-label="สร้าง Dashboard ด้วย AI"
            className="fixed left-1/2 top-[8vh] z-[91] flex max-h-[84vh] w-[min(1000px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-[var(--theme-radius-box)] bg-[var(--theme-surface)] shadow-[var(--theme-shadow-lg)] ring-1 ring-[var(--theme-neutral)]/10"
          >
            {/* Header */}
            <header className="flex items-start justify-between gap-3 border-b border-[var(--theme-neutral)]/10 px-6 py-5">
              <div className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 text-[length:var(--theme-text-lg)] font-semibold text-[var(--theme-neutral)]">
                  <IconSparkles
                    className="h-5 w-5 text-[var(--theme-primary)]"
                    stroke={1.75}
                  />
                  สร้าง Dashboard ด้วย AI
                </h2>
                <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                  บอกระบบว่าอยากเห็นอะไรเป็นภาษาธรรมชาติ — AI จะเลือก widget และ data source ที่เหมาะสม
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิด"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--theme-radius-selector)] text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
              >
                <IconX className="h-4 w-4" stroke={1.75} />
              </button>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {!preview ? (
                <>
                  <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                    placeholder="เช่น ขอภาพรวมคิว OPD วันนี้ พร้อมเวลารอเฉลี่ย และผู้ป่วยที่ no-show..."
                    rows={4}
                    className="w-full resize-none rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)] p-4 text-[length:var(--theme-text-md)] text-[var(--theme-neutral)] outline-none transition focus:border-[var(--theme-primary)] focus:bg-[var(--theme-surface)]"
                  />
                  <p className="mt-2 px-1 text-[10px] text-[var(--theme-neutral)]/45">
                    กด <kbd className="rounded border border-[var(--theme-neutral)]/20 px-1 font-mono">⌘</kbd>
                    {" + "}
                    <kbd className="rounded border border-[var(--theme-neutral)]/20 px-1 font-mono">↵</kbd>
                    {" "}เพื่อสร้าง
                  </p>

                  <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/45">
                    ตัวอย่าง
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPrompt(s)}
                        className="rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 px-3 py-2 text-left text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/80 transition hover:border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary-soft)]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[length:var(--theme-text-md)] font-semibold text-[var(--theme-neutral)]">
                        {preview.name}
                      </p>
                      <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                        {preview.widgets.length} widgets · จาก prompt: "{prompt}"
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 px-3 text-[length:var(--theme-text-xs)] font-medium text-[var(--theme-neutral)]/70 transition hover:bg-[var(--theme-primary-soft)]"
                    >
                      <IconRefresh className="h-3.5 w-3.5" stroke={1.75} />
                      ลองใหม่
                    </button>
                  </div>
                  {/* Live preview — uses the actual renderer with mock data. */}
                  <div className="rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 p-3">
                    <DashboardGrid widgets={preview.widgets} compact />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end gap-2 border-t border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/50 px-6 py-3">
              <button
                type="button"
                onClick={onClose}
                className="h-10 cursor-pointer rounded-[var(--theme-radius-field)] px-4 text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]/70 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
              >
                ยกเลิก
              </button>
              {!preview ? (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-[var(--theme-radius-field)] bg-[var(--theme-primary)] px-4 text-[length:var(--theme-text-sm)] font-semibold text-white shadow-[var(--theme-shadow-sm)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />
                      กำลังสร้าง...
                    </>
                  ) : (
                    <>
                      <IconSparkles className="h-4 w-4" stroke={2} />
                      สร้าง
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAccept}
                  className="h-10 cursor-pointer rounded-[var(--theme-radius-field)] bg-[var(--theme-primary)] px-4 text-[length:var(--theme-text-sm)] font-semibold text-white shadow-[var(--theme-shadow-sm)] transition hover:brightness-110"
                >
                  บันทึก Dashboard
                </button>
              )}
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
