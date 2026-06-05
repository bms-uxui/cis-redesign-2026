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
  IconEye,
  IconEyeOff,
  IconPencil,
} from "@tabler/icons-react";
import { Button, Card, CardBody, CardHeader, Divider } from "@heroui/react";
import type { SaveCommitField } from "./SaveCommitOverlay";
import { useDictationContext } from "../contexts/DictationContext";
import { useSidebar } from "../contexts/SidebarContext";
import { chat, chatJSON } from "../services/ai/llm";
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
  const { collapsed: sidebarCollapsed, railHidden } = useSidebar();

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
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      {/* Reserve space for the floating TopBar card (top-4 + h-16 = 80px). */}
      <div className="h-20 shrink-0" aria-hidden />
      {/* ── Main panel ─────────────────────────────────────────────────── */}
      <main
        className={[
          "flex min-w-0 flex-col overflow-hidden h-[calc(100vh-7rem)] mr-4 mt-4 mb-4 transition-[margin] duration-300 ease-out",
          // Match the global sidebar width: hidden=16, collapsed=106, expanded=370.
          railHidden
            ? "ml-4"
            : sidebarCollapsed
              ? "ml-[106px]"
              : "ml-[370px]",
        ].join(" ")}
      >
        {/* Content area — fits within the viewport during the INPUT phase
            (Figma single-screen layout) and switches back to scrolling for
            the extracting/review phases that have unbounded form lengths. */}
        <div
          className={
            phase === "input"
              ? "flex w-full min-h-0 flex-1 flex-col gap-3 overflow-hidden py-0"
              : "mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 overflow-y-auto px-6 py-6"
          }
        >
        {phase !== "input" && (
          <PageHeader
            phase={phase}
            populatedCount={populatedCount}
            onManualFallback={() => navigate("/patient/new/manual")}
          />
        )}

        {/* Phase: INPUT — Speech-to-text capture screen (Figma design 992:918).
            Hero card with the doctor avatar in the center, floating live
            transcript bubbles scattered around, and a Stop / Listening pill
            pair. Below: two side-by-side cards — patient profile preview on
            the left, full transcription on the right. */}
        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: EASE_TV }}
              className="flex min-h-0 flex-1 flex-col gap-3"
            >
              {/* Hero: Speech-to-text card with floating message bubbles.
                  Flex-basis 0 + flex-1 lets it share the viewport with the
                  bottom row without forcing a scroll. */}
              <section className="relative flex flex-[1.1_0_0] basis-0 items-center justify-center overflow-hidden rounded-[24px] bg-white px-8 py-6">
                {/* Cancel / Save action pill — overlaid at the hero card's
                    top-right corner (Figma 992:1387). z-20 keeps it above
                    the bubbles + center cluster. */}
                <div className="absolute right-5 top-5 z-20 inline-flex items-center gap-3 rounded-full border border-neutral-200 bg-white p-2 shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="flex w-[112px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitInput}
                    disabled={!prompt.trim() || isRecording}
                    className="flex w-[112px] items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    บันทึก
                  </button>
                </div>


                {/* Floating bubbles — recent transcript snippets sprinkled
                    around the avatar so the user sees their words "lifting
                    off". When idle, show subtle placeholder dots. */}
                <SpeechBubbles segments={segments} isRecording={isRecording} />

                {/* Center cluster: soft halo + avatar + title + buttons */}
                <div className="relative z-10 flex flex-col items-center gap-5">
                  <div className="relative">
                    {/* Soft semicircular gradient backdrop */}
                    <div
                      aria-hidden
                      className="absolute left-1/2 bottom-0 h-[140px] w-[300px] -translate-x-1/2 rounded-t-full bg-gradient-to-t from-violet-200/55 via-violet-100/35 to-transparent"
                    />
                    <motion.img
                      src={AI_DOCTOR}
                      alt="เมย์"
                      decoding="async"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                        y: isRecording ? [0, -4, 0] : 0,
                      }}
                      transition={{
                        scale: { duration: 0.7, ease: [0.34, 1.6, 0.5, 1] },
                        opacity: { duration: 0.7 },
                        y: isRecording
                          ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                          : { duration: 0.4 },
                      }}
                      className="relative h-32 w-auto object-contain drop-shadow-[0_8px_18px_rgba(120,90,220,0.25)]"
                    />
                    {/* Small "patient" head badge offset right — photo-style
                        avatar so this reads as a 2-person conversation, not
                        a one-sided monologue. Matches Figma node 992:1344. */}
                    <div
                      aria-hidden
                      className="absolute -right-14 top-16 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-100 via-rose-100 to-violet-100 shadow-[0_6px_16px_rgba(120,90,220,0.18)] ring-4 ring-white"
                    >
                      <IconUser
                        className="h-10 w-10 translate-y-1 text-rose-900/55"
                        stroke={1.4}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <h2 className="text-[24px] font-semibold leading-tight text-black">
                      Speech-to-text
                    </h2>
                    <p className="mt-1 text-[16px] text-black/80">
                      ซักประวัติผู้ป่วยโดยไม่ต้องจดเอง
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {isRecording ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void stopSession()}
                          className="rounded-2xl bg-[#ff383c] px-6 py-3 text-[16px] font-semibold text-white transition hover:bg-[#e6262a]"
                        >
                          หยุด
                        </button>
                        <div
                          aria-live="polite"
                          className="flex items-center gap-2 rounded-2xl bg-[#3965e1] px-6 py-3 text-[16px] font-semibold text-white"
                        >
                          <span className="relative inline-flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                          </span>
                          กำลังฟัง...
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleMic}
                        className="flex items-center gap-2 rounded-2xl bg-[#3965e1] px-6 py-3 text-[16px] font-semibold text-white transition hover:bg-[#2d52c4]"
                      >
                        <IconMicrophone className="h-4 w-4" stroke={2} />
                        เริ่มฟัง
                      </button>
                    )}
                  </div>

                  {!isRecording && !prompt && (
                    <button
                      type="button"
                      onClick={handleTabAudio}
                      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800"
                    >
                      <IconDeviceDesktop className="h-3.5 w-3.5" stroke={1.75} />
                      ใช้เสียงในอุปกรณ์ (Telehealth / คลิปที่เปิดอยู่)
                    </button>
                  )}
                </div>
              </section>

              {/* Bottom row — profile preview (left, from ID-card scan) +
                  full transcript (right). Figma split is roughly 40/60
                  (profile 518px, transcription 729px on 1299px). */}
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
                <ProfilePreviewCard populatedCount={populatedCount.filled} />
                <TranscriptionCard
                  prompt={prompt}
                  segments={segments}
                  onPromptChange={setPrompt}
                  textareaRef={inputRef}
                />
              </div>
            </motion.div>
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

// ── New "Speech-to-text" hero helpers (Figma 992:918) ────────────────────

interface SpeechBubblesProps {
  segments: { text: string; speaker?: number }[];
  isRecording: boolean;
}

/** Ask the LLM to extract clinically relevant key phrases from the live
 *  transcript. Polls every 3s while recording — independent of segment
 *  churn so calls always complete instead of being aborted mid-flight by
 *  rapid transcript updates. New phrases are MERGED with prior ones so
 *  the queue grows monotonically across the session. */
function useSymptomPhrasesFromLLM(
  segments: { text: string }[],
  isRecording: boolean,
): string[] {
  const [phrases, setPhrases] = useState<string[]>([]);
  // Latest segments via ref so the polling effect can read them without
  // re-running on every transcript update (which would abort the call).
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  // Clear ONLY when starting a new recording session.
  const wasRecordingRef = useRef(isRecording);
  useEffect(() => {
    if (isRecording && !wasRecordingRef.current) setPhrases([]);
    wasRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;
    let cancelled = false;

    const tick = async () => {
      const transcript = segmentsRef.current
        .map((s) => s.text)
        .join(" ")
        .trim();
      if (transcript.length < 6) return;
      try {
        const result = await chatJSON<{ phrases?: string[] }>(
          [
            {
              role: "system",
              content:
                "You are extracting clinically structured key phrases from a Thai patient interview transcript that GROWS over time — every call has the full transcript so far. " +
                "Use the standard HPI mnemonic OLD CARTS plus Social and PMH/Med categories. " +
                "Be exhaustive: extract EVERY distinct clinical detail mentioned so far, do not summarize or merge. " +
                'Output ONLY JSON: {"phrases":["...","..."]} — up to 20 short Thai phrases, each ≤24 characters, each a readable noun/verb chunk (not a sentence). ' +
                "Cover ALL of these when present, in this priority order:\n" +
                "• Onset — เริ่มเป็นเมื่อไร / สาเหตุที่กระตุ้น (เช่น 'เริ่มเมื่อวาน', 'หลังยกของหนัก')\n" +
                "• Location — ตำแหน่งที่เป็น (เช่น 'ปวดเอว', 'แน่นหน้าอก')\n" +
                "• Duration — เป็นมานาน/ความต่อเนื่อง (เช่น 'มา 3 วัน', 'เป็น ๆ หาย ๆ')\n" +
                "• Character — ลักษณะอาการ (เช่น 'แปลบ', 'ตื้อ ๆ', 'แสบร้อน')\n" +
                "• Aggravating / Alleviating — ปัจจัยกระตุ้นหรือบรรเทา (เช่น 'แย่ตอนนอน', 'ดีขึ้นเมื่อพัก')\n" +
                "• Radiation — ร้าวไปที่ไหน (เช่น 'ร้าวลงขา')\n" +
                "• Timing — ช่วงเวลา/ความถี่ (เช่น 'ทุกเช้า', 'หลังกินข้าว')\n" +
                "• Severity — ความรุนแรง (เช่น 'ปวดมาก ระดับ 8/10', 'พอทนได้')\n" +
                "• Social / Behavior — พฤติกรรม + ไลฟ์สไตล์ที่เกี่ยว (เช่น 'สูบบุหรี่ 10 มวน/วัน', 'นั่งทำงานนาน', 'นอนดึก', 'ดื่มเหล้า')\n" +
                "• PMH / Meds — โรคประจำตัว + ยาที่กินอยู่ (เช่น 'เป็นเบาหวาน', 'กินยาความดัน', 'แพ้ยา NSAID')\n" +
                "Skip greetings, names, ages, occupations unless they map to one of the categories above (e.g. 'พนักงานออฟฟิศ' is fine as Social context). " +
                "Deduplicate. " +
                'If nothing clinically relevant yet, return {"phrases":[]}.',
            },
            { role: "user", content: transcript },
          ],
          { temperature: 0.2, maxTokens: 600, fast: true },
        );
        if (cancelled) return;
        const next = Array.isArray(result?.phrases)
          ? result.phrases.filter(
              (p): p is string =>
                typeof p === "string" && p.length > 0 && p.length <= 32,
            )
          : [];
        if (next.length === 0) return;
        setPhrases((prev) => {
          // Merge — keep all prior phrases, append only new ones.
          const seen = new Set(prev);
          const additions = next.filter((p) => !seen.has(p));
          return additions.length ? [...prev, ...additions] : prev;
        });
      } catch {
        // Silent — next tick will retry with a fresh transcript snapshot.
      }
    };

    // Fire once immediately, then poll on a fixed cadence so calls
    // always have time to complete and accumulate.
    tick();
    const interval = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isRecording]);

  return phrases;
}

interface Pin {
  text: string;
  /** Monotonic release order — used for palette / rotation variation. */
  orderIndex: number;
  /** Locked random position (% of card). Never changes once assigned. */
  x: number;
  y: number;
}

/** Normalize a phrase for dedupe — strip whitespace, drop trailing
 *  punctuation, and collapse interior spaces so trivially different
 *  outputs from the LLM ("ปวด ท้อง " vs "ปวดท้อง") collapse to one pin. */
function normalizePhrase(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, "")
    .replace(/[\.,!?…]+$/u, "");
}

/** Pick a random spot inside the hero card that (a) stays clear of the
 *  central avatar/title cluster and (b) keeps a minimum distance from
 *  any post-it already placed. Bails to a random fallback after enough
 *  attempts so the wall never silently drops a pin. */
function pickRandomPosition(taken: { x: number; y: number }[]): {
  x: number;
  y: number;
} {
  // Coordinates are expressed as % of the hero card.
  const MIN_X = 2;
  const MAX_X = 78; // leave room for ~170px post-it width
  const MIN_Y = 4;
  const MAX_Y = 80;
  // Avoid the central avatar/title/buttons region.
  const CENTER = { x0: 36, x1: 64, y0: 22, y1: 90 };
  const MIN_DIST_X = 14;
  const MIN_DIST_Y = 16;

  for (let attempt = 0; attempt < 60; attempt++) {
    const x = MIN_X + Math.random() * (MAX_X - MIN_X);
    const y = MIN_Y + Math.random() * (MAX_Y - MIN_Y);
    if (
      x > CENTER.x0 &&
      x < CENTER.x1 &&
      y > CENTER.y0 &&
      y < CENTER.y1
    ) {
      continue;
    }
    const collides = taken.some(
      (p) => Math.abs(p.x - x) < MIN_DIST_X && Math.abs(p.y - y) < MIN_DIST_Y,
    );
    if (collides) continue;
    return { x, y };
  }
  // Best-effort fallback — anywhere outside the center zone.
  return {
    x: Math.random() > 0.5
      ? MAX_X - Math.random() * 20
      : MIN_X + Math.random() * 20,
    y: MIN_Y + Math.random() * (MAX_Y - MIN_Y),
  };
}

/** Post-it wall: as the LLM surfaces new clinical phrases, each one is
 *  released onto its own random position inside the hero card. Position
 *  is locked per pin so post-its don't shuffle while new ones arrive.
 *  The center cluster (avatar/title/buttons) is treated as a no-go zone. */
function SpeechBubbles({ segments, isRecording }: SpeechBubblesProps) {
  const phrases = useSymptomPhrasesFromLLM(segments, isRecording);
  const [pins, setPins] = useState<Pin[]>([]);
  const releaseCounterRef = useRef(0);
  const wasRecordingRef = useRef(isRecording);

  // Clear the wall only when a new recording session begins.
  useEffect(() => {
    if (isRecording && !wasRecordingRef.current) {
      setPins([]);
      releaseCounterRef.current = 0;
    }
    wasRecordingRef.current = isRecording;
  }, [isRecording]);

  // Release a fresh phrase roughly every second while recording.
  useEffect(() => {
    if (!isRecording) return;
    const pinnedKeys = new Set(pins.map((p) => normalizePhrase(p.text)));
    const next = phrases.find((p) => !pinnedKeys.has(normalizePhrase(p)));
    if (!next) return;
    const t = setTimeout(() => {
      setPins((prev) => {
        const key = normalizePhrase(next);
        if (prev.some((p) => normalizePhrase(p.text) === key)) return prev;
        const { x, y } = pickRandomPosition(prev);
        const orderIndex = releaseCounterRef.current;
        releaseCounterRef.current += 1;
        return [...prev, { text: next, orderIndex, x, y }];
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [phrases, pins, isRecording]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <AnimatePresence>
        {pins.map((pin) => (
          <PostItNote
            key={pin.text}
            text={pin.text}
            x={pin.x}
            y={pin.y}
            index={pin.orderIndex}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Post-it palette — soft pastels with matching ink color. Cycled per
// bubble index so neighbouring notes look distinct.
const POSTIT_PALETTE: { bg: string; ink: string; border: string }[] = [
  { bg: "#fff7c2", ink: "#7c5b00", border: "#f3e29a" }, // classic yellow
  { bg: "#ffd9e4", ink: "#8a1c4a", border: "#f9bcd0" }, // pink
  { bg: "#c8e4ff", ink: "#0c3d72", border: "#a9d0f3" }, // blue
  { bg: "#d2f5d6", ink: "#1d5e2a", border: "#b3e3ba" }, // mint
];

interface PostItNoteProps {
  text: string;
  /** Position in % of the parent hero card. */
  x: number;
  y: number;
  index: number;
}

/** Post-it note with a pen-writing animation. Text reveals character by
 *  character; a pencil hovers at the end while writing and lifts off
 *  when the note is complete. Each note is rotated a few degrees and
 *  cycles through the pastel palette so the wall reads like a real
 *  bulletin board. */
function PostItNote({ text, x, y, index }: PostItNoteProps) {
  const palette = POSTIT_PALETTE[index % POSTIT_PALETTE.length];
  // Stable per-bubble rotation: -7° → +7° based on index hash.
  const rotation = (((index * 53) % 14) - 7) | 0;

  const [typed, setTyped] = useState("");
  useEffect(() => {
    setTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 55);
    return () => window.clearInterval(id);
  }, [text]);

  const isWriting = typed.length < text.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 14, rotate: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -4, 0],
        rotate: rotation,
      }}
      exit={{ opacity: 0, scale: 0.85, y: -10, rotate: rotation + 4 }}
      transition={{
        opacity: { duration: 0.4 },
        scale: { duration: 0.4, ease: [0.34, 1.6, 0.5, 1] },
        rotate: { duration: 0.5 },
        y: {
          duration: 3 + (index % 3) * 0.4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: (index % 4) * 0.18,
        },
      }}
      className="absolute w-[170px]"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div
        className="relative px-4 py-3 shadow-[2px_4px_10px_rgba(0,0,0,0.08)]"
        style={{
          background: palette.bg,
          borderTop: `1px solid ${palette.border}`,
          // Sticky-note "tape" peel: a tiny darker fold at top-left
          backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.04) 0 8px, transparent 8px)`,
        }}
      >
        <p
          className="text-[13px] font-medium leading-snug"
          style={{ color: palette.ink, fontFamily: "'Caveat', 'Noto Sans Thai Looped', cursive" }}
        >
          {typed}
          {isWriting && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              className="ml-0.5 inline-block h-[14px] w-px align-middle"
              style={{ background: palette.ink }}
            />
          )}
        </p>
        {/* Pen — hovers at the bottom-right while writing, with a tiny
            scribble jitter so it reads as "in motion". */}
        <AnimatePresence>
          {isWriting && (
            <motion.div
              initial={{ opacity: 0, y: -6, rotate: -30 }}
              animate={{
                opacity: 1,
                y: 0,
                rotate: [-30, -22, -34, -26, -32],
                x: [0, 1, -1, 1, 0],
              }}
              exit={{ opacity: 0, y: -16, rotate: -40, transition: { duration: 0.35 } }}
              transition={{
                rotate: { duration: 0.5, repeat: Infinity, ease: "linear" },
                x: { duration: 0.5, repeat: Infinity, ease: "linear" },
              }}
              className="absolute -bottom-3 -right-2"
              style={{ originX: 0.5, originY: 0.5 }}
            >
              <IconPencil
                className="h-6 w-6"
                stroke={2}
                style={{ color: palette.ink }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface ProfilePreviewCardProps {
  populatedCount: number;
}

/** Skeleton-style preview of the patient profile that will be extracted
 *  from the transcript. Matches the Figma exactly: avatar circle + 2 lines
 *  + 6 field stubs in a 3×2 grid. When the LLM has populated fields the
 *  count is surfaced in the header to indicate progress. */
// Demo patient — fills the preview card so the page reads as a real
// post-ID-card scan, not a wireframe. Wire to the extracted A2UI response
// once that path is stable.
interface DemoField {
  label: string;
  value: string;
  /** When set, render with a mask toggle (eye icon) — used for PDPA-sensitive
   *  identifiers like the citizen ID. */
  sensitive?: boolean;
}
const DEMO_PATIENT: {
  initial: string;
  name: string;
  hn: string;
  fields: DemoField[];
} = {
  initial: "ส",
  name: "นายสมชาย ใจดี",
  hn: "HN 0001234",
  fields: [
    { label: "เลขบัตรประชาชน", value: "1-2345-67890-12-3", sensitive: true },
    { label: "วันเกิด", value: "12 มี.ค. 2522 (45 ปี)" },
    { label: "เพศ", value: "ชาย" },
    { label: "กรุ๊ปเลือด", value: "O Rh+" },
    { label: "เบอร์โทร", value: "081-234-5678" },
    { label: "ที่อยู่", value: "123/45 ถ.สุขุมวิท คลองเตย กรุงเทพฯ" },
  ],
};

/** Mask a Thai citizen ID (or any digit-with-dash string), keeping the
 *  last `visible` digits readable. Dashes are preserved so the layout
 *  doesn't reflow when the user toggles the eye. */
function maskId(value: string, visible = 4): string {
  const digits = value.replace(/\D/g, "");
  const keep = digits.slice(-visible);
  const masked = "X".repeat(Math.max(0, digits.length - visible)) + keep;
  // Re-insert dashes at the original positions.
  let i = 0;
  return value.replace(/\d/g, () => masked[i++] ?? "X");
}

function ProfilePreviewCard({ populatedCount }: ProfilePreviewCardProps) {
  return (
    <Card
      shadow="sm"
      radius="lg"
      className="h-full min-h-0 border border-neutral-200/60 bg-white"
    >
      {/* Header — avatar + name + HN. Matches Figma 995:1428 / 995:1432. */}
      <CardHeader className="flex items-center gap-5 px-6 pb-3 pt-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 via-sky-100 to-sky-200 text-3xl font-semibold text-violet-900/70">
          {DEMO_PATIENT.initial}
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-[17px] font-semibold text-neutral-900">
            {DEMO_PATIENT.name}
          </p>
          <p className="text-[13px] text-neutral-500">{DEMO_PATIENT.hn}</p>
        </div>
        {populatedCount > 0 && (
          <span className="shrink-0 self-start rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
            {populatedCount} ฟิลด์
          </span>
        )}
      </CardHeader>

      <Divider className="bg-[#f4f4f4]" />

      {/* Body — 3×2 patient field grid. Each cell: small label + value.
          Sensitive fields (citizen ID) render with a mask + eye toggle. */}
      <CardBody className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden p-6">
        <div className="grid grid-cols-3 gap-x-6 gap-y-5">
          {DEMO_PATIENT.fields.map((f) => (
            <PatientField key={f.label} field={f} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

/** Single patient field — label on top, value below. Sensitive fields
 *  start masked and reveal on eye-toggle. */
function PatientField({ field }: { field: DemoField }) {
  const [revealed, setRevealed] = useState(false);
  const isMasked = field.sensitive && !revealed;
  const display = isMasked ? maskId(field.value) : field.value;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {field.label}
      </p>
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="truncate text-[14px] font-medium text-neutral-900">
          {display}
        </p>
        {field.sensitive && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "ซ่อนข้อมูล" : "แสดงข้อมูล"}
            title={revealed ? "ซ่อนข้อมูล" : "แสดงข้อมูล"}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            {revealed ? (
              <IconEyeOff className="h-3.5 w-3.5" stroke={1.75} />
            ) : (
              <IconEye className="h-3.5 w-3.5" stroke={1.75} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface TranscriptionCardProps {
  prompt: string;
  segments: { text: string; speaker?: number }[];
  onPromptChange: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/** Live transcription panel — header with title + disclaimer, body shows
 *  the accumulated transcript. The user can edit the text before sending
 *  it for extraction (matches the prior editing affordance). */
function TranscriptionCard({
  prompt,
  segments,
  onPromptChange,
  textareaRef,
}: TranscriptionCardProps) {
  const hasContent = prompt.trim().length > 0 || segments.length > 0;
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* Section label sits outside the card — matches Figma 992:1383
          (parent flex col with label + white card). */}
      <p className="px-1 text-sm font-medium text-black">Transcription</p>
      {/* Single white card holds header row + transcript body. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[#3e3425]">บทสนทนา</p>
          <p className="text-[11px] text-[#3e3425]/55">
            *ผลลัพธ์ขึ้นอยู่กับสภาพแวดล้อมและความชัดเจนของเสียงที่ไมโครโฟนได้รับ
          </p>
        </div>
        {hasContent ? (
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="min-h-0 flex-1 resize-none bg-transparent text-sm leading-relaxed text-[#5d4d37] focus:outline-none"
          />
        ) : (
          <p className="min-h-0 flex-1 text-sm leading-relaxed text-neutral-400">
            ยังไม่มีบทสนทนา — กด "เริ่มฟัง" เพื่อเริ่มซักประวัติ หรือพิมพ์ลงในกล่องนี้ได้เลย
          </p>
        )}
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
