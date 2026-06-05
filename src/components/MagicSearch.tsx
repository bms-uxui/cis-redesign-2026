import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { IconScan, IconMicrophone, IconBrain } from "@tabler/icons-react";
import { useDictationContext } from "../contexts/DictationContext";

interface MagicSearchProps {
  placeholder?: string;
  className?: string;
  /** Custom submit handler. Defaults to navigating to /ai with prompt state. */
  onSubmit?: (prompt: string) => void;
}

/**
 * "Magic" AI prompt bar: scan icon · free-text input · mic toggle · send.
 * Self-contained — owns its own draft state and live-dictation mirroring.
 *
 * Style mirrors the floating prompt bar from the Figma Home design:
 * rounded-full pill with a soft blue halo shadow.
 */
export default function MagicSearch({
  placeholder = "สร้างหน้าแดชบอร์ดสรุปผลสุขภาพของคุณสมชาย",
  className,
  onSubmit,
}: MagicSearchProps) {
  const navigate = useNavigate();
  const { isRecording, startSession, stopSession, segments } =
    useDictationContext();
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Mirror live transcript into the prompt while dictating.
  useEffect(() => {
    if (!isRecording) return;
    const text = segments.map((s) => s.text).join(" ").trim();
    if (text) setPrompt(text);
  }, [segments, isRecording]);

  const handleMic = () => {
    if (isRecording) {
      void stopSession();
    } else {
      startSession("mic");
      inputRef.current?.focus();
    }
  };

  const handleSubmit = () => {
    const q = prompt.trim();
    if (!q) return;
    if (isRecording) void stopSession();
    if (onSubmit) {
      onSubmit(q);
    } else {
      navigate("/", { state: { prompt: q } });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className={[
        "flex w-[760px] max-w-[92vw] items-center gap-2 rounded-full border border-[#9db6fb] bg-white py-2 pl-4 pr-2 shadow-[0_4px_50px_rgba(157,182,251,0.4)]",
        className ?? "",
      ].join(" ")}
    >
      <IconScan className="h-6 w-6 shrink-0 text-[#1f1f1f]" stroke={1.6} />
      <input
        ref={inputRef}
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder}
        aria-label="ถามหมอเมย์"
        className="min-w-0 flex-1 bg-transparent px-2 text-[16px] text-[#1f1f1f] placeholder:text-[#1f1f1f]/40 outline-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={isRecording ? "หยุดบันทึกเสียง" : "พูด"}
          title={isRecording ? "หยุดบันทึกเสียง" : "พูด"}
          aria-pressed={isRecording}
          onClick={handleMic}
          className={[
            "flex h-14 w-14 items-center justify-center rounded-full transition",
            isRecording
              ? "bg-red-500 text-white shadow-[0_0_0_6px_rgba(239,68,68,0.18)] hover:bg-red-600"
              : "text-[#1f1f1f] hover:bg-neutral-100",
          ].join(" ")}
        >
          <IconMicrophone className="h-6 w-6" stroke={1.6} />
        </button>
        <button
          type="submit"
          aria-label="ส่งคำถามไปที่หมอเมย์"
          title="ส่งคำถามไปที่หมอเมย์"
          disabled={!prompt.trim()}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconBrain className="h-6 w-6" stroke={1.6} />
        </button>
      </div>
    </form>
  );
}
