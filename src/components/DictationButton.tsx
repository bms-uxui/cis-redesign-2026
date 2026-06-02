import { Button } from "@heroui/react";
import {
  IconMicrophone,
  IconLoader2,
  IconPlayerStopFilled,
  IconDeviceDesktop,
} from "@tabler/icons-react";
import { useDictationContext } from "../contexts/DictationContext";

interface DictationButtonProps {
  onResult?: (text: string) => void;
  language?: string;
  prompt?: string;
}

// Bilingual Thai/English clinical anchor prepended to whatever prompt the
// caller provides. Qwen3-ASR treats the prompt as biasing context, so listing
// representative vocabulary in both scripts keeps decoding tilted toward the
// right language for each segment.
const TH_EN_PROMPT_ANCHOR =
  "Bilingual Thai/English medical conversation. " +
  "ผู้ป่วย (patient) แพทย์ (doctor) อาการ (symptom) ประวัติ (history) ตรวจร่างกาย (PE) " +
  "การวินิจฉัย (diagnosis) แผนการรักษา (plan) ยา (medication). " +
  "Keep English clinical terms, drug names, abbreviations, and lab names in English script: " +
  "hypertension, diabetes mellitus, dyslipidemia, asthma, CBC, UA, BUN, Cr, eGFR, HbA1c, " +
  "ECG, MRI, CT, paracetamol, ibuprofen, amlodipine, metformin, insulin, aspirin. " +
  "Do not transliterate English to Thai characters.";

export default function DictationButton({ onResult, language, prompt }: DictationButtonProps) {
  const { status, isRecording, source, startSession, stopSession } = useDictationContext();
  const composedPrompt = [TH_EN_PROMPT_ANCHOR, prompt].filter(Boolean).join(" ");

  const handle = (src: "mic" | "tab") => {
    if (isRecording) {
      void stopSession();
      return;
    }
    startSession(src, {
      onResult,
      prompt: composedPrompt,
      language,
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        isIconOnly
        radius="full"
        onPress={() => handle("mic")}
        isDisabled={status === "requesting" || (isRecording && source !== "mic")}
        aria-label="dictation-mic"
        className={
          isRecording && source === "mic"
            ? "bg-[#ff383c] text-white shadow-[0_0_0_4px_rgba(255,56,60,0.2)]"
            : "bg-sky-50 text-[#3485ff]"
        }
      >
        {isRecording && source === "mic" ? (
          <IconPlayerStopFilled className="h-5 w-5" />
        ) : status === "requesting" && source === "mic" ? (
          <IconLoader2 className="h-5 w-5 animate-spin" />
        ) : (
          <IconMicrophone className="h-5 w-5" />
        )}
      </Button>
      <Button
        isIconOnly
        radius="full"
        onPress={() => handle("tab")}
        isDisabled={status === "requesting" || (isRecording && source !== "tab")}
        aria-label="dictation-tab"
        className={
          isRecording && source === "tab"
            ? "bg-[#ff383c] text-white shadow-[0_0_0_4px_rgba(255,56,60,0.2)]"
            : "bg-violet-50 text-[#6a4cff]"
        }
        title="ฟังเสียงจากแท็บ (เลือกแท็บแล้วเปิด Share tab audio)"
      >
        {isRecording && source === "tab" ? (
          <IconPlayerStopFilled className="h-5 w-5" />
        ) : status === "requesting" && source === "tab" ? (
          <IconLoader2 className="h-5 w-5 animate-spin" />
        ) : (
          <IconDeviceDesktop className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
