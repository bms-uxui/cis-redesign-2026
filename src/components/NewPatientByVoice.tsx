import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconMicrophone,
  IconArrowUp,
  IconKeyboard,
  IconSparkles,
  IconLoader2,
  IconRefresh,
  IconDeviceDesktop,
  IconUser,
  IconId,
  IconPhone,
  IconCalendar,
  IconDroplet,
  IconAlertTriangle,
  IconStethoscope,
  IconBriefcase,
  IconNote,
  IconHome,
  IconPlus,
  IconChevronRight,
  IconAdjustmentsHorizontal,
  IconSortDescending,
  IconThumbUp,
  IconThumbDown,
  IconTrash,
} from "@tabler/icons-react";
import { Button } from "@heroui/react";
import type { SaveCommitField } from "./SaveCommitOverlay";
import { useDictationContext } from "../contexts/DictationContext";
import { chat } from "../services/ai/llm";
import {
  A2UI_CATALOG_SYSTEM,
  A2UI_PATIENT_DESCRIBE_TASK,
} from "../services/a2ui/catalog";
import {
  validateA2UIResponse,
  type A2UIActionEvent,
  type A2UIResponse,
} from "../services/a2ui/types";
import A2UIRenderer from "./a2ui/A2UIRenderer";
import { useToast } from "../contexts/ToastContext";
import { addPatient, nextHN, saveProfile } from "../data/patientStore";
import { upsertPatient } from "../services/supabase/patients";
import { stashFreshSave } from "../data/freshSaveHandoff";
import type { Patient, BloodGroup, Gender, Rh } from "../types";
import AI_DOCTOR from "../assets/figma/ai-mode-doctor.png";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Phase = "input" | "extracting" | "review";

const EXAMPLE =
  "เช่น: ผู้ป่วยชายอายุ 45 ปี ชื่อสมชาย ใจดี เลขบัตร 1234567890123 โทร 0812345678 แพ้ penicillin มีโรคความดันโลหิตสูง...";

export default function NewPatientByVoice() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isRecording, startSession, stopSession, segments, source } = useDictationContext();

  const [phase, setPhase] = useState<Phase>("input");
  const [prompt, setPrompt] = useState("");
  const [extracted, setExtracted] = useState<A2UIResponse | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Stream voice transcript into the prompt as the user speaks
  useEffect(() => {
    if (!isRecording) return;
    const text = segments.map((s) => s.text).join(" ").trim();
    if (text) setPrompt(text);
  }, [segments, isRecording]);

  // Focus on mount so the user can start typing immediately
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleMic = useCallback(() => {
    if (isRecording) void stopSession();
    else startSession("mic");
  }, [isRecording, startSession, stopSession]);

  const handleTabAudio = useCallback(() => {
    if (isRecording) void stopSession();
    else startSession("tab");
  }, [isRecording, startSession, stopSession]);

  const runExtract = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        toast.info("ยังไม่มีข้อมูล", "พูดหรือพิมพ์ข้อมูลผู้ป่วยก่อนนะคะ");
        return;
      }
      setPhase("extracting");
      try {
        const llmResult = await chat(
          [
            {
              role: "system",
              content: `${A2UI_CATALOG_SYSTEM}\n\n${A2UI_PATIENT_DESCRIBE_TASK}`,
            },
            { role: "user", content: text },
          ],
          { temperature: 0.1, maxTokens: 2500, responseFormat: "json_object" },
        );
        const parsed = JSON.parse(llmResult.text);
        const validated = validateA2UIResponse(parsed);
        if (!validated) throw new Error("AI ไม่สามารถสกัดข้อมูลได้");
        console.log("[new-patient] A2UI structure:", JSON.stringify(validated, null, 2));
        setExtracted(validated);
        setPhase("review");
      } catch (e) {
        const err = e as Error;
        toast.error("สกัดข้อมูลไม่สำเร็จ", err.message);
        setPhase("input");
      }
    },
    [toast],
  );

  const handleSubmitInput = () => {
    if (isRecording) void stopSession();
    void runExtract(prompt);
  };

  const handleReExtract = () => {
    setExtracted(null);
    void runExtract(prompt);
  };

  const handleEditDescription = () => {
    setExtracted(null);
    setPhase("input");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleA2UIAction = useCallback(
    (event: A2UIActionEvent) => {
      console.log("[new-patient] A2UI action fired:", event.action, event.data);
      // Accept any "save-ish" action label the LLM emits — it sometimes
      // varies (save_patient / apply_all / save / confirm / submit).
      const SAVE_ACTIONS = ["save_patient", "apply_all", "save", "confirm", "submit", "apply"];
      if (SAVE_ACTIONS.includes(event.action)) {
        const f = (key: string) => (event.data[`patient.${key}`] ?? "").trim();

        const firstName = f("firstName");
        const lastName = f("lastName");
        if (!firstName && !lastName) {
          toast.info("ข้อมูลไม่ครบ", "กรุณากรอกชื่อหรือนามสกุลก่อนบันทึก");
          return;
        }

        const cid = f("cid").replace(/\D/g, "");
        const phone = f("mobilePhone").replace(/\D/g, "");
        const genderRaw = f("gender");
        const gender: Gender =
          genderRaw.includes("ชาย") && !genderRaw.includes("หญิง")
            ? "male"
            : genderRaw.includes("หญิง")
              ? "female"
              : "other";
        const blood = f("blood").toUpperCase();
        const bloodGroup: BloodGroup | undefined = ["A", "B", "AB", "O"].includes(blood)
          ? (blood as BloodGroup)
          : undefined;
        const rhRaw = f("rh");
        const rh: Rh | undefined = rhRaw.includes("+")
          ? "+"
          : rhRaw.includes("-")
            ? "-"
            : undefined;

        const hn = nextHN();
        const patient: Patient = {
          hn,
          cid,
          prefix: f("prefix"),
          firstName,
          lastName,
          gender,
          birthdate: f("birthdate"),
          bloodGroup,
          rh,
          phone,
          religion: f("religion") || undefined,
          occupation: f("occupation") || undefined,
          nationality: f("nationality") || "ไทย",
          marital: f("marital") || undefined,
          status: "active",
          totalVisits: 0,
        };
        const profileForm: Record<string, string> = {
          allergies: f("allergies"),
          chronicConditions: f("chronicConditions"),
          note: f("note"),
        };

        // Build the field list shown in the save overlay — only include
        // fields that actually have a value, so the user sees exactly
        // what's being committed.
        const fields: SaveCommitField[] = [
          { key: "name", label: "ชื่อ-นามสกุล", value: `${patient.prefix} ${firstName} ${lastName}`.trim(), Icon: IconUser },
          patient.cid && { key: "cid", label: "เลขบัตรประชาชน", value: patient.cid, Icon: IconId },
          patient.birthdate && { key: "birth", label: "วันเกิด", value: patient.birthdate, Icon: IconCalendar },
          patient.phone && { key: "phone", label: "เบอร์โทร", value: patient.phone, Icon: IconPhone },
          patient.occupation && { key: "occ", label: "อาชีพ", value: patient.occupation, Icon: IconBriefcase },
          patient.bloodGroup && { key: "blood", label: "หมู่เลือด", value: `${patient.bloodGroup}${patient.rh ?? ""}`, Icon: IconDroplet },
          profileForm.allergies && { key: "allergy", label: "แพ้ยา/อาหาร", value: profileForm.allergies, Icon: IconAlertTriangle },
          profileForm.chronicConditions && { key: "chronic", label: "โรคประจำตัว", value: profileForm.chronicConditions, Icon: IconStethoscope },
          profileForm.note && { key: "note", label: "หมายเหตุ", value: profileForm.note, Icon: IconNote },
        ].filter(Boolean) as SaveCommitField[];

        // Persist locally first (offline-safe), then fire-and-forget the
        // Supabase upsert so the DB stays in sync. Local always wins for
        // the immediate navigation; if the DB write fails we surface a
        // soft warning but don't block the user.
        addPatient(patient);
        saveProfile(patient.hn, profileForm, {});
        toast.success(
          "บันทึกผู้ป่วยแล้ว",
          `HN ${patient.hn} • ${firstName} ${lastName}`,
        );
        void upsertPatient(patient, profileForm).catch((e: unknown) => {
          // PostgREST errors come back as plain objects with message/details/
          // hint/code fields. console.log of the object alone collapses to
          // "Object" in some browsers — log a flat JSON dump so we always
          // see the real reason in DevTools, and surface it in the toast.
          const err = e as {
            message?: string;
            details?: string;
            hint?: string;
            code?: string;
          };
          const summary =
            [err?.code, err?.message, err?.details, err?.hint]
              .filter(Boolean)
              .join(" • ") || JSON.stringify(e);
          console.error("[new-patient] supabase upsert failed:", summary, e);
          toast.error("ซิงค์ฐานข้อมูลล้มเหลว", summary);
        });
        // Stash the field list in a module-scoped store keyed by HN.
        // history.pushState can't clone React components (Icon refs), so
        // we pull the data from the store on the destination page instead.
        stashFreshSave(patient.hn, { fields });
        navigate(`/patient/${patient.hn}`);
        return;
      }
      if (event.action === "discard") {
        handleEditDescription();
      }
    },
    [navigate, toast],
  );

  // Goal-Gradient — count populated vs total fields so the user sees progress
  const populatedCount = useMemo(() => {
    if (!extracted) return { filled: 0, total: 0 };
    const bindings = extracted.components
      .filter((c) => c.type === "field")
      .map((c) => (c as { binding: string }).binding);
    const data = extracted.data ?? {};
    let filled = 0;
    for (const b of bindings) {
      const v = (data[b] ?? "").trim();
      if (v && v !== "—") filled++;
    }
    return { filled, total: bindings.length };
  }, [extracted]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8f9fc] pt-[60px]">
      {/* ── Left sidebar — recent intake cases ─────────────────────────── */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 p-4">
          <Button
            variant="bordered"
            startContent={<IconPlus className="h-4 w-4" stroke={2} />}
            className="w-full border-violet-200 bg-violet-50/40 font-medium text-violet-700"
            onPress={() => navigate("/ai")}
          >
            เริ่มเคสใหม่
          </Button>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[13px] font-medium text-neutral-600">
            ผู้ป่วยใหม่ล่าสุด
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="กรอง"
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
            >
              <IconAdjustmentsHorizontal className="h-4 w-4" stroke={1.75} />
            </button>
            <button
              type="button"
              aria-label="เรียงลำดับ"
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
            >
              <IconSortDescending className="h-4 w-4" stroke={1.75} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="mt-2 mb-1 flex items-center gap-1.5 px-2 text-[12px] text-neutral-500">
            <IconCalendar className="h-3.5 w-3.5" stroke={1.75} />
            29/05/2569
          </div>
          <div className="rounded-lg bg-violet-50/60 px-3 py-2.5 ring-1 ring-violet-200">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                NEW
              </span>
              <span className="text-[11px] text-neutral-500">กำลังบันทึก</span>
            </div>
            <div className="mt-1.5 text-[13px] font-medium text-neutral-800">
              ผู้ป่วยใหม่ (ยังไม่บันทึก)
            </div>
          </div>
        </div>
        <div className="border-t border-neutral-100 px-4 py-3 text-[11px] text-neutral-400">
          ระบบเก็บบันทึกชั่วคราวไว้ 24 ชั่วโมงเท่านั้น
        </div>
      </aside>

      {/* ── Main panel ─────────────────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top toolbar */}
        <header className="flex items-center justify-between gap-4 border-b border-neutral-100 bg-white px-6 py-3">
          <nav className="flex items-center gap-2 text-[14px] text-neutral-600">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 hover:text-neutral-900"
            >
              <IconHome className="h-4 w-4" stroke={1.75} />
              <span>หน้าหลัก</span>
            </button>
            <IconChevronRight className="h-4 w-4 text-neutral-400" stroke={1.75} />
            <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[12px] font-semibold text-violet-700">
              NEW
            </span>
            <span className="font-medium text-neutral-900">ผู้ป่วยใหม่</span>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="bordered"
              startContent={<IconKeyboard className="h-4 w-4" stroke={1.75} />}
              className="h-9 border-neutral-200 bg-white text-[13px] font-medium text-neutral-700"
              onPress={() => navigate("/patient/new/manual")}
            >
              กรอกแบบฟอร์มเอง
            </Button>
          </div>
        </header>

        {/* Scrollable content area */}
        <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
        <PageHeader
          phase={phase}
          populatedCount={populatedCount}
          onManualFallback={() => navigate("/patient/new/manual")}
        />

        {/* Phase: INPUT — empty/idle and live-recording */}
        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.section
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: EASE_TV }}
              className="flex flex-col items-center gap-8 rounded-[28px] border border-neutral-200/80 bg-white px-10 py-12 shadow-[0_2px_6px_rgba(0,0,0,0.02)]"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <motion.img
                  src={AI_DOCTOR}
                  alt="เมย์"
                  decoding="async"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    duration: 0.7,
                    ease: [0.34, 1.6, 0.5, 1],
                  }}
                  className="h-32 w-auto object-contain drop-shadow-[0_8px_18px_rgba(120,90,220,0.22)]"
                />
                <div>
                  <p className="text-sm font-normal text-neutral-500">
                    ลงทะเบียนผู้ป่วยใหม่
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
                    เล่าให้เมย์ฟังเกี่ยวกับผู้ป่วยใหม่
                  </h1>
                  <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-neutral-500">
                    พูดหรือพิมพ์ข้อมูลก็ได้ — เมย์จะจัดเป็นฟอร์มให้ตรวจสอบก่อนบันทึก
                  </p>
                </div>
              </div>

              {/* Inline live transcript — replaces the floating LiveCaption
                  modal on this page. Shows diarized segments as chat-style
                  bubbles while the user records. */}
              {(isRecording || segments.length > 0) && (
                <div className="flex w-full max-w-[640px] flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 font-medium text-neutral-600">
                      {isRecording ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                          </span>
                          กำลังบันทึก{source === "tab" ? "เสียงในอุปกรณ์" : "เสียงพูด"}
                        </>
                      ) : (
                        <>ทรานสคริปต์ ({segments.length} ตอน)</>
                      )}
                    </span>
                    {!isRecording && segments.length > 0 && (
                      <span className="text-neutral-400">
                        แก้ไขข้อความด้านล่างก่อนวิเคราะห์ได้
                      </span>
                    )}
                  </div>
                  <div className="max-h-[260px] overflow-y-auto pr-1">
                    {segments.length === 0 ? (
                      <p className="py-6 text-center text-[13px] text-neutral-400">
                        พูดได้เลย เมย์กำลังฟังอยู่…
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {segments.map((s, i) => {
                          const isDoctor = s.speaker === 1;
                          return (
                            <div
                              key={i}
                              className={`flex gap-2 ${
                                isDoctor ? "flex-row" : "flex-row-reverse"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                                  isDoctor
                                    ? "bg-violet-100 text-violet-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                                title={isDoctor ? "แพทย์" : "ผู้ป่วย"}
                              >
                                {isDoctor ? "D" : "P"}
                              </span>
                              <span
                                className={`max-w-[78%] rounded-2xl px-3 py-1.5 text-[13px] leading-relaxed ${
                                  isDoctor
                                    ? "bg-violet-50 text-violet-900"
                                    : "bg-emerald-50 text-emerald-900"
                                }`}
                              >
                                {s.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div
                className={`flex w-full max-w-[640px] flex-col gap-3 rounded-2xl border bg-neutral-50 px-5 py-4 transition ${
                  isRecording
                    ? "border-violet-400 ring-2 ring-violet-100"
                    : "border-neutral-200"
                }`}
              >
                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSubmitInput();
                    }
                  }}
                  placeholder={EXAMPLE}
                  rows={4}
                  className="resize-none bg-transparent text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                />

                <div className="flex items-center justify-between">
                  <RecordingHint isRecording={isRecording} source={source} />
                  <div className="flex items-center gap-2">
                    {/* Tab/system audio — for telehealth calls, voice memos
                        playing on the device, recorded interviews, etc. */}
                    {!isRecording && (
                      <button
                        type="button"
                        onClick={handleTabAudio}
                        aria-label="ฟังเสียงในอุปกรณ์"
                        title="ฟังเสียงในอุปกรณ์ (เช่น Telehealth / คลิปที่เปิดอยู่)"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50"
                      >
                        <IconDeviceDesktop className="h-5 w-5" stroke={1.75} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={isRecording ? () => void stopSession() : handleMic}
                      aria-label={isRecording ? "หยุดบันทึก" : "พูดผ่านไมค์"}
                      title={isRecording ? "หยุดบันทึก" : "พูดผ่านไมค์"}
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                        isRecording
                          ? "bg-rose-500 text-white shadow-[0_4px_12px_rgba(244,63,94,0.4)]"
                          : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {isRecording ? (
                        <span className="block h-3 w-3 rounded-sm bg-white" />
                      ) : (
                        <IconMicrophone className="h-5 w-5" stroke={1.75} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitInput}
                      disabled={!prompt.trim() || isRecording}
                      className="flex h-10 items-center gap-2 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <span>วิเคราะห์</span>
                      <IconArrowUp className="h-4 w-4" stroke={2} />
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-neutral-400">
                ⌘+Enter เพื่อวิเคราะห์ทันที
              </p>
            </motion.section>
          )}

          {/* Phase: EXTRACTING — module card + field rows stagger in,
              matching the post-save commit visualizer's visual language for
              one continuous "data being prepared/filed" narrative. */}
          {phase === "extracting" && (
            <motion.section
              key="extracting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: EASE_TV }}
              className="flex flex-col gap-6 rounded-[28px] border border-neutral-200/80 bg-white px-8 py-8 shadow-[0_2px_6px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-4">
                <motion.img
                  src={AI_DOCTOR}
                  alt=""
                  className="h-16 w-auto object-contain"
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center gap-2 text-violet-700">
                    <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />
                    <span className="text-sm font-medium">
                      เมย์กำลังกรอกข้อมูลให้คุณ…
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    จัดเรียงข้อมูลที่คุณเล่ามาเป็นฟอร์มก่อนตรวจสอบ
                  </p>
                </div>
              </div>

              <ExtractFillVisualizer />
            </motion.section>
          )}

          {/* Phase: REVIEW — A2UI form + edit-description hint */}
          {phase === "review" && extracted && (
            <motion.section
              key="review"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: EASE_TV }}
              className="flex flex-col gap-5"
            >
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={AI_DOCTOR}
                    alt=""
                    className="h-10 w-auto object-contain"
                  />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                      ตรวจก่อนบันทึก
                    </p>
                    <p className="mt-0.5 text-sm text-neutral-700">
                      เมย์กรอกได้{" "}
                      <strong className="text-violet-700">
                        {populatedCount.filled}/{populatedCount.total}
                      </strong>{" "}
                      ฟิลด์ — แก้ไขที่ยังว่างหรือผิดก่อนกดบันทึก
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReExtract}
                    className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50"
                  >
                    <IconRefresh className="h-3.5 w-3.5" stroke={2} />
                    วิเคราะห์ใหม่
                  </button>
                  <button
                    type="button"
                    onClick={handleEditDescription}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    แก้คำอธิบาย
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-neutral-200/80 bg-white p-6 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                <A2UIRenderer
                  response={extracted}
                  onAction={handleA2UIAction}
                  theme="light"
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
        </div>

        {/* Bottom action row */}
        <footer className="flex items-center justify-between border-t border-neutral-100 bg-white px-6 py-3 text-[13px]">
          <button
            type="button"
            onClick={() => navigate("/ai")}
            className="flex items-center gap-1.5 text-neutral-600 hover:text-rose-600"
          >
            <IconTrash className="h-4 w-4" stroke={1.75} />
            <span className="underline-offset-4 hover:underline">
              ยกเลิกการบันทึก
            </span>
          </button>
          <div className="flex items-center gap-3 text-neutral-500">
            <button
              type="button"
              aria-label="เห็นด้วย"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 hover:text-emerald-600"
            >
              <IconThumbUp className="h-4 w-4" stroke={1.75} />
            </button>
            <button
              type="button"
              aria-label="ไม่เห็นด้วย"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 hover:text-rose-600"
            >
              <IconThumbDown className="h-4 w-4" stroke={1.75} />
            </button>
            <button
              type="button"
              className="text-rose-600 underline-offset-4 hover:underline"
            >
              แจ้งการบันทึกมีปัญหา
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PageHeader({
  phase,
  populatedCount,
  onManualFallback,
}: {
  phase: Phase;
  populatedCount: { filled: number; total: number };
  onManualFallback: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
        <IconSparkles className="h-3.5 w-3.5 text-violet-500" stroke={2} />
        ผู้ป่วยใหม่ · โหมดบอกเมย์
      </div>
      <div className="flex items-center gap-3">
        {phase === "review" && (
          <span className="text-xs text-neutral-500">
            {populatedCount.filled}/{populatedCount.total} ฟิลด์
          </span>
        )}
        <button
          type="button"
          onClick={onManualFallback}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          <IconKeyboard className="h-3.5 w-3.5" stroke={1.75} />
          พิมพ์ฟอร์มเอง
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Light field-fill visualizer — module card on the left + stack of field
// rows on the right that stagger in with avatar circle + write bar.
// Same visual language as SaveCommitOverlay so analyze → save reads as one
// continuous data pipeline.

interface FieldDef {
  key: string;
  label: string;
}

const EXTRACT_FIELDS: FieldDef[] = [
  { key: "name", label: "ชื่อ-นามสกุล" },
  { key: "cid", label: "เลขบัตรประชาชน" },
  { key: "allergies", label: "แพ้ยา/อาหาร" },
];

// Isometric matrix applied uniformly to every element so they share the
// same tilted plane. Values chosen to match the Figma wireframe — flat 2D
// rectangles rendered as a parallelogram seen from above-left.
//   a=1   (x-axis stays full width)
//   b=-0.18 (x-axis tilts UP slightly to the right)
//   c=-0.5  (y-axis leans LEFT going down)
//   d=0.7   (y-axis compressed — foreshortened depth)
const ISO_TRANSFORM = "none";

function ExtractFillVisualizer() {
  // Layout in normal coordinates — module at bottom-left, 3-block stack at
  // top-right. Each element + the SVG connector live inside a single
  // isometric-skewed wrapper so the connector lines lie in the same plane
  // as the boxes (matches the Figma reference).
  const W = 620;
  const H = 360;

  // Pre-skew block positions (these are the box top-left corners).
  const moduleBox = { x: 30, y: 230, w: 240, h: 78 };
  const stackX = 360;
  const stackTop = 30;
  const blockW = 270;
  const blockH = 64;
  const blockGap = 14;

  const blocks = EXTRACT_FIELDS.map((f, i) => ({
    key: f.key,
    label: f.label,
    x: stackX,
    y: stackTop + i * (blockH + blockGap),
    w: blockW,
    h: blockH,
  }));

  return (
    <div className="flex justify-center py-2">
      <div
        className="relative"
        style={{
          width: W,
          height: H,
          transform: ISO_TRANSFORM,
          transformOrigin: "center",
        }}
      >
        {/* Connectors — sit BEHIND the boxes, drawn in the same skewed plane */}
        <ConnectorLines
          from={{ x: moduleBox.x + moduleBox.w, y: moduleBox.y + moduleBox.h / 2 }}
          to={blocks.map((b) => ({ x: b.x, y: b.y + b.h / 2 }))}
          width={W}
          height={H}
        />

        {/* Module card — bottom-left */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: EASE_TV }}
          className="absolute flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-neutral-100 shadow-[0_8px_24px_rgba(120,90,220,0.12)] ring-1 ring-violet-300/40"
          style={{
            left: moduleBox.x,
            top: moduleBox.y,
            width: moduleBox.w,
            height: moduleBox.h,
          }}
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(167,139,250,0.4) 0%, transparent 70%)",
            }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <IconUser className="h-5 w-5 text-violet-700" stroke={1.75} />
          </div>
          <p className="relative text-sm font-semibold text-neutral-800">
            ทะเบียนผู้ป่วย
          </p>
        </motion.div>

        {/* 3 stacked blocks — top-right */}
        {blocks.map((b) => (
          <ExtractFieldRow
            key={b.key}
            label={b.label}
            x={b.x}
            y={b.y}
            w={b.w}
            h={b.h}
          />
        ))}
      </div>
    </div>
  );
}

function ConnectorLines({
  from,
  to,
  width,
  height,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number }[];
  width: number;
  height: number;
}) {
  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0"
      style={{ overflow: "visible" }}
    >
      {to.map((t, i) => {
        const mx = (from.x + t.x) / 2;
        const d = `M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${t.y}, ${t.x} ${t.y}`;
        return (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke="rgba(167,139,250,0.18)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <motion.path
              d={d}
              fill="none"
              stroke="rgba(139,92,246,0.85)"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeDasharray="3 8"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: -22 }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.18,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function ExtractFieldRow({
  label,
  x,
  y,
  w,
  h,
}: {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <div
      className="absolute flex items-center gap-3 overflow-hidden rounded-2xl bg-neutral-100 px-3 py-2.5 shadow-[0_4px_14px_rgba(120,90,220,0.08)]"
      style={{ left: x, top: y, width: w, height: h }}
    >
      {/* Avatar circle — pulses while "writing" */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
        <motion.span
          className="block h-2 w-2 rounded-full bg-violet-400"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Field label + writing bar */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate text-xs font-semibold text-neutral-700">
          {label}
        </span>
        <div className="h-2 overflow-hidden rounded-full bg-white/80">
          <motion.div
            className="h-full"
            style={{ background: "rgba(167,139,250,0.55)" }}
            initial={{ width: "0%" }}
            animate={{ width: ["0%", "65%", "85%", "100%"] }}
            transition={{
              duration: 1.4,
              times: [0, 0.35, 0.7, 1],
              ease: "easeOut",
              repeat: Infinity,
              repeatDelay: 0.6,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function RecordingHint({
  isRecording,
  source,
}: {
  isRecording: boolean;
  source: "mic" | "tab";
}) {
  if (!isRecording) {
    return (
      <span className="text-xs text-neutral-400">
        กดไมค์ / อุปกรณ์เพื่อฟัง หรือพิมพ์
      </span>
    );
  }
  const label = source === "tab" ? "กำลังฟังเสียงในอุปกรณ์…" : "กำลังฟัง…";
  return (
    <span className="flex items-center gap-2 text-xs font-medium text-rose-600">
      <motion.span
        className="block h-2 w-2 rounded-full bg-rose-500"
        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
      {label}
    </span>
  );
}
