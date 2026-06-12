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
  IconDots,
  IconCamera,
  IconForms,
  IconShieldCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import type { SaveCommitField } from "./SaveCommitOverlay";
import { useDictationContext } from "../contexts/DictationContext";
import { useSidebar } from "../contexts/SidebarContext";
import { chat, chatJSON } from "../services/ai/llm";
import { searchKb } from "../services/ai/kb";
import {
  A2UI_CATALOG_SYSTEM,
  A2UI_PATIENT_DESCRIBE_TASK,
  A2UI_PATIENT_EXTRACT_TASK,
} from "../services/a2ui/catalog";
import { ocr } from "../services/ai/ocr";
import {
  validateA2UIResponse,
  type A2UIActionEvent,
  type A2UIResponse,
} from "../services/a2ui/types";
import { useToast } from "../contexts/ToastContext";
import { addPatient, nextHN, saveProfile } from "../data/patientStore";
import { upsertPatient } from "../services/supabase/patients";
import { stashFreshSave } from "../data/freshSaveHandoff";
import { pushNurseHandoff, useNurseHandoffs } from "../data/nurseHandoff";
import DoctorCalendar from "./DoctorCalendar";
import type { Patient, BloodGroup, Gender, Rh } from "../types";
import AI_DOCTOR from "../assets/figma/ai-mascot-notepad.png";
import GARUDA_EMBLEM from "../assets/figma/garuda-emblem.svg";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Phase = "select" | "scanning" | "camera" | "ocr" | "input" | "review";

// Active OPD doctors the nurse can forward the registered patient to. Kept
// in-sync with `data/mock/operational.ts:DOCTORS`.
const FORWARD_DOCTORS = [
  "นพ.ราอูล มันเมาะ",
  "พญ.สุภาวดี ปิยะรัตน์",
  "นพ.ธวัชชัย พงษ์สวัสดิ์",
  "พญ.อรพิน วงศ์ใหญ่",
  "นพ.กิตติ บุญทวี",
];
const FORWARD_CLINICS = ["OPD ทั่วไป", "อายุรกรรม", "ศัลยกรรม", "กุมารเวช", "สูตินรีเวช"];

const EXAMPLE =
  "เช่น: ผู้ป่วยชายอายุ 45 ปี ชื่อสมชาย ใจดี เลขบัตร 1234567890123 โทร 0812345678 แพ้ penicillin มีโรคความดันโลหิตสูง...";

// Smart-card scan is mocked — there's no real reader wired up. When the
// doctor picks "scan ID card" we prefill the captured identity with our
// canonical demo patient, สมชาย ใจดี, so the ID-card panel + conversation
// header read as a real returning patient. Keys mirror the `patient.*`
// bindings that `derivePatientInfo` / the save handler read.
const SCAN_MOCK_SOMCHAI: A2UIResponse = {
  rootId: "scan-somchai",
  components: [],
  data: {
    "patient.prefix": "นาย",
    "patient.firstName": "สมชาย",
    "patient.lastName": "ใจดี",
    "patient.cid": "1103702456789",
    "patient.gender": "ชาย",
    "patient.birthdate": "1985-03-12",
    "patient.blood": "O",
    "patient.rh": "+",
    "patient.mobilePhone": "081-234-5678",
    "patient.religion": "พุทธ",
    "patient.nationality": "ไทย",
    "patient.marital": "สมรส",
  },
};

// Known-patient EHR, keyed by national ID. When the scanned/known patient
// matches, the report's "from EHR" sections (medical history + medications)
// fill from here instead of reading as a blank new patient. สมชาย ใจดี's
// record mirrors his rich entry in `mock/patients.ts`.
export interface PatientEhr {
  history: string[];
  meds: string[];
  visits: string[];
  reason?: string;
  vitals?: string;
}
const EMPTY_EHR: PatientEhr = { history: [], meds: [], visits: [] };
const KNOWN_EHR: Record<string, PatientEhr> = {
  // สมชาย ใจดี
  "1103702456789": {
    reason: "นัดติดตามเบาหวาน / ความดัน และปรับยา",
    vitals: "BP 152/94 mmHg · BMI 27.6 · HR 82 · Temp 36.6°C",
    history: [
      "เบาหวานชนิดที่ 2 (E11.9) — ควบคุมได้ไม่ดี",
      "ความดันโลหิตสูง (I10)",
      "ไขมันในเลือดสูง (E78.5)",
      "แพ้ยา Sulfa (ผื่น)",
    ],
    meds: [
      "Metformin 1000 mg หลังอาหารเช้า-เย็น",
      "Glipizide 5 mg ก่อนอาหารเช้า",
      "Losartan 50 mg วันละครั้ง เช้า",
      "Atorvastatin 20 mg ก่อนนอน",
      "Aspirin 81 mg วันละครั้ง",
    ],
    visits: [
      "8 วันก่อน · DM Clinic · ติดตาม HbA1c → DM type 2 uncontrolled (8.4%)",
      "38 วันก่อน · อายุรกรรม · ปวดตึงท้ายทอย เวียนศีรษะ → HT ควบคุมไม่ดี (158/96)",
      "98 วันก่อน · DM Clinic · เบิกยาเดิม",
      "156 วันก่อน · OPD ทั่วไป · ไอมีเสมหะ เจ็บคอ → Acute bronchitis",
    ],
  },
};
function ehrForCid(cid?: string): PatientEhr {
  return KNOWN_EHR[(cid ?? "").replace(/\D/g, "")] ?? EMPTY_EHR;
}

export default function NewPatientByVoice() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isRecording, startSession, stopSession, segments, source, asrInFlight, handleClose: clearDictation } =
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

  const [phase, setPhase] = useState<Phase>("select");
  const [prompt, setPrompt] = useState("");
  const [extracted, setExtracted] = useState<A2UIResponse | null>(null);
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [centerTab, setCenterTab] = useState<CenterTab>("summary");
  // Default the ID card collapsed on tablet/mobile (< lg) so the ID column +
  // conversation + mascot don't squeeze; the user can expand it on demand.
  const [idCardCollapsed, setIdCardCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024,
  );
  // Extraction runs in the background while the user stays on the input
  // screen (the "ถัดไป" button spins). No dedicated loading page.
  const [isExtracting, setIsExtracting] = useState(false);
  // Vital-signs modal opens once when the doctor first lands on the input
  // phase. Skipping or saving closes it for the rest of the session.
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [vitalsSeen, setVitalsSeen] = useState(false);
  const [vitalsValues, setVitalsValues] = useState<VitalsState | null>(null);
  // Doctor + clinic the nurse picks before forwarding. Surface on the
  // review screen so the nurse can override the defaults inline.
  const [forwardDoctor, setForwardDoctor] = useState<string>(FORWARD_DOCTORS[0]);
  const [forwardClinic, setForwardClinic] = useState<string>(FORWARD_CLINICS[0]);
  const [generated, setGenerated] = useState<GeneratedNote | null>(null);
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Build SOAP-style note from the captured conversation transcript: CC,
  // PI, PE, ICD-10 candidates, treatment plan. Pure LLM call — no
  // hand-edited fields.
  const handleGenerateNote = useCallback(async () => {
    const transcript = segments
      .map((s) => s.text.trim())
      .filter(Boolean)
      .join("\n");
    if (!transcript) {
      toast.error("ยังไม่มีบทสนทนา", "เริ่มบันทึกหรือพิมพ์บทสนทนาก่อน");
      return;
    }
    setGenerating(true);
    try {
      // Use `chat` (not `chatJSON`) so we can robustly extract the JSON
      // object — some models prefix prose / wrap in ```json fences even
      // with `response_format: json_object`. Truncation at low maxTokens
      // is another failure mode (5k buffer leaves headroom for ICD-10 +
      // medications + plan).
      const { text } = await chat(
        [
          { role: "system", content: GENERATE_NOTE_SYSTEM },
          { role: "user", content: transcript },
        ],
        { temperature: 0.2, maxTokens: 5000, responseFormat: "json_object" },
      );
      console.debug("[opd-note] raw LLM output:", text);
      const parsed = extractJsonObject(text);
      if (!parsed) throw new Error("AI ส่งคำตอบที่ parse JSON ไม่ได้");
      const draft = normalizeGeneratedNote(parsed);
      setGenerated(draft);
      // RAG verify ICD-10 codes against kbBase dictionary in background —
      // results stream in once `searchKb` returns.
      verifyIcd10Candidates(draft.icd10)
        .then((verified) => setGenerated((g) => (g ? { ...g, icd10: verified } : g)))
        .catch(() => {});
      toast.success("สร้างข้อมูลสำเร็จ", "ตรวจสอบ CC / PI / PE / ICD-10 / Plan ได้เลย");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("สร้างข้อมูลไม่สำเร็จ", msg);
    } finally {
      setGenerating(false);
    }
  }, [segments, toast]);

  useEffect(() => {
    if (phase === "input" && !vitalsSeen) {
      setVitalsModalOpen(true);
      setVitalsSeen(true);
    }
  }, [phase, vitalsSeen]);

  // Live clinical-topic extraction (Figma 996:1456) — drives the center
  // summary tab. OLD CARTS topics surface as the patient is interviewed.
  const { topics, inFlight: topicInFlight } = useSymptomTopicsFromLLM(segments, isRecording);
  // Live HPI narrative — a single prose paragraph the LLM refines in place
  // as the interview grows (separate from the OLD CARTS topic chips).
  const { hpi } = useHpiNarrativeFromLLM(segments, isRecording);
  // Live medication extraction (interview) + the scanned patient's EHR meds.
  const { meds: interviewMeds } = useMedsFromLLM(segments, isRecording);
  const ehr = useMemo(
    () => ehrForCid(extracted?.data?.["patient.cid"]),
    [extracted],
  );

  // Mirror the active dictation segments (live OR frozen via manual save)
  // into the `prompt` state so the next-step gate + extractor always see
  // whatever's actually in the transcript card, not just what was typed
  // into the textarea before this re-render.
  useEffect(() => {
    const text = segments.map((s) => s.text).join(" ").trim();
    setPrompt(text);
  }, [segments]);

  // Focus on mount so the user can start typing immediately
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const handleMic = useCallback(() => {
    if (isRecording) {
      if (asrInFlight + topicInFlight > 0) {
        setStopConfirmOpen(true);
        return;
      }
      void stopSession();
    } else {
      startSession("mic");
    }
  }, [isRecording, startSession, stopSession, asrInFlight, topicInFlight]);

  const handleTabAudio = useCallback(() => {
    if (isRecording) void stopSession();
    else startSession("tab");
  }, [isRecording, startSession, stopSession]);

  // Audio-file fallback: open a native file picker; once a file is chosen
  // we let the dictation context handle ingestion if/when that path is
  // wired up. For now this surfaces a clear toast so the doctor knows the
  // file was received, even if backend ingest is still WIP.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const handleAudioFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Step 1 → OCR option: open live camera viewfinder. User can either snap
  // a frame or fall back to file picker from within the camera view.
  const handlePickOcr = useCallback(() => {
    setPhase("camera");
  }, []);
  const handlePickOcrFile = useCallback(() => {
    ocrFileInputRef.current?.click();
  }, []);

  // Real OCR + extract pipeline. Uploads file to `${ocrBase}/api/ocr_image/upload`,
  // hands text to LLM via `A2UI_PATIENT_EXTRACT_TASK`, jumps to input phase.
  const runOcrPipeline = useCallback(
    async (file: File | Blob) => {
      setPhase("ocr");
      // Kick off face crop in parallel with OCR — both read the same image
      // but don't block each other.
      cropPortraitFromIdCard(file)
        .then((url) => setPortraitUrl(url))
        .catch(() => setPortraitUrl(null));
      try {
        const ocrResult = await ocr(file as File);
        const text = ocrResult.text?.trim();
        if (!text) throw new Error("OCR ไม่พบข้อความบนบัตร");
        const llmResult = await chat(
          [
            {
              role: "system",
              content: `${A2UI_CATALOG_SYSTEM}\n\n${A2UI_PATIENT_EXTRACT_TASK}`,
            },
            { role: "user", content: text },
          ],
          { temperature: 0.1, maxTokens: 2500, responseFormat: "json_object" },
        );
        const parsed = JSON.parse(llmResult.text);
        const validated = validateA2UIResponse(parsed);
        if (!validated) throw new Error("AI ไม่สามารถสกัดข้อมูลจากบัตรได้");
        setExtracted(validated);
        setPhase("input");
        toast.success("อ่านบัตรประชาชนสำเร็จ", "ตรวจสอบข้อมูลและบันทึกได้เลย");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error("อ่านบัตรไม่สำเร็จ", msg);
        setPhase("select");
      }
    },
    [toast],
  );
  const handleOcrFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      await runOcrPipeline(file);
    },
    [runOcrPipeline],
  );
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
      setIsExtracting(true);
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
      } finally {
        setIsExtracting(false);
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

        // Nurse → doctor handoff. Lands in the doctor's schedule + inbox
        // immediately via the shared `nurseHandoff` store.
        const reasonBits: string[] = [];
        if (profileForm.allergies) reasonBits.push(`แพ้: ${profileForm.allergies}`);
        if (profileForm.chronicConditions)
          reasonBits.push(`โรคประจำตัว: ${profileForm.chronicConditions}`);
        if (profileForm.note) reasonBits.push(profileForm.note);
        pushNurseHandoff({
          hn: patient.hn,
          patientName: `${patient.prefix ?? ""}${firstName} ${lastName}`.trim(),
          doctor: forwardDoctor,
          clinic: forwardClinic,
          reason: reasonBits.join(" · ") || undefined,
          vitals: vitalsValues
            ? {
                systolic: vitalsValues.systolic,
                diastolic: vitalsValues.diastolic,
                pulse: vitalsValues.pulse,
                temperature: vitalsValues.temperature,
                respiratoryRate: vitalsValues.respiratoryRate,
                spo2: vitalsValues.spo2,
                weight: vitalsValues.weight,
                height: vitalsValues.height,
              }
            : undefined,
        });

        toast.success(
          "ส่งต่อให้แพทย์แล้ว",
          `HN ${patient.hn} • ${firstName} ${lastName} → ${forwardDoctor}`,
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
        navigate(`/opd/${patient.hn}`);
        return;
      }
      if (event.action === "discard") {
        handleEditDescription();
      }
    },
    [navigate, toast, forwardDoctor, forwardClinic, vitalsValues],
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

  const patientInfo = useMemo(
    () => derivePatientInfo(extracted, vitalsValues),
    [extracted, vitalsValues],
  );

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      {/* Reserve space for the floating TopBar card (top-4 + h-16 = 80px). */}
      <div className="h-16 shrink-0" aria-hidden />
      {/* ── Main panel ─────────────────────────────────────────────────── */}
      <main
        className={[
          "flex min-w-0 flex-col overflow-hidden h-[calc(100vh-6rem)] mr-4 mt-4 mb-4 transition-[margin] duration-300 ease-out",
          // Match the global Notion-style sidebar width: 280px panel + 16px
          // gutter on each side = 312px when visible, 16px when hidden.
          railHidden ? "ml-4" : "ml-4 lg:ml-[296px]",
        ].join(" ")}
      >
        {/* Content area — same single-screen layout on every phase so the
            page feels like one continuous Dr Note workspace. The phase
            content itself handles its own internal scrolling when the
            form is longer than the viewport. */}
        <div className="flex w-full min-h-0 flex-1 flex-col gap-4 overflow-hidden py-0">
        {/* Persistent stepper — visible on every phase per the user's
            request. Cancel/next handlers depend on the current phase.
            For the extracting/review phases the stepper also acts as the
            page header, so the old `<PageHeader>` is no longer needed. */}
        <StepperBar
          phase={phase}
          isExtracting={isExtracting}
          nextEnabled={
            phase === "input"
              ? segments.some((s) => s.text.trim().length > 0) && !isRecording
              : false
          }
          onCancel={() => {
            if (phase === "scanning" || phase === "ocr" || phase === "camera")
              setPhase("select");
            else if (phase === "review") setPhase("input");
            else navigate("/");
          }}
          onNext={() => {
            if (phase === "select" || phase === "scanning" || phase === "ocr" || phase === "camera")
              setPhase("input");
            else if (phase === "input") handleSubmitInput();
          }}
        />

        {/* Phase: SELECT — first step. Two big choice cards: smart-card
            scan vs traditional manual form. Picking one advances to the
            next phase (or jumps straight to the legacy manual form). */}
        <AnimatePresence mode="wait">
          {phase === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: EASE_TV }}
              className="flex min-h-0 flex-1 flex-col gap-4"
            >
              <SelectMethodView
                onPickScan={() => setPhase("scanning")}
                onPickOcr={handlePickOcr}
                onPickManual={() => navigate("/patient/new/manual")}
              />
            </motion.div>
          )}
          {phase === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: EASE_TV }}
              className="flex min-h-0 flex-1 flex-col gap-4"
            >
              <ScanningCardView
                onDone={() => {
                  // Prefill the scanned identity with our demo patient.
                  setExtracted(SCAN_MOCK_SOMCHAI);
                  setPhase("input");
                }}
              />
            </motion.div>
          )}
          {phase === "camera" && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: EASE_TV }}
              className="flex min-h-0 flex-1 flex-col gap-4"
            >
              <CameraCaptureView
                onCapture={(blob) => runOcrPipeline(blob)}
                onPickFile={handlePickOcrFile}
                onCancel={() => setPhase("select")}
              />
            </motion.div>
          )}
          {phase === "ocr" && (
            <motion.div
              key="ocr"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: EASE_TV }}
              className="flex min-h-0 flex-1 flex-col gap-4"
            >
              <OcrScanView />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden file input for the ID-card OCR flow. `capture="environment"`
            opens the rear camera on mobile; on desktop falls back to the
            normal file chooser so doctors can drop in a scanned image too. */}
        <input
          ref={ocrFileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handleOcrFileSelected}
        />

        {/* Phase: INPUT — Speech-to-text capture screen (Figma 996:1456).
            Three-column layout: key-topics list (left), conversation card
            with summary/transcript tabs (center), and patient ID-card
            preview (right). */}
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
              {/* Two-column layout (Figma 1117:1864) — ID card on the
                  left so the doctor can verify identity at a glance,
                  workspace on the right. */}
              <div
                className={[
                  "grid min-h-0 flex-1 gap-4 transition-[grid-template-columns] duration-300 ease-out",
                  idCardCollapsed
                    ? "grid-cols-[52px_minmax(0,1fr)]"
                    : "grid-cols-[300px_minmax(0,1fr)]",
                ].join(" ")}
              >
                <PatientIdCard
                  info={patientInfo}
                  portraitUrl={portraitUrl}
                  collapsed={idCardCollapsed}
                  onToggle={() => setIdCardCollapsed((v) => !v)}
                />
                <ConversationCard
                  patientName={patientInfo.fullName || "ผู้ป่วยใหม่"}
                  topics={topics}
                  hpi={hpi}
                  ehr={ehr}
                  interviewMeds={interviewMeds}
                  segments={segments}
                  isRecording={isRecording}
                  onToggleRecord={handleMic}
                  onTabAudio={handleTabAudio}
                  onAudioFile={handleAudioFile}
                  tab={centerTab}
                  onTabChange={setCenterTab}
                  asrInFlight={asrInFlight}
                  topicInFlight={topicInFlight}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={handleFileSelected}
                />
              </div>
            </motion.div>
          )}

          {/* Phase: EXTRACTING — module card + field rows stagger in,
              matching the post-save commit visualizer's visual language for
              one continuous "data being prepared/filed" narrative. */}
          {/* Phase: REVIEW — A2UI form + edit-description hint */}
          {phase === "review" && extracted && (
            <motion.section
              key="review"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: EASE_TV }}
              className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto"
            >
              {/* Compact action bar — single row with status, generate
                  CTA, and re-analyze / edit-description controls. */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--theme-primary)]/20 bg-[var(--theme-primary-soft)] px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <img src={AI_DOCTOR} alt="" className="h-8 w-auto object-contain" />
                  <p className="text-[13px] text-[var(--theme-neutral)]">
                    เมย์กรอกได้{" "}
                    <strong className="text-[var(--theme-primary)]">
                      {populatedCount.filled}/{populatedCount.total}
                    </strong>{" "}
                    ฟิลด์
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {segments.some((s) => s.text.trim().length > 0) && (
                    <Button
                      color="primary"
                      className="bg-[#1ebfbf] text-white"
                      size="sm"
                      radius="full"
                      isLoading={generating}
                      startContent={!generating && <IconSparkles className="h-4 w-4" />}
                      onPress={handleGenerateNote}
                    >
                      สร้าง OPD Note
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={handleReExtract}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--theme-primary)]/20 bg-[var(--theme-surface)] px-3 py-1.5 text-xs font-medium text-[var(--theme-primary)] hover:bg-[var(--theme-primary-soft)]"
                  >
                    <IconRefresh className="h-3.5 w-3.5" stroke={2} />
                    วิเคราะห์ใหม่
                  </button>
                  <button
                    type="button"
                    onClick={handleEditDescription}
                    className="rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 py-1.5 text-xs font-medium text-[var(--theme-neutral)]/65 hover:bg-[var(--theme-primary-soft)]"
                  >
                    แก้คำอธิบาย
                  </button>
                </div>
              </div>

              <ForwardToDoctorPicker
                doctor={forwardDoctor}
                clinic={forwardClinic}
                doctors={FORWARD_DOCTORS}
                clinics={FORWARD_CLINICS}
                onDoctorChange={setForwardDoctor}
                onClinicChange={setForwardClinic}
              />

              {/* Main 2-col grid. Form left (fills), right column stacks
                  the doctor calendar on top + OPD note panel (when
                  generated) below — so on the same screen the nurse sees
                  patient data, the doctor's day, AND the AI draft note. */}
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
                <PatientReviewForm
                  initialData={extracted.data ?? {}}
                  onApply={(data) =>
                    handleA2UIAction({ action: "apply_all", data, source: "review_form" })
                  }
                  onDiscard={() =>
                    handleA2UIAction({ action: "discard", data: {}, source: "review_form" })
                  }
                />
                <div className="flex min-h-0 flex-col gap-4">
                  <div className="min-h-[320px] flex-1">
                    <DoctorTodaySchedule doctor={forwardDoctor} clinic={forwardClinic} />
                  </div>
                  {(generating || generated) && (
                    <GeneratedNotePanel generated={generated} generating={generating} />
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
        </div>

      </main>

      {/* Vital signs modal — pops once when the doctor first lands on the
          input phase. Both ข้าม and บันทึก close it. */}
      <VitalSignsModal
        open={vitalsModalOpen}
        onSkip={() => setVitalsModalOpen(false)}
        onSave={(vitals) => {
          setVitalsValues(vitals);
          setVitalsModalOpen(false);
        }}
      />

      {/* Confirm-stop modal — surfaces in-flight AI work so the doctor
          can wait for it instead of dropping ASR partials mid-flight. */}
      <StopRecordingConfirm
        open={stopConfirmOpen}
        asrInFlight={asrInFlight}
        topicInFlight={topicInFlight}
        onCancel={() => setStopConfirmOpen(false)}
        onConfirm={() => {
          setStopConfirmOpen(false);
          void stopSession();
        }}
      />
    </div>
  );
}

// ── Record-button glyph with progress ring + success flash ───────────────
// While recording: red center dot wrapped in a rotating dashed primary ring
// suggesting continuous capture. On stop: brief green check ring (~1.4s)
// then settles back to the resting "mic" state. Driven entirely by the
// `isRecording` transition so the parent doesn't need to manage anything.

function RecordButtonGlyph({ isRecording }: { isRecording: boolean }) {
  const [showSuccess, setShowSuccess] = useState(false);
  const wasRecordingRef = useRef(isRecording);
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      setShowSuccess(true);
      const t = window.setTimeout(() => setShowSuccess(false), 1400);
      return () => window.clearTimeout(t);
    }
    wasRecordingRef.current = isRecording;
  }, [isRecording]);

  return (
    <span aria-hidden className="relative flex h-9 w-9 items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        {isRecording ? (
          <motion.svg
            key="rec"
            viewBox="0 0 40 40"
            className="absolute inset-0 h-full w-full"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25, ease: EASE_TV }}
          >
            <circle cx="20" cy="20" r="18" fill="#ff383c" />
            <motion.circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeDasharray="22 14"
              strokeLinecap="round"
              animate={{ rotate: 360 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "20px 20px" }}
            />
          </motion.svg>
        ) : showSuccess ? (
          <motion.svg
            key="ok"
            viewBox="0 0 40 40"
            className="absolute inset-0 h-full w-full"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.32, ease: EASE_TV }}
          >
            <motion.circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="var(--theme-success)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 18}
              initial={{ strokeDashoffset: 2 * Math.PI * 18 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.5, ease: EASE_TV }}
            />
            <circle cx="20" cy="20" r="18" fill="var(--theme-success)" opacity="0.12" />
            <motion.path
              d="M13 20.5 L18 25.5 L28 14.5"
              fill="none"
              stroke="var(--theme-success)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.18, duration: 0.32, ease: EASE_TV }}
            />
          </motion.svg>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.22, ease: EASE_TV }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--theme-primary)] text-white"
          >
            <IconMicrophone className="h-5 w-5" stroke={2} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// ── Generated OPD note panel ─────────────────────────────────────────────
// Compact card rendering the AI-drafted CC / PI / PE / ICD-10 / meds /
// plan inline on the review screen. Shows a loading skeleton while the
// LLM call is in flight; once result lands, renders the sections in a
// dense stack. Sits in the right column under the doctor calendar.

function GeneratedNotePanel({
  generated,
  generating,
}: {
  generated: GeneratedNote | null;
  generating: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-[#1ebfbf]/30 bg-[var(--theme-surface)] p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1ebfbf]/15 text-[#1ebfbf]">
            <IconSparkles className="h-4 w-4" stroke={2} />
          </span>
          <span className="text-[13px] font-bold text-[var(--theme-neutral)]">
            OPD Note (AI draft)
          </span>
        </div>
        {generating ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1ebfbf]">
            <IconLoader2 className="h-3 w-3 animate-spin" stroke={2.2} />
            กำลังสร้าง…
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f5a524]/15 px-2 py-0.5 text-[10px] font-semibold text-[#b06d00]">
            <IconAlertCircle className="h-3 w-3" stroke={2.2} />
            ตรวจสอบก่อนใช้
          </span>
        )}
      </header>

      {!generated && generating && (
        <div className="space-y-2 text-[12px] text-[var(--theme-neutral)]/55">
          <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--theme-neutral)]/10" />
          <div className="h-3 w-full animate-pulse rounded bg-[var(--theme-neutral)]/10" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--theme-neutral)]/10" />
        </div>
      )}

      {generated && (
        <div className="flex flex-col gap-2.5">
          <NoteRow label="CC" value={generated.cc} />
          <NoteRow label="PI" value={generated.pi} />
          <NoteRow label="PE" value={generated.pe} />
          <div className="rounded-lg border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 p-2.5">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[11px] font-bold text-[var(--theme-neutral)]">ICD-10</span>
              <span className="text-[10px] text-[var(--theme-neutral)]/55">Suggestion</span>
            </div>
            {generated.icd10.length === 0 ? (
              <p className="text-[11px] text-[var(--theme-neutral)]/40">—</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {generated.icd10.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11.5px]">
                    <span className="rounded bg-[#1ebfbf]/15 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-[#0d8f8f]">
                      {d.code || "?"}
                    </span>
                    <span className="flex-1 text-[var(--theme-neutral)]/85">
                      {d.kbLabel || d.label}
                    </span>
                    {d.verified ? (
                      <IconShieldCheck
                        className="h-3.5 w-3.5 text-[var(--theme-success)]"
                        stroke={2.2}
                      />
                    ) : (
                      <IconAlertCircle className="h-3.5 w-3.5 text-[#b06d00]" stroke={2.2} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 p-2.5">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[11px] font-bold text-[var(--theme-neutral)]">ยา</span>
              <span className="text-[10px] text-[var(--theme-neutral)]/55">Medications</span>
            </div>
            {generated.medications.length === 0 ? (
              <p className="text-[11px] text-[var(--theme-neutral)]/40">—</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {generated.medications.map((m, i) => (
                  <li key={i} className="text-[11.5px]">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono font-bold text-[var(--theme-primary)]">
                        {m.name}
                      </span>
                      {m.dose && (
                        <span className="font-mono font-semibold text-[var(--theme-neutral)]/85">
                          {m.dose}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--theme-neutral)]/60">
                      {[m.route, m.frequency, m.duration].filter(Boolean).join(" · ")}
                    </div>
                    {m.indication && (
                      <p className="text-[10.5px] text-[var(--theme-neutral)]/75">{m.indication}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <NoteRow label="Plan" value={generated.plan} />
        </div>
      )}
    </div>
  );
}

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 p-2.5">
      <span className="text-[11px] font-bold text-[var(--theme-neutral)]">{label}</span>
      <p className="mt-0.5 whitespace-pre-line text-[11.5px] leading-relaxed text-[var(--theme-neutral)]/85">
        {value?.trim() || "—"}
      </p>
    </div>
  );
}

// ── Doctor calendar preview on review screen ─────────────────────────────
// Lets the OPD nurse glance at the doctor's day before forwarding, so they
// can pick a less-loaded doctor / clinic, or flag urgent cases. Reads from
// the same `TODAY_APPOINTMENTS` mock + live `useNurseHandoffs` queue used
// by the actual doctor schedule page.

function DoctorTodaySchedule({ doctor, clinic }: { doctor: string; clinic: string }) {
  const handoffs = useNurseHandoffs();
  // Real-only: just the nurse → doctor handoffs filtered by selected doctor.
  // Each handoff becomes a 20-min FullCalendar event keyed off its
  // `forwardedAt` timestamp.
  const events = useMemo(
    () =>
      handoffs
        .filter((h) => h.doctor === doctor)
        .map((h) => {
          const start = new Date(h.forwardedAt);
          const end = new Date(start.getTime() + 20 * 60_000);
          return {
            id: h.id,
            title: `${h.patientName} · HN ${h.hn}`,
            start: start.toISOString(),
            end: end.toISOString(),
            backgroundColor: "var(--theme-primary)",
            borderColor: "var(--theme-primary)",
            extendedProps: {
              clinic: h.clinic,
              reason: h.reason,
            },
          };
        }),
    [handoffs, doctor],
  );

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 rounded-3xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-5">
      <header className="flex items-baseline justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--theme-primary)]">
            ตารางวันนี้
          </span>
          <span className="mt-0.5 text-[14px] font-bold text-[var(--theme-neutral)]">
            {doctor}
          </span>
          <span className="text-[12px] text-[var(--theme-neutral)]/55">{clinic}</span>
        </div>
        <span className="rounded-full bg-[var(--theme-primary)]/12 px-2 py-0.5 text-[11px] font-semibold text-[var(--theme-primary)]">
          {events.length} ราย
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--theme-neutral)]/10">
        <DoctorCalendar events={events} />
      </div>
    </aside>
  );
}

// ── Desktop-dense patient review form ────────────────────────────────────
// Replaces the generic A2UIRenderer for the review screen. Fields are
// fixed to the OPD-card schema the extractor task targets so we can lay
// them out as a dense, HOSxP-style desktop form (3-up grid, small inputs,
// sticky action row).

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  span?: 1 | 2 | 3;
}

const REVIEW_GENERAL: FieldDef[] = [
  { key: "patient.prefix", label: "คำนำหน้า", placeholder: "นาย/นาง/นางสาว…" },
  { key: "patient.firstName", label: "ชื่อ", required: true },
  { key: "patient.lastName", label: "นามสกุล" },
  { key: "patient.gender", label: "เพศ", placeholder: "ชาย/หญิง" },
  { key: "patient.birthdate", label: "วันเกิด", placeholder: "YYYY-MM-DD" },
  { key: "patient.cid", label: "เลขบัตรประชาชน", placeholder: "13 หลัก" },
  { key: "patient.nationality", label: "สัญชาติ", placeholder: "ไทย", required: true },
  { key: "patient.religion", label: "ศาสนา" },
  { key: "patient.marital", label: "สถานภาพสมรส", placeholder: "โสด/สมรส/หย่า…" },
  { key: "patient.occupation", label: "อาชีพ" },
  { key: "patient.mobilePhone", label: "เบอร์โทรศัพท์", placeholder: "08…" },
];

const REVIEW_CLINICAL: FieldDef[] = [
  { key: "patient.blood", label: "หมู่เลือด", placeholder: "A/B/AB/O" },
  { key: "patient.rh", label: "Rh", placeholder: "Rh+/Rh-" },
  { key: "patient.allergies", label: "แพ้ยา/อาหาร", multiline: true, span: 3 },
  { key: "patient.chronicConditions", label: "โรคประจำตัว", multiline: true, span: 3 },
  { key: "patient.note", label: "หมายเหตุ", multiline: true, span: 3 },
];

function PatientReviewForm({
  initialData,
  onApply,
  onDiscard,
}: {
  initialData: Record<string, string>;
  onApply: (data: Record<string, string>) => void;
  onDiscard: () => void;
}) {
  const [data, setData] = useState<Record<string, string>>(initialData);
  // Refresh when a fresh OCR run replaces `initialData`.
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const set = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div className="flex flex-col rounded-3xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] py-6">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 px-8">
        <Accordion
          selectionMode="multiple"
          defaultExpandedKeys={new Set(["general", "clinical"])}
          variant="splitted"
          itemClasses={{
            base: "shadow-none border border-[var(--theme-neutral)]/15 rounded-2xl",
            title: "text-[14px] font-bold text-[var(--theme-neutral)]",
            trigger: "py-3 px-4",
            content: "px-4 pb-5 pt-1",
          }}
        >
          <AccordionItem
            key="general"
            aria-label="ข้อมูลทั่วไป"
            title={
              <SectionAccordionHeader
                title="ข้อมูลทั่วไป"
                fields={REVIEW_GENERAL}
                data={data}
              />
            }
          >
            <ReviewFields fields={REVIEW_GENERAL} data={data} onChange={set} />
          </AccordionItem>
          <AccordionItem
            key="clinical"
            aria-label="ข้อมูลทางคลินิก"
            title={
              <SectionAccordionHeader
                title="ข้อมูลทางคลินิก"
                fields={REVIEW_CLINICAL}
                data={data}
              />
            }
          >
            <ReviewFields fields={REVIEW_CLINICAL} data={data} onChange={set} />
          </AccordionItem>
        </Accordion>
      </div>
      <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-2 border-t border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] px-10 py-4">
        <Button variant="flat" onPress={onDiscard}>
          ทิ้ง
        </Button>
        <Button color="primary" onPress={() => onApply(data)}>
          ใช้ข้อมูลนี้
        </Button>
      </div>
    </div>
  );
}

function sectionStats(fields: FieldDef[], data: Record<string, string>) {
  const filled = fields.filter((f) => {
    const v = (data[f.key] ?? "").trim();
    return v && v !== "—";
  }).length;
  const requiredFields = fields.filter((f) => f.required);
  const requiredFilled = requiredFields.filter((f) => {
    const v = (data[f.key] ?? "").trim();
    return v && v !== "—";
  }).length;
  const allRequiredOk =
    requiredFields.length === 0 || requiredFilled === requiredFields.length;
  return {
    filled,
    total: fields.length,
    requiredFilled,
    requiredTotal: requiredFields.length,
    allRequiredOk,
  };
}

function SectionAccordionHeader({
  title,
  fields,
  data,
}: {
  title: string;
  fields: FieldDef[];
  data: Record<string, string>;
}) {
  const s = sectionStats(fields, data);
  return (
    <div className="flex items-center justify-between gap-3 pr-2">
      <span className="flex items-center gap-2">
        {s.allRequiredOk ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--theme-success)]/15 text-[var(--theme-success)]">
            <IconCheck className="h-3.5 w-3.5" stroke={2.6} />
          </span>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f5a524]/20 text-[#b06d00]">
            <IconAlertCircle className="h-3.5 w-3.5" stroke={2.4} />
          </span>
        )}
        <span>{title}</span>
      </span>
      <span className="flex items-center gap-2 text-[12px] font-medium">
        <span className="text-[var(--theme-neutral)]/60">
          กรอกแล้ว{" "}
          <span className="font-mono font-bold text-[var(--theme-neutral)]">
            {s.filled}/{s.total}
          </span>
        </span>
        {s.requiredTotal > 0 && (
          <span
            className={[
              "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
              s.allRequiredOk
                ? "bg-[var(--theme-success)]/15 text-[var(--theme-success)]"
                : "bg-[#f5a524]/20 text-[#b06d00]",
            ].join(" ")}
          >
            จำเป็น {s.requiredFilled}/{s.requiredTotal}
          </span>
        )}
      </span>
    </div>
  );
}

function ReviewFields({
  fields,
  data,
  onChange,
}: {
  fields: FieldDef[];
  data: Record<string, string>;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-x-5 gap-y-4 xl:grid-cols-3">
        {fields.map((f) => {
          const v = (data[f.key] ?? "").toString();
          const filled = v.trim() && v.trim() !== "—";
          const label = filled ? `✦ ${f.label}` : f.label;
          const span = f.span ?? 1;
          const common = {
            label,
            value: v,
            onValueChange: (next: string) => onChange(f.key, next),
            placeholder: f.placeholder,
            isRequired: f.required,
            size: "md" as const,
            radius: "md" as const,
            variant: "bordered" as const,
            labelPlacement: "outside" as const,
            classNames: {
              inputWrapper:
                "min-h-[44px] bg-[var(--theme-surface)] border border-[var(--theme-neutral)]/25 data-[hover=true]:border-[var(--theme-neutral)]/45 data-[focus=true]:border-[var(--theme-primary)] shadow-none",
              label:
                "text-[var(--theme-neutral)]/70 text-[13px] font-medium pb-1",
              input:
                "text-[15px] leading-relaxed text-[var(--theme-neutral)] placeholder:text-[var(--theme-neutral)]/40",
            },
          };
          return (
            <div
              key={f.key}
              className={
                span === 3
                  ? "col-span-2 xl:col-span-3"
                  : span === 2
                    ? "col-span-2"
                    : ""
              }
            >
              {f.multiline ? (
                <Textarea {...common} minRows={2} />
              ) : (
                <Input {...common} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ForwardToDoctorPicker({
  doctor,
  clinic,
  doctors,
  clinics,
  onDoctorChange,
  onClinicChange,
}: {
  doctor: string;
  clinic: string;
  doctors: string[];
  clinics: string[];
  onDoctorChange: (v: string) => void;
  onClinicChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-4">
      <span className="text-[13px] font-semibold text-[var(--theme-neutral)]">
        ส่งต่อให้แพทย์
      </span>
      <Dropdown>
        <DropdownTrigger>
          <Button variant="flat" className="font-medium">
            {doctor}
            <IconChevronDown className="h-3.5 w-3.5" stroke={2} />
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="เลือกแพทย์"
          onAction={(key) => onDoctorChange(String(key))}
          selectedKeys={new Set([doctor])}
          selectionMode="single"
        >
          {doctors.map((d) => (
            <DropdownItem key={d}>{d}</DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
      <span className="text-[12px] text-[var(--theme-neutral)]/55">·</span>
      <span className="text-[13px] font-semibold text-[var(--theme-neutral)]">คลินิก</span>
      <Dropdown>
        <DropdownTrigger>
          <Button variant="flat" className="font-medium">
            {clinic}
            <IconChevronDown className="h-3.5 w-3.5" stroke={2} />
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="เลือกคลินิก"
          onAction={(key) => onClinicChange(String(key))}
          selectedKeys={new Set([clinic])}
          selectionMode="single"
        >
          {clinics.map((c) => (
            <DropdownItem key={c}>{c}</DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
      <p className="ml-auto text-[12px] text-[var(--theme-neutral)]/60">
        เมื่อกดบันทึก ข้อมูลจะส่งเข้าคิวของแพทย์ทันที
      </p>
    </div>
  );
}

function StopRecordingConfirm({
  open,
  asrInFlight,
  topicInFlight,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  asrInFlight: number;
  topicInFlight: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const total = asrInFlight + topicInFlight;
  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      placement="center"
      backdrop="opaque"
      hideCloseButton
      classNames={{
        base: "bg-[var(--theme-surface)] text-[var(--theme-neutral)]",
        backdrop: "bg-black/50",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <IconAlertCircle className="h-5 w-5 text-[#b06d00]" stroke={2.2} />
          <span>หยุดบันทึกตอนนี้?</span>
        </ModalHeader>
        <ModalBody className="text-[14px] leading-relaxed">
          <p>
            Dr. Note ยังทำงานค้างอยู่ <span className="font-bold text-[var(--theme-primary)]">{total}</span> รายการ:
          </p>
          <ul className="ml-4 list-disc text-[13px] text-[var(--theme-neutral)]/85">
            {asrInFlight > 0 && <li>กำลังจดบทสนทนา {asrInFlight} รายการ</li>}
            {topicInFlight > 0 && <li>กำลังสรุปประเด็นทางคลินิก {topicInFlight} รายการ</li>}
          </ul>
          <p className="text-[13px] text-[var(--theme-neutral)]/70">
            หยุดตอนนี้ Dr. Note อาจบันทึกบทสนทนาบางส่วนไม่ทัน
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onCancel}>
            รอให้เสร็จก่อน
          </Button>
          <Button color="danger" onPress={onConfirm}>
            หยุดเลย
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
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
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--theme-neutral)]/55">
        <IconSparkles className="h-3.5 w-3.5 text-[var(--theme-primary)]" stroke={2} />
        ผู้ป่วยใหม่ · โหมดบอกเมย์
      </div>
      <div className="flex items-center gap-3">
        {phase === "review" && (
          <span className="text-xs text-[var(--theme-neutral)]/55">
            {populatedCount.filled}/{populatedCount.total} ฟิลด์
          </span>
        )}
        <button
          type="button"
          onClick={onManualFallback}
          className="flex items-center gap-1.5 rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 py-1.5 text-xs font-medium text-[var(--theme-neutral)]/65 transition hover:bg-[var(--theme-primary-soft)]"
        >
          <IconKeyboard className="h-3.5 w-3.5" stroke={1.75} />
          พิมพ์ฟอร์มเอง
        </button>
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
export function useSymptomTopicsFromLLM(
  segments: { text: string }[],
  isRecording: boolean,
): { topics: SymptomTopic[]; inFlight: number } {
  const [topics, setTopics] = useState<SymptomTopic[]>([]);
  const [inFlight, setInFlight] = useState(0);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const wasRecordingRef = useRef(isRecording);
  const lastFiredTranscriptRef = useRef("");

  useEffect(() => {
    if (isRecording && !wasRecordingRef.current) {
      setTopics([]);
      lastFiredTranscriptRef.current = "";
    }
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
      // Skip if transcript hasn't grown since last fired tick — otherwise
      // the queue counter ticks up every 3.5s even when no new speech.
      if (transcript === lastFiredTranscriptRef.current) return;
      lastFiredTranscriptRef.current = transcript;
      setInFlight((n) => n + 1);
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
      } finally {
        if (!cancelled) setInFlight((n) => Math.max(0, n - 1));
      }
    };
    tick();
    const interval = window.setInterval(tick, 3500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isRecording]);

  return { topics, inFlight };
}

/** Live HPI narrative — distinct from the OLD CARTS topic list. Polls the
 *  growing transcript and asks the LLM to (re)write a SINGLE cohesive HPI
 *  paragraph, feeding back the previous draft so it refines in place as new
 *  history surfaces rather than starting over each tick. */
export function useHpiNarrativeFromLLM(
  segments: { text: string }[],
  isRecording: boolean,
): { hpi: string; inFlight: number } {
  const [hpi, setHpi] = useState("");
  const [inFlight, setInFlight] = useState(0);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const hpiRef = useRef("");
  hpiRef.current = hpi;
  const wasRecordingRef = useRef(isRecording);
  const lastFiredTranscriptRef = useRef("");

  useEffect(() => {
    if (isRecording && !wasRecordingRef.current) {
      setHpi("");
      lastFiredTranscriptRef.current = "";
    }
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
      // Skip if transcript hasn't grown since last fired tick.
      if (transcript === lastFiredTranscriptRef.current) return;
      lastFiredTranscriptRef.current = transcript;
      setInFlight((n) => n + 1);
      try {
        const result = await chatJSON<{ hpi?: string }>(
          [
            {
              role: "system",
              content:
                "You are maintaining the History of Present Illness (HPI) for a clinical note from a Thai patient interview transcript that GROWS over time. " +
                "Each call gives the full transcript so far PLUS your PREVIOUS HPI draft. " +
                "The HPI is a SINGLE cohesive Thai narrative paragraph — prose, NOT bullet points, NOT a verbatim quote of the transcript. " +
                "SURGICAL EDITING IS REQUIRED: treat your previous draft as the source of truth for wording. Keep every sentence the new information does NOT affect EXACTLY as written, word for word — do NOT re-paraphrase or reorder unchanged content. Only rewrite, add, or remove the specific clause or sentence that the new transcript changes, contradicts, or expands. " +
                "Example: if the draft says 'ปฏิเสธไข้' but the patient now reports fever, change only that clause to describe the fever and leave the rest of the paragraph untouched. If the patient adds a new symptom, insert one clause for it in the right place without rewording the surrounding text. " +
                "Weave the OLD CARTS elements into the prose when present: onset, location, duration, character, aggravating/alleviating factors, radiation, timing, severity, associated symptoms, and pertinent negatives. " +
                "Write in formal clinical Thai, third person (e.g. 'ผู้ป่วยมาด้วยอาการ...'). " +
                'Output ONLY JSON: {"hpi":"..."} containing the full updated paragraph. If there is nothing clinically relevant yet, return {"hpi":""}.',
            },
            {
              role: "user",
              content:
                `Transcript so far:\n${transcript}\n\n` +
                `Previous HPI draft:\n${hpiRef.current || "(none)"}`,
            },
          ],
          { temperature: 0.2, maxTokens: 1200, fast: true },
        );
        if (cancelled) return;
        const next = typeof result?.hpi === "string" ? result.hpi.trim() : "";
        if (next) setHpi(next);
      } catch {
        // Silent — next tick retries.
      } finally {
        if (!cancelled) setInFlight((n) => Math.max(0, n - 1));
      }
    };
    tick();
    const interval = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isRecording]);

  return { hpi, inFlight };
}

/** Live medication extraction — pulls the drugs the patient says they
 *  currently take / were prescribed from the growing transcript. Returns
 *  the full current list each tick (the model sees the whole transcript),
 *  so it stays in sync as the interview adds or revises meds. */
export function useMedsFromLLM(
  segments: { text: string }[],
  isRecording: boolean,
): { meds: string[]; inFlight: number } {
  const [meds, setMeds] = useState<string[]>([]);
  const [inFlight, setInFlight] = useState(0);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const wasRecordingRef = useRef(isRecording);
  const lastFiredTranscriptRef = useRef("");

  useEffect(() => {
    if (isRecording && !wasRecordingRef.current) {
      setMeds([]);
      lastFiredTranscriptRef.current = "";
    }
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
      if (transcript === lastFiredTranscriptRef.current) return;
      lastFiredTranscriptRef.current = transcript;
      setInFlight((n) => n + 1);
      try {
        const result = await chatJSON<{ meds?: string[] }>(
          [
            {
              role: "system",
              content:
                "You extract the MEDICATIONS a Thai patient mentions in an interview transcript that GROWS over time. Every call has the full transcript so far. " +
                "Include prescription drugs, over-the-counter drugs, and herbal/traditional remedies the patient says they CURRENTLY take or were recently prescribed. " +
                "For each, write 'ชื่อยา ขนาด ความถี่' when the patient states dose/frequency, otherwise just the drug name. Keep drug names in their usual form (English generic or Thai brand as spoken). Deduplicate. Do NOT invent doses the patient did not say. " +
                'Output ONLY JSON: {"meds":["..."]} — return the COMPLETE current list each time. If the patient has not mentioned any medication, return {"meds":[]}.',
            },
            { role: "user", content: transcript },
          ],
          { temperature: 0.1, maxTokens: 800, fast: true },
        );
        if (cancelled) return;
        const next = Array.isArray(result?.meds)
          ? result.meds.map((m) => (typeof m === "string" ? m.trim() : "")).filter(Boolean)
          : [];
        // Only overwrite with a non-empty list so a glitchy empty tick
        // doesn't wipe meds already captured.
        if (next.length > 0) setMeds(next);
      } catch {
        // Silent — next tick retries.
      } finally {
        if (!cancelled) setInFlight((n) => Math.max(0, n - 1));
      }
    };
    tick();
    const interval = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isRecording]);

  return { meds, inFlight };
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
  phase: Phase;
}

// ── Step 1: Select capture method ─────────────────────────────────────────
// Two big choice cards: voice-driven Mae capture vs ID-card smart-card
// scan. The card the user picks is the one their consult will run as.

function SelectMethodView({
  onPickScan,
  onPickOcr,
  onPickManual,
}: {
  onPickScan: () => void;
  onPickOcr: () => void;
  onPickManual: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 items-center justify-center px-6">
      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
        <MethodCard
          Icon={IconId}
          title="สแกนบัตรประชาชน"
          description="แตะบัตรบนเครื่องอ่าน Smart Card — ดึงข้อมูลทะเบียนผู้ป่วยอัตโนมัติ แล้วเริ่มซักประวัติกับเมย์ได้เลย"
          cta="สแกนบัตร"
          accent="primary"
          onClick={onPickScan}
        />
        <MethodCard
          Icon={IconCamera}
          title="ถ่ายภาพบัตรประชาชน (OCR)"
          description="ใช้กล้องถ่ายบัตรประชาชน — AI จะอ่านข้อมูลจากภาพและกรอกฟอร์มให้อัตโนมัติ"
          cta="ถ่ายภาพ"
          accent="primary"
          onClick={onPickOcr}
        />
        <MethodCard
          Icon={IconKeyboard}
          title="กรอกฟอร์มเอง"
          description="เปิดฟอร์มลงทะเบียนผู้ป่วยแบบดั้งเดิม — กรอกข้อมูลแต่ละช่องเองทั้งหมด"
          cta="เปิดฟอร์ม"
          accent="neutral"
          onClick={onPickManual}
        />
      </div>
    </div>
  );
}

// ── OCR camera mock ───────────────────────────────────────────────────────
// Camera-style viewfinder with corner brackets + "อ่านข้อความจากภาพ" caption.
// In production this would hand off to a camera/file picker + the OCR
// service; here we just simulate the read and advance.

function OcrScanView() {
  // No auto-advance timer — the parent navigates away when the real OCR +
  // LLM pipeline finishes (or errors out).
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-neutral)]/10">
        {/* Faux ID card photo — flat rectangle in the centre. */}
        <div className="absolute left-1/2 top-1/2 flex h-[60%] w-[68%] -translate-x-1/2 -translate-y-1/2 flex-col gap-2 rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow-md)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--theme-neutral)]/20" />
            <div className="flex flex-1 flex-col gap-1">
              <span className="h-2 w-3/4 rounded-full bg-[var(--theme-neutral)]/20" />
              <span className="h-2 w-1/2 rounded-full bg-[var(--theme-neutral)]/20" />
            </div>
          </div>
          <span className="mt-2 h-2 w-2/3 rounded-full bg-[var(--theme-neutral)]/20" />
          <span className="h-2 w-3/5 rounded-full bg-[var(--theme-neutral)]/20" />
        </div>
        {/* Corner brackets — camera viewfinder framing. */}
        {(["tl", "tr", "bl", "br"] as const).map((corner) => (
          <span
            key={corner}
            aria-hidden
            className={[
              "absolute h-6 w-6 border-[var(--theme-primary)]",
              corner === "tl" && "left-4 top-4 border-l-2 border-t-2",
              corner === "tr" && "right-4 top-4 border-r-2 border-t-2",
              corner === "bl" && "bottom-4 left-4 border-b-2 border-l-2",
              corner === "br" && "bottom-4 right-4 border-b-2 border-r-2",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
        {/* Scan line — sweeps across the ID card image. */}
        <motion.div
          aria-hidden
          className="absolute inset-x-12 h-[3px] bg-[var(--theme-primary)] shadow-[0_0_20px_4px_rgba(57,101,225,0.55)]"
          initial={{ top: "20%" }}
          animate={{ top: ["20%", "80%", "20%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-[var(--theme-primary)]">
          <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />
          <span className="text-[14px] font-semibold">กำลังอ่านข้อความจากภาพ…</span>
        </div>
        <p className="text-[13px] text-[var(--theme-neutral)]/60">
          AI กำลังสกัดชื่อ-เลขบัตร-ที่อยู่จากภาพถ่ายบัตรประชาชน
        </p>
      </div>
    </div>
  );
}

// ── Live camera capture ──────────────────────────────────────────────────
// Opens the device camera via getUserMedia(facingMode: 'environment'),
// shows a live preview with viewfinder brackets, and snaps a JPEG blob on
// "ถ่ายภาพ". Falls back to file picker if camera is blocked/unavailable.

function CameraCaptureView({
  onCapture,
  onPickFile,
  onCancel,
}: {
  onCapture: (blob: Blob) => void;
  onPickFile: () => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "ไม่สามารถเปิดกล้องได้");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const handleSnap = useCallback(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.92,
    );
  }, [onCapture, ready]);

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[var(--theme-neutral)]/15 bg-black">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="text-[14px] font-semibold text-[var(--theme-error)]">
              เปิดกล้องไม่ได้
            </span>
            <p className="text-[13px] text-white/70">{error}</p>
            <Button color="primary" variant="flat" onPress={onPickFile}>
              เลือกไฟล์ภาพแทน
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-white">
                <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />
                <span className="text-[13px]">กำลังเปิดกล้อง…</span>
              </div>
            )}
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <span
                key={corner}
                aria-hidden
                className={[
                  "pointer-events-none absolute h-8 w-8 border-[var(--theme-primary)]",
                  corner === "tl" && "left-4 top-4 border-l-2 border-t-2",
                  corner === "tr" && "right-4 top-4 border-r-2 border-t-2",
                  corner === "bl" && "bottom-4 left-4 border-b-2 border-l-2",
                  corner === "br" && "bottom-4 right-4 border-b-2 border-r-2",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            ))}
          </>
        )}
      </div>
      <p className="text-center text-[13px] text-[var(--theme-neutral)]/65">
        วางบัตรประชาชนให้อยู่ในกรอบ แล้วกด "ถ่ายภาพ"
      </p>
      <div className="flex items-center gap-3">
        <Button variant="flat" onPress={onCancel}>
          ยกเลิก
        </Button>
        <Button variant="bordered" startContent={<IconKeyboard className="h-4 w-4" />} onPress={onPickFile}>
          เลือกไฟล์
        </Button>
        <Button
          color="primary"
          isDisabled={!ready || !!error}
          startContent={<IconCamera className="h-4 w-4" />}
          onPress={handleSnap}
        >
          ถ่ายภาพ
        </Button>
      </div>
    </div>
  );
}

// ── Smart-card scanning mock ──────────────────────────────────────────────
// Plays a short scan-line animation over an ID card silhouette, then auto-
// advances the flow into the Mae conversation phase. The data extraction
// itself is mocked — we're just simulating the hardware step.

function ScanningCardView({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2400);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="relative h-[240px] w-full overflow-hidden rounded-3xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-primary-soft)]/40">
        {/* Mock ID card silhouette */}
        <div className="absolute left-1/2 top-1/2 flex h-[160px] w-[260px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-2xl border border-[var(--theme-neutral)]/20 bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow-sm)]">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 rounded-full bg-[var(--theme-primary)]/15" />
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="h-2 w-3/4 rounded-full bg-[var(--theme-neutral)]/15" />
              <span className="h-2 w-1/2 rounded-full bg-[var(--theme-neutral)]/15" />
            </div>
          </div>
          <span className="h-2 w-2/3 rounded-full bg-[var(--theme-neutral)]/15" />
          <span className="h-2 w-1/2 rounded-full bg-[var(--theme-neutral)]/15" />
          <span className="h-2 w-3/5 rounded-full bg-[var(--theme-neutral)]/15" />
        </div>
        {/* Scan line — sweeps top-to-bottom + glow */}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 h-[3px] bg-[var(--theme-primary)] shadow-[0_0_20px_4px_rgba(57,101,225,0.55)]"
          initial={{ top: "0%" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-[var(--theme-primary)]">
          <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />
          <span className="text-[14px] font-semibold">กำลังอ่านบัตรประชาชน…</span>
        </div>
        <p className="text-[13px] text-[var(--theme-neutral)]/60">
          เครื่องอ่านบัตร Smart Card กำลังทำงาน — กรุณาอย่าถอดบัตรออก
        </p>
      </div>
    </div>
  );
}

// ── Vital signs modal ─────────────────────────────────────────────────────
// Soft prompt that pops up the first time the doctor enters the input
// phase. Optional — every field can be left blank and the doctor can
// "ข้าม" at any time. Saved values aren't persisted yet; this is the UI
// skeleton ready for backend wiring.

interface VitalsState {
  systolic: string;
  diastolic: string;
  pulse: string;
  temperature: string;
  respiratoryRate: string;
  spo2: string;
  weight: string;
  height: string;
}

const VITALS_INIT: VitalsState = {
  systolic: "",
  diastolic: "",
  pulse: "",
  temperature: "",
  respiratoryRate: "",
  spo2: "",
  weight: "",
  height: "",
};

interface VitalField {
  key: keyof VitalsState;
  label: string;
  unit: string;
  placeholder?: string;
}

const VITAL_FIELDS: VitalField[] = [
  { key: "systolic", label: "ความดัน Systolic", unit: "mmHg", placeholder: "120" },
  { key: "diastolic", label: "ความดัน Diastolic", unit: "mmHg", placeholder: "80" },
  { key: "pulse", label: "ชีพจร", unit: "bpm", placeholder: "75" },
  { key: "temperature", label: "อุณหภูมิ", unit: "°C", placeholder: "36.8" },
  { key: "respiratoryRate", label: "อัตราหายใจ", unit: "/min", placeholder: "16" },
  { key: "spo2", label: "SpO₂", unit: "%", placeholder: "98" },
  { key: "weight", label: "น้ำหนัก", unit: "kg", placeholder: "65" },
  { key: "height", label: "ส่วนสูง", unit: "cm", placeholder: "170" },
];

function VitalSignsModal({
  open,
  onSkip,
  onSave,
}: {
  open: boolean;
  onSkip: () => void;
  onSave: (vitals: VitalsState) => void;
}) {
  const [state, setState] = useState<VitalsState>(VITALS_INIT);
  const update = (key: keyof VitalsState, value: string) =>
    setState((s) => ({ ...s, [key]: value }));

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="ข้าม"
            onClick={onSkip}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[var(--theme-neutral)]/40 backdrop-blur-sm"
          />
          {/* Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="กรอกสัญญาณชีพ"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.28, ease: EASE_TV }}
            className="relative flex w-full max-w-[640px] flex-col gap-6 rounded-3xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-6 shadow-[var(--theme-shadow-lg)]"
          >
            <header className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[var(--theme-primary)]">
                <IconStethoscope className="h-4 w-4" stroke={2} />
                <span className="text-[12px] font-semibold uppercase tracking-wider">
                  สัญญาณชีพ (ไม่บังคับ)
                </span>
              </div>
              <h2 className="text-[18px] font-bold text-[var(--theme-neutral)]">
                บันทึก Vital Signs ก่อนเริ่มซักประวัติ
              </h2>
              <p className="text-[13px] text-[var(--theme-neutral)]/60">
                กรอกตามที่วัดได้ ช่องที่ยังไม่มีข้อมูลข้ามได้
              </p>
            </header>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {VITAL_FIELDS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="text-[12px] text-[var(--theme-neutral)]/65">
                    {f.label}
                  </span>
                  <div className="flex items-center gap-1.5 rounded-xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-2.5 py-2 transition focus-within:border-[var(--theme-primary)] focus-within:ring-2 focus-within:ring-[var(--theme-primary)]/15">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={state[f.key]}
                      onChange={(e) => update(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--theme-neutral)] placeholder:text-[var(--theme-neutral)]/35 focus:outline-none"
                    />
                    <span className="shrink-0 text-[11px] text-[var(--theme-neutral)]/50">
                      {f.unit}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <footer className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onSkip}
                className="rounded-full px-5 py-2 text-[14px] font-medium text-[var(--theme-neutral)]/65 transition hover:bg-[var(--theme-primary-soft)]"
              >
                ข้าม
              </button>
              <button
                type="button"
                onClick={() => onSave(state)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-primary)] px-5 py-2 text-[14px] font-medium text-white shadow-[var(--theme-shadow-sm)] transition hover:brightness-105"
              >
                <IconCheck className="h-4 w-4" stroke={2.25} />
                บันทึก
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MethodCard({
  Icon,
  title,
  description,
  cta,
  accent,
  onClick,
}: {
  Icon: typeof IconMicrophone;
  title: string;
  description: string;
  cta: string;
  accent: "primary" | "neutral";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-6 rounded-3xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-8 text-left transition hover:border-[var(--theme-primary)]/40 hover:shadow-[var(--theme-shadow-md)]"
    >
      <div
        className={[
          "flex h-14 w-14 items-center justify-center rounded-2xl transition group-hover:scale-105",
          accent === "primary"
            ? "bg-[var(--theme-primary)] text-white"
            : "bg-[var(--theme-neutral)]/10 text-[var(--theme-neutral)]",
        ].join(" ")}
      >
        <Icon className="h-7 w-7" stroke={1.75} />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-[18px] font-bold text-[var(--theme-neutral)]">
          {title}
        </h2>
        <p className="text-[14px] leading-relaxed text-[var(--theme-neutral)]/60">
          {description}
        </p>
      </div>
      <span className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--theme-primary)] transition group-hover:gap-2">
        {cta}
        <IconChevronRight className="h-4 w-4" stroke={2} />
      </span>
    </button>
  );
}

function StepperBar({ onCancel, onNext, nextEnabled, isExtracting, phase }: StepperBarProps) {
  const disabled = !nextEnabled || isExtracting;
  // Step order matches the visual stepper. `extracting` is a loading
  // sub-state of "บันทึกประวัติ"; the review screen owns "ตรวจสอบข้อมูล".
  const stepIndex =
    phase === "select" || phase === "scanning" || phase === "ocr" || phase === "camera"
      ? 0
      : phase === "review"
        ? 2
        : 1;
  const stateOf = (i: number): "done" | "current" | "upcoming" =>
    i < stepIndex ? "done" : i === stepIndex ? "current" : "upcoming";
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-2">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <StepPill state={stateOf(0)} label="ลงทะเบียน" />
        <IconChevronRight className="h-4 w-4 shrink-0 text-neutral-300" stroke={2} />
        <StepPill state={stateOf(1)} label="บันทึกประวัติ" />
        <IconChevronRight className="h-4 w-4 shrink-0 text-neutral-300" stroke={2} />
        <StepPill state={stateOf(2)} label="ตรวจสอบข้อมูล" />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex w-[124px] items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
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

type CenterTab = "summary" | "transcript" | "oldcarts";

interface ConversationCardProps {
  patientName: string;
  topics: SymptomTopic[];
  hpi: string;
  ehr: PatientEhr;
  interviewMeds: string[];
  segments: { text: string }[];
  isRecording: boolean;
  onToggleRecord: () => void;
  onTabAudio: () => void;
  onAudioFile: () => void;
  tab: CenterTab;
  onTabChange: (t: CenterTab) => void;
  asrInFlight?: number;
  topicInFlight?: number;
}

/** "อื่น ๆ" audio-source picker (tab audio / audio file). Shared between the
 *  centered idle CTA (`lg`) and the left record panel (`sm`) so a source is
 *  always reachable, not only on the empty pre-recording screen. */
function AudioSourceDropdown({
  onTabAudio,
  onAudioFile,
  variant = "lg",
}: {
  onTabAudio: () => void;
  onAudioFile: () => void;
  variant?: "lg" | "sm";
}) {
  const lg = variant === "lg";
  return (
    <Dropdown placement="top">
      <DropdownTrigger>
        <button
          type="button"
          aria-label="เลือกแหล่งเสียงอื่น"
          className={[
            "inline-flex items-center gap-2 rounded-full border border-[var(--theme-primary)] bg-[var(--theme-surface)] font-medium text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary-soft)]",
            lg ? "px-4 py-4 text-[14px]" : "px-3 py-2 text-[13px]",
          ].join(" ")}
        >
          <IconDots className={lg ? "h-5 w-5" : "h-4 w-4"} stroke={2} />
          อื่น ๆ
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="แหล่งเสียง"
        onAction={(key) => {
          if (key === "tab") onTabAudio();
          else if (key === "file") onAudioFile();
        }}
      >
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
  );
}

export function ConversationCard({
  patientName,
  topics,
  hpi,
  ehr,
  interviewMeds,
  segments,
  isRecording,
  onToggleRecord,
  onTabAudio,
  onAudioFile,
  tab,
  onTabChange,
  asrInFlight = 0,
  topicInFlight = 0,
}: ConversationCardProps) {
  // The summary already has something to show before recording starts when
  // a known patient was scanned (EHR history/meds) — or once any live
  // content exists. In that case the mic must live in the LEFT panel so the
  // big centered CTA doesn't float on top of the report.
  const started = segments.length > 0;
  const hasContent =
    isRecording ||
    started ||
    topics.length > 0 ||
    hpi.length > 0 ||
    interviewMeds.length > 0 ||
    ehr.history.length > 0 ||
    ehr.meds.length > 0;

  return (
    <section className="relative flex h-full min-h-0 flex-col items-stretch gap-4 rounded-3xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)]">
      {/* The floating mascot in the header has been retired — per Figma
          1117:1779 / 1117:2105 the mascot now lives inside the workspace
          (centered CTA when idle, left panel when recording) instead of
          poking above the card. */}

      {/* Header (Figma 1117:1892) — title block on the left + tab control
          on the right, so the workspace surface below is dedicated to
          either the empty CTA or the live summary/form/transcript view. */}
      <header className="relative flex min-h-[80px] items-center justify-between gap-4 rounded-t-3xl border-b border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-4">
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-[16px] font-bold text-[var(--theme-neutral)]">
            บทสนทนากับผู้ป่วย {patientName}
          </h2>
          <p className="flex items-center gap-1.5 text-[14px] font-medium text-[var(--theme-neutral)]/60">
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
        <div className="flex flex-1 items-center">
          <Tabs
            aria-label="แสดงสรุปอาการ / แบบฟอร์ม / บทสนทนาเต็ม"
            selectedKey={tab}
            onSelectionChange={(key) => onTabChange(key as CenterTab)}
            variant="solid"
            fullWidth
            radius="full"
            classNames={{
              base: "w-full",
              tabList: "bg-[var(--theme-neutral)]/10 p-1 rounded-[28px] gap-0.5",
              tab: "px-3 py-1.5 text-[14px] font-medium leading-[1.43] data-[hover-unselected=true]:opacity-100",
              cursor: "bg-[var(--theme-surface)] rounded-[32px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
              tabContent: "text-[var(--theme-neutral)]/55 group-data-[selected=true]:text-[var(--theme-neutral)]",
            }}
          >
            <Tab key="summary" title="สรุปอาการสำคัญ" />
            <Tab key="oldcarts" title="แบบฟอร์ม" />
            <Tab key="transcript" title="บทสนทนา" />
          </Tabs>
        </div>
      </header>

      {/* Body — splits into a LEFT recording panel + RIGHT scroll area
          while live, collapses to a single full-width scroll area when
          idle or done. */}
      <div className="flex min-h-0 flex-1 gap-4 px-4">
        <AnimatePresence initial={false}>
          {(isRecording || hasContent) && (
            <motion.aside
              key="record-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 273, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_TV }}
              className="flex shrink-0 flex-col items-center justify-center gap-6 overflow-hidden border-r border-[var(--theme-neutral)]/15"
            >
              <img
                src={AI_DOCTOR}
                alt=""
                aria-hidden
                className="h-[200px] w-[215px] object-contain"
              />
              <div className="flex w-full flex-col items-center gap-4">
                {/* Soundwave only animates during live capture; once the
                    user stops, the panel keeps its position but the wave
                    is replaced with a paused caption so the layout stays
                    consistent. */}
                {isRecording ? (
                  <>
                    <Soundwave />
                    <ListeningCaption />
                  </>
                ) : started ? (
                  <PausedCaption
                    asrInFlight={asrInFlight}
                    topicInFlight={topicInFlight}
                  />
                ) : (
                  <p className="text-center text-[14px] text-[var(--theme-neutral)]/60">
                    กดไมค์เพื่อเริ่มซักประวัติ
                  </p>
                )}
              </div>
              <div className="flex w-full flex-col items-center gap-2 px-2">
                <button
                  type="button"
                  onClick={onToggleRecord}
                  className="inline-flex items-center gap-4 rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-4 text-[14px] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
                >
                  <RecordButtonGlyph isRecording={isRecording} />
                  {isRecording ? "หยุดการบันทึก" : started ? "บันทึกต่อ" : "เริ่มบันทึก"}
                </button>
                {!isRecording && (
                  <AudioSourceDropdown
                    variant="sm"
                    onTabAudio={onTabAudio}
                    onAudioFile={onAudioFile}
                  />
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
        <ScrollArea>
          {/* Keep BOTH tabs mounted at all times — only toggle visibility.
              This preserves the typewriter progress in SummaryTab and the
              textarea state in TranscriptTab when the doctor flips between
              them, so it feels seamless instead of "starting over". */}
          <div className={tab === "summary" ? "flex flex-col" : "hidden"}>
            <SummaryTab
              topics={topics}
              hpi={hpi}
              ehr={ehr}
              interviewMeds={interviewMeds}
              isRecording={isRecording}
            />
          </div>
          <div className={tab === "transcript" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
            <TranscriptTab segments={segments} isRecording={isRecording} />
          </div>
          <div className={tab === "oldcarts" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
            <OldCartsTab />
          </div>
        </ScrollArea>
        </div>
      </div>

      {/* Centered CTA — only when the card is in its empty/pre-recording
          state (no segments yet AND not recording). Once there's any
          transcript content the mic migrates to the footer so it doesn't
          float on top of the summary/transcript cards. */}
      {!isRecording && !hasContent && tab === "summary" && (
        <motion.div
          key="cta-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: EASE_TV }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <div className="pointer-events-auto flex w-[339px] flex-col items-center gap-7">
            {/* Mascot lives in the centered CTA per Figma 1117:1779 —
                serves as the visual anchor before recording starts. */}
            <img
              src={AI_DOCTOR}
              alt=""
              aria-hidden
              className="h-[200px] w-[215px] object-contain"
            />
            <div className="flex items-center gap-4">
              {/* Primary mic action (Figma 1117:1819). */}
              <button
                type="button"
                onClick={onToggleRecord}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--theme-primary)] px-6 py-4 text-[14px] font-medium text-white shadow-[var(--theme-shadow-sm)] transition hover:brightness-110"
              >
                <IconMicrophone className="h-5 w-5" stroke={2} />
                เริ่มบันทึกโดยไมโครโฟน
              </button>
              {/* Secondary "อื่น ๆ" outline action (Figma 1117:1820) —
                  opens the source dropdown so the doctor can pick
                  tab audio or an audio file. */}
              <AudioSourceDropdown
                variant="lg"
                onTabAudio={onTabAudio}
                onAudioFile={onAudioFile}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Thin spacer to round out the card bottom. The LEFT panel now
          owns the re-record control whether the user is mid-capture or
          paused, so a dedicated bottom footer would just duplicate it. */}
      <div className="h-4 shrink-0 rounded-b-3xl" />
    </section>
  );
}

// ── Record control + live soundwave ───────────────────────────────────────

interface RecordControlProps {
  isRecording: boolean;
  size: "large" | "small";
  onToggleRecord: () => void;
  onTabAudio: () => void;
  onAudioFile: () => void;
}

/** Shared record button used in two positions (center CTA + footer panel).
 *  `layoutId` makes framer-motion morph between the two layouts so the
 *  control feels like it physically migrates when recording starts. */
function RecordControl({
  isRecording,
  size,
  onToggleRecord,
  onTabAudio,
  onAudioFile,
}: RecordControlProps) {
  const large = size === "large";
  return (
    <motion.div
      layoutId="record-control"
      transition={{ duration: 0.55, ease: EASE_TV }}
      className={[
        "pointer-events-auto flex items-stretch overflow-hidden rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] text-[var(--theme-neutral)] shadow-[var(--theme-shadow-md)]",
        large ? "text-[length:var(--theme-text-md)]" : "text-[length:var(--theme-text-sm)]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onToggleRecord}
        className={[
          "flex items-center gap-3 font-medium transition hover:bg-[var(--theme-primary-soft)]",
          large ? "px-6 py-4" : "px-4 py-2.5",
        ].join(" ")}
      >
        <span
          aria-hidden
          className={[
            "flex shrink-0 items-center justify-center rounded-full text-white transition",
            isRecording
              ? "bg-[#ff383c] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.12)]"
              : "bg-[var(--theme-primary)]",
            large ? "h-12 w-12" : "h-9 w-9",
          ].join(" ")}
        >
          {isRecording ? (
            <span className={large ? "block h-3 w-3 rounded-sm bg-white" : "block h-2.5 w-2.5 rounded-sm bg-white"} />
          ) : (
            <IconMicrophone className={large ? "h-6 w-6" : "h-5 w-5"} stroke={2} />
          )}
        </span>
        {isRecording ? "หยุดการบันทึก" : "เริ่มบันทึก"}
      </button>
      {!isRecording && (
        <Dropdown placement="top-end">
          <DropdownTrigger>
            <button
              type="button"
              aria-label="เลือกแหล่งเสียง"
              className="flex items-center border-l border-[var(--theme-neutral)]/15 px-3 text-[var(--theme-neutral)]/60 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
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
      )}
    </motion.div>
  );
}

/** Live soundwave visualizer — bars driven by the recorder's actual RMS
 *  amplitude (from `useDictationContext().levelRef`). A small ring buffer
 *  of recent levels gives the wave its left-scrolling motion; updates
 *  run inside a single `requestAnimationFrame` loop so React never
 *  re-renders at audio rate (only inline `style.height` mutates). */
const SOUNDWAVE_BARS = 24;
const SOUNDWAVE_MIN_PX = 4;
const SOUNDWAVE_MAX_PX = 44;

function Soundwave() {
  const { levelRef } = useDictationContext();
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const historyRef = useRef<number[]>(new Array(SOUNDWAVE_BARS).fill(0));

  useEffect(() => {
    let raf = 0;
    let frame = 0;
    const SHIFT_EVERY = 2;

    const tick = () => {
      const level = levelRef.current ?? 0;
      const eased = Math.min(1, Math.pow(level * 4.5, 0.7));
      if (frame % SHIFT_EVERY === 0) {
        const h = historyRef.current;
        h.shift();
        h.push(eased);
      }
      frame += 1;
      const arr = historyRef.current;
      for (let i = 0; i < SOUNDWAVE_BARS; i++) {
        const el = barRefs.current[i];
        if (!el) continue;
        const mirrored = arr[Math.min(arr.length - 1, Math.abs(i - SOUNDWAVE_BARS / 2) * 2)];
        const px = SOUNDWAVE_MIN_PX + mirrored * (SOUNDWAVE_MAX_PX - SOUNDWAVE_MIN_PX);
        el.style.height = `${px}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [levelRef]);

  return (
    <div className="flex h-12 items-center gap-1" aria-hidden>
      {Array.from({ length: SOUNDWAVE_BARS }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          className="block w-1 rounded-full bg-[var(--theme-primary)] transition-[height] duration-100 ease-out"
          style={{ height: SOUNDWAVE_MIN_PX }}
        />
      ))}
    </div>
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
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] text-[var(--theme-neutral)]/70 shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition hover:text-[var(--theme-neutral)] hover:bg-[var(--theme-primary-soft)]"
          >
            <IconChevronDown className="h-4 w-4" stroke={2} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// Interview self-evaluation seeds (would be produced by the LLM once the
// transcript is complete — mirrors AppointReady's report evaluation).
const SUMMARY_HELPFUL_SEED = [
  "บันทึกอาการสำคัญและคำบรรยายจากผู้ป่วยครบถ้วน",
  "มีการระบุระยะเวลาและลักษณะของอาการ",
];
const SUMMARY_GAPS_SEED = [
  "ประวัติแพ้ยา / อาหาร",
  "ประวัติโรคประจำตัวและยาที่ใช้ประจำ",
  "สัญญาณชีพ (อุณหภูมิ / ความดัน / ชีพจร)",
];

function SummaryTab({
  topics,
  hpi,
  ehr,
  interviewMeds,
  isRecording,
}: {
  topics: SymptomTopic[];
  hpi: string;
  ehr: PatientEhr;
  interviewMeds: string[];
  isRecording: boolean;
}) {
  // Throttle topic reveal — each new LLM-extracted topic surfaces at
  // most once every ~1.2s so the list grows calmly even when the model
  // emits a burst on a single tick.
  const visible = useThrottledReveal(topics, 1200);
  const [evalOpen, setEvalOpen] = useState(false);

  const hasEhr = ehr.history.length > 0 || ehr.meds.length > 0;
  if (topics.length === 0 && !hpi && !hasEhr && interviewMeds.length === 0 && !isRecording) {
    return (
      <div className="flex flex-1 items-center justify-center text-center text-[13px] text-[var(--theme-neutral)]/40">
        ยังไม่มีอาการสำคัญที่สรุปได้
      </div>
    );
  }

  // The first extracted topic reads as the chief / primary concern; the HPI
  // is the LLM's evolving narrative paragraph (refined live as the interview
  // grows), not a list of the remaining topics.
  const primary = visible[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Report card — bold headings + flowing content, AppointReady style */}
      <div className="rounded-2xl border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <ReportSection heading="Primary concern:">
          {primary ? (
            <p className="text-[14px] leading-relaxed text-[var(--theme-neutral)]/85">
              {primary.title}
            </p>
          ) : (
            <ReportLineSkeleton />
          )}
        </ReportSection>

        <ReportSection heading="History of Present Illness (HPI):">
          {hpi ? (
            <HpiDiffText text={hpi} />
          ) : isRecording ? (
            <ReportLineSkeleton />
          ) : (
            <p className="text-[13px] text-[var(--theme-neutral)]/45">—</p>
          )}
        </ReportSection>

        <ReportSection heading="Relevant Medical History (from EHR):">
          {ehr.history.length > 0 ? (
            <ul className="flex flex-col gap-1 text-[14px] leading-relaxed text-[var(--theme-neutral)]/85">
              {ehr.history.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[var(--theme-neutral)]/30">•</span>
                  <span>{renderAllergy(h, `pmh${i}`)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--theme-neutral)]/45">
              ไม่มีข้อมูลใน EHR (ผู้ป่วยใหม่)
            </p>
          )}
        </ReportSection>

        <ReportSection heading="Medications (from EHR and interview):" last>
          {ehr.meds.length > 0 || interviewMeds.length > 0 ? (
            <ul className="flex flex-col gap-1 text-[14px] leading-relaxed text-[var(--theme-neutral)]/85">
              {ehr.meds.map((m, i) => (
                <li key={`e${i}`} className="flex items-center gap-2">
                  <span className="text-[var(--theme-neutral)]/30">•</span>
                  <span>{m}</span>
                  <span className="rounded bg-[var(--theme-neutral)]/10 px-1 text-[9px] font-semibold text-[var(--theme-neutral)]/45">
                    EHR
                  </span>
                </li>
              ))}
              {interviewMeds.map((m, i) => (
                <li key={`i${i}`} className="flex items-center gap-2">
                  <span className="text-[var(--theme-neutral)]/30">•</span>
                  <span>{m}</span>
                  <span className="rounded bg-[var(--theme-primary)]/10 px-1 text-[9px] font-semibold text-[var(--theme-primary)]">
                    ซักประวัติ
                  </span>
                </li>
              ))}
            </ul>
          ) : isRecording ? (
            <ReportLineSkeleton />
          ) : (
            <p className="text-[13px] text-[var(--theme-neutral)]/45">ยังไม่มีรายการยา</p>
          )}
        </ReportSection>

        {/* Report evaluation — collapsible */}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setEvalOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full bg-[#ddd6fe] px-3 py-1.5 text-[12px] font-medium text-[#6d28d9] transition hover:bg-[#c4b5fd]"
          >
            <IconChevronDown
              className={`h-3.5 w-3.5 transition-transform ${evalOpen ? "rotate-180" : ""}`}
              stroke={2}
            />
            View Report Evaluation
          </button>

          {evalOpen && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-[var(--theme-success)]">
                  ข้อมูลที่ได้ (helpful facts)
                </span>
                <ul className="flex flex-col gap-1">
                  {SUMMARY_HELPFUL_SEED.map((f, i) => (
                    <li
                      key={i}
                      className="flex gap-1.5 text-[12px] leading-snug text-[var(--theme-neutral)]/80"
                    >
                      <IconCheck
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--theme-success)]"
                        stroke={2}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-[var(--theme-warning)]">
                  ยังไม่ได้ถาม แต่ควรถามเพิ่ม
                </span>
                <ul className="flex flex-col gap-1">
                  {SUMMARY_GAPS_SEED.map((g, i) => (
                    <li
                      key={i}
                      className="flex gap-1.5 text-[12px] leading-snug text-[var(--theme-neutral)]/80"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--theme-warning)]" />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-[14px] font-bold tracking-[0.4em] text-[var(--theme-neutral)]/35">
            ***
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
        <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" stroke={1.75} />
        <p className="text-[11px] leading-snug text-amber-800">
          การสาธิตนี้แสดงความสามารถพื้นฐานของโมเดลเท่านั้น ไม่ใช่ผลิตภัณฑ์ที่สมบูรณ์
          ไม่ได้มีไว้เพื่อวินิจฉัยหรือแนะนำการรักษาโรคใด ๆ และไม่ควรใช้แทนคำแนะนำจากแพทย์
        </p>
      </div>
    </div>
  );
}

/** One report heading + body, bold-heading-with-colon style. `last` drops
 *  the bottom spacing. Local to the dr-note summary tab. */
function ReportSection({
  heading,
  last,
  children,
}: {
  heading: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={last ? "" : "mb-5"}>
      <h4 className="mb-2 text-[15px] font-bold text-[var(--theme-neutral)]">{heading}</h4>
      {children}
    </div>
  );
}

/** Inline single-line shimmer for a report field still being transcribed. */
function ReportLineSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-[16px] w-full animate-pulse rounded-full"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(189,189,189,0.6), rgba(221,221,221,0.6))",
        }}
      />
      <div
        className="h-[16px] w-3/4 animate-pulse rounded-full"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(189,189,189,0.6), rgba(221,221,221,0.6))",
        }}
      />
    </div>
  );
}

// ── Live HPI diff rendering ───────────────────────────────────────────────
// The HPI paragraph is rewritten in place as the interview grows. To make
// each change legible we diff the previous paragraph against the new one
// (character level, coalesced into runs) and, for ~2.6s:
//   • added text   → emerald, fades in with a green highlight sweep
//   • removed text → struck through in rose
// then the view settles to plain prose. Allergy mentions stay highlighted.

type DiffOp = { type: "same" | "added" | "removed"; text: string };

function diffChars(a: string, b: string): DiffOp[] {
  // Guard against pathological sizes — the DP table is O(n·m).
  if (a.length > 4000 || b.length > 4000) {
    return b ? [{ type: "same", text: b }] : [];
  }
  const n = a.length;
  const m = b.length;
  const dp: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  const push = (type: DiffOp["type"], ch: string) => {
    const last = ops[ops.length - 1];
    if (last && last.type === type) last.text += ch;
    else ops.push({ type, text: ch });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("removed", a[i]);
      i++;
    } else {
      push("added", b[j]);
      j++;
    }
  }
  while (i < n) push("removed", a[i++]);
  while (j < m) push("added", b[j++]);
  return ops;
}

// Drug / food allergy mentions to keep highlighted in the HPI. Longest
// phrases first so the alternation matches them before the bare "แพ้".
const ALLERGY_RE =
  /(แพ้ยาและอาหาร|แพ้อาหารและยา|แพ้ยา\/อาหาร|แพ้อาหาร|แพ้ยา|ประวัติการแพ้|ประวัติแพ้|แพ้)/g;

function renderAllergy(text: string, keyPrefix: string) {
  return text.split(ALLERGY_RE).map((seg, i) =>
    seg === "" ? null : i % 2 === 1 ? (
      <mark
        key={`${keyPrefix}-a${i}`}
        className="rounded bg-amber-100 px-0.5 font-medium text-amber-800"
      >
        {seg}
      </mark>
    ) : (
      <span key={`${keyPrefix}-t${i}`}>{seg}</span>
    ),
  );
}

function HpiDiffText({ text }: { text: string }) {
  const [ops, setOps] = useState<DiffOp[]>(() =>
    text ? [{ type: "same", text }] : [],
  );
  const prevRef = useRef(text);

  useEffect(() => {
    if (text === prevRef.current) return;
    setOps(diffChars(prevRef.current, text));
    prevRef.current = text;
    // Settle to plain prose after the change has been shown — drops the
    // struck-through removals and clears the green on additions.
    const settled = text;
    const id = window.setTimeout(() => {
      setOps(settled ? [{ type: "same", text: settled }] : []);
    }, 2600);
    return () => window.clearTimeout(id);
  }, [text]);

  return (
    <p className="whitespace-pre-line text-[14px] leading-relaxed text-[var(--theme-neutral)]/85">
      {ops.map((op, i) => {
        if (op.type === "removed") {
          return (
            <motion.span
              key={`r${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-rose-500/70 line-through decoration-rose-400/70"
            >
              {op.text}
            </motion.span>
          );
        }
        if (op.type === "added") {
          return (
            <motion.span
              key={`d${i}`}
              initial={{ opacity: 0, backgroundColor: "rgba(34,197,94,0.28)" }}
              animate={{ opacity: 1, backgroundColor: "rgba(34,197,94,0)" }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="rounded font-medium text-emerald-600"
            >
              {renderAllergy(op.text, `d${i}`)}
            </motion.span>
          );
        }
        return <span key={`s${i}`}>{renderAllergy(op.text, `s${i}`)}</span>;
      })}
    </p>
  );
}

function TopicSummaryCard({ topic }: { topic: SymptomTopic }) {
  return (
    <article className="group flex flex-col gap-4 border-b border-[var(--theme-neutral)]/15 p-4 transition-colors rounded-2xl hover:border-[var(--theme-primary)] hover:bg-[var(--theme-primary-soft)]">
      <header className="flex items-center">
        <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--theme-neutral)]/5 px-2 py-1 transition-colors group-hover:bg-[var(--theme-surface)]">
          <IconNote
            className="h-4 w-4 shrink-0 text-[var(--theme-neutral)]/60 transition-colors group-hover:text-[var(--theme-primary)]"
            stroke={1.5}
          />
          <span className="text-[14px] font-medium text-[var(--theme-neutral)]">{topic.title}</span>
        </span>
      </header>
      <p className="text-[14px] font-normal leading-normal text-[var(--theme-neutral)]/60">
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
          <IconNote className="h-4 w-4 shrink-0 text-[var(--theme-neutral)]/30" stroke={1.5} />
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
  const { saveManualTranscript } = useDictationContext();
  const joined = segments.map((s) => s.text).join(" ");
  const [draft, setDraft] = useState(joined);
  const [isEditing, setIsEditing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Commits the typed draft back to the dictation session so it persists
  // across tab switches + page reloads (localStorage), and so the
  // "สรุปด้วย AI" / normalization pipelines see the same text.
  const handleSaveDraft = () => {
    if (!draft.trim()) {
      toast.error("ไม่มีบทสนทนาให้บันทึก", "พิมพ์หรือพูดก่อนกดบันทึก");
      return;
    }
    saveManualTranscript(draft);
    setIsEditing(false);
    toast.success("บันทึกบทสนทนาแล้ว", "ใช้สำหรับสรุป/รีวิวต่อได้");
  };

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

  // Collapse consecutive same-speaker segments into chat turns so the
  // conversation reads as alternating bubbles, not one bubble per chunk.
  const turns = groupTurns(segments);

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
          onPress={() => (isEditing ? handleSaveDraft() : setIsEditing(true))}
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

      {/* Edit mode → raw textarea so the doctor can fix wording. View mode →
          the conversation rendered as a speaker-split chat. */}
      {isEditing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={'พิมพ์บทสนทนา หรือกด "บันทึก" เมื่อเสร็จ'}
          className="min-h-[200px] w-full flex-1 cursor-text resize-none rounded-2xl border border-[var(--theme-primary)] bg-[var(--theme-surface)] px-4 py-3 text-[14px] leading-relaxed text-[var(--theme-neutral)] ring-2 ring-[var(--theme-primary)]/15 transition focus:outline-none"
        />
      ) : turns.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)]/30 p-4">
          {turns.map((turn, i) => (
            <ChatTurn key={i} speaker={turn.speaker} text={turn.text} />
          ))}
          {isRecording && (
            <div className="flex items-center gap-2 px-1 pt-1 text-[12px] text-[var(--theme-primary)]">
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--theme-primary)] [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--theme-primary)] [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--theme-primary)]" />
              </span>
              กำลังฟัง...
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-[200px] flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--theme-neutral)]/20 bg-[var(--theme-base)]/30 px-6 text-center text-[13px] text-[var(--theme-neutral)]/45">
          {isRecording
            ? "กำลังฟัง..."
            : "ยังไม่มีบทสนทนา — กดไมโครโฟนเพื่อบันทึก หรือกดปุ่ม \"แก้ไข\" เพื่อพิมพ์เอง"}
        </div>
      )}
    </div>
  );
}

// ── Speaker-split chat rendering ──────────────────────────────────────────
// Diarization (DictationContext) tags each segment speaker 1 = ผู้ซักประวัติ
// (clinician) or speaker 2 = ผู้ป่วย (patient). We render speaker 1 on the
// right (primary bubble) and speaker 2 on the left (neutral bubble).

interface ChatTurnData {
  speaker?: number;
  text: string;
}

function groupTurns(segments: { text: string; speaker?: number }[]): ChatTurnData[] {
  const turns: ChatTurnData[] = [];
  for (const s of segments) {
    const text = s.text.trim();
    if (!text) continue;
    const last = turns[turns.length - 1];
    if (last && last.speaker === s.speaker) last.text += " " + text;
    else turns.push({ speaker: s.speaker, text });
  }
  return turns;
}

function ChatTurn({ speaker, text }: ChatTurnData) {
  const isClinician = speaker === 1;
  const isPatient = speaker === 2;
  const label = isClinician ? "ผู้ซักประวัติ" : isPatient ? "ผู้ป่วย" : "ไม่ระบุผู้พูด";
  return (
    <div className={`flex ${isClinician ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-[80%] flex-col gap-1">
        <span
          className={`px-1 text-[11px] text-[var(--theme-neutral)]/45 ${isClinician ? "text-right" : ""}`}
        >
          {label}
        </span>
        <div
          className={[
            "px-4 py-2.5 text-[14px] leading-relaxed",
            isClinician
              ? "rounded-2xl rounded-tr-sm bg-[var(--theme-primary)] text-white"
              : isPatient
                ? "rounded-2xl rounded-tl-sm bg-[var(--theme-surface)] text-[var(--theme-neutral)] ring-1 ring-[var(--theme-neutral)]/10"
                : "rounded-2xl rounded-tl-sm bg-[var(--theme-neutral)]/5 text-[var(--theme-neutral)]/70",
          ].join(" ")}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

// ── OLD CARTS structured form ──────────────────────────────────────────────
// Same conversation surface as `TranscriptTab` but field-by-field so a doctor
// can capture HPI without composing prose. On save we serialize the fields
// as a labeled transcript and feed it through `saveManualTranscript`, so
// every downstream step (summarize, normalize, extract) treats it the same
// way as a typed/spoken transcript.

interface OldCartsField {
  key: keyof OldCartsState;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

interface OldCartsState {
  chiefComplaint: string;
  onset: string;
  location: string;
  duration: string;
  character: string;
  aggravating: string;
  radiation: string;
  timing: string;
  severity: string;
  redFlags: string;
  pmh: string;
  medications: string;
  allergies: string;
}

const OLD_CARTS_INIT: OldCartsState = {
  chiefComplaint: "",
  onset: "",
  location: "",
  duration: "",
  character: "",
  aggravating: "",
  radiation: "",
  timing: "",
  severity: "",
  redFlags: "",
  pmh: "",
  medications: "",
  allergies: "",
};

const OLD_CARTS_FIELDS: OldCartsField[] = [
  { key: "chiefComplaint", label: "อาการสำคัญ (Chief Complaint)", placeholder: "เช่น ปวดท้องส่วนล่างขวา 2 วัน", multiline: true },
  { key: "onset", label: "O — เริ่มเป็นเมื่อไหร่ (Onset)", placeholder: "เช่น 2 ชั่วโมงก่อนมาตรวจ" },
  { key: "location", label: "L — ตำแหน่ง (Location)", placeholder: "เช่น ท้องน้อยขวา" },
  { key: "duration", label: "D — ระยะเวลา (Duration)", placeholder: "เช่น เป็นต่อเนื่อง 6 ชม." },
  { key: "character", label: "C — ลักษณะอาการ (Character)", placeholder: "เช่น ปวดบีบ ๆ" },
  { key: "aggravating", label: "A — กระตุ้น/บรรเทา (Aggrav./Alleviating)", placeholder: "เช่น แย่ลงตอนเดิน ดีขึ้นตอนนอน" },
  { key: "radiation", label: "R — ปวดร้าวไปที่ใด (Radiation)", placeholder: "เช่น ร้าวลงขา" },
  { key: "timing", label: "T — ช่วงเวลา (Timing)", placeholder: "เช่น เป็นมากตอนเช้า" },
  { key: "severity", label: "S — ความรุนแรง (Severity 1–10)", placeholder: "เช่น 7/10" },
  { key: "redFlags", label: "Red flags", placeholder: "เช่น ถ่ายเป็นเลือด ไข้สูง น้ำหนักลด", multiline: true },
  { key: "pmh", label: "โรคประจำตัว (PMH)", placeholder: "เช่น DM, HT, CKD", multiline: true },
  { key: "medications", label: "ยาที่ใช้อยู่", placeholder: "เช่น Metformin 500 mg bid", multiline: true },
  { key: "allergies", label: "ประวัติแพ้ยา", placeholder: "เช่น Penicillin — ผื่น" },
];

function serializeOldCarts(state: OldCartsState): string {
  const lines: string[] = [];
  for (const field of OLD_CARTS_FIELDS) {
    const value = state[field.key].trim();
    if (value) lines.push(`${field.label}: ${value}`);
  }
  return lines.join("\n");
}

function OldCartsTab() {
  const toast = useToast();
  const { saveManualTranscript } = useDictationContext();
  const [state, setState] = useState<OldCartsState>(OLD_CARTS_INIT);
  const [isEditing, setIsEditing] = useState(false);

  const update = (key: keyof OldCartsState, value: string) =>
    setState((s) => ({ ...s, [key]: value }));

  const handleSave = () => {
    const text = serializeOldCarts(state);
    if (!text) {
      toast.error("ยังไม่มีข้อมูล", "กรอกอย่างน้อย 1 ช่องก่อนบันทึก");
      return;
    }
    saveManualTranscript(text);
    setIsEditing(false);
    toast.success("บันทึกแล้ว", "ข้อมูลถูกใช้เป็นบทสนทนาสำหรับสรุป");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 pb-2">
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
          onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="text-[13px]"
        >
          {isEditing ? "บันทึก" : "แก้ไข"}
        </Button>
      </div>

      {/* Two-column structured form. `readOnly` until the doctor clicks
          "แก้ไข", mirroring the transcript-tab flow. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {OLD_CARTS_FIELDS.map((field) => {
          const value = state[field.key];
          const spanClass = field.multiline ? "md:col-span-2" : "";
          return (
            <div key={field.key} className={spanClass}>
              {field.multiline ? (
                <Textarea
                  label={field.label}
                  placeholder={field.placeholder}
                  value={value}
                  onValueChange={(v) => update(field.key, v)}
                  isReadOnly={!isEditing}
                  minRows={2}
                  variant="bordered"
                  classNames={{ inputWrapper: "bg-[var(--theme-surface)]" }}
                />
              ) : (
                <Input
                  label={field.label}
                  placeholder={field.placeholder}
                  value={value}
                  onValueChange={(v) => update(field.key, v)}
                  isReadOnly={!isEditing}
                  variant="bordered"
                  classNames={{ inputWrapper: "bg-[var(--theme-surface)]" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Listening caption (compact AI queue status) ──────────────────────────
// Replaces the static "กำลังฟังเสียง..." line under the soundwave. Shows
// the live counts of in-flight AI tasks (ASR partials + topic ticks) so
// the doctor can see how many requests are still being chewed on.

const LISTENING_PHRASES = [
  "กำลังจดบทสนทนาให้คุณหมอ",
  "Dr. Note กำลังตั้งใจฟัง",
  "กำลังเรียบเรียงให้คุณหมอ",
  "Dr. Note ตามทันคุณหมออยู่",
  "กำลังสรุปให้อ่านง่ายขึ้น",
  "Dr. Note กำลังจับประเด็นสำคัญ",
  "กำลังแยกเสียงคุณหมอกับคนไข้",
  "Dr. Note กำลังทำการบ้านอยู่",
  "กำลังจดอาการที่คนไข้บอก",
  "Dr. Note กำลังเชื่อมโยงประวัติ",
  "กำลังจัดให้เป็น OLD CARTS",
  "Dr. Note กำลังคัดประเด็นทางคลินิก",
  "กำลังตรวจคำที่ฟังไม่ชัด",
  "Dr. Note กำลังจัดระเบียบความคิด",
  "กำลังสรุปอาการสำคัญ",
  "Dr. Note กำลังเก็บรายละเอียดทุกคำ",
  "กำลังเช็คคำศัพท์ทางการแพทย์",
  "Dr. Note กำลังถอดเสียงเป็นข้อความ",
  "กำลังเก็บประเด็นไว้ในบทสรุป",
  "Dr. Note ฟังอยู่ ไม่พลาดสักคำ",
  "กำลังรวบรวมข้อมูลจากบทสนทนา",
  "Dr. Note กำลังจดให้เป็นระบบ",
  "กำลังบันทึกประวัติคนไข้",
  "Dr. Note พร้อมช่วยคุณหมอเสมอ",
  "กำลังเรียงลำดับเหตุการณ์",
];

function ListeningCaption() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = window.setInterval(
      () => setIdx((n) => (n + 1) % LISTENING_PHRASES.length),
      5000,
    );
    return () => window.clearInterval(t);
  }, []);
  const current = LISTENING_PHRASES[idx];
  return (
    <div className="flex h-5 items-center gap-2 overflow-hidden text-[13px] text-[var(--theme-primary)]">
      <IconLoader2 className="h-3 w-3 shrink-0 animate-spin" stroke={2.2} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.32, ease: EASE_TV }}
          className="block font-medium"
        >
          {current}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ── Paused caption ───────────────────────────────────────────────────────
// Shown after the user stops recording. While ASR/topic tasks are still
// draining we surface them; only when the queue truly empties (and we did
// see tasks fire while recording) do we flip to the green "ครบแล้ว"
// success line — i.e. it appears ONCE on the last task, not at every
// fleeting gap between ticks.

function PausedCaption({
  asrInFlight,
  topicInFlight,
}: {
  asrInFlight: number;
  topicInFlight: number;
}) {
  const total = asrInFlight + topicInFlight;
  const hadTasksRef = useRef(false);
  if (total > 0) hadTasksRef.current = true;
  const allDone = hadTasksRef.current && total === 0;

  if (total > 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        <p className="text-[14px] text-[var(--theme-neutral)]/60">
          หยุดบันทึกแล้ว · กดเพื่อบันทึกต่อ
        </p>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--theme-primary)]">
          <IconLoader2 className="h-3 w-3 animate-spin" stroke={2.2} />
          Dr. Note กำลังประมวลผลคำพูดสุดท้าย…
        </span>
      </div>
    );
  }
  if (allDone) {
    return (
      <div className="flex flex-col items-center gap-1">
        <p className="text-[14px] text-[var(--theme-neutral)]/60">
          หยุดบันทึกแล้ว · กดเพื่อบันทึกต่อ
        </p>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--theme-success)]">
          <IconCheck className="h-3.5 w-3.5" stroke={2.5} />
          Dr. Note จดครบแล้วค่ะ คุณหมอเช็คได้เลย
        </span>
      </div>
    );
  }
  return (
    <p className="text-[14px] text-[var(--theme-neutral)]/60">
      หยุดบันทึกแล้ว · กดเพื่อบันทึกต่อ
    </p>
  );
}

// ── Right column: Generation stage card ──────────────────────────────────
// Takes the captured consultation transcript and asks the LLM to draft a
// SOAP-style note (CC, PI, PE, ICD-10 candidates, treatment plan). Header
// chip uses the teal "Generation" accent; each generated section expands
// inline once the model returns.

interface Icd10Candidate {
  code: string;
  label: string;
  /** Verified against the kbBase ICD-10 dictionary via RAG. */
  verified: boolean;
  /** Authoritative label returned from KB hit (overrides LLM label when set). */
  kbLabel?: string;
}

interface Medication {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  indication: string;
}

interface GeneratedNote {
  cc: string;
  pi: string;
  pe: string;
  icd10: Icd10Candidate[];
  medications: Medication[];
  plan: string;
}

const GENERATE_NOTE_SYSTEM = `
You are a clinical scribe + outpatient prescribing assistant. Given a Thai consultation transcript (doctor + patient turns) AND a likely ICD-10 working diagnosis, draft a SOAP-style OPD note with structured medication suggestions.

Return JSON ONLY with this exact shape (no extra keys, no prose outside JSON):
{
  "cc": "<chief complaint — one short Thai sentence, the patient's reason for visit>",
  "pi": "<present illness — concise Thai paragraph covering OLD CARTS>",
  "pe": "<physical exam — Thai summary of objective findings the doctor verbalized; '—' if not mentioned>",
  "icd10": [ { "code": "<ICD-10 code>", "label": "<Thai disease name>" } ],
  "medications": [
    {
      "name":        "<generic drug name — English, lower-case>",
      "dose":        "<strength + units, e.g. '500 mg' / '5 mg/kg'>",
      "route":       "<oral | IV | IM | topical | inhaled | …>",
      "frequency":   "<e.g. 'BID' / 'tid pc' / 'q6h prn' — standard medical abbrev>",
      "duration":    "<e.g. '5 days' / 'prn' / 'ongoing'>",
      "indication": "<short Thai phrase — why this drug for this patient>"
    }
  ],
  "plan": "<treatment plan — Thai prose. Investigations, lifestyle advice, follow-up. Do NOT repeat the medications list verbatim; mention them only at a summary level.>"
}

Rules — read carefully:
- Only use facts present in the transcript; never invent symptoms or exam findings.
- For medications, prefer 1st-line evidence-based therapy for the most likely ICD-10 candidate. Use generic names (paracetamol, amoxicillin, omeprazole, …), not brand names.
- ALWAYS include adult standard dose unless the transcript suggests pediatric/renal/hepatic context — then adjust and note "indication" briefly.
- AVOID drugs the patient stated they are allergic to (search transcript for "แพ้").
- Suggest AT MOST 5 medications, ranked by clinical priority.
- If you have low confidence about a drug (e.g., diagnosis unclear), leave medications as []. Better empty than wrong.
- "icd10" lists 1–3 most likely candidates with valid ICD-10 codes.
- Empty string "—" for empty narrative fields. Empty array for empty list fields.
- Output Thai for narrative ("cc", "pi", "pe", "plan", "indication"). Keep drug names + ICD-10 codes in English.
`.trim();

/** Pull the first balanced `{ … }` object out of a string and JSON.parse
 *  it. Tolerates ```json fences, leading prose, trailing prose. Returns
 *  `null` if no parseable object is found. */
function extractJsonObject(text: string): unknown {
  if (!text) return null;
  const trimmed = text.trim();
  // Try plain parse first.
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  // Strip ```json fences if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // fall through
    }
  }
  // Last resort: scan for the first balanced top-level object.
  const start = trimmed.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(trimmed.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function normalizeGeneratedNote(raw: unknown): GeneratedNote {
  const r = (raw ?? {}) as Partial<GeneratedNote> & Record<string, unknown>;
  const icd10Raw = Array.isArray(r.icd10) ? r.icd10 : [];
  const medsRaw = Array.isArray(r.medications) ? r.medications : [];
  const s = (x: unknown) => (typeof x === "string" ? x.trim() : "");
  return {
    cc: s(r.cc),
    pi: s(r.pi),
    pe: s(r.pe),
    icd10: icd10Raw
      .map((x) => {
        const o = (x ?? {}) as { code?: unknown; label?: unknown };
        return { code: s(o.code), label: s(o.label), verified: false };
      })
      .filter((x) => x.code || x.label),
    medications: medsRaw
      .map((x) => {
        const o = (x ?? {}) as unknown as Record<string, unknown>;
        return {
          name: s(o.name),
          dose: s(o.dose),
          route: s(o.route),
          frequency: s(o.frequency),
          duration: s(o.duration),
          indication: s(o.indication),
        };
      })
      .filter((m) => m.name.length > 0)
      .slice(0, 5),
    plan: s(r.plan),
  };
}

/** RAG-verify each LLM-generated ICD-10 candidate against the kbBase
 *  dictionary. Hits whose code matches the candidate (case-insensitive,
 *  no separators) are marked verified and re-labelled with the KB's
 *  authoritative label. If KB is unreachable, all candidates stay
 *  unverified (silently — caller already shows the AI-generated warning). */
async function verifyIcd10Candidates(
  candidates: Icd10Candidate[],
): Promise<Icd10Candidate[]> {
  const normalize = (s: string) => s.replace(/[.\s-]/g, "").toUpperCase();
  return Promise.all(
    candidates.map(async (cand) => {
      const want = normalize(cand.code);
      if (!want) return cand;
      try {
        const hits = await searchKb(`ICD-10 ${cand.code} ${cand.label}`, 5);
        for (const hit of hits) {
          const probe = `${hit.id} ${hit.title} ${hit.snippet}`;
          const found = probe
            .toUpperCase()
            .match(/\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/g)
            ?.find((m) => normalize(m) === want);
          if (found) {
            return {
              ...cand,
              verified: true,
              kbLabel: hit.title || cand.label,
            };
          }
        }
        return cand;
      } catch {
        return cand;
      }
    }),
  );
}

function GenerationStageCard({
  generated,
  generating,
  canGenerate,
  onGenerate,
}: {
  generated: GeneratedNote | null;
  generating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
}) {
  const sections: { key: keyof Omit<GeneratedNote, "icd10" | "medications">; label: string; sub: string }[] = [
    { key: "cc", label: "CC", sub: "Chief Complaint" },
    { key: "pi", label: "PI", sub: "Present Illness" },
    { key: "pe", label: "PE", sub: "Physical Exam" },
    { key: "plan", label: "Plan", sub: "Treatment Plan" },
  ];
  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      {/* Header chip */}
      <div className="shrink-0 rounded-2xl bg-[#1ebfbf] px-4 py-3 text-center shadow-[var(--theme-shadow-sm)]">
        <p className="text-[15px] font-bold leading-tight text-white">สร้างข้อมูล</p>
        <p className="text-[12px] font-medium leading-tight text-white/85">(Generation)</p>
      </div>
      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow-sm)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1ebfbf]/10 text-[#1ebfbf]">
            <IconForms className="h-5 w-5" stroke={1.8} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[14px] font-bold text-[var(--theme-neutral)]">สร้าง OPD Note</span>
            <span className="text-[12px] text-[var(--theme-neutral)]/60">จากบทสนทนา</span>
          </div>
        </div>

        <Button
          color="primary"
          className="w-full bg-[#1ebfbf] text-white"
          isDisabled={!canGenerate || generating}
          isLoading={generating}
          startContent={!generating && <IconSparkles className="h-4 w-4" />}
          onPress={onGenerate}
        >
          {generated ? "สร้างใหม่อีกครั้ง" : "สร้างจากบทสนทนา"}
        </Button>

        {/* AI-generated warning — shown only after a draft exists. */}
        {generated && (
          <div className="flex items-start gap-2 rounded-xl border border-[#f5a524]/30 bg-[#f5a524]/10 p-2.5">
            <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b06d00]" stroke={2} />
            <p className="text-[11px] font-medium leading-relaxed text-[#7a4a00] dark:text-[#f5a524]">
              AI generated — ต้องตรวจสอบโดยแพทย์ก่อนใช้
            </p>
          </div>
        )}

        {/* Section list — collapsed when empty, expanded once generated. */}
        <div className="flex flex-col gap-2">
          {sections.map(({ key, label, sub }) => {
            const value = generated?.[key]?.trim() ?? "";
            return (
              <div
                key={key}
                className="rounded-xl border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-bold text-[var(--theme-neutral)]">{label}</span>
                  <span className="text-[11px] text-[var(--theme-neutral)]/55">{sub}</span>
                </div>
                <p
                  className={[
                    "mt-1 whitespace-pre-line text-[12px] leading-relaxed",
                    value ? "text-[var(--theme-neutral)]/85" : "text-[var(--theme-neutral)]/40",
                  ].join(" ")}
                >
                  {value || (generating ? "กำลังสร้าง…" : "—")}
                </p>
              </div>
            );
          })}

          {/* ICD-10 — separate render since it's a list of code/label pairs. */}
          <div className="rounded-xl border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-bold text-[var(--theme-neutral)]">ICD-10</span>
              <span className="text-[11px] text-[var(--theme-neutral)]/55">Suggestion</span>
            </div>
            {generated?.icd10.length ? (
              <ul className="mt-1 flex flex-col gap-1.5">
                {generated.icd10.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-[12px]">
                    <span className="rounded bg-[#1ebfbf]/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#0d8f8f]">
                      {d.code || "?"}
                    </span>
                    <span className="flex-1 text-[var(--theme-neutral)]/85">
                      {d.kbLabel || d.label}
                    </span>
                    {d.verified ? (
                      <span
                        className="flex items-center gap-0.5 text-[var(--theme-success)]"
                        title="ตรวจสอบกับ ICD-10 dictionary แล้ว"
                      >
                        <IconShieldCheck className="h-3.5 w-3.5" stroke={2.2} />
                      </span>
                    ) : (
                      <span
                        className="flex items-center gap-0.5 text-[#b06d00]"
                        title="ยังไม่ได้ตรวจสอบกับ ICD-10 dictionary — อาจเป็นรหัสที่ AI แต่งขึ้น"
                      >
                        <IconAlertCircle className="h-3.5 w-3.5" stroke={2.2} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[12px] text-[var(--theme-neutral)]/40">
                {generating ? "กำลังสร้าง…" : "—"}
              </p>
            )}
          </div>

          {/* Medications — drug suggestion table. Drug name + dose stays
              English; indication is Thai. AI-generated → warning badge
              at top of body already covers the disclaimer. */}
          <div className="rounded-xl border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-bold text-[var(--theme-neutral)]">ยา</span>
              <span className="text-[11px] text-[var(--theme-neutral)]/55">Medications</span>
            </div>
            {generated?.medications.length ? (
              <ul className="mt-1.5 flex flex-col gap-2">
                {generated.medications.map((m, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] p-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[12px] font-bold text-[var(--theme-primary)]">
                        {m.name}
                      </span>
                      {m.dose && (
                        <span className="font-mono text-[11px] font-semibold text-[var(--theme-neutral)]/85">
                          {m.dose}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] font-medium text-[var(--theme-neutral)]/65">
                      {m.route && <span>{m.route}</span>}
                      {m.frequency && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{m.frequency}</span>
                        </>
                      )}
                      {m.duration && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{m.duration}</span>
                        </>
                      )}
                    </div>
                    {m.indication && (
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--theme-neutral)]/75">
                        {m.indication}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[12px] text-[var(--theme-neutral)]/40">
                {generating ? "กำลังสร้าง…" : "—"}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Right column: patient ID card preview ─────────────────────────────────

interface PatientInfo {
  fullName: string;
  prefix: string;
  cid: string;
  gender: string;
  age: string;
  bloodPressure: string;
  pulse: string;
  weight: string;
  height: string;
}

/** Derive the ID-card panel rows from OCR-extracted A2UI data + the
 *  vital-signs modal. Anything not present falls back to "—". */
function derivePatientInfo(
  extracted: A2UIResponse | null,
  vitals: VitalsState | null,
): PatientInfo {
  const data = (extracted?.data ?? {}) as Record<string, string>;
  const get = (k: string) => (data[k] ?? "").trim();
  const prefix = get("patient.prefix");
  const firstName = get("patient.firstName");
  const lastName = get("patient.lastName");
  const fullName = [prefix, firstName, lastName].filter(Boolean).join(" ").trim();
  const birthdate = get("patient.birthdate");
  const age = ageFromBirthdate(birthdate);
  const bp =
    vitals && (vitals.systolic.trim() || vitals.diastolic.trim())
      ? `${vitals.systolic.trim() || "—"}/${vitals.diastolic.trim() || "—"}`
      : "";
  return {
    fullName,
    prefix,
    cid: get("patient.cid"),
    gender: get("patient.gender"),
    age,
    bloodPressure: bp,
    pulse: vitals?.pulse.trim() ?? "",
    weight: vitals?.weight.trim() ?? "",
    height: vitals?.height.trim() ?? "",
  };
}

/** Crop the patient's face from a Thai ID-card photo and return a data URL.
 *  Strategy:
 *   1. Decode the file via `createImageBitmap`.
 *   2. Try `window.FaceDetector` (Chrome/Edge) — picks the largest face.
 *   3. Fallback: heuristic crop of the right ~28% × middle ~78% region,
 *      where the photo plate sits on a standard Thai national ID card.
 *  Output: 240×280 JPEG data URL. */
async function cropPortraitFromIdCard(file: File | Blob): Promise<string | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const W = bitmap.width;
  const H = bitmap.height;
  let sx = Math.round(W * 0.72);
  let sy = Math.round(H * 0.12);
  let sw = Math.round(W * 0.26);
  let sh = Math.round(H * 0.76);

  // Try the platform face detector if present. Pick the largest face and
  // pad ~25% around it so we get hair + shoulders, not just the eyes.
  const FD = (window as unknown as { FaceDetector?: new (opts?: object) => { detect: (src: ImageBitmap) => Promise<Array<{ boundingBox: DOMRectReadOnly }>> } }).FaceDetector;
  if (FD) {
    try {
      const detector = new FD({ fastMode: true, maxDetectedFaces: 3 });
      const faces = await detector.detect(bitmap);
      if (faces.length) {
        const biggest = faces.reduce((a, b) =>
          a.boundingBox.width * a.boundingBox.height >
          b.boundingBox.width * b.boundingBox.height
            ? a
            : b,
        );
        const b = biggest.boundingBox;
        const pad = 0.35;
        sx = Math.max(0, Math.round(b.x - b.width * pad));
        sy = Math.max(0, Math.round(b.y - b.height * pad * 1.2));
        sw = Math.min(W - sx, Math.round(b.width * (1 + pad * 2)));
        sh = Math.min(H - sy, Math.round(b.height * (1 + pad * 2.2)));
      }
    } catch {
      // ignore — fall back to heuristic crop
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 280;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.9);
}

function ageFromBirthdate(yyyyMmDd: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(yyyyMmDd);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return "";
  const now = new Date();
  let years = now.getFullYear() - y;
  let months = now.getMonth() + 1 - mo;
  let days = now.getDate() - d;
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "";
  return `${years} ปี ${months} เดือน ${days} วัน`;
}

function PatientIdCard({
  info,
  portraitUrl,
  collapsed = false,
  onToggle,
}: {
  info: PatientInfo;
  portraitUrl?: string | null;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  // Collapsed → a thin rail with an expand button + vertical label, so the
  // conversation workspace gets the full width.
  if (collapsed) {
    return (
      <aside className="flex h-full min-h-0 flex-col items-center gap-3 overflow-hidden rounded-3xl border border-[var(--theme-neutral)]/15 bg-white p-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label="ขยายข้อมูลผู้ป่วย"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--theme-neutral)]/60 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]"
        >
          <IconChevronRight className="h-5 w-5" stroke={2} />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--theme-primary-soft)]">
          <IconId className="h-5 w-5 text-[var(--theme-primary)]" stroke={1.75} />
        </div>
        <span className="mt-1 rotate-180 text-[12px] font-medium text-[var(--theme-neutral)]/55 [writing-mode:vertical-rl]">
          ข้อมูลผู้ป่วย
        </span>
      </aside>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: "ชื่อและนามสกุล", value: info.fullName || "—" },
    { label: "เลขบัตรประชาชน", value: info.cid || "—" },
    { label: "อายุ", value: info.age || "—" },
    { label: "เพศ", value: info.gender || "—" },
    { label: "ความดันโลหิต", value: info.bloodPressure || "—" },
    { label: "ชีพจร", value: info.pulse || "—" },
    { label: "น้ำหนัก", value: info.weight || "—" },
    { label: "ส่วนสูง", value: info.height || "—" },
  ];
  return (
    <aside className="flex h-full min-h-0 flex-col items-start justify-between gap-4 overflow-y-auto rounded-3xl border border-[var(--theme-neutral)]/15 bg-white p-4">
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full items-center justify-between">
          <span className="text-[13px] font-semibold text-[var(--theme-neutral)]/55">
            ข้อมูลผู้ป่วย
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-label="ย่อข้อมูลผู้ป่วย"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]"
          >
            <IconChevronRight className="h-5 w-5 rotate-180" stroke={2} />
          </button>
        </div>
        <PatientIdCardSvg fullName={info.fullName} cid={info.cid} portraitUrl={portraitUrl} />
        <div className="flex w-full flex-col text-[14px] font-medium">
          {rows.map((v) => (
            <div
              key={v.label}
              className="flex w-full items-center justify-between border-b border-[#ebebec] py-4"
            >
              <span className="text-[var(--theme-neutral)]/60">{v.label}</span>
              <span className="text-[var(--theme-neutral)]">{v.value}</span>
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
    <p className="w-full text-center text-[14px] font-medium text-[var(--theme-neutral)]/60">
      โปรดตรวจสอบความถูกต้องการบันทึกเสมอ
    </p>
  );
}

/** Patient ID card — inline SVG matching Figma 1022:1582 layout. Cyan
 *  card 409×223 with: Garuda circle + 2 blue header bars on top, vertical
 *  barcode strip on the left, yellow SIM chip + name block in the middle,
 *  portrait plate on the right. */
function PatientIdCardSvg({
  fullName,
  cid,
  portraitUrl,
}: {
  fullName?: string;
  cid?: string;
  portraitUrl?: string | null;
}) {
  const displayName = fullName?.trim() || "ยังไม่มีข้อมูล";
  const displayCid = cid?.trim()
    ? cid.replace(/^(\d)(\d{4})(\d{5})(\d{2})(\d{1})$/, "$1 $2 $3 $4 $5")
    : "—";
  // First grapheme of first + last word — works for Thai (single char) and
  // Latin (first letter). Falls back to "?" when name not yet known.
  const initials = (() => {
    const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    const first = [...parts[0]][0] ?? "";
    const last = parts.length > 1 ? [...parts[parts.length - 1]][0] ?? "" : "";
    return (first + last).toUpperCase();
  })();
  return (
    <div className="aspect-[409/223] w-full overflow-hidden rounded-2xl border border-[#cccccc]">
      <svg
        viewBox="0 0 409 223"
        xmlns="http://www.w3.org/2000/svg"
        className="block h-full w-full"
        aria-label={`บัตรประจำตัวประชาชน — ${displayName}`}
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

        {/* Card title */}
        <text
          x="66"
          y="26"
          fontFamily="Google Sans, Noto Sans Thai Looped, sans-serif"
          fontSize="11"
          fontWeight="700"
          fill="#1f1f1f"
        >
          บัตรประจำตัวประชาชน
        </text>
        <text
          x="66"
          y="44"
          fontFamily="Google Sans, Noto Sans Thai Looped, sans-serif"
          fontSize="9"
          fontWeight="500"
          fill="#1f1f1f"
        >
          เลขประจำตัวประชาชน  {displayCid}
        </text>

        {/* "ชื่อและนามสกุล" label */}
        <text
          x="78"
          y="72"
          fontFamily="Google Sans, Noto Sans Thai Looped, sans-serif"
          fontSize="8"
          fill="#1f1f1f"
        >
          ชื่อและนามสกุล
        </text>

        {/* Name (Thai, bold) — from OCR */}
        <text
          x="140"
          y="86"
          fontFamily="Google Sans, Noto Sans Thai Looped, sans-serif"
          fontSize="12"
          fontWeight="700"
          fill="#1f1f1f"
        >
          {displayName}
        </text>

        {/* SIM-style yellow chip (Figma 1020:1375) */}
        <rect x="78" y="104" width="58" height="53" rx="8" fill="#fddd86" />

        {/* Portrait photo plate. If we cropped a face from the captured ID
            card image, paint it here; otherwise fall back to initials or a
            generic head silhouette. */}
        <rect x="300" y="100" width="85" height="100" rx="8" fill="#e1e4e6" />
        {portraitUrl ? (
          <image
            href={portraitUrl}
            x="300"
            y="100"
            width="85"
            height="100"
            clipPath="url(#photoClip)"
            preserveAspectRatio="xMidYMid slice"
          />
        ) : initials ? (
          <text
            x="342.5"
            y="158"
            textAnchor="middle"
            fontFamily="Google Sans, Noto Sans Thai Looped, sans-serif"
            fontSize="34"
            fontWeight="700"
            fill="#7a8089"
          >
            {initials}
          </text>
        ) : (
          <g transform="translate(342.5, 150)" fill="#b6bcc3">
            <circle cx="0" cy="-12" r="13" />
            <path d="M -22 22 C -22 6, 22 6, 22 22 L 22 30 L -22 30 Z" />
          </g>
        )}
      </svg>
    </div>
  );
}

