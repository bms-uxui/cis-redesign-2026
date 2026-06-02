import { Button } from "@heroui/react";
import {
  IconUpload,
  IconFileText,
  IconLoader2,
  IconX,
  IconSparkles,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import { ocr } from "../services/ai/ocr";
import { chat } from "../services/ai/llm";
import { A2UI_CATALOG_SYSTEM, A2UI_PATIENT_EXTRACT_TASK } from "../services/a2ui/catalog";
import {
  validateA2UIResponse,
  type A2UIActionEvent,
  type A2UIResponse,
} from "../services/a2ui/types";
import A2UIRenderer from "./a2ui/A2UIRenderer";
import { useToast } from "../contexts/ToastContext";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Phase = "idle" | "ocr" | "extract" | "review" | "error";

interface DocumentDropZoneProps {
  onApply: (fields: Record<string, string>) => void;
}

export default function DocumentDropZone({ onApply }: DocumentDropZoneProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState("");
  const [extracted, setExtracted] = useState<A2UIResponse | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [showSource, setShowSource] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const reset = useCallback(() => {
    setPhase("idle");
    setFileName("");
    setExtracted(null);
    setSourceText("");
    setShowSource(false);
    setErrorMsg("");
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setExtracted(null);
      setSourceText("");
      setErrorMsg("");
      setPhase("ocr");
      try {
        const ocrResult = await ocr(file);
        const text = ocrResult.text?.trim();
        if (!text) {
          throw new Error("OCR ไม่พบข้อความในไฟล์");
        }
        setSourceText(text);
        setPhase("extract");
        const llmResult = await chat(
          [
            { role: "system", content: `${A2UI_CATALOG_SYSTEM}\n\n${A2UI_PATIENT_EXTRACT_TASK}` },
            { role: "user", content: text },
          ],
          { temperature: 0.1, maxTokens: 2500, responseFormat: "json_object" },
        );
        const parsed = JSON.parse(llmResult.text);
        const validated = validateA2UIResponse(parsed);
        if (!validated) throw new Error("AI ไม่สามารถสกัดข้อมูลได้ถูกต้อง");
        setExtracted(validated);
        setPhase("review");
      } catch (e) {
        const err = e as Error;
        setErrorMsg(err.message);
        setPhase("error");
        toast.error("อ่านเอกสารไม่สำเร็จ", err.message);
      }
    },
    [toast],
  );

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleAction = useCallback(
    (event: A2UIActionEvent) => {
      if (event.action === "apply_all") {
        const mapped: Record<string, string> = {};
        for (const [key, value] of Object.entries(event.data)) {
          if (!value || !value.trim()) continue;
          if (key.startsWith("patient.")) {
            mapped[key.slice("patient.".length)] = value;
          }
        }
        if (Object.keys(mapped).length === 0) {
          toast.info("ไม่มีข้อมูลให้ใช้", "ไม่พบข้อมูลที่กรอกค่าไว้");
          return;
        }
        onApply(mapped);
        toast.success("ใช้ข้อมูลแล้ว", `อัปเดต ${Object.keys(mapped).length} ฟิลด์`);
        reset();
        return;
      }
      if (event.action === "discard") {
        reset();
      }
    },
    [onApply, reset, toast],
  );

  // Goal-Gradient: count how many of the proposed fields actually carry data.
  const populatedCount = useMemo(() => {
    if (!extracted) return { filled: 0, total: 0 };
    const fieldBindings = extracted.components
      .filter((c) => c.type === "field")
      .map((c) => (c as { binding: string }).binding);
    const total = fieldBindings.length;
    const data = extracted.data ?? {};
    let filled = 0;
    for (const b of fieldBindings) {
      const v = (data[b] ?? "").trim();
      if (v && v !== "—") filled++;
    }
    return { filled, total };
  }, [extracted]);

  const modalOpen = phase !== "idle";
  const isWorking = phase === "ocr" || phase === "extract";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handlePick}
      />
      <Button
        isIconOnly
        radius="full"
        onPress={() => inputRef.current?.click()}
        aria-label="upload-document"
        className="bg-emerald-50 text-emerald-600"
        title="อัปโหลดเอกสาร (PDF / รูปบัตร / ใบส่งตัว) → AI สกัดข้อมูล"
      >
        <IconUpload className="h-5 w-5" />
      </Button>

      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.4, ease: EASE_TV }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="flex h-[min(82vh,760px)] w-full max-w-[880px] flex-col overflow-hidden rounded-[32px] bg-white text-gray-900 shadow-[0_40px_120px_rgba(15,23,42,0.18),0_8px_32px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,1)]">
                {/* header */}
                <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] bg-gradient-to-b from-white to-gray-50/60 px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.18),inset_0_1px_0_rgba(255,255,255,0.8)]">
                      <IconFileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[16px] font-semibold text-gray-900">
                        Document Extract
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                        {phase === "ocr"
                          ? "กำลังอ่านเอกสาร (OCR)"
                          : phase === "extract"
                            ? "AI กำลังสกัดข้อมูล"
                            : phase === "error"
                              ? "เกิดข้อผิดพลาด"
                              : fileName || "เอกสาร"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {phase === "review" && populatedCount.total > 0 && (
                      <div className="flex items-center gap-1.5 rounded-full bg-[#3485ff]/10 px-3 py-1.5 text-[12px] font-semibold text-[#1e6fe6]">
                        <IconSparkles className="h-3.5 w-3.5" />
                        ดึงได้ {populatedCount.filled}/{populatedCount.total} ฟิลด์
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        reset();
                      }}
                      aria-label="close"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* body */}
                <div className="flex-1 overflow-y-auto bg-gray-50/40 px-8 py-6">
                  {isWorking && <WorkingState phase={phase} fileName={fileName} />}
                  {phase === "error" && (
                    <div className="rounded-[32px] border border-[#ff383c]/20 bg-[#ff383c]/[0.04] p-5 text-[14px] text-[#c8262a]">
                      {errorMsg}
                    </div>
                  )}
                  {phase === "review" && extracted && (
                    <div className="space-y-4">
                      <A2UIRenderer response={extracted} onAction={handleAction} theme="light" />

                      {/* Working Memory: keep raw source reachable without leaving the modal */}
                      {sourceText && (
                        <SourceDisclosure
                          text={sourceText}
                          open={showSource}
                          onToggle={() => setShowSource((s) => !s)}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function WorkingState({ phase, fileName }: { phase: Phase; fileName: string }) {
  return (
    <div className="space-y-5">
      <div className="rounded-[32px] border border-black/[0.05] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#3485ff]">
          {phase === "ocr" ? (
            <>
              <IconLoader2 className="h-4 w-4 animate-spin" /> กำลังอ่าน {fileName}
            </>
          ) : (
            <>
              <IconSparkles className="h-4 w-4" /> AI กำลังสกัดข้อมูล…
            </>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {["95%", "82%", "88%", "70%"].map((w, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{
                width: w,
                height: 14,
                background:
                  "linear-gradient(90deg, rgba(52,133,255,0.08) 0%, rgba(52,133,255,0.32) 45%, rgba(52,133,255,0.08) 100%)",
                backgroundSize: "200% 100%",
              }}
              animate={{ backgroundPositionX: ["120%", "-120%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.18 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SourceDisclosure({
  text,
  open,
  onToggle,
}: {
  text: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-[32px] border border-black/[0.05] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          <IconFileText className="h-4 w-4" />
          ข้อความต้นฉบับจากเอกสาร (OCR)
        </div>
        {open ? (
          <IconChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <IconChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_TV }}
            className="overflow-hidden"
          >
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap px-5 pb-5 text-[12px] leading-relaxed text-gray-700">
              {text}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
