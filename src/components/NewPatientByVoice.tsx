import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconMicrophone,
  IconDeviceDesktop,
  IconKeyboard,
  IconSparkles,
  IconLoader2,
  IconRefresh,
  IconUser,
  IconId,
  IconPhone,
  IconCalendar,
  IconDroplet,
  IconAlertTriangle,
  IconStethoscope,
  IconBriefcase,
  IconNote,
  IconChevronRight,
  IconChevronDown,
  IconFileMusic,
  IconCheck,
  IconPencil,
} from "@tabler/icons-react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tab,
  Tabs,
} from "@heroui/react";
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
import AI_DOCTOR from "../assets/figma/ai-mascot-notepad.png";
import PATIENT_AVATAR from "../assets/figma/patient-avatar-somchai.svg";
import GARUDA_EMBLEM from "../assets/figma/garuda-emblem.svg";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Phase = "input" | "extracting" | "review";

const EXAMPLE =
  "เช่น: ผู้ป่วยชายอายุ 45 ปี ชื่อสมชาย ใจดี เลขบัตร 1234567890123 โทร 0812345678 แพ้ penicillin มีโรคความดันโลหิตสูง...";

export default function NewPatientByVoice() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isRecording, startSession, stopSession, segments, source, handleClose: clearDictation } =
    useDictationContext();

  // Clear any persisted dictation session on mount so a fresh visit to
  // this page doesn't surface yesterday's transcript in the textarea.
  // (Skips if a recording is already in progress, e.g. user navigated
  // away and came back mid-session.)
  useEffect(() => {
    if (!isRecording) clearDictation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { railHidden } = useSidebar();

  const [phase, setPhase] = useState<Phase>("input");
  const [prompt, setPrompt] = useState("");
  const [extracted, setExtracted] = useState<A2UIResponse | null>(null);
  const [centerTab, setCenterTab] = useState<CenterTab>("summary");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Live clinical-topic extraction (Figma 996:1456) — drives the center
  // summary tab. OLD CARTS topics surface as the patient is interviewed.
  const topics = useSymptomTopicsFromLLM(segments, isRecording);

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

  // Audio-file fallback: open a native file picker; once a file is chosen
  // we let the dictation context handle ingestion if/when that path is
  // wired up. For now this surfaces a clear toast so the doctor knows the
  // file was received, even if backend ingest is still WIP.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleAudioFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      toast.info(
        "ได้รับไฟล์เสียงแล้ว",
        `${file.name} (${Math.round(file.size / 1024)} KB) — กำลังส่งเข้า ASR…`,
      );
      // Reset the input so picking the same file twice re-fires.
      e.target.value = "";
    },
    [toast],
  );

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
          // Match the global Notion-style sidebar width: 280px panel + 16px
          // gutter on each side = 312px when visible, 16px when hidden.
          railHidden ? "ml-4" : "ml-[296px]",
        ].join(" ")}
      >
        {/* Content area — fits within the viewport during the INPUT phase
            (Figma single-screen layout) and switches back to scrolling for
            the extracting/review phases that have unbounded form lengths. */}
        <div
          className={
            phase === "input"
              ? "flex w-full min-h-0 flex-1 flex-col gap-4 overflow-hidden py-0"
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

        {/* Phase: INPUT — Speech-to-text capture screen (Figma 996:1456).
            Three-column layout: key-topics list (left), conversation card
            with summary/transcript tabs (center), and patient ID-card
            preview (right). A stepper sits on top with cancel / next. */}
        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: EASE_TV }}
              className="flex min-h-0 flex-1 flex-col gap-4"
            >
              <StepperBar
                onCancel={() => navigate("/")}
                onNext={handleSubmitInput}
                nextEnabled={Boolean(prompt.trim()) && !isRecording}
                isExtracting={false}
              />

              <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-4">
                <ConversationCard
                  patientName="นายสมชาย ใจดี"
                  topics={topics}
                  segments={segments}
                  isRecording={isRecording}
                  onToggleRecord={handleMic}
                  onTabAudio={handleTabAudio}
                  onAudioFile={handleAudioFile}
                  tab={centerTab}
                  onTabChange={setCenterTab}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={handleFileSelected}
                />
                <PatientIdCard />
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

// ── Recording screen helpers (Figma 996:1456) ─────────────────────────────
// Three-column live capture layout: key-topics list (left), conversation +
// summary tabs (center, with hide-to-the-side AI doctor avatar), and the
// patient ID-card preview (right). The recording state drives all three
// columns from the same dictation segments + LLM extraction.

interface SymptomTopic {
  /** Short Thai label, e.g. "ปวดท้อง". */
  title: string;
  /** Patient's verbatim statement that mentioned this topic. */
  body: string;
}

/** Normalize a phrase for dedupe — strip whitespace, drop trailing
 *  punctuation, and collapse interior spaces so trivially different
 *  outputs from the LLM ("ปวด ท้อง " vs "ปวดท้อง") collapse to one entry. */
function normalizePhrase(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, "")
    .replace(/[\.,!?…]+$/u, "");
}

/** Extract clinical key topics + the patient's verbatim statement that
 *  surfaces each topic. Polls every 3.5s while recording, merges new
 *  topics into the accumulator, and dedupes by normalized title. */
function useSymptomTopicsFromLLM(
  segments: { text: string }[],
  isRecording: boolean,
): SymptomTopic[] {
  const [topics, setTopics] = useState<SymptomTopic[]>([]);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const wasRecordingRef = useRef(isRecording);

  useEffect(() => {
    if (isRecording && !wasRecordingRef.current) setTopics([]);
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
        const result = await chatJSON<{ topics?: { title?: string; body?: string }[] }>(
          [
            {
              role: "system",
              content:
                "You are extracting clinically structured key topics from a Thai patient interview transcript that GROWS over time. Every call has the full transcript so far. " +
                "Use the OLD CARTS clinical mnemonic STRICTLY: Onset, Location, Duration, Character, Aggravating/Alleviating factors, Radiation, Timing, Severity. Add Social/PMH/Meds only when the patient explicitly mentions them. " +
                'Output ONLY JSON: {"topics":[{"title":"...","body":"..."}, ...]} — up to 12 entries. ' +
                "title: SHORT clinical key-point per OLD CARTS, ≤16 Thai characters (e.g. 'ปวดท้อง' for Location, 'เป็น 3 วัน' for Duration, 'หลังกินอาหาร' for Timing, 'ระดับ 7/10' for Severity). One topic per OLD CARTS bucket when present. " +
                "body: ANALYTICAL clinical summary written by you — a 1-3 sentence Thai paragraph that SYNTHESIZES what the patient said about this OLD CARTS point into a clinical statement. NOT a verbatim quote, NOT raw transcript. Combine multiple patient utterances into clinical language with proper terminology when appropriate. Example title 'ปวดท้อง' → body 'ผู้ป่วยมีอาการปวดบริเวณท้องน้อยด้านขวา ลักษณะปวดบีบรัด รุนแรงขึ้นหลังรับประทานอาหารมื้อหนัก โดยอาการเริ่มเป็น 3 วันก่อน'. Aim for 80-280 Thai characters per body, no surrounding quotation marks. " +
                "Be exhaustive — extract every distinct OLD CARTS detail surfaced so far. Deduplicate by title. " +
                'If nothing clinically relevant yet, return {"topics":[]}.',
            },
            { role: "user", content: transcript },
          ],
          { temperature: 0.2, maxTokens: 3500, fast: true },
        );
        if (cancelled) return;
        const next = Array.isArray(result?.topics)
          ? result.topics
              .map((t) => ({
                title: typeof t?.title === "string" ? t.title.trim() : "",
                body: typeof t?.body === "string" ? t.body.trim() : "",
              }))
              .filter((t) => t.title.length > 0 && t.title.length <= 24)
          : [];
        if (next.length === 0) return;
        setTopics((prev) => {
          const seen = new Set(prev.map((p) => normalizePhrase(p.title)));
          const additions = next.filter((t) => !seen.has(normalizePhrase(t.title)));
          return additions.length ? [...prev, ...additions] : prev;
        });
      } catch {
        // Silent — next tick retries.
      }
    };
    tick();
    const interval = window.setInterval(tick, 3500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isRecording]);

  return topics;
}

// ── Stepper ────────────────────────────────────────────────────────────────
// Three-step header: ลงทะเบียน (done) → บันทึกประวัติ (current) → ตรวจสอบข้อมูล.
// Done steps render with a green pill + check; the current step renders
// with a primary-tinted outlined pill; the upcoming step stays muted.

interface StepperBarProps {
  onCancel: () => void;
  onNext: () => void;
  nextEnabled: boolean;
  isExtracting: boolean;
}

function StepperBar({ onCancel, onNext, nextEnabled, isExtracting }: StepperBarProps) {
  const disabled = !nextEnabled || isExtracting;
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#dadada] bg-white p-2">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <StepPill state="done" label="ลงทะเบียน" />
        <IconChevronRight className="h-4 w-4 shrink-0 text-neutral-300" stroke={2} />
        <StepPill state="current" label="บันทึกประวัติ" />
        <IconChevronRight className="h-4 w-4 shrink-0 text-neutral-300" stroke={2} />
        <StepPill state="upcoming" label="ตรวจสอบข้อมูล" />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex w-[124px] items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-100"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className={[
            "flex w-[124px] items-center justify-center gap-1.5 rounded-full bg-[#3965e1] px-4 py-2 text-sm font-medium text-white transition",
            disabled ? "cursor-not-allowed opacity-50" : "hover:bg-[#2d52c4]",
          ].join(" ")}
        >
          {isExtracting && <IconLoader2 className="h-3.5 w-3.5 animate-spin" stroke={2.5} />}
          ถัดไป
        </button>
      </div>
    </div>
  );
}

function StepPill({ state, label }: { state: "done" | "current" | "upcoming"; label: string }) {
  if (state === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-xl bg-[#3eaf3f] px-4 py-2 text-sm font-medium text-white">
        <IconCheck className="h-4 w-4" stroke={2.5} />
        {label}
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="inline-flex items-center rounded-xl bg-[#3965e1]/10 px-4 py-2 text-sm font-medium text-[#3965e1]">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium text-black opacity-50">
      {label}
    </span>
  );
}

// ── Center column: conversation card with tabs ────────────────────────────

type CenterTab = "summary" | "transcript";

interface ConversationCardProps {
  patientName: string;
  topics: SymptomTopic[];
  segments: { text: string }[];
  isRecording: boolean;
  onToggleRecord: () => void;
  onTabAudio: () => void;
  onAudioFile: () => void;
  tab: CenterTab;
  onTabChange: (t: CenterTab) => void;
}

function ConversationCard({
  patientName,
  topics,
  segments,
  isRecording,
  onToggleRecord,
  onTabAudio,
  onAudioFile,
  tab,
  onTabChange,
}: ConversationCardProps) {
  return (
    <section className="relative flex h-full min-h-0 flex-col items-stretch gap-4 rounded-3xl border border-[#dadada] bg-white">
      {/* Mascot — wrapped in a clipping window. Mascot itself is larger
          than the window so the bottom portion is intentionally cropped
          at the header's bottom edge; top still pokes above the card. */}
      <div className="pointer-events-none absolute right-6 -top-14 z-20 h-[142px] w-44 overflow-hidden">
        <motion.img
          src={AI_DOCTOR}
          alt="เมย์"
          aria-hidden
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="block h-44 w-auto object-contain"
        />
      </div>

      {/* Header — gradient banner with patient name, recording status.
          Min-height locks the header so the mascot clip aligns. */}
      <header className="relative flex min-h-[80px] items-start justify-between gap-4 rounded-t-3xl border-b border-[#dadada] bg-gradient-to-r from-white to-[#e5efff] p-4 pr-40">
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-[16px] font-bold text-[#1f1f1f]">
            บทสนทนากับผู้ป่วย {patientName}
          </h2>
          <p className="flex items-center gap-1.5 text-[14px] font-medium text-[#1f1f1f]/60">
            {isRecording ? (
              <>
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                </span>
                กำลังบันทึก...
              </>
            ) : (
              "Dr. Note พร้อมจดให้แล้ว — กดไมค์เพื่อเริ่มซักประวัติ"
            )}
          </p>
        </div>
      </header>

      {/* Body — tab control + content scroll area. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4">
        {/* Tab control — HeroUI Tabs (solid variant) styled to match
            Figma 1013:1713: #ebebec track + white pill on active tab. */}
        <Tabs
          aria-label="แสดงสรุปอาการ / บทสนทนาเต็ม"
          selectedKey={tab}
          onSelectionChange={(key) => onTabChange(key as CenterTab)}
          variant="solid"
          fullWidth
          radius="full"
          classNames={{
            base: "w-full",
            tabList: "bg-[#ebebec] px-2 py-1 rounded-[28px] gap-0.5",
            tab: "px-3 py-1.5 text-[14px] font-medium leading-[1.43] data-[hover-unselected=true]:opacity-100",
            cursor: "bg-white rounded-[32px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
            tabContent: "text-[#71717a] group-data-[selected=true]:text-[#18181b]",
          }}
        >
          <Tab key="summary" title="สรุปอาการสำคัญ" />
          <Tab key="transcript" title="บทสนทนา" />
        </Tabs>

        <ScrollArea>
          {/* Keep BOTH tabs mounted at all times — only toggle visibility.
              This preserves the typewriter progress in SummaryTab and the
              textarea state in TranscriptTab when the doctor flips between
              them, so it feels seamless instead of "starting over". */}
          <div className={tab === "summary" ? "flex flex-col" : "hidden"}>
            <SummaryTab topics={topics} isRecording={isRecording} />
          </div>
          <div className={tab === "transcript" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
            <TranscriptTab segments={segments} isRecording={isRecording} />
          </div>
        </ScrollArea>
      </div>

      {/* Bottom record bar — sticky footer at the bottom of the card.
          Hosts the record button + tab-audio fallback (Figma 1010:1223). */}
      <div className="shrink-0 h-[102px] border-t border-[#dadada] bg-white/60 backdrop-blur-md rounded-b-3xl">
        <div className="flex h-full flex-col items-center justify-center gap-1.5">
          {isRecording ? (
            <button
              type="button"
              onClick={onToggleRecord}
              className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-[#d9d9d9] bg-white p-4 text-[14px] font-medium text-black transition hover:bg-neutral-50"
            >
              <span
                aria-hidden
                className="block h-9 w-9 rounded-full bg-[#ff383c] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.12)]"
              />
              หยุดการบันทึก
            </button>
          ) : (
            <div className="pointer-events-auto flex items-stretch rounded-2xl border border-[#d9d9d9] bg-white text-[14px] font-medium text-black overflow-hidden">
              {/* Main record action — mic is the default source. */}
              <button
                type="button"
                onClick={onToggleRecord}
                className="flex items-center gap-4 p-4 transition hover:bg-neutral-50"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3965e1] text-white"
                >
                  <IconMicrophone className="h-5 w-5" stroke={2} />
                </span>
                เริ่มบันทึก
              </button>
              {/* Source picker — pops a menu with the other two sources. */}
              <Dropdown placement="top-end">
                <DropdownTrigger>
                  <button
                    type="button"
                    aria-label="เลือกแหล่งเสียง"
                    className="flex items-center border-l border-[#d9d9d9] px-3 text-[#1f1f1f]/60 transition hover:bg-neutral-50 hover:text-[#1f1f1f]"
                  >
                    <IconChevronDown className="h-4 w-4" stroke={2} />
                  </button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="แหล่งเสียง"
                  onAction={(key) => {
                    if (key === "mic") onToggleRecord();
                    else if (key === "tab") onTabAudio();
                    else if (key === "file") onAudioFile();
                  }}
                >
                  <DropdownItem
                    key="mic"
                    startContent={<IconMicrophone className="h-4 w-4" stroke={1.75} />}
                    description="ใช้ไมโครโฟนของอุปกรณ์นี้"
                  >
                    ไมโครโฟน
                  </DropdownItem>
                  <DropdownItem
                    key="tab"
                    startContent={<IconDeviceDesktop className="h-4 w-4" stroke={1.75} />}
                    description="Telehealth / คลิปที่เปิดในแท็บ"
                  >
                    เสียงในอุปกรณ์
                  </DropdownItem>
                  <DropdownItem
                    key="file"
                    startContent={<IconFileMusic className="h-4 w-4" stroke={1.75} />}
                    description="อัปโหลดไฟล์ .mp3 / .wav"
                  >
                    ไฟล์เสียง
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

/** Scrollable region with a floating "scroll-down" pill that appears
 *  whenever the user is not at the bottom (or new content has pushed the
 *  bottom out of view). Clicking the pill smooth-scrolls to the bottom. */
function ScrollArea({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distance < 24); // 24px tolerance — counts as "at bottom"
  }, []);

  // Re-check when content size changes (new cards / typewriter chars).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [check]);

  const handleScrollToBottom = () => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={ref}
        onScroll={check}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-48"
      >
        {children}
      </div>
      <AnimatePresence>
        {!atBottom && (
          <motion.button
            type="button"
            onClick={handleScrollToBottom}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            aria-label="เลื่อนลงล่างสุด"
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#dadada] bg-white text-[#1f1f1f]/70 shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition hover:text-[#1f1f1f] hover:bg-neutral-50"
          >
            <IconChevronDown className="h-4 w-4" stroke={2} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryTab({
  topics,
  isRecording,
}: {
  topics: SymptomTopic[];
  isRecording: boolean;
}) {
  // Throttle topic reveal — each new LLM-extracted topic surfaces at
  // most once every ~1.2s so the list grows calmly even when the model
  // emits a burst on a single tick.
  const visible = useThrottledReveal(topics, 1200);

  if (topics.length === 0 && !isRecording) {
    return (
      <div className="flex flex-1 items-center justify-center text-center text-[13px] text-[#1f1f1f]/40">
        ยังไม่มีอาการสำคัญที่สรุปได้
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {visible.map((t, i) => (
        <TopicSummaryCard key={`${t.title}-sum-${i}`} topic={t} />
      ))}
      {(isRecording || visible.length < topics.length) && <SummarySkeletonCard />}
    </div>
  );
}

function TopicSummaryCard({ topic }: { topic: SymptomTopic }) {
  return (
    <article className="group flex flex-col gap-4 border-b border-[#d9d9d9] p-4 transition-colors rounded-2xl hover:border-[#3965e1] hover:bg-[#f5f7fd]">
      <header className="flex items-center">
        <span className="inline-flex items-center gap-2 rounded-lg bg-black/5 px-2 py-1 transition-colors group-hover:bg-white">
          <IconNote
            className="h-4 w-4 shrink-0 text-[#1f1f1f]/60 transition-colors group-hover:text-[#3965e1]"
            stroke={1.5}
          />
          <span className="text-[14px] font-medium text-[#1f1f1f]">{topic.title}</span>
        </span>
      </header>
      <p className="text-[14px] font-normal leading-normal text-[#1f1f1f]/60">
        {topic.body ? <TypewriterLine text={topic.body} speed={18} /> : "—"}
      </p>
    </article>
  );
}

function SummarySkeletonCard() {
  return (
    <article className="flex flex-col gap-4 p-4">
      <header className="flex items-center">
        <span className="inline-flex items-center gap-2 rounded-lg bg-black/5 px-2 py-1">
          <IconNote className="h-4 w-4 shrink-0 text-[#1f1f1f]/30" stroke={1.5} />
          <span
            className="block h-5 w-[100px] animate-pulse rounded-full"
            style={{ backgroundImage: "linear-gradient(to right, #bdbdbd, #dddddd)" }}
          />
        </span>
      </header>
      <div className="flex flex-col gap-2">
        <div
          className="h-[18px] w-full animate-pulse rounded-full"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(189,189,189,0.6), rgba(221,221,221,0.6))",
          }}
        />
        <div
          className="h-[18px] w-3/4 animate-pulse rounded-full"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(189,189,189,0.6), rgba(221,221,221,0.6))",
          }}
        />
      </div>
    </article>
  );
}

/** Throttled reveal — caps the rate at which new transcript items appear
 *  so a burst of ASR chunks doesn't flood the panel in a single frame.
 *  Returns the prefix of `segments` that has been "revealed" so far. */
function useThrottledReveal<T>(items: T[], intervalMs = 900): T[] {
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    if (revealed >= items.length) return;
    const id = window.setTimeout(() => setRevealed((c) => c + 1), intervalMs);
    return () => window.clearTimeout(id);
  }, [revealed, items.length, intervalMs]);
  return items.slice(0, revealed);
}

/** Char-by-char typewriter for a single transcript line. Calls `onTick`
 *  every reveal step so the parent can keep auto-scroll pinned to the
 *  bottom as the line grows. */
function TypewriterLine({
  text,
  speed = 22,
  onTick,
}: {
  text: string;
  speed?: number;
  onTick?: () => void;
}) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      onTick?.();
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed, onTick]);
  const isTyping = shown.length < text.length;
  return (
    <>
      {shown}
      {isTyping && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[1em] w-[2px] -mb-0.5 animate-pulse bg-[#3965e1]/60 align-middle"
        />
      )}
    </>
  );
}

function TranscriptTab({
  segments,
  isRecording,
}: {
  segments: { text: string; speaker?: number }[];
  isRecording: boolean;
}) {
  const toast = useToast();
  const joined = segments.map((s) => s.text).join(" ");
  const [draft, setDraft] = useState(joined);
  const [isEditing, setIsEditing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Keep the textarea in sync with incoming ASR chunks whenever the user
  // is NOT mid-edit. Once they start editing, their draft owns the field
  // until they save (or discard).
  useEffect(() => {
    if (!isEditing) setDraft(joined);
  }, [joined, isEditing]);

  const handleSummarize = async () => {
    const source = draft.trim();
    if (!source || isSummarizing) return;
    setIsSummarizing(true);
    try {
      // Use the standard (non-fast) endpoint — summarization rewards
      // model quality over speed; the conversation is short anyway.
      const { text } = await chat(
        [
          {
            role: "system",
            content:
              "คุณคือ AI ผู้ช่วยแพทย์ในระบบ CIS ของโรงพยาบาลไทย หน้าที่: สรุปบทสนทนาระหว่างหมอกับผู้ป่วยให้เป็นบันทึกทางคลินิกที่กระชับ ใช้ภาษาไทย ใช้ bullet point เมื่อเหมาะสม. " +
              "ครอบคลุมหัวข้อต่อไปนี้ตามที่ผู้ป่วยพูดจริง: Chief complaint, HPI ตามกรอบ OLD CARTS (Onset, Location, Duration, Character, Aggravating/Alleviating, Radiation, Timing, Severity), PMH/ยา/แพ้ยา, Red flags. " +
              "ใช้คำศัพท์ทางคลินิกที่เหมาะสม. ห้ามแต่งข้อมูลที่ผู้ป่วยไม่ได้พูด — ถ้าหัวข้อใดไม่มีข้อมูลให้เว้นไว้หรือเขียนว่า 'ไม่ได้ระบุ'.",
          },
          { role: "user", content: source },
        ],
        { temperature: 0.2, maxTokens: 1200 },
      );
      const summary = text.trim();
      if (!summary) throw new Error("AI ไม่ได้ส่งบทสรุปกลับมา");
      setDraft(summary);
      setIsEditing(true);
      toast.success("สรุปบทสนทนาเสร็จแล้ว", "ตรวจสอบและแก้ไขได้ก่อนบันทึก");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[transcript] summarize failed:", e);
      toast.error("สรุปไม่สำเร็จ", msg);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 pb-2">
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="bordered"
          startContent={
            isEditing ? (
              <IconCheck className="h-3.5 w-3.5" stroke={2} />
            ) : (
              <IconPencil className="h-3.5 w-3.5" stroke={2} />
            )
          }
          onPress={() => setIsEditing((v) => !v)}
          className="text-[13px]"
        >
          {isEditing ? "บันทึก" : "แก้ไข"}
        </Button>
        <Button
          size="sm"
          color="primary"
          variant="flat"
          startContent={
            isSummarizing ? (
              <IconLoader2 className="h-3.5 w-3.5 animate-spin" stroke={2} />
            ) : (
              <IconSparkles className="h-3.5 w-3.5" stroke={2} />
            )
          }
          onPress={handleSummarize}
          isDisabled={!draft.trim() || isSummarizing}
          className="text-[13px]"
        >
          {isSummarizing ? "กำลังสรุป..." : "สรุปด้วย AI"}
        </Button>
      </div>

      {segments.length === 0 && !draft ? (
        <div className="flex flex-1 items-center justify-center text-center text-[13px] text-neutral-400">
          {isRecording ? "กำลังฟัง…" : "ยังไม่มีบทสนทนา"}
        </div>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (!isEditing) setIsEditing(true);
          }}
          readOnly={!isEditing}
          placeholder={isRecording ? "กำลังฟัง..." : "ยังไม่มีบทสนทนา"}
          className={[
            "min-h-[200px] w-full flex-1 resize-none rounded-2xl border bg-white px-4 py-3 text-[14px] leading-relaxed text-[#1f1f1f] transition focus:outline-none",
            isEditing
              ? "border-[#3965e1] ring-2 ring-[#3965e1]/15"
              : "border-[#d9d9d9]",
          ].join(" ")}
        />
      )}
    </div>
  );
}

// ── Right column: patient ID card preview ─────────────────────────────────

interface VitalField {
  label: string;
  value: string;
}

const DEMO_VITALS: VitalField[] = [
  { label: "ชื่อและนามสกุล", value: "สมชาย ใจดี" },
  { label: "อายุ", value: "50 ปี 2 เดือน 3 วัน" },
  { label: "เพศ", value: "ชาย" },
  { label: "ความดันโลหิต", value: "140/110" },
  { label: "ชีพจร", value: "80" },
  { label: "น้ำหนัก", value: "80" },
  { label: "ส่วนสูง", value: "180" },
];

function PatientIdCard() {
  return (
    <aside className="flex h-full min-h-0 flex-col items-start justify-between gap-4 overflow-y-auto rounded-3xl border border-[#dadada] bg-white p-4">
      <div className="flex w-full flex-col gap-4">
        {/* Smart-card visual — inline SVG so it scales crisply at any
            density and the name / barcode / chip can be updated from data
            later. Mirrors the Figma 1022:1597 layout. */}
        <PatientIdCardSvg />

        {/* Vitals stack — label left, value right, separated by `#ebebec`
            hairline rules. py-16 per Figma 1022:1601. */}
        <div className="flex w-full flex-col text-[14px] font-medium">
          {DEMO_VITALS.map((v) => (
            <div
              key={v.label}
              className="flex w-full items-center justify-between border-b border-[#ebebec] py-4"
            >
              <span className="text-[#1f1f1f]/60">{v.label}</span>
              <span className="text-[#1f1f1f]">{v.value}</span>
            </div>
          ))}
        </div>
      </div>

      <FooterNote />
    </aside>
  );
}

function FooterNote() {
  return (
    <p className="w-full text-center text-[14px] font-medium text-[#1f1f1f]/60">
      โปรดตรวจสอบความถูกต้องการบันทึกเสมอ
    </p>
  );
}

/** Patient ID card — inline SVG matching Figma 1022:1582 layout. Cyan
 *  card 409×223 with: Garuda circle + 2 blue header bars on top, vertical
 *  barcode strip on the left, yellow SIM chip + name block in the middle,
 *  portrait plate on the right. */
function PatientIdCardSvg() {
  return (
    <div className="aspect-[409/223] w-full overflow-hidden rounded-2xl border border-[#cccccc]">
      <svg
        viewBox="0 0 409 223"
        xmlns="http://www.w3.org/2000/svg"
        className="block h-full w-full"
        aria-label="บัตรประจำตัวประชาชน — นายสมชาย ใจดี"
        role="img"
      >
        <defs>
          <clipPath id="cardClip">
            <rect width="409" height="223" rx="24" />
          </clipPath>
          <clipPath id="photoClip">
            <rect x="300" y="100" width="85" height="100" rx="8" />
          </clipPath>
        </defs>

        {/* Card base */}
        <rect width="409" height="223" rx="24" fill="#abe5f5" />

        {/* Card-clipped group — keeps the barcode strip from peeking past
            the rounded corners. */}
        <g clipPath="url(#cardClip)">
          {/* Vertical barcode strip on the left edge */}
          <g transform="translate(8, 50)">
            {[
              { y: 0, h: 4 },
              { y: 7, h: 2 },
              { y: 12, h: 6 },
              { y: 22, h: 2 },
              { y: 27, h: 4 },
              { y: 35, h: 8 },
              { y: 47, h: 2 },
              { y: 52, h: 4 },
              { y: 60, h: 2 },
              { y: 65, h: 6 },
              { y: 75, h: 2 },
              { y: 80, h: 4 },
              { y: 88, h: 6 },
              { y: 98, h: 2 },
              { y: 103, h: 8 },
              { y: 115, h: 2 },
              { y: 120, h: 4 },
              { y: 128, h: 6 },
              { y: 138, h: 2 },
              { y: 143, h: 4 },
            ].map((b, i) => (
              <rect key={i} x="0" y={b.y} width="24" height={b.h} fill="#3a3a3a" />
            ))}
          </g>
        </g>

        {/* Garuda emblem — white circle (36px) with the Royal Garuda
            inside, top-left. */}
        <g transform="translate(28, 28)">
          <circle cx="0" cy="0" r="17.5" fill="#ffffff" stroke="#1f1f1f" strokeWidth="1" />
          <image
            href={GARUDA_EMBLEM}
            x="-14"
            y="-14"
            width="28"
            height="28"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>

        {/* Two blue header bars — placeholder strips for "card title /
            id number" copy. */}
        <rect x="66" y="14" width="255" height="14" rx="7" fill="rgba(57,101,225,0.6)" />
        <rect x="66" y="36" width="161" height="12" rx="6" fill="rgba(57,101,225,0.6)" />

        {/* "ชื่อและนามสกุล" label (small, above the name) */}
        <text
          x="78"
          y="72"
          fontFamily="Google Sans, Noto Sans Thai Looped, sans-serif"
          fontSize="8"
          fill="#1f1f1f"
        >
          ชื่อและนามสกุล
        </text>

        {/* Name (Thai, bold) */}
        <text
          x="140"
          y="86"
          fontFamily="Google Sans, Noto Sans Thai Looped, sans-serif"
          fontSize="12"
          fontWeight="700"
          fill="#1f1f1f"
        >
          นายสมชาย ใจดี
        </text>

        {/* Transliteration (English, regular) */}
        <text
          x="140"
          y="100"
          fontFamily="Google Sans, sans-serif"
          fontSize="10"
          fontWeight="400"
          fill="#1f1f1f"
        >
          Mr. Somchai Jaidee
        </text>

        {/* SIM-style yellow chip (Figma 1020:1375) */}
        <rect x="78" y="104" width="58" height="53" rx="8" fill="#fddd86" />

        {/* Portrait photo plate (Figma 1020:1374) */}
        <rect x="300" y="100" width="85" height="100" rx="8" fill="#e1e4e6" />
        <image
          href={PATIENT_AVATAR}
          x="300"
          y="100"
          width="85"
          height="100"
          clipPath="url(#photoClip)"
          preserveAspectRatio="xMidYMid slice"
        />
      </svg>
    </div>
  );
}

