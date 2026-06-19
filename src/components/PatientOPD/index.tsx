import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { Accordion, AccordionItem, Tooltip, Textarea } from "@heroui/react";
import { useNavigate, useParams } from "react-router";
import {
  IconChevronRight,
  IconChevronDown,
  IconFlame,
  IconLoader2,
  IconSparkles,
  IconStethoscope,
  IconPlus,
  IconMinus,
  IconZoomReset,
  IconCircle,
  IconArrowsMinimize,
  IconRotateClockwise2,
  IconNeedle,
  IconBolt,
  IconHeartbeat,
  IconActivity,
  IconArrowsMaximize,
  IconGrain,
  IconDropletFilled,
  IconBandage,
  IconCircleDot,
  IconHandStop,
  IconBattery2,
  IconBone,
  IconChevronLeft,
  IconCamera,
  IconX,
  IconPrinter,
  IconSignature,
  IconUser,
  IconUserScan,
  IconMicrophone,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconBulb,
  IconEye,
  IconEyeOff,
  IconPill,
  IconTestPipe,
  IconCertificate,
  IconCalendarEvent,
  IconPencil,
  IconDeviceDesktop,
  IconCheck,
  IconLayoutSidebarRightExpand,
  IconLayoutSidebarRightCollapse,
  IconInfoCircle,
  IconClipboardPlus,
  IconSearch,
  IconAlertTriangle,
  IconGripVertical,
  IconCircleCheckFilled,
  IconLayoutGrid,
  IconHistory,
} from "@tabler/icons-react";
import DRNOTE_ROBOT from "../../assets/figma/drnote-robot.png";
import DRNOTE_READY from "../../assets/figma/drnote-ready.png";
import DRNOTE_DIAGNOSIS from "../../assets/figma/dr-note-diagnosis.png";
import PLAN_WAVE from "../../assets/figma/plan/header-wave.svg";
import PLAN_WAVE_ORANGE from "../../assets/figma/plan/header-wave-orange.svg";
import PLAN_WAVE_BLUE from "../../assets/figma/plan/header-wave-blue.svg";
import PLAN_HEADER_ICON from "../../assets/figma/plan/header-icon.svg";
import PLAN_EDIT_ICON from "../../assets/figma/plan/edit.svg";
import PLAN_WARN_ICON from "../../assets/figma/plan/warn.svg";
import LAB_ABNORMAL_ICON from "../../assets/figma/lab-abnormal-icon.svg";
import { useSidebar } from "../../contexts/SidebarContext";
import { useToast } from "../../contexts/ToastContext";
import { chatJSON } from "../../services/ai/llm";
import { startPcmRecorder, type PcmRecorder } from "../../services/ai/pcmRecorder";
import { transcribe } from "../../services/ai/asr";
import { PATIENTS, type Patient, type VisitSummary } from "../../data/mock/patients";
import { ICD10_CATALOG, searchIcd10, findIcd10, type Icd10Entry } from "../../data/icd10";
import { searchDrugs, type DrugMaster } from "../../data/drugMaster";
import { searchLabs, labPrep, type LabMaster } from "../../data/labMaster";
import CertificateBuilder, { CertPreview } from "./CertificateBuilder";
import AppointmentScheduler from "./AppointmentScheduler";
import { useUser } from "../../contexts/UserContext";
import { CERT_TEMPLATE_BY_ID, logCertIssuance, type MedicalCert } from "../../data/medCertTemplates";
import {
  addDaysISO as apptAddDays,
  nearestIntervalKey,
  type PlanAppt,
} from "../../data/apptIntervals";
import { createPortal } from "react-dom";
import { ICD10_EXTERNAL_ENABLED, externalSearchIcd10 } from "../../services/ai/icd10Rag";
import { getPatient } from "../../data/patientStore";
import type { Patient as StoredPatient } from "../../types";
import SpeakButton from "../SpeakButton";
import {
  useChiefComplaintFromLLM,
  useHpiNarrativeFromLLM,
  useMedsFromLLM,
  Soundwave,
  HpiDiffText,
  ListeningCaption,
} from "../NewPatientByVoice";
import { useDictationContext } from "../../contexts/DictationContext";
import BodyMap, { type BodyAnnotation } from "../BodyMap";
import {
  BODY_REGION_BY_ID,
  BODY_REGION_ENUM,
  BODY_VIEWBOX,
  type BodyRegionId,
} from "../../data/bodyRegions";
import {
  PAIN_CHARACTERS,
  PAIN_CHARACTER_BY_ID,
  painCharactersFromText,
  painCharacterFromText,
  severityFromText,
} from "../../data/painCharacters";
import {
  FINDING_TYPE_BY_ID,
  FINDING_TYPE_ENUM,
} from "../../data/findingTypes";

/** Hydrate the rich `mock/patients.ts` Patient shape from the leaner
 *  `types.ts` Patient that lands in the `patientStore` (nurse-registered
 *  patients). Missing clinical data is filled with safe empty defaults. */
function storedToMockPatient(s: StoredPatient): Patient {
  const ageFrom = (yyyyMmDd?: string) => {
    if (!yyyyMmDd) return 0;
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(yyyyMmDd);
    if (!m) return 0;
    const birth = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (
      now.getMonth() < birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
    )
      age--;
    return Math.max(0, age);
  };
  const gender: Patient["gender"] = s.gender === "male" ? "M" : s.gender === "female" ? "F" : "M";
  return {
    id: s.hn,
    hn: s.hn,
    citizenId: s.cid ?? "",
    prefix: (s.prefix as Patient["prefix"]) || "นาย",
    firstName: s.firstName ?? "",
    lastName: s.lastName ?? "",
    birthDate: s.birthdate ?? "",
    age: ageFrom(s.birthdate),
    gender,
    bloodType: (s.bloodGroup as Patient["bloodType"]) || "O",
    rh: s.rh === "-" ? "-" : "+",
    phone: s.phone ?? "",
    address: { district: "—", province: "—" },
    insurance: "UC",
    status: "active",
    registeredDate: new Date().toISOString().slice(0, 10),
    lastVisit: new Date().toISOString().slice(0, 10),
    primaryDoctor: "—",
    vitals: {
      height: 0, weight: 0, bmi: 0, systolic: 0, diastolic: 0,
      heartRate: 0, temperature: 0, measuredAt: new Date().toISOString(),
    },
    diagnoses: [],
    allergies: [],
    medications: [],
    labs: [],
    recentVisits: [],
    riskFlags: [],
  };
}

// ── Condition knowledge (drives the AI summary seed + symptom mapping) ─────

interface ConditionInfo {
  title: string;
  blurb: string;
  symptoms: { label: string; hint?: string }[];
  seeDoctorIf: string[];
  homeCare: { warn?: string; tips: string[] };
  complications: { name: string; desc: string }[];
}

const CONDITION_INFO: Record<string, ConditionInfo> = {
  E11: {
    title: "รายงานวิเคราะห์เมตาบอลิก",
    blurb:
      "ระดับน้ำตาลและการควบคุมเมตาบอลิกบ่งชี้สุขภาพของระบบต่อมไร้ท่อ ภาวะดื้ออินซูลินและน้ำตาลสูงเรื้อรังสัมพันธ์กับภาวะแทรกซ้อนหลายระบบ",
    symptoms: [
      { label: "ปัสสาวะบ่อย" }, { label: "กระหายน้ำมาก" }, { label: "อ่อนเพลีย" },
      { label: "ตาพร่ามัว" }, { label: "แผลหายช้า" },
    ],
    seeDoctorIf: ["น้ำตาลในเลือดสูงเกิน 250 mg/dL", "ชาปลายมือปลายเท้า", "แผลที่เท้าหายช้า"],
    homeCare: { warn: "หลีกเลี่ยงอาหารหวาน", tips: ["ออกกำลังกายสม่ำเสมอ", "ตรวจน้ำตาลปลายนิ้ว"] },
    complications: [
      { name: "โรคไตจากเบาหวาน", desc: "เบาหวานที่คุมไม่ดีทำให้การกรองของไตเสื่อมลง" },
      { name: "เบาหวานขึ้นตา", desc: "ทำลายหลอดเลือดในจอประสาทตา เสี่ยงต่อการมองเห็น" },
    ],
  },
  I10: {
    title: "รายงานวิเคราะห์หลอดเลือดและหัวใจ",
    blurb:
      "ความดันโลหิตที่สูงต่อเนื่องเพิ่มภาระต่อหัวใจและหลอดเลือด และเป็นปัจจัยเสี่ยงสำคัญของโรคหัวใจและหลอดเลือดสมอง",
    symptoms: [
      { label: "ปวดตึงท้ายทอย" }, { label: "เวียนศีรษะ" }, { label: "ใจสั่น" }, { label: "ตาพร่า" },
    ],
    seeDoctorIf: ["ความดันสูงเกิน 180/110 mmHg", "เจ็บแน่นหน้าอก", "แขนขาอ่อนแรง"],
    homeCare: { warn: "ลดอาหารเค็ม", tips: ["วัดความดันที่บ้านสม่ำเสมอ", "ควบคุมน้ำหนัก"] },
    complications: [
      { name: "โรคหลอดเลือดสมอง", desc: "ความดันสูงเพิ่มความเสี่ยงต่อภาวะสมองขาดเลือด" },
      { name: "หัวใจโต / หัวใจล้มเหลว", desc: "หัวใจทำงานหนักขึ้นจากความดันที่สูงเรื้อรัง" },
    ],
  },
};

const DEFAULT_CONDITION: ConditionInfo = {
  title: "รายงานวิเคราะห์ผู้ป่วย",
  blurb: "สรุปผลตรวจและการประเมินทางคลินิกของผู้ป่วย เพื่อช่วยแพทย์ในการวินิจฉัยและวางแผนการดูแลรักษา",
  symptoms: [{ label: "อ่อนเพลีย" }, { label: "เบื่ออาหาร" }],
  seeDoctorIf: ["อาการแย่ลงอย่างรวดเร็ว", "มีไข้สูงต่อเนื่อง"],
  homeCare: { tips: ["พักผ่อนให้เพียงพอ", "ดื่มน้ำมาก ๆ"] },
  complications: [],
};

/** Resolve a patient by HN — mock roster first, then locally-stored patients
 *  (registered via the nurse intake flow). Shared by PatientOPD + DrNoteConsult
 *  so both routes resolve the same record. */
export function resolvePatient(hn?: string): Patient | undefined {
  if (!hn) return PATIENTS[0];
  const mock = PATIENTS.find((p) => p.hn === hn);
  if (mock) return mock;
  const stored = getPatient(hn);
  return stored ? storedToMockPatient(stored) : undefined;
}

export function conditionFor(p: Patient): ConditionInfo {
  const code = p.diagnoses[0]?.code ?? "";
  return CONDITION_INFO[code.split(".")[0]] ?? DEFAULT_CONDITION;
}

/** A phrase in the review blurb to visually highlight, by category, so doctors
 *  can skim symptoms / severity / allergies quickly. */
type ReviewHighlight = { text: string; kind: "symptom" | "severity" | "allergy" };
const HL_KINDS = new Set(["symptom", "severity", "allergy"]);

/** AI case-review summary (รีวิวเคสคนไข้) — seeds with static condition copy,
 *  then replaces the blurb once the model responds. Re-runs on HN change. */
export function useAiCaseReview(patient: Patient | undefined): {
  blurb: string;
  loading: boolean;
  aiGenerated: boolean;
  highlights: ReviewHighlight[];
} {
  const [state, setState] = useState<{ blurb: string; aiGenerated: boolean; highlights: ReviewHighlight[] }>({
    blurb: DEFAULT_CONDITION.blurb,
    aiGenerated: false,
    highlights: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patient) return;
    let cancelled = false;
    const fb = conditionFor(patient);
    setState({ blurb: fb.blurb, aiGenerated: false, highlights: [] });

    const dx = patient.diagnoses.map((d) => `${d.name} (${d.code})`).join(", ") || "ไม่มีโรคประจำตัว";
    const drugAllergy =
      patient.allergies.filter((a) => DRUG_ALLERGY_RE.test(a.substance)).map((a) => a.substance).join(", ") ||
      "ไม่มีประวัติแพ้ยา";
    const foodAllergy =
      patient.allergies.filter((a) => FOOD_ALLERGY_RE.test(a.substance)).map((a) => a.substance).join(", ") ||
      "ไม่มีประวัติแพ้อาหาร";
    const meds = patient.medications.map((m) => `${m.drug} ${m.dose}`).join(", ") || "ไม่มียาประจำ";
    const abn =
      patient.labs.filter((l) => l.abnormal).map((l) => `${l.test} ${l.value} ${l.unit} (ปกติ ${l.referenceRange})`).join("; ") ||
      "ไม่มีผลแลปผิดปกติ";
    const v = patient.vitals;
    const visit0 = patient.recentVisits[0];
    const cc = visit0?.chiefComplaint ?? "-";
    const o = visit0?.opqrst;
    const hpi = o
      ? `เริ่มเป็น: ${o.onset}; ปัจจัยกระตุ้น/บรรเทา: ${o.provocation}; ลักษณะ: ${o.quality}; ` +
        `ตำแหน่ง: ${o.region}${o.radiation ? ` (ร้าว ${o.radiation})` : ""}; ความรุนแรง: ${o.severity}/10; ` +
        `ระยะเวลา: ${o.timing}${o.associated ? `; อาการร่วม: ${o.associated}` : ""}`
      : "วันนี้ไม่ได้ซักประวัติแบบ OPQRST — ให้วิเคราะห์ร่วมจากประวัติการมาตรวจก่อนหน้า";
    // visit timeline so the review can synthesise from earlier visits when the
    // current visit lacks a detailed history
    const timeline =
      patient.recentVisits
        .map((vt) => {
          const oo = vt.opqrst;
          const extra = oo ? ` — ${oo.quality} บริเวณ${oo.region} ระดับ ${oo.severity}/10` : "";
          return `• ${fmtThaiDate(vt.date)} (${vt.clinic}): ${vt.chiefComplaint} → ${vt.diagnosis}${extra}`;
        })
        .join("\n") || "ไม่มีประวัติการมาตรวจก่อนหน้า";
    const ctx =
      `เพศ${patient.gender === "M" ? "ชาย" : "หญิง"} อายุ ${patient.age} ปี น้ำหนัก ${v.weight} กก.\n` +
      `อาการสำคัญวันนี้: ${cc}\nประวัติปัจจุบัน (OPQRST): ${hpi}\n` +
      `ประวัติการมาตรวจล่าสุด:\n${timeline}\n` +
      `โรคประจำตัว/ประวัติการเจ็บป่วย: ${dx}\nประวัติแพ้ยา: ${drugAllergy}\nประวัติแพ้อาหาร: ${foodAllergy}\n` +
      `ประวัติการใช้ยา: ${meds}\nผลแลปผิดปกติ: ${abn}\n` +
      `สัญญาณชีพ: BP ${v.systolic}/${v.diastolic} mmHg, BMI ${v.bmi}, HR ${v.heartRate} bpm`;

    setLoading(true);
    chatJSON<{ blurb?: string; highlights?: { text?: string; kind?: string }[] }>(
      [
        {
          role: "system",
          content:
            "คุณคือ AI ผู้ช่วยแพทย์ในระบบ CIS เขียน 'รีวิวเคสคนไข้' สรุปภาพรวมเคสจากข้อมูลที่ให้ " +
            'Output ONLY JSON: {"blurb":"...","highlights":[{"text":"...","kind":"..."}]}. ' +
            "blurb: ภาษาไทยคลินิก แบ่งเป็น 2 ส่วนในย่อหน้าเดียว (3-5 ประโยค): " +
            "(1) เรียบเรียงประวัติปัจจุบันจาก OPQRST ให้เป็นเรื่องราว (มาด้วยอาการอะไร เริ่มเมื่อไหร่ ลักษณะ ตำแหน่ง ความรุนแรง ปัจจัยกระตุ้น/บรรเทา อาการร่วม) — หากวันนี้ไม่ได้ซักประวัติแบบละเอียด ให้วิเคราะห์ร่วมจาก 'ประวัติการมาตรวจล่าสุด' แทน ห้ามเขียนว่า 'ไม่มีประวัติ' หรือ 'ไม่ได้ซักประวัติ' " +
            "(2) ปิดท้ายด้วยสรุปข้อมูลพื้นฐานที่ต้องระวังเสมอ: โรคประจำตัว, ประวัติการแพ้ยา, การแพ้อาหาร, และยาที่ใช้ประจำ — ระบุตามข้อมูลจริง ถ้าไม่มีให้บอกชัดเจน เช่น 'ไม่มีประวัติแพ้ยา' 'ไม่มีโรคประจำตัว' " +
            "เชื่อมกับผลแลปผิดปกติและความเสี่ยงที่ต้องระวัง ตามข้อมูลจริง ห้ามแต่งข้อมูลที่ไม่ได้ระบุ. " +
            "highlights: เลือกข้อความสำคัญที่ควรเน้นให้แพทย์ skim — แต่ละ text ต้องเป็น 'substring ที่ตรงเป๊ะ' ตัดมาจาก blurb (คัดลอกคำต่อคำ ห้ามดัดแปลง). " +
            'kind มี 3 แบบ: "symptom" (อาการ/การวินิจฉัยเด่น), "severity" (ความรุนแรง เช่น "7/10" หรือคำว่ารุนแรง), "allergy" (การแพ้ยา/อาหาร รวมถึงประโยค "ไม่มีประวัติแพ้ยา"). เลือกเฉพาะวลีสั้น ๆ ที่สำคัญจริง.',
        },
        { role: "user", content: ctx },
      ],
      { temperature: 0.3, maxTokens: 650, fast: true },
    )
      .then((r) => {
        if (cancelled) return;
        const blurb = typeof r?.blurb === "string" ? r.blurb.trim() : "";
        const highlights: ReviewHighlight[] = Array.isArray(r?.highlights)
          ? r.highlights
              .filter((h): h is { text: string; kind: string } => !!h && typeof h.text === "string" && typeof h.kind === "string")
              .filter((h) => HL_KINDS.has(h.kind) && h.text.trim().length > 0 && blurb.includes(h.text.trim()))
              .map((h) => ({ text: h.text.trim(), kind: h.kind as ReviewHighlight["kind"] }))
          : [];
        if (blurb) setState({ blurb, aiGenerated: true, highlights });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [patient?.hn]);

  return { ...state, loading };
}

// ── Symptom → body region heat-map (LLM) ──────────────────────────────────

const BODY_ANALYSIS_SYSTEM =
  "คุณคือ AI ผู้ช่วยแพทย์ วิเคราะห์ว่าจากโรคและอาการของผู้ป่วย มี 'บริเวณร่างกาย' ใดที่เกี่ยวข้อง/มีอาการ และให้คะแนนความรุนแรง 0..1 (1 = รุนแรง/เด่นชัดสุด). " +
  "พิจารณาทั้งตำแหน่งอาการตรง ๆ และอาการปวดร้าว (referred pain). " +
  `เลือก region id จากรายการนี้เท่านั้น: ${BODY_REGION_ENUM}. ` +
  'ตอบ JSON เท่านั้น: {"regions":[{"id":"...","intensity":0.0}]} — ใส่เฉพาะบริเวณที่เกี่ยวข้องจริง.';

function useSymptomBodyRegions(
  visit: VisitSummary | undefined,
  p: Patient,
  info: ConditionInfo,
): {
  highlights: Partial<Record<BodyRegionId, number>>;
  loading: boolean;
} {
  const [highlights, setHighlights] = useState<Partial<Record<BodyRegionId, number>>>({});
  const [loading, setLoading] = useState(false);

  const clinicalInput = useMemo(() => {
    const dx = p.diagnoses.map((d) => `${d.name} (${d.code})`).join(", ");
    const sx = info.symptoms.map((s) => s.label).join(", ");
    const o = visit?.opqrst;
    const hpi = o ? `${o.quality} บริเวณ ${o.region}${o.radiation ? ` ร้าวไป ${o.radiation}` : ""}` : "-";
    return (
      `อาการสำคัญของ visit นี้: ${visit?.chiefComplaint ?? "-"}\nประวัติ: ${hpi}\n` +
      `การวินิจฉัยของ visit: ${visit?.diagnosis ?? "-"}\nโรคประจำตัว: ${dx || "-"}\nอาการที่พบบ่อยของโรค: ${sx || "-"}`
    );
  }, [visit, p, info]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await chatJSON<{ regions?: { id?: string; intensity?: number }[] }>(
          [
            { role: "system", content: BODY_ANALYSIS_SYSTEM },
            { role: "user", content: clinicalInput },
          ],
          { temperature: 0.1, maxTokens: 500, fast: true },
        );
        if (cancelled) return;
        const map: Partial<Record<BodyRegionId, number>> = {};
        for (const r of res.regions ?? []) {
          if (r.id && r.id in BODY_REGION_BY_ID) {
            const v = typeof r.intensity === "number" ? r.intensity : 0.6;
            map[r.id as BodyRegionId] = Math.max(0.2, Math.min(1, v));
          }
        }
        setHighlights(map);
      } catch {
        if (!cancelled) setHighlights({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clinicalInput]);

  return { highlights, loading };
}

/** Live symptom → body-region mapping from the GROWING interview transcript.
 *  As the patient names where it hurts (e.g. "ปวดหัว" → head, "ปวดท้อง" → abdomen),
 *  re-runs every few seconds while recording and returns region→intensity so the
 *  body model highlights + auto-zooms to that area. Generic: any region in the
 *  taxonomy. Holds its last result after recording stops; [] until anything maps. */
export function useTranscriptBodyRegions(
  transcript: string,
  isRecording: boolean,
): Partial<Record<BodyRegionId, number>> {
  const [highlights, setHighlights] = useState<Partial<Record<BodyRegionId, number>>>({});
  const txRef = useRef(transcript);
  txRef.current = transcript;
  const lastRef = useRef("");

  useEffect(() => {
    if (!isRecording) return;
    let cancelled = false;
    const tick = async () => {
      const tx = txRef.current.trim();
      if (tx.length < 8) return;
      if (tx === lastRef.current) return;
      lastRef.current = tx;
      try {
        const res = await chatJSON<{ regions?: { id?: string; intensity?: number }[] }>(
          [
            { role: "system", content: BODY_ANALYSIS_SYSTEM },
            {
              role: "user",
              content: `บทสนทนาการซักประวัติ (กำลังดำเนินอยู่ — ระบุบริเวณร่างกายที่ผู้ป่วยบอกว่ามีอาการ ตามที่เล่าจริง):\n${tx}`,
            },
          ],
          { temperature: 0.1, maxTokens: 400, fast: true },
        );
        if (cancelled) return;
        const map: Partial<Record<BodyRegionId, number>> = {};
        for (const r of res.regions ?? []) {
          if (r.id && r.id in BODY_REGION_BY_ID) {
            const v = typeof r.intensity === "number" ? r.intensity : 0.6;
            map[r.id as BodyRegionId] = Math.max(0.2, Math.min(1, v));
          }
        }
        if (Object.keys(map).length) setHighlights(map);
      } catch {
        // silent — next tick retries
      }
    };
    tick();
    const interval = window.setInterval(tick, 4500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isRecording]);

  return highlights;
}

const SYMPTOM_PLOT_SYSTEM =
  "คุณคือ AI ผู้ช่วยแพทย์ สรุป 'อาการสำคัญ + สาเหตุที่สงสัย' จากบทสนทนาการซักประวัติ เป็นรายการสั้น ๆ เฉพาะอาการเด่นที่ควร plot ลงร่างกาย (ไม่เกิน 4 อาการ — เน้นอาการหลักและตำแหน่งที่ชัดเจน อย่าลงทุก region). " +
  `แต่ละอาการเลือก region id ที่เกี่ยวข้องจากรายการนี้เท่านั้น: ${BODY_REGION_ENUM}. ` +
  "label = วลีอาการไทยสั้นกระชับ เช่น 'ปวดบิด 6/10', 'กดเจ็บ', 'แน่นท้อง', 'ร้าวไปหลัง'. " +
  "cause = สาเหตุ/กลไก/ภาวะที่สงสัยจากการซักประวัติ สั้น ๆ เช่น 'สงสัยลำไส้อักเสบ', 'น่าจะกระเพาะ', 'นิ่วท่อไต' (ถ้าไม่ชัดให้เว้นว่าง). " +
  'ตอบ JSON เท่านั้น: {"items":[{"region":"<id>","label":"<อาการ>","cause":"<สาเหตุที่สงสัย>"}]}';

export interface SymptomPlotItem {
  id: BodyRegionId;
  label: string;
  /** suspected cause / mechanism from the history */
  cause?: string;
}

/** After the Dr.Note recording stops, summarise the history into a few key
 *  symptom callouts (region + short phrase) to plot on the body — NOT one line
 *  per mapped region. Re-extracts once each time recording stops. */
export function useSymptomPlot(transcript: string, isRecording: boolean): SymptomPlotItem[] {
  const [items, setItems] = useState<SymptomPlotItem[]>([]);
  const txRef = useRef(transcript);
  txRef.current = transcript;
  const wasRecording = useRef(isRecording);

  useEffect(() => {
    const stopped = wasRecording.current && !isRecording;
    wasRecording.current = isRecording;
    if (isRecording) setItems([]); // clear while a new session records
    if (!stopped) return;
    const tx = txRef.current.trim();
    if (tx.length < 12) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await chatJSON<{ items?: { region?: string; label?: string; cause?: string }[] }>(
          [
            { role: "system", content: SYMPTOM_PLOT_SYSTEM },
            { role: "user", content: `บทสนทนาการซักประวัติ:\n${tx}` },
          ],
          { temperature: 0.1, maxTokens: 500, fast: true },
        );
        if (cancelled) return;
        const out = (res.items ?? [])
          .filter((it) => it.region && it.region in BODY_REGION_BY_ID && it.label)
          .slice(0, 4)
          .map((it) => ({
            id: it.region as BodyRegionId,
            label: String(it.label),
            cause: it.cause ? String(it.cause).trim() || undefined : undefined,
          }));
        setItems(out);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isRecording]);

  return items;
}

const PAST_HISTORY_SYSTEM =
  "คุณคือ AI ผู้ช่วยแพทย์ ดึงเฉพาะ 'ประวัติการเจ็บป่วยในอดีต (Past Medical History)' จากบทสนทนาการซักประวัติ — ได้แก่ โรคประจำตัว/โรคเรื้อรัง, การผ่าตัด, การนอนโรงพยาบาล, ประวัติเจ็บป่วยสำคัญในอดีตที่ผู้ป่วยกล่าวถึง. " +
  "ห้ามรวม 'อาการเจ็บป่วยปัจจุบัน' (current illness / HPI) หรืออาการที่มาตรวจครั้งนี้ — ส่วนนั้นถูกสรุปแยกที่ HPI แล้ว อย่าทำซ้ำ. " +
  'Output ONLY JSON: {"history":["...","..."]} — แต่ละ item เป็นวลีไทยสั้นกระชับ (เช่น "เบาหวานชนิดที่ 2 มา 5 ปี", "เคยผ่าตัดไส้ติ่ง 2562", "แพ้ penicillin"). ถ้ายังไม่มีประวัติอดีตที่ระบุชัด ให้ {"history":[]}.';

/** Live extraction of PAST medical history mentioned in the interview — kept
 *  deliberately distinct from HPI (current illness) so the two sections don't
 *  duplicate each other. Re-runs while recording; holds its last result. */
function usePastHistoryFromLLM(transcript: string, isRecording: boolean): string[] {
  const [history, setHistory] = useState<string[]>([]);
  const txRef = useRef(transcript);
  txRef.current = transcript;
  const lastRef = useRef("");

  useEffect(() => {
    if (!isRecording) return;
    let cancelled = false;
    const tick = async () => {
      const tx = txRef.current.trim();
      if (tx.length < 8) return;
      if (tx === lastRef.current) return;
      lastRef.current = tx;
      try {
        const r = await chatJSON<{ history?: string[] }>(
          [
            { role: "system", content: PAST_HISTORY_SYSTEM },
            { role: "user", content: `บทสนทนาการซักประวัติ (กำลังดำเนินอยู่):\n${tx}` },
          ],
          { temperature: 0.1, maxTokens: 300, fast: true },
        );
        if (cancelled) return;
        const list = Array.isArray(r?.history)
          ? r.history.filter((h): h is string => typeof h === "string" && h.trim().length > 0).map((h) => h.trim()).slice(0, 8)
          : [];
        setHistory(list);
      } catch {
        // silent — next tick retries
      }
    };
    tick();
    const interval = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isRecording]);

  return history;
}

// ── HPI highlighting ───────────────────────────────────────────────────────

type HpiCategory = "symptom" | "severity" | "allergy" | "onset" | "location" | "negation";

/** Display style per HPI annotation category — marker tint (bg) + text colour
 *  (fg, a Tailwind class). Tuned for AA contrast on the light marker. */
const HPI_CATEGORIES: Record<HpiCategory, { label: string; bg: string; fg: string }> = {
  symptom:  { label: "อาการ",      bg: "rgba(57,101,225,0.20)",  fg: "text-[#1e3a8a]" },
  severity: { label: "ความรุนแรง", bg: "rgba(255,56,60,0.22)",   fg: "text-[#991b1b]" },
  allergy:  { label: "การแพ้",     bg: "rgba(245,158,11,0.32)",  fg: "text-[#92400e]" },
  onset:    { label: "ระยะเวลา",   bg: "rgba(13,148,136,0.20)",  fg: "text-[#0f766e]" },
  location: { label: "ตำแหน่ง",    bg: "rgba(147,51,234,0.18)",  fg: "text-[#6b21a8]" },
  negation: { label: "ปฏิเสธ",     bg: "rgba(100,116,139,0.18)", fg: "text-[#334155]" },
};
const HPI_CATEGORY_KEYS = Object.keys(HPI_CATEGORIES) as HpiCategory[];

type HpiAnnotation = { text: string; category: HpiCategory; confidence: number };

/** The JSON contract the model must return for HPI annotations. */
const HPI_ANNOTATION_SCHEMA =
  'Output ONLY JSON: {"annotations":[{"text":"<substring ตรงเป๊ะจาก HPI>","category":"<' +
  HPI_CATEGORY_KEYS.join("|") +
  '>","confidence":0.0}]}. text ต้องคัดลอกคำต่อคำจาก HPI ห้ามดัดแปลง/แปล. confidence 0..1 ตามความมั่นใจ. เลือกเฉพาะวลีสำคัญ (สูงสุด ~10).';
const HPI_ANNOTATION_SYSTEM =
  "คุณคือ AI ผู้ช่วยแพทย์ ทำ annotation วลีสำคัญใน 'ประวัติการเจ็บป่วยปัจจุบัน (HPI)' เพื่อช่วยแพทย์ skim. หมวด: " +
  HPI_CATEGORY_KEYS.map((k) => `${k}=${HPI_CATEGORIES[k].label}`).join(", ") +
  ". " +
  HPI_ANNOTATION_SCHEMA;

/** Deterministic fallback when the model returns no annotations — a small Thai
 *  clinical lexicon. Lower confidence so spans render faded. */
const HPI_LEXICON: { category: HpiCategory; re: RegExp }[] = [
  { category: "allergy", re: /แพ้ยาและอาหาร|แพ้อาหารและยา|แพ้อาหาร|แพ้ยา|ประวัติการแพ้|ประวัติแพ้/g },
  { category: "severity", re: /\d+\s*\/\s*10|รุนแรงมาก|รุนแรง|ปานกลาง|เล็กน้อย/g },
  { category: "onset", re: /\d+\s*(?:นาที|ชั่วโมง|ชม\.|วัน|สัปดาห์|เดือน|ปี)(?:ก่อน|ที่แล้ว|มาแล้ว)?/g },
  { category: "negation", re: /ปฏิเสธ\S{0,10}|ไม่มีอาการ\S{0,8}/g },
  { category: "symptom", re: /ปวด\S{0,6}|เจ็บ\S{0,6}|ไข้|ไอ|เหนื่อย\S{0,4}|คลื่นไส้|อาเจียน|เวียนศีรษะ|เวียนหัว|ใจสั่น|บวม|ชา\S{0,4}/g },
];
function lexiconAnnotations(hpi: string): HpiAnnotation[] {
  const out: HpiAnnotation[] = [];
  for (const { category, re } of HPI_LEXICON) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(hpi))) {
      const text = m[0].trim();
      if (text) out.push({ text, category, confidence: 0.45 });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  return out;
}

type HpiSpan = { text: string; category?: HpiCategory; confidence?: number };
/** Slice `hpi` into renderable spans from annotations (exact substrings,
 *  non-overlapping, earliest-wins). Plain text fills the gaps. */
function buildHpiSpans(hpi: string, annotations: HpiAnnotation[]): HpiSpan[] {
  const ranges: { start: number; end: number; category: HpiCategory; confidence: number }[] = [];
  for (const a of annotations) {
    const t = a.text.trim();
    if (!t) continue;
    const i = hpi.indexOf(t);
    if (i < 0) continue;
    const start = i;
    const end = i + t.length;
    if (ranges.some((r) => start < r.end && end > r.start)) continue;
    ranges.push({ start, end, category: a.category, confidence: a.confidence });
  }
  ranges.sort((a, b) => a.start - b.start);
  const out: HpiSpan[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) out.push({ text: hpi.slice(cursor, r.start) });
    out.push({ text: hpi.slice(r.start, r.end), category: r.category, confidence: r.confidence });
    cursor = r.end;
  }
  if (cursor < hpi.length) out.push({ text: hpi.slice(cursor) });
  return out;
}

type HpiAnnotationState = { annotations: HpiAnnotation[]; ai: boolean };
/** Requests HPI annotations from the model once the transcript has ended (not
 *  recording). Shows the lexicon immediately, then upgrades to AI annotations
 *  if the model returns any. */
function useHpiAnnotations(hpi: string, isRecording: boolean): HpiAnnotationState {
  const [state, setState] = useState<HpiAnnotationState>({ annotations: [], ai: false });
  const lastRef = useRef("");

  useEffect(() => {
    if (isRecording || !hpi.trim()) {
      setState({ annotations: [], ai: false });
      lastRef.current = "";
      return;
    }
    if (hpi === lastRef.current) return;
    lastRef.current = hpi;
    let cancelled = false;
    setState({ annotations: lexiconAnnotations(hpi), ai: false });
    chatJSON<{ annotations?: { text?: string; category?: string; confidence?: number }[] }>(
      [
        { role: "system", content: HPI_ANNOTATION_SYSTEM },
        { role: "user", content: hpi },
      ],
      { temperature: 0.2, maxTokens: 500, fast: true },
    )
      .then((r) => {
        if (cancelled) return;
        const anns: HpiAnnotation[] = Array.isArray(r?.annotations)
          ? r.annotations
              .filter((a): a is { text: string; category: string; confidence?: number } => !!a && typeof a.text === "string" && typeof a.category === "string")
              .filter((a) => (HPI_CATEGORY_KEYS as string[]).includes(a.category) && a.text.trim().length > 0 && hpi.includes(a.text.trim()))
              .map((a) => ({
                text: a.text.trim(),
                category: a.category as HpiCategory,
                confidence: typeof a.confidence === "number" ? Math.max(0, Math.min(1, a.confidence)) : 0.8,
              }))
          : [];
        if (anns.length) setState({ annotations: anns, ai: true });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hpi, isRecording]);

  return state;
}

/** The "Dr. Note ช่วยไฮไลท์ให้" badge + show/hide toggle. Shared so it can live
 *  either inside <HpiHighlighted> or out in the section title row. */
function HpiHlControls({ ai, show, onToggle }: { ai: boolean; show: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {ai && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#3965e1]/10 px-2 py-0.5 text-[10px] font-bold text-[#3965e1]">
          <IconSparkles className="h-3 w-3" stroke={2.2} />
          Dr. Note ช่วยไฮไลท์ให้
        </span>
      )}
      <Tooltip content={show ? "ซ่อนไฮไลต์" : "แสดงไฮไลต์"} placement="top" delay={200} closeDelay={0}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "ซ่อนไฮไลต์" : "แสดงไฮไลต์"}
          className="grid h-6 w-6 place-items-center rounded-md text-black/40 transition-colors hover:bg-black/5 hover:text-black/70"
        >
          {show ? <IconEyeOff className="h-4 w-4" stroke={2} /> : <IconEye className="h-4 w-4" stroke={2} />}
        </button>
      </Tooltip>
    </div>
  );
}

/** Renders HPI with category-coloured highlight overlays. Low-confidence spans
 *  render faded + dotted. `show` can be controlled by the parent; `hideControls`
 *  drops the inline badge/toggle (when they live in the section title instead). */
function HpiHighlighted({
  hpi,
  annotations,
  ai,
  className,
  show: showProp,
  onToggleShow,
  hideControls,
}: {
  hpi: string;
  annotations: HpiAnnotation[];
  ai: boolean;
  className?: string;
  show?: boolean;
  onToggleShow?: () => void;
  hideControls?: boolean;
}) {
  const [internal, setInternal] = useState(true);
  const show = showProp ?? internal;
  const toggle = onToggleShow ?? (() => setInternal((v) => !v));
  const spans = useMemo(() => buildHpiSpans(hpi, annotations), [hpi, annotations]);
  let order = 0;
  return (
    <div>
      {!hideControls && (
        <div className="mb-1 flex justify-end">
          <HpiHlControls ai={ai} show={show} onToggle={toggle} />
        </div>
      )}
      <p key={hpi} className={className}>
        {show
          ? spans.map((s, i) => {
              if (!s.category) return <span key={i}>{s.text}</span>;
              const cat = HPI_CATEGORIES[s.category];
              const low = (s.confidence ?? 1) < 0.6;
              const o = order++;
              return (
                <motion.span
                  key={i}
                  initial={{ backgroundSize: "0% 78%" }}
                  animate={{ backgroundSize: "100% 78%" }}
                  transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1], delay: 0.35 + o * 0.4 }}
                  style={{
                    backgroundImage: `linear-gradient(${cat.bg}, ${cat.bg})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "0 88%",
                    borderRadius: 4,
                    padding: "0 2px",
                    boxDecorationBreak: "clone",
                    WebkitBoxDecorationBreak: "clone",
                  }}
                  title={`${cat.label}${low ? " · ความมั่นใจต่ำ" : ""}`}
                  className={[cat.fg, "font-semibold", low ? "opacity-60 [text-decoration:underline_dotted]" : ""].join(" ")}
                >
                  {s.text}
                </motion.span>
              );
            })
          : hpi}
      </p>
    </div>
  );
}

// ── Finding analysis (LLM) ────────────────────────────────────────────────

/** A clinical finding plotted on the body: a type (ปวด/บวม/ผื่น/…) plus, when
 *  the type is pain, the pain character that refines its marker. */
export interface Finding {
  type: string;
  painCharacter?: string;
}

const PAIN_ENUM = PAIN_CHARACTERS.map((p) => `${p.id} (${p.label})`).join(", ");
const FINDING_ANALYSIS_SYSTEM =
  "คุณคือ AI ผู้ช่วยแพทย์ วิเคราะห์ 'ชนิดอาการ/อาการแสดง' (finding) ของผู้ป่วยจากอาการสำคัญ ประวัติปัจจุบัน และการวินิจฉัย " +
  `เลือก finding type id จากรายการนี้เท่านั้น: ${FINDING_TYPE_ENUM}. ` +
  `ถ้า type เป็น pain ให้ระบุลักษณะความปวด (painCharacter) จากรายการนี้ด้วย: ${PAIN_ENUM}. ` +
  "เลือกเฉพาะที่ตรงกับอาการจริง เรียงจากเด่นสุดไปรอง (สูงสุด 4). " +
  "ถ้าผู้ป่วยไม่มีอาการเฉพาะที่ (เช่น มาติดตามผล/ตรวจสุขภาพ) ให้ส่ง array ว่าง. " +
  'ตอบ JSON เท่านั้น: {"findings":[{"type":"...","painCharacter":"..."}]} (painCharacter ใส่เฉพาะเมื่อ type=pain).';

/** LLM classifies the patient's real findings from the taxonomy. A recorded
 *  OPQRST `painCharacterId` short-circuits to a deterministic pain finding. */
function useFindingAnalysis(
  visit: VisitSummary | undefined,
  p: Patient,
  info: ConditionInfo,
): { findings: Finding[]; loading: boolean } {
  const explicit = visit?.opqrst?.painCharacterId;
  const [findings, setFindings] = useState<Finding[]>(
    explicit ? [{ type: "pain", painCharacter: explicit }] : [],
  );
  const [loading, setLoading] = useState(false);

  const input = useMemo(() => {
    const o = visit?.opqrst;
    const dx = p.diagnoses.map((d) => `${d.name} (${d.code})`).join(", ");
    const hpi = o
      ? `${o.quality}; ตำแหน่ง ${o.region}; ${o.onset}; ${o.provocation}; ${o.timing}${o.associated ? `; ${o.associated}` : ""}`
      : "-";
    return (
      `อาการสำคัญ: ${visit?.chiefComplaint ?? "-"}\nประวัติปัจจุบัน: ${hpi}\n` +
      `การวินิจฉัยของ visit: ${visit?.diagnosis ?? "-"}\nโรคประจำตัว: ${dx || "-"}\n` +
      `อาการที่พบบ่อยของโรค: ${info.symptoms.map((s) => s.label).join(", ") || "-"}`
    );
  }, [visit, p, info]);

  useEffect(() => {
    if (explicit) {
      setFindings([{ type: "pain", painCharacter: explicit }]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    chatJSON<{ findings?: { type?: string; painCharacter?: string }[] }>(
      [
        { role: "system", content: FINDING_ANALYSIS_SYSTEM },
        { role: "user", content: input },
      ],
      { temperature: 0.1, maxTokens: 200, fast: true },
    )
      .then((r) => {
        if (cancelled) return;
        const fs = (r.findings ?? [])
          .filter((f): f is { type: string; painCharacter?: string } => !!f.type && f.type in FINDING_TYPE_BY_ID)
          .slice(0, 4)
          .map((f) => ({
            type: f.type,
            painCharacter:
              f.type === "pain" && f.painCharacter && f.painCharacter in PAIN_CHARACTER_BY_ID
                ? f.painCharacter
                : undefined,
          }));
        setFindings(fs);
      })
      .catch(() => {
        if (!cancelled) setFindings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [input, explicit]);

  return { findings, loading };
}

/** Live finding/pain-character mapping from the GROWING interview transcript.
 *  Re-runs every few seconds while recording so the body model reflects the
 *  pain character the doctor is eliciting in real time. Holds its last result
 *  after recording stops. Returns [] until anything is captured. */
export function useTranscriptFindings(transcript: string, isRecording: boolean): Finding[] {
  const [findings, setFindings] = useState<Finding[]>([]);
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;
  const lastFiredRef = useRef("");

  useEffect(() => {
    if (!isRecording) return;
    let cancelled = false;
    const tick = async () => {
      const tx = transcriptRef.current.trim();
      if (tx.length < 8) return;
      if (tx === lastFiredRef.current) return;
      lastFiredRef.current = tx;
      try {
        const r = await chatJSON<{ findings?: { type?: string; painCharacter?: string }[] }>(
          [
            { role: "system", content: FINDING_ANALYSIS_SYSTEM },
            { role: "user", content: `บทสนทนาการซักประวัติ (กำลังดำเนินอยู่ — วิเคราะห์จากสิ่งที่ผู้ป่วยเล่า):\n${tx}` },
          ],
          { temperature: 0.1, maxTokens: 200, fast: true },
        );
        if (cancelled) return;
        const fs = (r.findings ?? [])
          .filter((f): f is { type: string; painCharacter?: string } => !!f.type && f.type in FINDING_TYPE_BY_ID)
          .slice(0, 4)
          .map((f) => ({
            type: f.type,
            painCharacter:
              f.type === "pain" && f.painCharacter && f.painCharacter in PAIN_CHARACTER_BY_ID
                ? f.painCharacter
                : undefined,
          }));
        if (fs.length) setFindings(fs);
      } catch {
        // silent — next tick retries
      }
    };
    tick();
    const interval = window.setInterval(tick, 4500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isRecording]);

  return findings;
}

/** Resolve a finding to its display label/colour/icon. For pain findings the
 *  marker comes from the PainCharacter; otherwise from the FindingType. */
function resolveFinding(f: Finding): { label: string; bg: string; fg: string; Icon: typeof IconCircle } {
  if (f.type === "pain" && f.painCharacter && PAIN_CHARACTER_BY_ID[f.painCharacter]) {
    const pc = PAIN_CHARACTER_BY_ID[f.painCharacter];
    return { label: pc.label, bg: pc.bg, fg: pc.fg, Icon: FINDING_ICON[pc.icon] ?? IconCircle };
  }
  const ft = FINDING_TYPE_BY_ID[f.type] ?? FINDING_TYPE_BY_ID.pain;
  return { label: ft.labelTh, bg: ft.bg, fg: ft.fg, Icon: FINDING_ICON[ft.icon] ?? IconCircle };
}

// ── Small helpers ──────────────────────────────────────────────────────────

function ageDetail(birthDate: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(birthDate);
  if (!m) return "";
  const b = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const n = new Date();
  let y = n.getFullYear() - b.getFullYear();
  let mo = n.getMonth() - b.getMonth();
  let d = n.getDate() - b.getDate();
  if (d < 0) { mo--; d += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); }
  if (mo < 0) { y--; mo += 12; }
  return `${mo} ด. ${d} ว.`;
}

const INSURANCE_LABEL: Record<string, string> = {
  UC: "บัตรทอง", SSO: "ประกันสังคม", CSMBS: "ข้าราชการ", OOP: "จ่ายเอง", Private: "ประกันเอกชน",
};

const FOOD_ALLERGY_RE = /กุ้ง|ปู|หอย|ปลา|ทะเล|นม|ไข่|ถั่ว|แป้งสาลี|งา|seafood|shrimp|crab|nut|milk|egg|wheat|soy/i;

/** Detect a drug-allergy substance (drug names + common generic suffixes). */
const DRUG_ALLERGY_RE =
  /penicillin|amoxi|ampicillin|sulfa|cillin|mycin|cef|cipro|floxacin|ibuprofen|aspirin|nsaid|paracetamol|acetamin|codeine|morphine|tramadol|opioid|metformin|statin|pril|sartan|azole|insulin|ยา|เพนิซิลลิน|อะม็อกซี|ซัลฟา|แอสไพริน|พารา|ไอบูโพรเฟน/i;

export function labFlag(l: { value: number; referenceRange: string }): "high" | "low" | "abn" {
  const r = l.referenceRange.replace(/\s/g, "");
  let m: RegExpExecArray | null;
  if ((m = /^<(\d+\.?\d*)$/.exec(r))) return l.value > Number(m[1]) ? "high" : "low";
  if ((m = /^>(\d+\.?\d*)$/.exec(r))) return l.value < Number(m[1]) ? "low" : "high";
  if ((m = /^(\d+\.?\d*)-(\d+\.?\d*)$/.exec(r))) return l.value > Number(m[2]) ? "high" : l.value < Number(m[1]) ? "low" : "abn";
  return "abn";
}
export const FLAG_LABEL: Record<"high" | "low" | "abn", string> = {
  high: "เกินเกณฑ์", low: "ต่ำกว่าเกณฑ์", abn: "ผิดปกติ",
};

/** Abnormal-lab panel (Figma 1396-18849) — gradient white→purple section with a
 *  3D marker icon and deep-indigo value cards. Shared by the patient detail
 *  overview and the schedule next-case summary. Renders nothing when empty. */
export function AbnormalLabsCard({ labs, className = "" }: { labs: Patient["labs"]; className?: string }) {
  return (
    <div className={`relative w-full overflow-hidden rounded-[24px] bg-gradient-to-b from-white to-[#f2eaff] p-4 ${className}`}>
      {/* decorative 3D marker — sits BEHIND the value cards (z-0) */}
      <img src={LAB_ABNORMAL_ICON} alt="" className="pointer-events-none absolute right-3 top-2 z-0 h-14 w-14 select-none" />
      <div className="relative z-10 flex flex-col gap-2">
        <p className="text-[14px] font-semibold text-black/60">ผล Lab ผิดปกติ</p>
        {!labs.length && (
          <p className="rounded-[16px] bg-white/60 px-4 py-2.5 text-[13px] text-black/45">ไม่พบผลแลปที่ผิดปกติ</p>
        )}
        {labs.map((l) => {
          const flag = labFlag(l);
          return (
            <div key={l.test} className="flex items-center justify-between gap-2 rounded-[16px] bg-[#4440b3] px-4 py-2">
              <div className="leading-tight text-white">
                <p className="text-[16px] font-bold">{l.test}</p>
                <p className="text-[12px]">Ref <span className="font-bold">{l.referenceRange}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold tabular-nums text-white">{l.value}{l.unit}</span>
                <span className="rounded-[8px] bg-white/10 px-2 py-1 text-[12px] font-medium text-white">{FLAG_LABEL[flag]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface VitalCheck { label: string; value: string; unit: string; normal: boolean }
function vitalChecks(v: Patient["vitals"]): VitalCheck[] {
  return [
    { label: "ความดันตัวบน", value: `${v.systolic}`, unit: "mmHg", normal: v.systolic >= 90 && v.systolic <= 139 },
    { label: "ความดันตัวล่าง", value: `${v.diastolic}`, unit: "mmHg", normal: v.diastolic >= 60 && v.diastolic <= 89 },
    { label: "ชีพจร", value: `${v.heartRate}`, unit: "bpm", normal: v.heartRate >= 60 && v.heartRate <= 100 },
    { label: "อุณหภูมิ", value: `${v.temperature}`, unit: "°C", normal: v.temperature >= 36.1 && v.temperature <= 37.5 },
    { label: "BMI", value: v.bmi.toFixed(1), unit: "kg/m²", normal: v.bmi >= 18.5 && v.bmi <= 24.9 },
    { label: "น้ำหนัก", value: `${v.weight}`, unit: "กก.", normal: true },
  ];
}

// ── Page ──────────────────────────────────────────────────────────────────

const STEPS = ["การคัดกรอง", "แพทย์ตรวจ", "การวินิจฉัย ICD-10", "วางแผนรักษา"] as const;

export default function PatientOPD() {
  const params = useParams();
  const navigate = useNavigate();
  const { railHidden } = useSidebar();
  const toast = useToast();
  const { startSession: startDictation, segments, isRecording } = useDictationContext();
  const [activeStep, setActiveStep] = useState(0); // 0 คัดกรอง · 1 แพทย์ตรวจ · 2 วางแผน
  const [recordSource, setRecordSource] = useState<"mic" | "tab">("mic");
  // Transcript panel can expand over the model column while recording
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const modelHidden = activeStep >= 1 && transcriptExpanded;
  // AI treatment-plan draft, generated on the finish button (loading lives there)
  const [planDraft, setPlanDraft] = useState<TreatmentPlan | null>(null);
  // Encounter diagnoses (ICD-10) — entered at วางแผน, flow into lab/cert/claim
  const [diagnoses, setDiagnoses] = useState<EncounterDx[]>([]);

  // Derived transcript lives HERE (not inside the recording panel) so it
  // survives unmounting when moving between แพทย์ตรวจ ↔ วางแผนการรักษา. The raw
  // segments persist in DictationContext; these summaries persist in the parent.
  const cc = useChiefComplaintFromLLM(segments, isRecording);
  const { hpi } = useHpiNarrativeFromLLM(segments, isRecording);
  const { meds } = useMedsFromLLM(segments, isRecording);
  const primaryText = cc.trim();
  const transcriptText = useMemo(() => segments.map((s) => s.text).join(" "), [segments]);
  // PMH from the interview — distinct from HPI so the two don't overlap.
  const pastHistory = usePastHistoryFromLLM(transcriptText, isRecording);
  // HPI annotations — computed once recording stops (sweep after end).
  const hpiAnn = useHpiAnnotations(hpi, isRecording);
  const transcript = { primaryText, hpi, pastHistory, meds, hpiAnn, isRecording };
  // Live pain-character / finding + body-region mapping from the transcript →
  // feeds the body model so it updates while the doctor takes history.
  const liveFindings = useTranscriptFindings(transcriptText, isRecording);
  const liveRegions = useTranscriptBodyRegions(transcriptText, isRecording);
  // Curated symptom summary plotted on the body once recording stops.
  const symptomPlot = useSymptomPlot(transcriptText, isRecording);

  const patient = useMemo<Patient | undefined>(() => resolvePatient(params.hn), [params.hn]);

  if (!patient) {
    return (
      <div className="min-h-screen w-full bg-[var(--theme-base)] p-8">
        <p className="text-[var(--theme-neutral)]/55">ไม่พบผู้ป่วยรายนี้</p>
      </div>
    );
  }

  const info = conditionFor(patient);

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f4f4f4]">
      <div className="h-16 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-6rem)] flex-col mr-4 mt-4 mb-4 gap-4 overflow-hidden transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-4 lg:ml-[296px]",
        ].join(" ")}
      >
        {/* ── Stepper bar ──────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl bg-white px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/schedule")}
              className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-[var(--theme-neutral)]/60 transition hover:bg-black/[0.04] hover:text-[var(--theme-neutral)]"
            >
              <IconChevronLeft className="h-4 w-4" stroke={2} />
              ตารางแพทย์
            </button>
            <span className="h-5 w-px shrink-0 bg-black/10" />
            <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
              {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveStep(i)}
                  className={[
                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition",
                    i === activeStep
                      ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]"
                      : "text-[var(--theme-neutral)]/45 hover:text-[var(--theme-neutral)]/70",
                  ].join(" ")}
                >
                  {s}
                </button>
                {i < STEPS.length - 1 && (
                  <IconChevronRight className="h-4 w-4 shrink-0 text-[var(--theme-neutral)]/30" stroke={2} />
                )}
              </div>
            ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeStep === 3) {
                toast.success("บันทึกแผนการรักษาแล้ว", `HN ${patient.hn}`);
                navigate("/schedule");
              } else {
                toast.success("บันทึกแบบร่างแล้ว", `HN ${patient.hn}`);
              }
            }}
            className="shrink-0 rounded-full bg-[#3485ff] px-5 py-2 text-[12px] font-semibold text-white transition hover:brightness-110"
          >
            {activeStep === 3 ? "บันทึก" : "บันทึกแบบร่าง"}
          </button>
        </div>

        {/* ── Body: patient · screening · model — each its own card ───── */}
        <div className="flex min-h-0 flex-1">
          {/* LEFT — about patient (stacked cards). `relative` + AboutPanel
              `absolute inset-0` pins the panel to this box's exact height so its
              inner scroll area is bounded (flex-grow height was unreliable). */}
          <div className="relative hidden w-[400px] shrink-0 overflow-hidden xl:mr-4 xl:block">
            <AboutPanel patient={patient} encounterDx={diagnoses} />
          </div>

          {/* CENTER — screening (step 0) → Dr.Note recording (step 1) */}
          <div className="hidden min-w-[340px] flex-1 md:block">
            {activeStep === 0 ? (
              <ScreeningPanel
                patient={patient}
                onStart={(src) => {
                  // start capture inside the click gesture so getDisplayMedia
                  // (tab/system audio) is allowed by the browser
                  setRecordSource(src);
                  startDictation(src);
                  setActiveStep(1);
                }}
                onManual={() => setActiveStep(1)}
              />
            ) : activeStep === 1 ? (
              <DrNoteRecordingPanel
                patient={patient}
                transcript={transcript}
                source={recordSource}
                onSourceChange={setRecordSource}
                onFinish={() => setActiveStep(2)}
                expanded={transcriptExpanded}
                onToggleExpand={() => setTranscriptExpanded((v) => !v)}
              />
            ) : activeStep === 2 ? (
              <DiagnosisPanel
                patient={patient}
                transcript={transcript}
                diagnoses={diagnoses}
                onDiagnosesChange={setDiagnoses}
                onResume={() => setActiveStep(1)}
                onProceed={async () => {
                  const t = segments.map((s) => s.text).join(" ");
                  const plan = await generateTreatmentPlan(patient, t);
                  setPlanDraft(plan);
                  setActiveStep(3);
                }}
                expanded={transcriptExpanded}
                onToggleExpand={() => setTranscriptExpanded((v) => !v)}
              />
            ) : (
              <PlanDraftPanel
                patient={patient}
                plan={planDraft ?? EMPTY_PLAN}
                transcript={transcript}
                diagnoses={diagnoses}
                onResume={() => setActiveStep(2)}
                expanded={transcriptExpanded}
                onToggleExpand={() => setTranscriptExpanded((v) => !v)}
              />
            )}
          </div>

          {/* RIGHT — body model; animates closed when transcript expands */}
          <AnimatePresence initial={false}>
            {!modelHidden && (
              <motion.div
                key="model"
                initial={{ width: 0, marginLeft: 0, opacity: 0 }}
                animate={{ width: 380, marginLeft: 16, opacity: 1 }}
                exit={{ width: 0, marginLeft: 0, opacity: 0 }}
                transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
                className="hidden h-full shrink-0 overflow-hidden lg:block"
              >
                <div className="h-full w-[380px]">
                  <ModelPanel patient={patient} info={info} liveFindings={liveFindings} liveRegions={liveRegions} liveHpi={hpi} recording={isRecording} symptomPlot={symptomPlot} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── LEFT: nurse screening ───────────────────────────────────────────────────

function ScreeningPanel({
  patient: p,
  onStart,
  onManual,
}: {
  patient: Patient;
  onStart: (source: "mic" | "tab") => void;
  onManual: () => void;
}) {
  const [srcMenuOpen, setSrcMenuOpen] = useState(false);
  const srcMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!srcMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (srcMenuRef.current && !srcMenuRef.current.contains(e.target as Node)) setSrcMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [srcMenuOpen]);
  const checks = vitalChecks(p.vitals);
  const ranged = checks.filter((c) => c.label !== "น้ำหนัก");
  const normalCount = ranged.filter((c) => c.normal).length;
  const visit0 = p.recentVisits[0];
  const cc = visit0?.chiefComplaint ?? "—";
  const o = visit0?.opqrst;
  const sex = p.gender === "M" ? "ชาย" : "หญิง";
  const hpi = o
    ? `ผู้ป่วย${sex} อายุ ${p.age} ปี มาด้วย${o.quality} บริเวณ${o.region} ${o.onset} ${o.provocation} ความรุนแรง ${o.severity}/10 ${o.timing}${o.associated ? ` ร่วมกับ${o.associated}` : ""}`
    : visit0
      ? `ผู้ป่วย${sex} อายุ ${p.age} ปี มาด้วยอาการ${cc} — ${visit0.diagnosis}`
      : "ยังไม่มีบันทึกการซักประวัติจากพยาบาล";

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] bg-white">
      {/* Dr.Note mascot — sits behind the content (content reads on top) */}
      <img
        src={DRNOTE_ROBOT}
        alt=""
        className="pointer-events-none absolute bottom-[72px] right-8 z-0 h-28 w-auto object-contain"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, #000 60%, transparent 96%)",
          maskImage: "linear-gradient(to bottom, #000 60%, transparent 96%)",
        }}
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto p-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-bold text-[#22202a]">การคัดกรองจากพยาบาล</h2>
          <span className="shrink-0 rounded-[12px] bg-black/5 px-3 py-1 text-[13px] font-semibold text-black/60">
            พว. นิรนาม ยามว่าง
          </span>
        </div>

        <div className="mt-4 pb-20">
          <Accordion
            selectionMode="multiple"
            variant="splitted"
            defaultExpandedKeys={["symptoms"]}
            className="gap-3 px-0"
            itemClasses={{
              base: "bg-white border border-[var(--theme-neutral)]/12 shadow-none rounded-[16px] px-4",
              trigger: "py-3 gap-3",
              title: "text-[15px] font-semibold text-[#22202a]",
              content: "pb-3 pt-0",
            }}
          >
            <AccordionItem
              key="vitals"
              aria-label="Vital Signs"
              disableIndicatorAnimation
              indicator={({ isOpen }) => (
                <IconChevronDown
                  className={`h-5 w-5 text-black/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  stroke={2}
                />
              )}
              startContent={<IconHeartbeat className="h-5 w-5 text-[var(--theme-primary)]" stroke={2} />}
              title={
                <span>
                  Vital Signs{" "}
                  <span className="text-[12px] font-medium text-black/45">
                    (ค่าปกติ {normalCount}/{ranged.length})
                  </span>
                </span>
              }
            >
              <div className="grid grid-cols-2 gap-2.5">
                {checks.map((c) => (
                  <div
                    key={c.label}
                    className={["rounded-[12px] px-3 py-2", c.normal ? "bg-black/[0.03]" : "bg-[#ff383c]/[0.08]"].join(" ")}
                  >
                    <p className="text-[11px] font-medium text-black/55">{c.label}</p>
                    <p className={`mt-0.5 text-[14px] font-bold tabular-nums ${c.normal ? "text-[#22202a]" : "text-[#ff383c]"}`}>
                      {c.value} <span className="text-[10px] font-medium text-black/40">{c.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </AccordionItem>

            <AccordionItem
              key="symptoms"
              aria-label="อาการเจ็บป่วย"
              disableIndicatorAnimation
              indicator={({ isOpen }) => (
                <IconChevronDown
                  className={`h-5 w-5 text-black/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  stroke={2}
                />
              )}
              startContent={<IconStethoscope className="h-5 w-5 text-[var(--theme-primary)]" stroke={2} />}
              title={
                <span className="flex items-center gap-2">
                  อาการเจ็บป่วย
                  <SpeakButton getText={() => `อาการสำคัญ ${cc}. ${hpi}`} />
                </span>
              }
            >
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[13px] font-semibold text-black/60">อาการสำคัญ</p>
                  <p className="mt-2 text-[14px] font-semibold text-[#22202a]">{cc}</p>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-black/60">อาการเจ็บป่วยปัจจุบัน (HPI)</p>
                  <p className="mt-2 text-[14px] font-semibold leading-relaxed text-[#22202a]">{hpi}</p>
                </div>
              </div>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Sticky footer — start recording the history right from screening */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 rounded-b-[24px] bg-gradient-to-b from-transparent via-white/85 to-white px-4 pb-4 pt-10">
        <div className="pointer-events-auto relative flex gap-2">
          <Tooltip content="จดบันทึกด้วยตัวเอง" placement="top" delay={200} closeDelay={0}>
          <button
            type="button"
            onClick={onManual}
            aria-label="จดบันทึกด้วยตัวเอง"
            className="flex w-14 shrink-0 items-center justify-center rounded-[16px] border border-[#3965e1]/30 text-[#3965e1] transition hover:bg-[#3965e1]/[0.04]"
          >
            <IconPencil className="h-5 w-5" stroke={2} />
          </button>
          </Tooltip>
          <div ref={srcMenuRef} className="relative flex-1">
            <button
              type="button"
              onClick={() => setSrcMenuOpen((o) => !o)}
              className="btn-shimmer flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#3965ff] py-4 text-[14px] font-bold text-white transition hover:brightness-110"
            >
              <IconMicrophone className="h-5 w-5" stroke={2} />
              เริ่มบันทึกการซักประวัติ
              <IconChevronDown className={`h-4 w-4 transition-transform ${srcMenuOpen ? "rotate-180" : ""}`} stroke={2.5} />
            </button>
            {srcMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 z-30 mb-2 rounded-2xl border border-black/5 bg-white p-1.5 shadow-[0_-8px_28px_rgba(0,0,0,0.16)]">
                <p className="px-2 py-1 text-[11px] font-semibold text-black/45">เลือกแหล่งที่มาของเสียง</p>
                {([
                  { key: "mic", label: "ไมโครโฟน", Icon: IconMicrophone },
                  { key: "tab", label: "เสียงจากแท็บ/ระบบ", Icon: IconDeviceDesktop },
                ] as const).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSrcMenuOpen(false);
                      onStart(key);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] text-[#22202a] transition hover:bg-[#3965e1]/[0.06]"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[#3965e1]" stroke={2} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// ── CENTER (step "แพทย์ตรวจ"): Dr.Note recording ───────────────────────────

/** Section icons pulled straight from the Figma design (16px stroke icons).
 *  `currentColor` lets us drive the colour with a text class. */
function FigIcon({ className, paths }: { className?: string; paths: string[] }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
type TxIcon = (props: { className?: string }) => React.ReactNode;
const ChiefIcon: TxIcon = (p) => (
  <FigIcon
    {...p}
    paths={[
      "M8.66667 13.3333L13.3333 8.66667",
      "M8.66667 13.3333V9.33333C8.66667 9.15652 8.7369 8.98695 8.86193 8.86193C8.98695 8.7369 9.15652 8.66667 9.33333 8.66667H13.3333V4C13.3333 3.64638 13.1929 3.30724 12.9428 3.05719C12.6928 2.80714 12.3536 2.66667 12 2.66667H4C3.64638 2.66667 3.30724 2.80714 3.05719 3.05719C2.80714 3.30724 2.66667 3.64638 2.66667 4V12C2.66667 12.3536 2.80714 12.6928 3.05719 12.9428C3.30724 13.1929 3.64638 13.3333 4 13.3333H8.66667Z",
    ]}
  />
);
const HpiIcon: TxIcon = (p) => (
  <FigIcon
    {...p}
    paths={[
      "M7.66667 12.6667H4C3.46957 12.6667 2.96086 12.456 2.58579 12.0809C2.21071 11.7058 2 11.1971 2 10.6667V5.33333C2 4.8029 2.21071 4.29419 2.58579 3.91912C2.96086 3.54405 3.46957 3.33333 4 3.33333H12C12.5304 3.33333 13.0391 3.54405 13.4142 3.91912C13.7893 4.29419 14 4.8029 14 5.33333V8",
      "M4.66667 10H8",
      "M11.3333 8H9.33333",
      "M7.33333 8H6.66667",
      "M13.5054 13.5054C13.0937 13.917 12.8035 14.4342 12.6667 15C12.5298 14.4342 12.2396 13.917 11.8279 13.5054C11.4163 13.0937 10.8992 12.8035 10.3333 12.6667C10.8992 12.5298 11.4163 12.2396 11.8279 11.8279C12.2396 11.4163 12.5298 10.8992 12.6667 10.3333C12.8035 10.8992 13.0937 11.4163 13.5054 11.8279C13.917 12.2396 14.4342 12.5298 15 12.6667C14.4342 12.8035 13.917 13.0937 13.5054 13.5054Z",
    ]}
  />
);
const HistoryIcon: TxIcon = (p) => (
  <FigIcon
    {...p}
    paths={[
      "M5.33333 3.33333H4C3.64638 3.33333 3.30724 3.47381 3.05719 3.72386C2.80714 3.97391 2.66667 4.31304 2.66667 4.66667V12.6667C2.66667 13.0203 2.80714 13.3594 3.05719 13.6095C3.30724 13.8595 3.64638 14 4 14H7.798",
      "M12 9.33333V12H14.6667",
      "M12 7.33333V4.66667C12 4.31304 11.8595 3.97391 11.6095 3.72386C11.3594 3.47381 11.0203 3.33333 10.6667 3.33333H9.33333",
      "M5.33333 3.33333C5.33333 2.97971 5.47381 2.64057 5.72386 2.39052C5.97391 2.14048 6.31304 2 6.66667 2H8C8.35362 2 8.69276 2.14048 8.94281 2.39052C9.19286 2.64057 9.33333 2.97971 9.33333 3.33333C9.33333 3.68696 9.19286 4.02609 8.94281 4.27614C8.69276 4.52619 8.35362 4.66667 8 4.66667H6.66667C6.31304 4.66667 5.97391 4.52619 5.72386 4.27614C5.47381 4.02609 5.33333 3.68696 5.33333 3.33333Z",
      "M10.1144 13.8856C9.61429 13.3855 9.33333 12.7072 9.33333 12C9.33333 11.2928 9.61429 10.6145 10.1144 10.1144C10.6145 9.61429 11.2928 9.33333 12 9.33333C12.7072 9.33333 13.3855 9.61429 13.8856 10.1144C14.3857 10.6145 14.6667 11.2928 14.6667 12C14.6667 12.7072 14.3857 13.3855 13.8856 13.8856C13.3855 14.3857 12.7072 14.6667 12 14.6667C11.2928 14.6667 10.6145 14.3857 10.1144 13.8856Z",
      "M5.33333 7.33333H8",
      "M5.33333 10H7.33333",
    ]}
  />
);
const MedsIcon: TxIcon = (p) => (
  <FigIcon
    {...p}
    paths={[
      "M2.97631 7.69036C2.35119 7.06523 2 6.21739 2 5.33333C2 4.44928 2.35119 3.60143 2.97631 2.97631C3.60143 2.35119 4.44928 2 5.33333 2C6.21739 2 7.06523 2.35119 7.69036 2.97631C8.31548 3.60143 8.66667 4.44928 8.66667 5.33333C8.66667 6.21739 8.31548 7.06523 7.69036 7.69036C7.06523 8.31548 6.21739 8.66667 5.33333 8.66667C4.44928 8.66667 3.60143 8.31548 2.97631 7.69036Z",
      "M9.44771 13.2189C8.94762 12.7189 8.66667 12.0406 8.66667 11.3333C8.66667 10.6261 8.94762 9.94781 9.44771 9.44771C9.94781 8.94762 10.6261 8.66667 11.3333 8.66667C12.0406 8.66667 12.7189 8.94762 13.2189 9.44771C13.719 9.94781 14 10.6261 14 11.3333C14 12.0406 13.719 12.7189 13.2189 13.2189C12.7189 13.719 12.0406 14 11.3333 14C10.6261 14 9.94781 13.719 9.44771 13.2189Z",
      "M3 3L7.66667 7.66667",
      "M13 9.66667L9.66667 13",
    ]}
  />
);

/** A flat transcript section (no accordion): 16px icon + bold title, content
 *  below, divided by a hairline rule — matches the Figma message layout. */
function TxSection({
  icon: Icon,
  title,
  className = "",
  speak,
  accessory,
  children,
}: {
  icon: TxIcon;
  title: string;
  className?: string;
  speak?: () => string;
  accessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 border-b border-[#bebdbd] pb-3 pt-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-[#22202a]" />
        <h3 className="text-[16px] font-bold text-[#22202a]">{title}</h3>
        {speak && <SpeakButton getText={speak} />}
        {accessory && <div className="ml-auto">{accessory}</div>}
      </div>
      {children}
    </div>
  );
}

/** Tiny source tag (EHR vs interview) — mirrors the patient/new report format. */
function SourceBadge({ source }: { source: "ehr" | "interview" }) {
  return source === "ehr" ? (
    <span className="mt-0.5 shrink-0 rounded bg-black/10 px-1 text-[10px] font-semibold text-black/45">EHR</span>
  ) : (
    <span className="mt-0.5 shrink-0 rounded bg-[#3965e1]/10 px-1 text-[10px] font-semibold text-[#3965e1]">ซักประวัติ</span>
  );
}

/** Live transcript summaries — owned by the parent so they outlive panel
 *  unmounts when moving between แพทย์ตรวจ ↔ วางแผนการรักษา. */
type TranscriptData = {
  primaryText: string;
  hpi: string;
  pastHistory: string[];
  meds: ReturnType<typeof useMedsFromLLM>["meds"];
  hpiAnn: HpiAnnotationState;
  isRecording: boolean;
};

function DrNoteRecordingPanel({
  patient,
  transcript,
  source = "mic",
  onSourceChange,
  onFinish,
  expanded = false,
  onToggleExpand,
}: {
  patient: Patient;
  transcript: TranscriptData;
  source?: "mic" | "tab";
  onSourceChange?: (src: "mic" | "tab") => void;
  onFinish: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const { segments, isRecording, startSession, resumeSession, stopSession, levelRef } =
    useDictationContext();
  const [finishing, setFinishing] = useState(false);
  // active audio source — switchable mid-flow (restarts capture if recording)
  const [src, setSrc] = useState<"mic" | "tab">(source);
  const [srcOpen, setSrcOpen] = useState(false);
  const switchSource = async (next: "mic" | "tab") => {
    setSrcOpen(false);
    if (next === src) return;
    setSrc(next);
    onSourceChange?.(next);
    // restart the capture with the new source (inside this click gesture so
    // getDisplayMedia for tab/system audio is allowed)
    if (isRecording) {
      await stopSession();
      await startSession(next);
    }
  };
  const [hpiShow, setHpiShow] = useState(true);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalData, setEvalData] = useState<HistoryEval | null>(null);
  const { primaryText, hpi, pastHistory, meds, hpiAnn } = transcript;
  // Existing EHR data → concise one-line bullets (patient/new format):
  // diagnosis + วันวินิจฉัย, and drug + dose + frequency.
  const ehrHistory = patient.diagnoses.map((d) => `${d.name} (วินิจฉัย ${fmtThaiDate(d.onsetDate)})`);
  const ehrMeds = patient.medications.map((m) => `${m.drug} ${m.dose} · ${m.frequency}`);
  // Recording is started from the screening click (a user gesture) so the
  // browser allows getDisplayMedia for tab/system audio — no mount auto-start.
  const resume = () => (segments.length > 0 ? resumeSession(src) : startSession(src));

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] bg-[#3965e1]">
      {/* decorative wave — anchored to the band bottom (72px) like the shell:
          spans y ∈ [-78, 72], clipped by the root overflow-hidden */}
      <img
        src={PLAN_WAVE_BLUE}
        alt=""
        className="pointer-events-none absolute inset-x-0 -top-[78px] z-0 h-[150px] w-full object-cover opacity-90"
      />
      {/* Dr.Note mascot — sits in the blue band, bottom faded into the blue */}
      <img
        src={DRNOTE_ROBOT}
        alt=""
        className="pointer-events-none absolute left-1 top-3 z-0 h-32 w-auto -scale-x-100 object-contain"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, #000 60%, transparent 92%)",
          maskImage: "linear-gradient(to bottom, #000 60%, transparent 92%)",
        }}
      />
      {/* Blue header band — fixed height so the white container sits at the same
          spot in both the recording and finished (green) states; above the
          container so the audio-source dropdown isn't covered by it */}
      <div className="relative z-20 flex h-[72px] shrink-0 items-center justify-between gap-2 pl-[124px]">
        <div className="flex flex-1 flex-col items-start gap-1">
          <Soundwave levelRef={levelRef} barClassName="bg-white" bars={13} />
          {isRecording ? (
            <ListeningCaption tone="white" />
          ) : (
            <span className="text-[13px] font-bold text-white/80">หยุดชั่วคราว</span>
          )}
        </div>
        <div className="flex shrink-0 items-stretch gap-2 pr-3">
          {/* Audio-source picker — switch ไมโครโฟน ↔ เสียงแท็บ/ระบบ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSrcOpen((o) => !o)}
              className="flex h-12 shrink-0 items-center gap-2 rounded-[16px] bg-white/15 px-4 text-[14px] font-bold text-white transition hover:bg-white/25"
            >
              {src === "mic" ? <IconMicrophone className="h-5 w-5" stroke={2} /> : <IconDeviceDesktop className="h-5 w-5" stroke={2} />}
              <span className="hidden sm:inline">{src === "mic" ? "ไมโครโฟน" : "เสียงแท็บ/ระบบ"}</span>
              <IconChevronDown className={`h-4 w-4 transition-transform ${srcOpen ? "rotate-180" : ""}`} stroke={2.2} />
            </button>
            <AnimatePresence>
              {srcOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setSrcOpen(false)} aria-hidden />
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 top-[calc(100%+6px)] z-30 w-52 overflow-hidden rounded-[14px] bg-white p-1 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                  >
                    {([
                      { key: "mic", label: "ไมโครโฟน", desc: "เสียงในห้องตรวจ", Icon: IconMicrophone },
                      { key: "tab", label: "เสียงจากแท็บ/ระบบ", desc: "เช่น Telemed", Icon: IconDeviceDesktop },
                    ] as const).map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => void switchSource(o.key)}
                        className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition hover:bg-black/[0.04] ${src === o.key ? "bg-[#3965e1]/[0.06]" : ""}`}
                      >
                        <o.Icon className={`h-5 w-5 shrink-0 ${src === o.key ? "text-[#3965e1]" : "text-black/45"}`} stroke={2} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold text-[#22202a]">{o.label}</span>
                          <span className="block text-[11px] text-black/45">{o.desc}</span>
                        </span>
                        {src === o.key && <IconCheck className="h-4 w-4 shrink-0 text-[#3965e1]" stroke={2.4} />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          {/* Pause / resume the recording */}
          <button
            type="button"
            onClick={isRecording ? () => void stopSession() : resume}
            className="flex h-12 shrink-0 items-center gap-2 rounded-[16px] bg-white px-5 text-[14px] font-bold text-[#3965e1] transition hover:bg-slate-100"
          >
            {isRecording ? (
              <>
                <IconPlayerPauseFilled className="h-5 w-5" />
                หยุดบันทึก
              </>
            ) : (
              <>
                <IconPlayerPlayFilled className="h-5 w-5" />
                บันทึกต่อ
              </>
            )}
          </button>
        </div>
        {/* Expand/collapse transcript over the model panel — flush to the edge */}
        {onToggleExpand && (
          <Tooltip content={expanded ? "ย่อกลับ" : "ขยายเต็มพื้นที่"} placement="bottom" delay={200} closeDelay={0}>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? "ย่อ transcript" : "ขยาย transcript เต็มพื้นที่"}
            className="flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-l-[16px] bg-white text-[#3965e1] transition hover:bg-slate-100"
          >
            {expanded ? (
              <IconLayoutSidebarRightCollapse className="h-5 w-5" stroke={2} />
            ) : (
              <IconLayoutSidebarRightExpand className="h-5 w-5" stroke={2} />
            )}
          </button>
          </Tooltip>
        )}
      </div>

      {/* White container — transcript + finish footer; offset down so the
          mascot has room in the blue band above. Slides up on entering this step. */}
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 28, mass: 0.9, opacity: { duration: 0.3 } }}
        style={{ willChange: "transform, opacity" }}
        className="relative z-10 mt-2 flex min-h-0 flex-1 flex-col rounded-[24px] bg-white p-3"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[16px] bg-white px-1 pb-24 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {/* อาการสำคัญ */}
          <TxSection
            icon={ChiefIcon}
            title="อาการสำคัญ"
            className="pt-2"
            speak={primaryText ? () => primaryText : undefined}
          >
            {primaryText ? (
              <HpiDiffText text={primaryText} />
            ) : (
              <p className="text-[13px] text-black/45">{isRecording ? "กำลังฟังเพื่อสรุปอาการสำคัญ…" : "—"}</p>
            )}
          </TxSection>
          {/* HPI — highlight controls sit in the title row when active */}
          {(() => {
            const hpiHl = !isRecording && hpiAnn.annotations.length > 0;
            return (
              <TxSection
                icon={HpiIcon}
                title="History of Present Illness (HPI)"
                speak={hpi ? () => hpi : undefined}
                accessory={
                  hpiHl ? <HpiHlControls ai={hpiAnn.ai} show={hpiShow} onToggle={() => setHpiShow((v) => !v)} /> : undefined
                }
              >
                {hpi ? (
                  hpiHl ? (
                    // After the transcript ends → annotate อาการ/ความรุนแรง/การแพ้/…
                    <HpiHighlighted
                      hpi={hpi}
                      annotations={hpiAnn.annotations}
                      ai={hpiAnn.ai}
                      show={hpiShow}
                      hideControls
                      className="text-[14px] leading-relaxed text-[#22202a]"
                    />
                  ) : (
                    <HpiDiffText text={hpi} />
                  )
                ) : (
                  <p className="text-[13px] text-black/45">กำลังเรียบเรียงประวัติการเจ็บป่วยปัจจุบัน…</p>
                )}
              </TxSection>
            );
          })()}
          {/* ประวัติการเจ็บป่วย — EHR + ซักประวัติ */}
          <TxSection
            icon={HistoryIcon}
            title="ประวัติการเจ็บป่วย"
            speak={
              ehrHistory.length || pastHistory.length
                ? () => [...ehrHistory, ...pastHistory].join(". ")
                : undefined
            }
          >
            {ehrHistory.length > 0 || pastHistory.length > 0 ? (
              <ul className="flex flex-col gap-1.5 text-[14px] leading-relaxed text-[#22202a]">
                {ehrHistory.map((h, i) => (
                  <li key={`e${i}`} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-black/25" />
                    <span className="flex-1">{h}</span>
                    <SourceBadge source="ehr" />
                  </li>
                ))}
                {pastHistory.map((h, i) => (
                  <li key={`h${i}`} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-black/25" />
                    <span className="flex-1">{h}</span>
                    <SourceBadge source="interview" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-black/45">{isRecording ? "กำลังฟังประวัติการเจ็บป่วยในอดีต…" : "ไม่มีข้อมูล"}</p>
            )}
          </TxSection>
          {/* ประวัติการใช้ยา — EHR + ซักประวัติ */}
          <TxSection
            icon={MedsIcon}
            title="ประวัติการใช้ยา"
            speak={
              ehrMeds.length || meds.length
                ? () => [...ehrMeds, ...meds].join(". ")
                : undefined
            }
          >
            {ehrMeds.length > 0 || meds.length > 0 ? (
              <ul className="flex flex-col gap-1.5 text-[14px] leading-relaxed text-[#22202a]">
                {ehrMeds.map((m, i) => (
                  <li key={`e${i}`} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-black/25" />
                    <span className="flex-1">{m}</span>
                    <SourceBadge source="ehr" />
                  </li>
                ))}
                {meds.map((m, i) => (
                  <li key={`i${i}`} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-black/25" />
                    <span className="flex-1">{m}</span>
                    <SourceBadge source="interview" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-black/45">{isRecording ? "กำลังประมวลผลรายการยา…" : "ไม่มีข้อมูล"}</p>
            )}
          </TxSection>
        </div>

        {/* Finish footer — evaluate (paused only) + generate the treatment plan.
            Plan button is disabled while recording; pause first to enable it. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-stretch gap-2.5 rounded-b-[24px] px-3 pb-3 pt-10">
          {/* Frosted backdrop: progressive blur (sharp at the top edge → heavy at
              the bottom) under a white tint, so the buttons read clearly. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[24px] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_80%)] [mask-image:linear-gradient(to_bottom,transparent_0%,black_80%)]"
          >
            <div className="absolute inset-0 backdrop-blur-[2px] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_35%)] [mask-image:linear-gradient(to_bottom,transparent_0%,black_35%)]" />
            <div className="absolute inset-0 backdrop-blur-[6px] [-webkit-mask-image:linear-gradient(to_bottom,transparent_35%,black_70%)] [mask-image:linear-gradient(to_bottom,transparent_35%,black_70%)]" />
            <div className="absolute inset-0 backdrop-blur-[12px] [-webkit-mask-image:linear-gradient(to_bottom,transparent_70%,black_100%)] [mask-image:linear-gradient(to_bottom,transparent_70%,black_100%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/70 to-white" />
          </div>
          {/* Evaluate the history → suggest follow-up questions (only when paused) */}
          {!isRecording && (
            <Tooltip content="ประเมิน / แนะนำคำถามเพิ่มเติม" placement="top" delay={200} closeDelay={0}>
            <motion.button
              type="button"
              aria-label="ประเมิน / แนะนำคำถาม"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              disabled={evalLoading || finishing}
              onClick={async () => {
                if (evalLoading || finishing) return;
                setEvalLoading(true);
                const tx = segments.map((s) => s.text).join(" ");
                const result = await evaluateHistory(patient, tx);
                setEvalData(result);
                setEvalOpen(true);
                setEvalLoading(false);
              }}
              className="pointer-events-auto relative z-10 flex shrink-0 items-center justify-center rounded-[16px] bg-[#f1f5ff] px-4 text-[#3965e1] transition-colors hover:bg-[#e3ebff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {evalLoading ? (
                <IconLoader2 className="h-6 w-6 animate-spin" stroke={2} />
              ) : (
                <IconBulb className="h-6 w-6" stroke={2} />
              )}
            </motion.button>
            </Tooltip>
          )}
          {/* วินิจฉัยโรค — shown only after pausing the recording */}
          {!isRecording && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 30, delay: 0.06 }}
              disabled={finishing}
              onClick={async () => {
                if (finishing) return;
                setFinishing(true);
                await stopSession();
                onFinish();
              }}
              className="pointer-events-auto relative z-10 flex flex-1 items-center justify-center gap-2 rounded-[16px] bg-[#3965e1] py-4 text-[14px] font-bold text-white transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {finishing ? (
                <>
                  <IconLoader2 className="h-5 w-5 animate-spin" stroke={2} />
                  กำลังวิเคราะห์เคส…
                </>
              ) : (
                <>
                  <IconStethoscope className="h-5 w-5" stroke={2} />
                  วินิจฉัยโรค
                </>
              )}
            </motion.button>
          )}
        </div>

        {/* Evaluation overlay — assessment + suggested follow-up questions */}
        <AnimatePresence>
          {evalOpen && evalData && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0 z-40 flex flex-col rounded-[24px] bg-white p-3"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 pb-2">
                <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-[#22202a]">
                  <IconSparkles className="h-5 w-5 text-[#3965e1]" stroke={2} />
                  แนะนำคำถามเพิ่มเติม
                </h3>
                <button
                  type="button"
                  onClick={() => setEvalOpen(false)}
                  aria-label="ปิด"
                  className="grid h-9 w-9 place-items-center rounded-full text-black/55 transition hover:bg-black/5"
                >
                  <IconX className="h-5 w-5" stroke={2} />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {evalData.assessment && (
                  <div className="flex items-start gap-2 rounded-[12px] bg-[#3965e1]/[0.06] px-3 py-2.5">
                    <IconInfoCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#3965e1]" stroke={2} />
                    <p className="text-[13px] font-medium leading-relaxed text-[#22202a]">{evalData.assessment}</p>
                  </div>
                )}
                {evalData.questions.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {evalData.questions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2.5 rounded-[12px] bg-[#f7f7f8] px-3 py-2.5">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#3965e1] text-[11px] font-bold text-white">
                          {i + 1}
                        </span>
                        <p className="text-[14px] leading-relaxed text-[#22202a]">{q}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 rounded-[12px] bg-[#1f9d52]/[0.08] px-3 py-2.5">
                    <IconCheck className="h-5 w-5 shrink-0 text-[#1f9d52]" stroke={2.5} />
                    <p className="text-[14px] font-semibold text-[#1f9d52]">ซักประวัติครบถ้วนแล้ว</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEvalOpen(false)}
                className="mt-3 shrink-0 rounded-[16px] bg-[#3965e1] py-3 text-[14px] font-bold text-white transition hover:brightness-110"
              >
                ซักประวัติต่อ
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ── CENTER (step 2): AI treatment-plan draft, shown after finishing the visit ─

/** Structured treatment plan — rendered as grouped sections (view) and an
 *  editable table (edit). */
interface PlanMed { name: string; usage: string; qty: string; reimbursable: boolean; tmtCode?: string; form?: string }
interface PlanLab {
  name: string;
  prep: string;
  reimbursable: boolean;
  indication?: string;
  // master refs (from the LOINC/TMLT compendium — no free text)
  loinc?: string;
  tmlt?: string;
  panel?: string;
  specimen?: string;
  turnaroundHrs?: number;
  price?: number;
  sendOut?: boolean;
}
interface TreatmentPlan {
  medications: PlanMed[];
  labs: PlanLab[];
  certificate: string;
  /** Structured medical certificate (template + auto-fill + signature/log). */
  cert?: MedicalCert;
  appointment: string;
  /** Structured, auto-scheduled follow-up appointment. */
  appt?: PlanAppt;
}
const EMPTY_PLAN: TreatmentPlan = { medications: [], labs: [], certificate: "", appointment: "" };

/** Flatten a plan to speakable text for the read-aloud button. */
function planToText(p: TreatmentPlan): string {
  const parts: string[] = [];
  if (p.medications.length)
    parts.push("สั่งยา " + p.medications.map((m) => `${m.name} ${m.qty} ${m.usage}`.trim()).join(", "));
  if (p.labs.length)
    parts.push("สั่งตรวจแล็บ " + p.labs.map((l) => (l.prep && l.prep !== "-" ? `${l.name} ${l.prep}` : l.name)).join(", "));
  if (p.cert?.signed) parts.push("ใบรับรองแพทย์ลงนามแล้ว");
  else if (p.certificate) parts.push("ใบรับรองแพทย์ " + p.certificate);
  if (p.appt) parts.push(`นัดหมาย ${p.appt.date} ที่ ${p.appt.clinic} (${p.appt.type})`);
  else if (p.appointment) parts.push("นัดหมาย " + p.appointment);
  return parts.join(". ");
}

/** Auto-schedule the next follow-up from the AI-proposed interval (days). */
function buildAutoAppt(patient: Patient, days: number, note: string): PlanAppt {
  const d = Math.max(1, Math.round(days || 30));
  return {
    date: apptAddDays(d),
    intervalKey: nearestIntervalKey(d),
    clinic: patient.nextAppointment?.clinic ?? "OPD อายุรกรรม",
    doctor: patient.nextAppointment?.doctor ?? patient.primaryDoctor,
    type: "ติดตามอาการ",
    note,
  };
}

/** Drafts a structured treatment plan from the patient context + recorded
 *  transcript. Called once when the doctor finishes the visit so the loading
 *  sits on the finish button (not the plan screen). Returns EMPTY_PLAN on error. */
async function generateTreatmentPlan(patient: Patient, transcript: string): Promise<TreatmentPlan> {
  const dx = patient.diagnoses.map((d) => `${d.name} (${d.code})`).join(", ") || "ไม่มีโรคประจำตัว";
  const meds = patient.medications.map((m) => `${m.drug} ${m.dose} (${m.frequency})`).join(", ") || "ไม่มียาประจำ";
  const abn =
    patient.labs.filter((l) => l.abnormal).map((l) => `${l.test} ${l.value}${l.unit} (ปกติ ${l.referenceRange})`).join("; ") ||
    "ไม่มีผลแลปผิดปกติ";
  const cc = patient.recentVisits[0]?.chiefComplaint ?? "-";
  // ประวัติการรักษา — timeline of previous visits + diagnoses
  const treatmentHistory =
    patient.recentVisits
      .map((vt) => `• ${fmtThaiDate(vt.date)} (${vt.clinic}): ${vt.chiefComplaint} → ${vt.diagnosis}`)
      .join("\n") || "ไม่มีประวัติการรักษาก่อนหน้า";
  // การนัดหมายเดิมในระบบ (ถ้ามี)
  const appt = patient.nextAppointment
    ? `${fmtThaiDate(patient.nextAppointment.date)} ที่ ${patient.nextAppointment.clinic} (${patient.nextAppointment.type}) กับ ${patient.nextAppointment.doctor}`
    : "ยังไม่มีนัดหมายในระบบ";
  const ctx =
    `อาการสำคัญวันนี้: ${cc}\nโรคประจำตัว/การวินิจฉัย: ${dx}\nผลแลปผิดปกติ: ${abn}\n` +
    `ประวัติการใช้ยา: ${meds}\nประวัติการรักษา (visit ก่อนหน้า):\n${treatmentHistory}\n` +
    `การนัดหมายเดิมในระบบ: ${appt}\n` +
    `บทสนทนาจากการซักประวัติวันนี้: ${transcript.trim() || "(ไม่มีบทสนทนา — ให้ร่างจากข้อมูลเคส)"}`;

  try {
    const r = await chatJSON<{
      medications?: { name?: string; usage?: string; qty?: string; reimbursable?: boolean }[];
      labs?: { name?: string; prep?: string; reimbursable?: boolean }[];
      certificate?: string;
      appointment?: string;
      appointmentDays?: number;
    }>(
      [
        {
          role: "system",
          content:
            "คุณคือ AI ผู้ช่วยแพทย์ ร่าง 'แผนการรักษา' แบบมีโครงสร้าง โดยวิเคราะห์ร่วมจาก: บทสนทนาการซักประวัติวันนี้, ประวัติการใช้ยา, ประวัติการรักษา (visit ก่อนหน้า) และการนัดหมาย. " +
            'Output ONLY JSON: {"medications":[{"name":"","usage":"","qty":"","reimbursable":true}],"labs":[{"name":"","prep":"","reimbursable":true}],"certificate":"","appointment":"","appointmentDays":30}. ' +
            "medications: ยาที่สั่ง — name=ชื่อยา, usage=วิธีใช้ (เช่น '1x2 pc' หรือ '1 เม็ด วันละ 2 ครั้งหลังอาหาร'), qty=ขนาด/ปริมาณ (เช่น '500 mg'), reimbursable=เบิกได้หรือไม่. พิจารณาคงยาเดิม/ปรับขนาด/เพิ่มยาใหม่จาก 'ประวัติการใช้ยา' ระวังยาซ้ำซ้อน/ตีกัน. " +
            "labs: การตรวจติดตามตามผลแลปผิดปกติ/โรค — name=ชื่อการตรวจ, prep=การเตรียมตัว (เช่น 'งดอาหาร' หรือ '-'), reimbursable. " +
            "certificate: ข้อความใบรับรองแพทย์ถ้าจำเป็น มิฉะนั้นเว้นว่าง ''. " +
            "appointment: ข้อความเหตุผล/หมายเหตุการนัดติดตามครั้งถัดไปสั้น ๆ (เช่น 'ติดตามความดันและผลข้างเคียงยา'). " +
            "appointmentDays: ระยะเวลาถึงนัดถัดไปเป็น 'จำนวนวัน' ที่เหมาะกับภาวะ (เช่น 7, 14, 30, 90, 180) — โรคเรื้อรังคุมได้ ~30-90 วัน, อาการเฉียบพลัน ~7-14 วัน. " +
            "อ้างอิงข้อมูลจริงเท่านั้น ห้ามแต่งข้อมูลที่ไม่ได้ระบุ.",
        },
        { role: "user", content: ctx },
      ],
      { temperature: 0.3, maxTokens: 800, fast: true },
    );
    // Wire each AI-recommended drug to the drug master so it carries a real
    // tmtCode/form (no free-text). Unmatched ones keep the AI text — the doctor
    // re-picks from the search field.
    const aiMeds = Array.isArray(r?.medications)
      ? r.medications.filter((m): m is { name: string } & typeof m => !!m && typeof m.name === "string" && m.name.trim().length > 0)
      : [];
    const medications: PlanMed[] = await Promise.all(
      aiMeds.map(async (m) => {
        const name = m.name.trim();
        const usage = typeof m.usage === "string" ? m.usage.trim() : "";
        const qty = typeof m.qty === "string" ? m.qty.trim() : "";
        const reimbursable = m.reimbursable !== false;
        const hits = await searchDrugs(`${name} ${qty}`.trim(), 5);
        const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        // prefer a hit whose strength matches the AI's qty, else the top hit
        const match = (qty && hits.find((h) => key(h.strength).includes(key(qty)))) || hits[0];
        if (match) {
          return { name: match.generic, usage, qty: qty || match.strength, reimbursable: match.inFormulary, tmtCode: match.tmtCode, form: match.form };
        }
        return { name, usage, qty, reimbursable };
      }),
    );
    const aiLabs = Array.isArray(r?.labs)
      ? r.labs.filter((l): l is { name: string } & typeof l => !!l && typeof l.name === "string" && l.name.trim().length > 0)
          .map((l) => ({ name: l.name.trim(), prep: typeof l.prep === "string" ? l.prep.trim() : "", reimbursable: l.reimbursable !== false }))
      : [];
    return {
      medications,
      labs: await mapAiLabs(aiLabs),
      certificate: typeof r?.certificate === "string" ? r.certificate.trim() : "",
      appointment: typeof r?.appointment === "string" ? r.appointment.trim() : "",
      // Auto-schedule the follow-up: AI proposes the interval (days) → concrete
      // date the doctor confirms. Clinic/doctor auto-filled from the patient.
      appt: buildAutoAppt(
        patient,
        typeof r?.appointmentDays === "number" ? r.appointmentDays : 30,
        typeof r?.appointment === "string" ? r.appointment.trim() : "",
      ),
    };
  } catch {
    return EMPTY_PLAN;
  }
}

/** Map AI-suggested drugs to the drug master (real tmtCode/form, no free text). */
async function mapAiMeds(
  aiMeds: { name: string; usage?: string; qty?: string; reimbursable?: boolean }[],
): Promise<PlanMed[]> {
  return Promise.all(
    aiMeds.map(async (m) => {
      const name = m.name.trim();
      const usage = typeof m.usage === "string" ? m.usage.trim() : "";
      const qty = typeof m.qty === "string" ? m.qty.trim() : "";
      const reimbursable = m.reimbursable !== false;
      const hits = await searchDrugs(`${name} ${qty}`.trim(), 5);
      const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = (qty && hits.find((h) => key(h.strength).includes(key(qty)))) || hits[0];
      if (match) return { name: match.generic, usage, qty: qty || match.strength, reimbursable: match.inFormulary, tmtCode: match.tmtCode, form: match.form };
      return { name, usage, qty, reimbursable };
    }),
  );
}

/** Map AI-suggested labs to the lab compendium (LOINC/TMLT, no free text).
 *  Unmatched names are dropped — labs MUST come from the master. */
async function mapAiLabs(
  aiLabs: { name: string; prep?: string; reimbursable?: boolean }[],
): Promise<PlanLab[]> {
  const out: PlanLab[] = [];
  for (const l of aiLabs) {
    const hits = await searchLabs(l.name, 3);
    const m = hits[0];
    if (m) out.push(labToPlan(m, l.reimbursable));
  }
  return out;
}

/** Build a PlanLab from a master entry (compendium fields carried through). */
function labToPlan(m: LabMaster, reimbursable?: boolean): PlanLab {
  return {
    name: m.name,
    prep: labPrep(m),
    reimbursable: reimbursable ?? m.reimbursable,
    loinc: m.loinc,
    tmlt: m.tmlt,
    panel: m.panel,
    specimen: m.specimen,
    turnaroundHrs: m.turnaroundHrs,
    price: m.price,
    sendOut: m.sendOut,
  };
}

/** Apply a spoken edit command to the whole treatment plan. Returns the next
 *  plan (the LLM rewrites the full structure; we re-map drugs + keep cert/appt
 *  structured). Returns the unchanged plan on error. */
async function applyVoiceEdit(transcript: string, plan: TreatmentPlan, patient: Patient): Promise<TreatmentPlan> {
  const t = transcript.trim();
  if (!t) return plan;
  const snapshot = {
    medications: plan.medications.map((m) => ({ name: m.name, usage: m.usage, qty: m.qty, reimbursable: m.reimbursable })),
    labs: plan.labs.map((l) => ({ name: l.name, prep: l.prep, reimbursable: l.reimbursable })),
    certificate: plan.certificate,
    appointment: plan.appt ? { date: plan.appt.date, type: plan.appt.type, clinic: plan.appt.clinic, doctor: plan.appt.doctor, note: plan.appt.note ?? "" } : null,
  };
  try {
    const r = await chatJSON<{
      medications?: { name?: string; usage?: string; qty?: string; reimbursable?: boolean }[];
      labs?: { name?: string; prep?: string; reimbursable?: boolean }[];
      certificate?: string;
      appointment?: { date?: string; type?: string; clinic?: string; doctor?: string; note?: string } | null;
    }>(
      [
        {
          role: "system",
          content:
            "คุณคือ AI แก้ไข 'แผนการรักษา' ตามคำสั่งเสียงของแพทย์. รับ 'แผนปัจจุบัน' (JSON) + 'คำสั่ง' แล้วคืนแผนใหม่ทั้งก้อนในรูปแบบ JSON เดิม. " +
            "แก้เฉพาะส่วนที่แพทย์สั่ง (เพิ่ม/ลบ/แก้ ยา-แล็บ-นัด-ใบรับรอง) ส่วนที่ไม่ได้สั่งให้คงเดิมทุกตัว. " +
            'Output ONLY JSON: {"medications":[{"name":"","usage":"","qty":"","reimbursable":true}],"labs":[{"name":"","prep":"","reimbursable":true}],"certificate":"","appointment":{"date":"YYYY-MM-DD","type":"","clinic":"","doctor":"","note":""}}. ' +
            "medications.name=ชื่อยาสามัญ, usage=วิธีใช้, qty=ขนาด. labs.name=ชื่อตรวจ, prep=การเตรียมตัว. appointment.date=วันนัด (YYYY-MM-DD). " +
            "ห้ามแต่งข้อมูลที่ไม่ได้สั่ง.",
        },
        { role: "user", content: `แผนปัจจุบัน:\n${JSON.stringify(snapshot)}\n\nคำสั่ง: ${t}` },
      ],
      { temperature: 0.2, maxTokens: 800, fast: true },
    );
    const aiMeds = Array.isArray(r?.medications)
      ? r.medications.filter((m): m is { name: string } & typeof m => !!m && typeof m.name === "string" && m.name.trim().length > 0)
      : [];
    const medications = await mapAiMeds(aiMeds);
    const aiLabs = Array.isArray(r?.labs)
      ? r.labs.filter((l): l is { name: string } & typeof l => !!l && typeof l.name === "string" && l.name.trim().length > 0)
          .map((l) => ({ name: l.name.trim(), prep: typeof l.prep === "string" ? l.prep.trim() : "", reimbursable: l.reimbursable !== false }))
      : [];
    const labs = await mapAiLabs(aiLabs);
    const ap = r?.appointment;
    const nextAppt: PlanAppt | undefined = ap
      ? {
          date: typeof ap.date === "string" && ap.date ? ap.date : plan.appt?.date ?? apptAddDays(30),
          intervalKey: "custom",
          clinic: typeof ap.clinic === "string" && ap.clinic ? ap.clinic : plan.appt?.clinic ?? (patient.nextAppointment?.clinic ?? "OPD อายุรกรรม"),
          doctor: typeof ap.doctor === "string" && ap.doctor ? ap.doctor : plan.appt?.doctor ?? patient.primaryDoctor,
          type: typeof ap.type === "string" && ap.type ? ap.type : plan.appt?.type ?? "ติดตามอาการ",
          note: typeof ap.note === "string" ? ap.note : plan.appt?.note,
        }
      : plan.appt;
    return {
      ...plan,
      medications,
      labs,
      certificate: typeof r?.certificate === "string" ? r.certificate.trim() : plan.certificate,
      appt: nextAppt,
    };
  } catch {
    return plan;
  }
}

// ── ICD-10 Diagnosis (encounter-level) ──────────────────────────────────────
/** A diagnosis attached to THIS visit — distinct from the chronic problem list
 *  (`patient.diagnoses`). Carries the ICD-10 code for claims + downstream
 *  auto-fill (lab indication / certificate). See docs/icd10-requirement.md. */
interface EncounterDx {
  icd10: string;
  termTh: string;
  termEn: string;
  rank: "primary" | "secondary";
  source: "doctor" | "ai-suggested" | "problem-list";
  confidence?: number;
  /** disease named but code not yet pinned — coding staff fills later */
  pending?: boolean;
  /** AI suggestion awaiting the doctor's confirmation. `false` = unconfirmed
   *  (shown in the list, draggable, but excluded from downstream auto-fill);
   *  undefined/true = confirmed. */
  confirmed?: boolean;
}

const dxKey = (icd10: string, termTh: string) => `${icd10}|${termTh}`.toLowerCase();

/** Build an EncounterDx from a catalog hit. */
function dxFromEntry(e: Icd10Entry, source: EncounterDx["source"], rank: EncounterDx["rank"], confidence?: number): EncounterDx {
  return { icd10: e.code, termTh: e.termTh, termEn: e.termEn, rank, source, confidence };
}

/** Local keyword match: catalog entries whose name/synonym appears in the text.
 *  Instant, no network — used to shrink the AI prompt and as offline fallback. */
function localDxCandidates(text: string): Icd10Entry[] {
  const t = text.toLowerCase();
  if (!t.trim()) return [];
  const hit = (e: Icd10Entry) =>
    [e.termTh, e.termEn, ...(e.synonyms ?? [])].some((w) => {
      const k = w.toLowerCase();
      return k.length >= 3 && t.includes(k);
    });
  return ICD10_CATALOG.filter(hit).slice(0, 6);
}

/** Suggest ICD-10 from today's symptoms. Strategy for SPEED + accuracy:
 *  1) local keyword match → instant candidate pool (also offline fallback)
 *  2) ask the LLM ONLY to rank/pick from that short pool (small prompt, 8s cap)
 *  Codes constrained to the catalog → no hallucinated codes. Each result is
 *  unconfirmed — the doctor must accept it (ป้าย "เสนอโดย AI · รอยืนยัน"). */
async function aiSuggestDiagnoses(patient: Patient, transcript: TranscriptData): Promise<EncounterDx[]> {
  const cc = transcript.primaryText || patient.recentVisits[0]?.chiefComplaint || "-";
  const hpi = transcript.hpi || "-";
  const pmh = patient.diagnoses.map((d) => `${d.name} (${d.code})`).join(", ") || "ไม่มี";

  // Pool = local matches on the symptom text; keep it small so the prompt (and
  // thus latency) stays tiny. Empty pool → let the model see common OPD codes.
  const local = localDxCandidates(`${cc} ${hpi}`);
  const pool = local.length ? local : ICD10_CATALOG.slice(0, 18);
  const allowed = pool.map((e) => `${e.code} ${e.termTh} / ${e.termEn}`).join("\n");

  // Instant fallback (used if the model is slow/errors): top local matches.
  const fallback: EncounterDx[] = local
    .slice(0, 3)
    .map((e, i) => dxFromEntry(e, "ai-suggested", i === 0 ? "primary" : "secondary", 0.5));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await chatJSON<{ diagnoses?: { icd10?: string; confidence?: number }[] }>(
      [
        {
          role: "system",
          content:
            "คุณคือ AI ผู้ช่วยแพทย์ เลือก 'การวินิจฉัย (working dx)' วันนี้ จาก 'รายการที่เลือกได้' เท่านั้น. " +
            'Output ONLY JSON: {"diagnoses":[{"icd10":"K52.9","confidence":0.0}]}. ' +
            "เรียงน่าจะเป็นมากสุดก่อน (อาการสำคัญวันนี้=ตัวหลัก), 1-3 รายการ, confidence 0-1. ห้ามแต่งรหัสใหม่.",
        },
        { role: "user", content: `อาการสำคัญ: ${cc}\nHPI: ${hpi}\nโรคประจำตัว: ${pmh}\n\nรายการที่เลือกได้:\n${allowed}` },
      ],
      { temperature: 0.2, maxTokens: 200, fast: true, signal: ctrl.signal },
    );
    const out: EncounterDx[] = [];
    for (const d of r?.diagnoses ?? []) {
      const e = d?.icd10 ? findIcd10(d.icd10) : undefined;
      if (!e || out.some((x) => x.icd10 === e.code)) continue;
      out.push(dxFromEntry(e, "ai-suggested", out.length === 0 ? "primary" : "secondary", typeof d?.confidence === "number" ? d.confidence : undefined));
    }
    return out.length ? out : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/** Evaluates the history taken so far and suggests follow-up questions to close
 *  the gaps (OPQRST completeness, red-flag screening, relevant ROS/PMH). */
type HistoryEval = { assessment: string; questions: string[] };
async function evaluateHistory(patient: Patient, transcript: string): Promise<HistoryEval> {
  const cc = patient.recentVisits[0]?.chiefComplaint ?? "-";
  const dx = patient.diagnoses.map((d) => `${d.name} (${d.code})`).join(", ") || "ไม่มีโรคประจำตัว";
  const ctx =
    `อาการสำคัญ: ${cc}\nโรคประจำตัว: ${dx}\n` +
    `บทสนทนาจากการซักประวัติจนถึงตอนนี้: ${transcript.trim() || "(ยังไม่มีบทสนทนา)"}`;
  try {
    const r = await chatJSON<{ assessment?: string; questions?: string[] }>(
      [
        {
          role: "system",
          content:
            "คุณคือ AI ผู้ช่วยแพทย์ ประเมิน 'ความครบถ้วนของการซักประวัติ' จากบทสนทนาที่ให้ แล้วแนะนำคำถามที่แพทย์ควรถามต่อเพื่อให้ครบถ้วน. " +
            "พิจารณา OPQRST (Onset, Provocation/Palliation, Quality, Region/Radiation, Severity, Timing), อาการร่วม (associated symptoms), red flags ที่ต้องคัดกรองตามอาการสำคัญ, ประวัติการใช้ยา/แพ้ยา และประวัติที่เกี่ยวข้อง. " +
            'Output ONLY JSON: {"assessment":"...","questions":["...","..."]}. ' +
            "assessment: 1 ประโยคภาษาไทยสรุปว่าซักครบแค่ไหน/ขาดด้านใด. " +
            "questions: 3-6 คำถามภาษาไทยที่ 'ยังไม่ได้ถาม' และควรถามต่อ เรียงตามความสำคัญ เจาะจงกับเคสนี้ (อิงอาการจริง ไม่ใช่คำถามทั่วไปลอย ๆ). หากซักครบถ้วนแล้วให้ questions เป็น array สั้นหรือว่าง. " +
            "อ้างอิงเฉพาะข้อมูลที่ให้ ห้ามสมมติว่าผู้ป่วยตอบอะไรที่ไม่ได้อยู่ในบทสนทนา.",
        },
        { role: "user", content: ctx },
      ],
      { temperature: 0.3, maxTokens: 500, fast: true },
    );
    return {
      assessment: typeof r?.assessment === "string" ? r.assessment.trim() : "",
      questions: Array.isArray(r?.questions)
        ? r.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0).map((q) => q.trim()).slice(0, 6)
        : [],
    };
  } catch {
    return { assessment: "", questions: [] };
  }
}

/** Confetti raining down from the top, clipped within the green header band.
 *  Fires once on mount as a success cue. */
function SuccessConfetti() {
  const pieces = useMemo(() => {
    const COLORS = ["#ffd166", "#06d6a0", "#ef476f", "#3965e1", "#ffffff", "#f78c6b"];
    return Array.from({ length: 26 }, (_, i) => ({
      id: i,
      left: Math.random() * 100, // % across the band
      delay: Math.random() * 0.9,
      dur: 1 + Math.random() * 0.7,
      sway: (Math.random() - 0.5) * 26,
      rot: (Math.random() - 0.5) * 540,
      color: COLORS[i % COLORS.length],
      w: 5 + Math.random() * 5,
    }));
  }, []);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[82px] overflow-hidden rounded-t-[24px]">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block rounded-[1px]"
          style={{ left: `${p.left}%`, width: p.w, height: p.w * 0.55, backgroundColor: p.color }}
          initial={{ y: -14, x: 0, opacity: 0, rotate: 0 }}
          animate={{ y: 96, x: p.sway, opacity: [0, 1, 1, 0], rotate: p.rot }}
          transition={{ duration: p.dur, ease: "easeIn", delay: p.delay }}
        />
      ))}
    </div>
  );
}

type PlanTab = "med" | "lab" | "cert" | "appt";

/** Collapsible plan section — keeps the แพทย์ตรวจ step's flat TxSection look
 *  (dark icon + bold title + hairline divider) but each header toggles open. */
function PlanSection({
  icon,
  title,
  className = "",
  children,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`flex flex-col border-b border-[#bebdbd] ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 py-3 text-left"
      >
        {icon}
        <h3 className="text-[16px] font-bold text-[#22202a]">{title}</h3>
        <IconChevronDown className={`ml-auto h-5 w-5 shrink-0 text-black/40 transition-transform ${open ? "rotate-180" : ""}`} stroke={2} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Read-only grouped view of the treatment plan (สั่งยา / Lab / ใบรับรอง / นัด).
 *  The primary Dx auto-fills lab indication + the certificate diagnosis line. */
function PlanView({ plan, primaryDx }: { plan: TreatmentPlan; primaryDx?: EncounterDx }) {
  const ic = "h-4 w-4 shrink-0 text-[#22202a]";
  const dxLabel = primaryDx ? (primaryDx.icd10 ? `[${primaryDx.icd10}] ${primaryDx.termTh}` : primaryDx.termTh) : "";
  return (
    <div className="flex flex-col">
      <PlanSection
        icon={<IconPill className={ic} stroke={2} />}
        title={<>สั่งยา <span className="font-semibold text-black/45">{plan.medications.length} รายการ</span></>}
        className="pt-1"
      >
        {plan.medications.length ? (
          <ul className="flex flex-col gap-2">
            {plan.medications.map((m, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#22202a]">{m.name}</p>
                  {m.usage && <p className="mt-0.5 text-[12px] text-black/45">({m.usage})</p>}
                </div>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-black/60">{m.qty}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-black/40">ไม่มีรายการยา</p>
        )}
      </PlanSection>
      <PlanSection
        icon={<IconTestPipe className={ic} stroke={2} />}
        title={<>สั่งตรวจ Lab <span className="font-semibold text-black/45">{plan.labs.length} รายการ</span></>}
      >
        {plan.labs.length ? (
          <ul className="flex flex-col gap-2">
            {plan.labs.map((l, i) => {
              const indication = l.indication || dxLabel;
              return (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#22202a]">{l.name}</p>
                    {l.prep && l.prep !== "-" && <p className="mt-0.5 text-[12px] text-black/45">{l.prep}</p>}
                    {indication && (
                      <p className="mt-0.5 text-[11px] text-[#3965e1]/70">ข้อบ่งชี้: {indication}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[13px] font-semibold ${l.reimbursable ? "text-[#1f9d52]" : "text-black/40"}`}>
                    {l.reimbursable ? "เบิกได้" : "เบิกไม่ได้"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-black/40">ไม่มีรายการตรวจ</p>
        )}
      </PlanSection>
      <PlanSection icon={<IconCertificate className={ic} stroke={2} />} title="ออกใบรับรองแพทย์">
        {dxLabel && (
          <p className="mb-1.5 text-[12px] text-black/55">
            การวินิจฉัย: <span className="font-semibold text-[#22202a]">{dxLabel}</span>
          </p>
        )}
        {plan.cert && plan.cert.template === "none" ? (
          <p className="text-[13px] text-black/40">ไม่ออกใบรับรองแพทย์สำหรับการตรวจครั้งนี้</p>
        ) : plan.cert ? (
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-semibold text-[#22202a]">{CERT_TEMPLATE_BY_ID[plan.cert.template].label}</p>
            {plan.cert.signed ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#1f9d52]/10 px-2.5 py-0.5 text-[12px] font-bold text-[#1f7a43]">
                <IconCertificate className="h-3.5 w-3.5" stroke={2.4} /> ลงนามแล้ว · ว.{plan.cert.licenseNo}
              </span>
            ) : (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#e1a325]/15 px-2.5 py-0.5 text-[12px] font-bold text-[#b9791a]">
                ร่างไว้ — ยังไม่ลงนาม (แก้ไขเพื่อลงนาม)
              </span>
            )}
          </div>
        ) : plan.certificate ? (
          <p className="text-[14px] leading-relaxed text-[#22202a]">{plan.certificate}</p>
        ) : (
          <p className="text-[13px] text-black/40">ไม่มีใบรับรองแพทย์สำหรับการตรวจครั้งนี้ — เพิ่มได้ในโหมดแก้ไข</p>
        )}
      </PlanSection>
      <PlanSection icon={<IconCalendarEvent className={ic} stroke={2} />} title="การนัดหมาย">
        {plan.appt && plan.appt.intervalKey === "none" ? (
          <p className="text-[13px] text-black/40">ไม่มีนัดครั้งต่อไป</p>
        ) : plan.appt ? (
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-semibold text-[#22202a]">
              {fmtThaiDate(plan.appt.date)} · {plan.appt.type}
            </p>
            <p className="text-[12px] text-black/55">
              {plan.appt.clinic} · {plan.appt.doctor}
            </p>
            {plan.appt.note && <p className="text-[12px] text-black/45">{plan.appt.note}</p>}
          </div>
        ) : plan.appointment ? (
          <p className="text-[14px] leading-relaxed text-[#22202a]">{plan.appointment}</p>
        ) : (
          <p className="text-[13px] text-black/40">ไม่มีการนัดหมาย — เพิ่มได้ในโหมดแก้ไข</p>
        )}
      </PlanSection>
    </div>
  );
}

/** Drug picker — search the master by generic/trade and SELECT (no free-text;
 *  a typo can't be committed). Returns a DrugMaster object via `onPick`. The
 *  dropdown is portaled to <body> so the table's overflow can't clip it. */
function DrugSelect({
  value,
  className,
  onPick,
}: {
  value: string;
  className?: string;
  onPick: (d: DrugMaster) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<DrugMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ddRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.bottom + 4, width: Math.max(r.width, 240) });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const on = () => place();
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    const t = setTimeout(() => {
      searchDrugs(q).then((r) => {
        if (!cancel) {
          setResults(r);
          setLoading(false);
        }
      });
    }, 180);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (inputRef.current?.contains(t) || ddRef.current?.contains(t)) return;
      setOpen(false);
      setQ("");
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = (d: DrugMaster) => {
    onPick(d);
    setOpen(false);
    setQ("");
  };

  return (
    <>
      <input
        ref={inputRef}
        value={open ? q : value}
        placeholder="ค้นหายา (สามัญ/การค้า)"
        onFocus={() => {
          setOpen(true);
          setQ("");
        }}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        className={className}
      />
      {open &&
        rect &&
        createPortal(
          <div
            ref={ddRef}
            style={{ position: "fixed", left: rect.left, top: rect.top, width: rect.width, zIndex: 80 }}
            className="max-h-[260px] overflow-y-auto rounded-[12px] border border-black/10 bg-white py-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
          >
            {loading ? (
              <p className="flex items-center gap-2 px-3 py-2 text-[12px] text-black/45">
                <IconLoader2 className="h-3.5 w-3.5 animate-spin" stroke={2} /> กำลังค้นหา…
              </p>
            ) : results.length ? (
              results.map((d) => (
                <button
                  key={d.tmtCode}
                  type="button"
                  onClick={() => choose(d)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-[#3965e1]/[0.06]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[#22202a]">
                      {d.generic} <span className="font-normal text-black/45">{d.strength}</span>
                    </span>
                    <span className="block truncate text-[11px] text-black/40">
                      {d.tradeNames[0] ? `${d.tradeNames[0]} · ` : ""}{d.form} · TMT {d.tmtCode}
                    </span>
                  </span>
                  {d.nlem && <span className="shrink-0 rounded-[6px] bg-[#1f9d52]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#1f9d52]">NLEM</span>}
                  {!d.inFormulary && <span className="shrink-0 rounded-[6px] bg-[#e1a325]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#a9741a]">นอกบัญชี</span>}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-[12px] text-black/45">
                {q.trim() ? "ไม่พบยาในระบบ — เลือกจากรายการเท่านั้น (ห้ามพิมพ์เอง)" : "พิมพ์ชื่อยาเพื่อค้นหา"}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Lab picker — search the LOINC/TMLT compendium and SELECT (no free-text; a
 *  typo can't be committed). Returns a LabMaster via `onPick`. Dropdown is
 *  portaled to <body> so the table overflow can't clip it. */
function LabSelect({
  value,
  className,
  onPick,
}: {
  value: string;
  className?: string;
  onPick: (l: LabMaster) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<LabMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ddRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.bottom + 4, width: Math.max(r.width, 280) });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const on = () => place();
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    const t = setTimeout(() => {
      searchLabs(q).then((r) => {
        if (!cancel) { setResults(r); setLoading(false); }
      });
    }, 180);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (inputRef.current?.contains(t) || ddRef.current?.contains(t)) return;
      setOpen(false);
      setQ("");
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = (l: LabMaster) => { onPick(l); setOpen(false); setQ(""); };

  return (
    <>
      <input
        ref={inputRef}
        value={open ? q : value}
        placeholder="ค้นหารายการตรวจ (ชื่อ/panel/LOINC)"
        onFocus={() => { setOpen(true); setQ(""); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        className={className}
      />
      {open && rect &&
        createPortal(
          <div
            ref={ddRef}
            style={{ position: "fixed", left: rect.left, top: rect.top, width: rect.width, zIndex: 80 }}
            className="max-h-[260px] overflow-y-auto rounded-[12px] border border-black/10 bg-white py-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
          >
            {loading ? (
              <p className="flex items-center gap-2 px-3 py-2 text-[12px] text-black/45">
                <IconLoader2 className="h-3.5 w-3.5 animate-spin" stroke={2} /> กำลังค้นหา…
              </p>
            ) : results.length ? (
              results.map((l) => (
                <button
                  key={l.loinc}
                  type="button"
                  onClick={() => choose(l)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-[#3965e1]/[0.06]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[#22202a]">{l.name}</span>
                    <span className="block truncate text-[11px] text-black/40">
                      {l.panel ? `${l.panel} · ` : ""}{l.specimen} · {l.fasting ? "งดอาหาร" : "ไม่งด"} · {l.price}฿ · LOINC {l.loinc}
                    </span>
                  </span>
                  {l.sendOut && <span className="shrink-0 rounded-[6px] bg-[#7c3aed]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#7c3aed]">ส่งนอก</span>}
                  {!l.reimbursable && <span className="shrink-0 rounded-[6px] bg-[#e1a325]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#a9741a]">เบิกไม่ได้</span>}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-[12px] text-black/45">
                {q.trim() ? "ไม่พบรายการตรวจ — เลือกจากรายการเท่านั้น (ห้ามพิมพ์เอง)" : "พิมพ์ชื่อการตรวจเพื่อค้นหา"}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Editable, tabbed table view of the plan. Mutates `draft` via setDraft. */
/** Voice-edit the whole treatment plan: record → transcribe → AI applies the
 *  spoken command to ยา/แล็บ/ใบรับรอง/นัด. One button for every plan section. */
/** Which plan tabs differ between two plans (drives the AI-edit glow). */
function planDiffTabs(a: TreatmentPlan, b: TreatmentPlan): PlanTab[] {
  const ch: PlanTab[] = [];
  const j = (v: unknown) => JSON.stringify(v);
  if (j(a.medications) !== j(b.medications)) ch.push("med");
  if (j(a.labs) !== j(b.labs)) ch.push("lab");
  if (a.certificate !== b.certificate || j(a.cert) !== j(b.cert)) ch.push("cert");
  if (a.appointment !== b.appointment || j(a.appt) !== j(b.appt)) ch.push("appt");
  return ch;
}

function VoiceEditButton({
  draft,
  setDraft,
  patient,
  onEdited,
}: {
  draft: TreatmentPlan;
  setDraft: React.Dispatch<React.SetStateAction<TreatmentPlan>>;
  patient: Patient;
  onEdited?: (changed: PlanTab[]) => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<"idle" | "recording" | "processing">("idle");
  const recRef = useRef<PcmRecorder | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const start = async () => {
    try {
      recRef.current = await startPcmRecorder("mic", { onChunk: () => {} });
      setStatus("recording");
    } catch {
      toast.error("เปิดไมโครโฟนไม่ได้", "ตรวจสอบสิทธิ์การใช้ไมค์");
    }
  };

  const stop = async () => {
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return setStatus("idle");
    setStatus("processing");
    try {
      const wav = await rec.stop();
      if (!wav) { setStatus("idle"); return; }
      const { text } = await transcribe(wav, { language: "th" });
      if (!text.trim()) { toast.error("ไม่ได้ยินคำสั่ง", "ลองพูดอีกครั้ง"); setStatus("idle"); return; }
      const prev = draftRef.current;
      const next = await applyVoiceEdit(text, prev, patient);
      setDraft(next);
      onEdited?.(planDiffTabs(prev, next));
      toast.success("แก้แผนตามคำสั่งแล้ว", `“${text.trim()}”`);
    } catch {
      toast.error("แก้ด้วยเสียงไม่สำเร็จ");
    } finally {
      setStatus("idle");
    }
  };

  const recording = status === "recording";
  const processing = status === "processing";
  return (
    <button
      type="button"
      disabled={processing}
      onClick={() => (recording ? stop() : start())}
      className={[
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition",
        recording
          ? "bg-[#ff383c] text-white"
          : processing
            ? "cursor-wait bg-black/5 text-black/40"
            : "bg-[#3965e1]/[0.08] text-[#3965e1] hover:bg-[#3965e1]/[0.16]",
      ].join(" ")}
    >
      {processing ? (
        <IconLoader2 className="h-4 w-4 animate-spin" stroke={2.2} />
      ) : (
        <IconMicrophone className={["h-4 w-4", recording ? "animate-pulse" : ""].join(" ")} stroke={2.2} />
      )}
      {recording ? "หยุดแล้วแก้ไข" : processing ? "กำลังแก้ไข…" : "แก้ไขด้วยเสียง"}
    </button>
  );
}

function PlanEditor({
  draft,
  setDraft,
  tab,
  setTab,
  primaryDx,
  patient,
}: {
  draft: TreatmentPlan;
  setDraft: React.Dispatch<React.SetStateAction<TreatmentPlan>>;
  tab: PlanTab;
  setTab: (t: PlanTab) => void;
  primaryDx?: EncounterDx;
  patient: Patient;
}) {
  const dxLabel = primaryDx ? (primaryDx.icd10 ? `[${primaryDx.icd10}] ${primaryDx.termTh}` : primaryDx.termTh) : "";
  // AI voice-edit highlight: which tabs were just changed + a nonce so the glow
  // animation restarts on every edit.
  const [editedTabs, setEditedTabs] = useState<Set<PlanTab>>(new Set());
  const [glowNonce, setGlowNonce] = useState(0);
  const glowTimer = useRef<number | null>(null);
  const handleVoiceEdited = (changed: PlanTab[]) => {
    if (!changed.length) return;
    setEditedTabs(new Set(changed));
    setGlowNonce((n) => n + 1);
    setTab(changed[0]); // jump to a changed section so the glow is visible
    if (glowTimer.current) window.clearTimeout(glowTimer.current);
    glowTimer.current = window.setTimeout(() => setEditedTabs(new Set()), 2600);
  };
  const cell = "w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[13px] text-[#22202a] outline-none transition focus:border-[#3965e1]";
  const updMed = (i: number, p: Partial<PlanMed>) =>
    setDraft((d) => ({ ...d, medications: d.medications.map((m, idx) => (idx === i ? { ...m, ...p } : m)) }));
  const updLab = (i: number, p: Partial<PlanLab>) =>
    setDraft((d) => ({ ...d, labs: d.labs.map((l, idx) => (idx === i ? { ...l, ...p } : l)) }));
  const tabs: { key: PlanTab; label: string }[] = [
    { key: "med", label: "การสั่งยา" },
    { key: "lab", label: "สั่งตรวจ Lab" },
    { key: "cert", label: "ออกใบรับรองแพทย์" },
    { key: "appt", label: "การนัดหมาย" },
  ];
  const addBtn = "flex items-center gap-1.5 self-start rounded-[10px] bg-[#3965e1]/[0.08] px-3 py-1.5 text-[12px] font-bold text-[#3965e1] transition hover:bg-[#3965e1]/[0.14]";
  const delBtn = "grid h-6 w-6 place-items-center rounded-md text-black/35 transition hover:bg-black/5 hover:text-[#ff383c]";
  return (
    <div className="flex flex-col gap-3">
      {/* tabs + voice-edit */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-[12px] bg-black/[0.04] p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                "rounded-[9px] px-3 py-1.5 text-[12px] font-bold transition",
                tab === t.key ? "bg-white text-[#22202a] shadow-sm" : "text-black/50 hover:text-black/70",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <VoiceEditButton draft={draft} setDraft={setDraft} patient={patient} onEdited={handleVoiceEdited} />
      </div>

      <div key={glowNonce} className={editedTabs.has(tab) ? "ai-edit-glow flex flex-col gap-3" : "flex flex-col gap-3"}>
      {tab === "med" && (
        <>
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <table className="w-full min-w-[420px] border-separate border-spacing-y-1.5 text-left">
              <thead>
                <tr className="text-[11px] font-bold text-black/45">
                  <th className="w-7 pl-1">#</th>
                  <th>ชื่อยา</th>
                  <th>วิธีการใช้</th>
                  <th className="w-20">ปริมาณ</th>
                  <th className="w-16">เบิกได้</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {draft.medications.map((m, i) => (
                  <tr key={i}>
                    <td className="pl-1 text-[12px] tabular-nums text-black/45">{i + 1}</td>
                    <td className="pr-1.5">
                      <DrugSelect
                        value={m.name}
                        className={cell}
                        onPick={(d) =>
                          updMed(i, {
                            name: d.generic,
                            tmtCode: d.tmtCode,
                            form: d.form,
                            qty: m.qty || d.strength,
                            reimbursable: d.inFormulary,
                          })
                        }
                      />
                    </td>
                    <td className="pr-1.5"><input value={m.usage} onChange={(e) => updMed(i, { usage: e.target.value })} placeholder="วิธีใช้" className={cell} /></td>
                    <td className="pr-1.5"><input value={m.qty} onChange={(e) => updMed(i, { qty: e.target.value })} placeholder="ขนาด" className={cell} /></td>
                    <td className="pr-1.5">
                      <button
                        type="button"
                        onClick={() => updMed(i, { reimbursable: !m.reimbursable })}
                        className={["w-full rounded-md px-2 py-1 text-[11px] font-bold transition", m.reimbursable ? "bg-[#1f9d52]/10 text-[#1f9d52]" : "bg-black/5 text-black/40"].join(" ")}
                      >
                        {m.reimbursable ? "เบิกได้" : "ไม่เบิก"}
                      </button>
                    </td>
                    <td>
                      <button type="button" aria-label="ลบ" onClick={() => setDraft((d) => ({ ...d, medications: d.medications.filter((_, idx) => idx !== i) }))} className={delBtn}>
                        <IconX className="h-4 w-4" stroke={2} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setDraft((d) => ({ ...d, medications: [...d.medications, { name: "", usage: "", qty: "", reimbursable: true }] }))} className={addBtn}>
            <IconPlus className="h-4 w-4" stroke={2.2} /> เพิ่มรายการยา
          </button>
        </>
      )}

      {tab === "lab" && (
        <>
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <table className="w-full min-w-[520px] border-separate border-spacing-y-1.5 text-left">
              <thead>
                <tr className="text-[11px] font-bold text-black/45">
                  <th className="w-7 pl-1">#</th>
                  <th>รายการตรวจ</th>
                  <th>การเตรียมตัว</th>
                  <th>ข้อบ่งชี้</th>
                  <th className="w-16">เบิกได้</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {draft.labs.map((l, i) => (
                  <tr key={i}>
                    <td className="pl-1 text-[12px] tabular-nums text-black/45">{i + 1}</td>
                    <td className="pr-1.5">
                      <LabSelect
                        value={l.name}
                        className={cell}
                        onPick={(m) =>
                          updLab(i, {
                            name: m.name,
                            prep: labPrep(m),
                            reimbursable: m.reimbursable,
                            loinc: m.loinc,
                            tmlt: m.tmlt,
                            panel: m.panel,
                            specimen: m.specimen,
                            turnaroundHrs: m.turnaroundHrs,
                            price: m.price,
                            sendOut: m.sendOut,
                          })
                        }
                      />
                    </td>
                    <td className="pr-1.5"><input value={l.prep} onChange={(e) => updLab(i, { prep: e.target.value })} placeholder="เช่น งดอาหาร" className={cell} /></td>
                    <td className="pr-1.5"><input value={l.indication ?? ""} onChange={(e) => updLab(i, { indication: e.target.value })} placeholder={dxLabel || "ข้อบ่งชี้"} className={cell} /></td>
                    <td className="pr-1.5">
                      <button
                        type="button"
                        onClick={() => updLab(i, { reimbursable: !l.reimbursable })}
                        className={["w-full rounded-md px-2 py-1 text-[11px] font-bold transition", l.reimbursable ? "bg-[#1f9d52]/10 text-[#1f9d52]" : "bg-black/5 text-black/40"].join(" ")}
                      >
                        {l.reimbursable ? "เบิกได้" : "ไม่เบิก"}
                      </button>
                    </td>
                    <td>
                      <button type="button" aria-label="ลบ" onClick={() => setDraft((d) => ({ ...d, labs: d.labs.filter((_, idx) => idx !== i) }))} className={delBtn}>
                        <IconX className="h-4 w-4" stroke={2} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setDraft((d) => ({ ...d, labs: [...d.labs, { name: "", prep: "", reimbursable: true }] }))} className={addBtn}>
            <IconPlus className="h-4 w-4" stroke={2.2} /> เพิ่มรายการตรวจ
          </button>
        </>
      )}

      {tab === "cert" && (
        <CertificateBuilder
          patient={patient}
          dxLabel={dxLabel}
          cert={draft.cert}
          onChange={(cert) => setDraft((d) => ({ ...d, cert }))}
        />
      )}

      {tab === "appt" && (
        <AppointmentScheduler
          appt={draft.appt}
          patient={patient}
          onChange={(appt) => setDraft((d) => ({ ...d, appt }))}
        />
      )}
      </div>
    </div>
  );
}

/** One diagnosis row (Figma 1396-19297) — grip · sparkle (AI origin) · code +
 *  name · rank pill · (edit) · ✕ · ✓. `pending` rows are unconfirmed AI
 *  suggestions (✓ = ยืนยัน, ✕ = ไม่ใช้); confirmed rows (✓ = ตั้งเป็นหลัก,
 *  edit = แก้รหัส/ชื่อ, ✕ = ลบ). The grip starts a drag-reorder when draggable. */
function DxRow({
  dx,
  pending = false,
  draggable = false,
  onGripPointerDown,
  onConfirm,
  onEdit,
  onRemove,
}: {
  dx: EncounterDx;
  pending?: boolean;
  draggable?: boolean;
  onGripPointerDown?: (e: React.PointerEvent) => void;
  onConfirm: () => void;
  onEdit?: () => void;
  onRemove: () => void;
}) {
  const grip = (
    <span
      onPointerDown={draggable ? onGripPointerDown : undefined}
      className={`grid shrink-0 place-items-center text-black/25 ${draggable ? "cursor-grab touch-none select-none active:cursor-grabbing" : ""}`}
    >
      <IconGripVertical className="h-4 w-4" stroke={2} />
    </span>
  );
  const label = (
    <p className="min-w-0 truncate text-[14px] text-[#22202a]">
      {!dx.pending && <span className="font-bold">{dx.icd10}</span>}
      {!dx.pending && " "}
      <span className={dx.pending ? "font-bold" : ""}>{dx.pending ? `${dx.termTh} · รอระบุรหัส` : dx.termTh}</span>
    </p>
  );

  // ── Pending AI suggestion — gradient + sparkle + accept/deny buttons ──────
  if (pending) {
    return (
      <div className="flex items-center gap-2 rounded-[12px] bg-gradient-to-r from-[#ff9c78]/10 to-[#3965e1]/10 p-2 transition">
        {grip}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <IconSparkles className="h-5 w-5 shrink-0 text-[#ff7a59]" stroke={2} />
          {label}
          <span className="shrink-0 rounded-[8px] bg-[#3965e1]/[0.05] px-3 py-1 text-[10px] font-semibold text-[#3965e1]">
            {dx.rank === "primary" ? "หลัก" : "รอง"}
          </span>
        </div>
        <Tooltip content="ไม่ใช้" placement="top" delay={250} closeDelay={0}>
          <button
            type="button"
            onClick={onRemove}
            aria-label="ไม่ใช้"
            className="grid size-7 shrink-0 place-items-center rounded-[8px] text-[#ff383c] transition hover:bg-[#ff383c]/10"
          >
            <IconX className="h-5 w-5" stroke={2} />
          </button>
        </Tooltip>
        <Tooltip content="ยืนยัน" placement="top" delay={250} closeDelay={0}>
          <button
            type="button"
            onClick={onConfirm}
            aria-label="ยืนยัน"
            className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-[#3965e1] text-white transition hover:brightness-110"
          >
            <IconCheck className="h-5 w-5" stroke={2.2} />
          </button>
        </Tooltip>
      </div>
    );
  }

  // ── Confirmed — green row; edit + delete reveal on hover ──────────────────
  const primary = dx.rank === "primary";
  return (
    <div className="group flex items-center gap-2 rounded-[12px] bg-[#3eaf3f]/[0.08] p-2 transition">
      {grip}
      <IconCircleCheckFilled className="h-5 w-5 shrink-0 text-[#3eaf3f]" />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {label}
        <Tooltip content={primary ? "การวินิจฉัยหลัก (รายการบนสุด)" : "ลากขึ้นบนสุดเพื่อตั้งเป็นหลัก"} placement="top" delay={250} closeDelay={0}>
          <span
            className={[
              "shrink-0 rounded-[8px] px-3 py-1 text-[10px] font-semibold",
              primary ? "bg-[#3eaf3f] text-white" : "bg-[#3eaf3f]/10 text-[#2f8a31]",
            ].join(" ")}
          >
            {primary ? "หลัก" : "รอง"}
          </span>
        </Tooltip>
      </div>
      {/* delete revealed on hover */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <Tooltip content="ลบ" placement="top" delay={250} closeDelay={0}>
          <button
            type="button"
            onClick={onRemove}
            aria-label="ลบ"
            className="grid size-7 place-items-center rounded-[8px] text-[#ff383c] transition hover:bg-[#ff383c]/10"
          >
            <IconX className="h-5 w-5" stroke={2} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

/** A confirmed diagnosis row wrapped as a drag-reorderable Reorder.Item. The
 *  grip (not the whole row) initiates the drag so the action buttons stay
 *  clickable. */
function DxReorderRow({
  dx,
  index = 0,
  pending = false,
  onConfirm,
  onEdit,
  onRemove,
}: {
  dx: EncounterDx;
  index?: number;
  pending?: boolean;
  onConfirm: () => void;
  onEdit?: () => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={dx}
      dragListener={false}
      dragControls={controls}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 350, damping: 34, mass: 0.8, delay: index * 0.04 }}
    >
      <DxRow
        dx={dx}
        pending={pending}
        draggable
        onGripPointerDown={(e) => controls.start(e)}
        onConfirm={onConfirm}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    </Reorder.Item>
  );
}

/** Inline editor for one diagnosis row — search-replace the ICD code/name while
 *  keeping the row's rank. Picking a result swaps the code; Enter on free text
 *  keeps it as a pending (code-less) entry. */
function DxEditRow({
  dx,
  onSave,
  onCancel,
}: {
  dx: EncounterDx;
  onSave: (next: EncounterDx) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState(dx.pending ? dx.termTh : `${dx.icd10} ${dx.termTh}`.trim());
  const results = useMemo(() => searchIcd10(q), [q]);
  const pick = (e: Icd10Entry) => onSave({ ...dx, icd10: e.code, termTh: e.termTh, termEn: e.termEn, pending: false });
  const keepPending = () => {
    const name = q.trim();
    if (!name) return onCancel();
    onSave({ ...dx, termTh: name });
  };
  return (
    <div className="flex flex-col gap-1.5 rounded-[12px] border border-[#3965e1]/40 bg-white p-2">
      <div className="flex items-center gap-2">
        <IconPencil className="h-4 w-4 shrink-0 text-[#3965e1]" stroke={2} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (results[0] ? pick(results[0]) : keepPending());
            else if (e.key === "Escape") onCancel();
          }}
          placeholder="ค้นรหัส/ชื่อโรค เพื่อแก้ไข"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#22202a] outline-none placeholder:text-black/30"
        />
        <button
          type="button"
          onClick={onCancel}
          aria-label="ยกเลิก"
          className="grid size-6 shrink-0 place-items-center rounded-md text-black/40 transition hover:bg-black/5"
        >
          <IconX className="h-4 w-4" stroke={2} />
        </button>
      </div>
      {q.trim() && results.length > 0 && (
        <div className="flex flex-col">
          {results.slice(0, 5).map((e) => (
            <button
              key={e.code}
              type="button"
              onClick={() => pick(e)}
              className="flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left transition hover:bg-[#3965e1]/[0.06]"
            >
              <span className="w-[54px] shrink-0 text-[12px] font-bold tabular-nums text-[#3965e1]">{e.code}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-[#22202a]">{e.termTh}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Diagnosis picker (Figma 1396-19297) — search ICD-10, one primary, pull
 *  comorbidity from the problem list, AI suggestions (confirm-gated). Prereq at
 *  the top of วางแผนการรักษา before ordering lab/ยา. */
function DxSection({
  patient,
  value,
  onChange,
  transcript,
  hideHeader = false,
}: {
  patient: Patient;
  value: EncounterDx[];
  onChange: (next: EncounterDx[]) => void;
  transcript: TranscriptData;
  hideHeader?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEmpty, setAiEmpty] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Rank is derived from ORDER: the topmost CONFIRMED row is the primary (หลัก),
  // every other row is secondary. Re-applied on every mutation so dragging an
  // item to the top makes it the primary diagnosis.
  const rankByOrder = (list: EncounterDx[]): EncounterDx[] => {
    const firstConfirmed = list.findIndex((d) => d.confirmed !== false);
    return list.map((d, i) => ({ ...d, rank: i === firstConfirmed ? ("primary" as const) : ("secondary" as const) }));
  };
  const commit = (next: EncounterDx[]) => onChange(rankByOrder(next));
  // Local Thai catalog = instant baseline (Thai names for common OPD codes).
  // External master (KB RAG → NLM ICD-10-CM) fills the long tail, debounced and
  // appended AFTER local so Thai names win; falls back to local on any error.
  const localResults = useMemo(() => searchIcd10(query), [query]);
  const [extResults, setExtResults] = useState<Icd10Entry[]>([]);
  useEffect(() => {
    if (!ICD10_EXTERNAL_ENABLED || !query.trim()) {
      setExtResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      externalSearchIcd10(query, 8, ctrl.signal).then(setExtResults).catch(() => setExtResults([]));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);
  const results = useMemo(() => {
    const seen = new Set<string>();
    const merged: Icd10Entry[] = [];
    for (const e of [...localResults, ...extResults]) {
      if (seen.has(e.code)) continue;
      seen.add(e.code);
      merged.push(e);
    }
    return merged.slice(0, 10);
  }, [localResults, extResults]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Doctor-added dx go to the TOP (→ become primary); comorbidity quick-adds go
  // to the bottom so they stay secondary.
  const addDx = (dx: EncounterDx, atTop = true) => {
    if (value.some((d) => dxKey(d.icd10, d.termTh) === dxKey(dx.icd10, dx.termTh))) return;
    const entry = { ...dx, confirmed: true };
    commit(atTop ? [entry, ...value] : [...value, entry]);
  };
  const updateDx = (i: number, next: EncounterDx) => {
    commit(value.map((d, idx) => (idx === i ? next : d)));
    setEditIdx(null);
  };
  const addEntry = (e: Icd10Entry, source: EncounterDx["source"], atTop = true) => {
    addDx(dxFromEntry(e, source, "secondary"), atTop);
    setQuery("");
    setOpen(false);
  };
  /** disease typed but no catalog match → add as pending (code filled later) */
  const addPending = () => {
    const name = query.trim();
    if (!name) return;
    addDx({ icd10: "", termTh: name, termEn: "", rank: "secondary", source: "doctor", pending: true });
    setQuery("");
    setOpen(false);
  };
  const removeDx = (i: number) => commit(value.filter((_, idx) => idx !== i));

  /** Confirm an AI suggestion. The FIRST dx accepted becomes the primary (placed
   *  on top); every later accept goes below it as secondary, so the first stays
   *  primary regardless of order. */
  const acceptDx = (i: number) => {
    const target = { ...value[i], confirmed: true };
    const rest = value.filter((_, idx) => idx !== i);
    const hasPrimary = rest.some((d) => d.confirmed !== false && d.rank === "primary");
    commit(hasPrimary ? [...rest, target] : [target, ...rest]);
  };

  // AI suggestions are appended as UNCONFIRMED rows (confirmed:false) so they
  // live in the same draggable list immediately — no need to accept first.
  const runAi = async () => {
    setAiLoading(true);
    setAiEmpty(false);
    const sugg = await aiSuggestDiagnoses(patient, transcript);
    const fresh = sugg
      .filter((s) => !value.some((d) => d.icd10 === s.icd10))
      .map((s) => ({ ...s, rank: "secondary" as const, confirmed: false }));
    if (fresh.length) commit([...value, ...fresh]);
    else setAiEmpty(true);
    setAiLoading(false);
  };

  // Auto-suggest on first entry to the ICD-10 step — show AI picks immediately
  // (only when nothing's been chosen yet, so revisits don't re-run).
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (value.length === 0) runAi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const problemList = patient.diagnoses
    .map((d) => findIcd10(d.code))
    .filter((e): e is Icd10Entry => !!e)
    .filter((e) => !value.some((d) => d.icd10 === e.code));

  const primaryDx = value.find((d) => d.confirmed !== false && d.rank === "primary");

  return (
    <motion.div layout transition={{ type: "spring", stiffness: 350, damping: 34, mass: 0.8 }} className="shrink-0 rounded-[24px] bg-gradient-to-b from-white to-[#fff2ed] p-4">
      {/* header */}
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <IconClipboardPlus className="h-4 w-4 shrink-0 text-[#22202a]" stroke={2} />
          <h3 className="text-[16px] font-semibold text-[#22202a]">การวินิจฉัย ICD-10</h3>
        </div>
      )}

      {/* warning when no confirmed primary yet (no duplicate banner above search) */}
      {!primaryDx && (
        <div className="mt-4 flex items-center gap-1.5 rounded-[12px] bg-[#e1a325]/[0.12] px-3 py-2 text-[12px] font-semibold text-[#a9741a]">
          <IconAlertTriangle className="h-4 w-4 shrink-0" stroke={2} />
          ต้องระบุการวินิจฉัยหลัก อย่างน้อย 1 รายการก่อนปิดการตรวจ
        </div>
      )}

      {/* search — pill input */}
      <div ref={boxRef} className="relative mt-4">
        <div className="flex h-12 items-center justify-between gap-2 rounded-[40px] border border-[#9db6fb] bg-white pl-6 pr-2 transition focus-within:border-[#3965e1]">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (results[0]) addEntry(results[0], "doctor");
                else addPending();
              }
            }}
            placeholder="ค้นชื่อโรค (ไทย/อังกฤษ) หรือรหัส ICD-10"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[#1f1f1f] outline-none placeholder:text-[#1f1f1f]/60"
          />
          <span className="grid size-10 shrink-0 place-items-center rounded-full text-[#3965e1]">
            <IconSearch className="h-5 w-5" stroke={2} />
          </span>
        </div>
        {open && query.trim() && (
          <div className="absolute inset-x-0 top-[calc(100%+4px)] z-50 max-h-[240px] overflow-y-auto rounded-[16px] border border-black/10 bg-white py-1 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
            {results.length > 0 ? (
              results.map((e) => (
                <button
                  key={e.code}
                  type="button"
                  onClick={() => addEntry(e, "doctor")}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-[#3965e1]/[0.06]"
                >
                  <span className="w-[58px] shrink-0 text-[12px] font-bold tabular-nums text-[#3965e1]">{e.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[#22202a]">{e.termTh}</span>
                    {e.termEn && e.termEn !== e.termTh && (
                      <span className="block truncate text-[11px] text-black/40">{e.termEn}</span>
                    )}
                  </span>
                  {e.system && e.system !== "ICD-10-TM" && (
                    <span
                      className="shrink-0 rounded-[6px] bg-[#e1a325]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#a9741a]"
                      title="รหัสอ้างอิงจากต่างประเทศ — ไม่ใช่ ICD-10-TM สำหรับเบิกจ่ายไทย"
                    >
                      {e.system} · อ้างอิง
                    </span>
                  )}
                  <IconPlus className="h-4 w-4 shrink-0 text-black/30" stroke={2.2} />
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={addPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-black/55 transition hover:bg-[#e1a325]/[0.08]"
              >
                <IconPlus className="h-4 w-4 shrink-0 text-[#e1a325]" stroke={2.2} />
                เพิ่ม “{query.trim()}” แบบรอระบุรหัส (ให้เจ้าหน้าที่ coding เติมภายหลัง)
              </button>
            )}
          </div>
        )}
      </div>

      {/* AI ran but found nothing usable */}
      {aiEmpty && !aiLoading && (
        <div className="mt-4 flex items-center gap-1.5 rounded-[12px] bg-black/[0.03] px-3 py-2 text-[12px] text-black/45">
          <IconSparkles className="h-4 w-4 shrink-0" stroke={2} />
          AI ยังเสนอไม่ได้ — ลองค้นรหัสเอง หรือซักประวัติเพิ่ม
        </div>
      )}

      {/* diagnosis list — every row is drag-reorderable & editable. AI
          suggestions sit here too (confirmed:false) so they drag immediately;
          ✓ confirms them, ✕ dismisses. Reorder.Items MUST be direct children of
          Reorder.Group (no AnimatePresence wrapper) or drag tracking breaks. */}
      {value.length > 0 && (
        <Reorder.Group as="div" axis="y" values={value} onReorder={commit} className="mt-4 flex flex-col gap-2">
          {value.map((d, i) => {
            const pending = d.confirmed === false;
            return editIdx === i ? (
              <DxEditRow
                key={dxKey(d.icd10, d.termTh)}
                dx={d}
                onSave={(next) => updateDx(i, next)}
                onCancel={() => setEditIdx(null)}
              />
            ) : (
              <DxReorderRow
                key={dxKey(d.icd10, d.termTh)}
                dx={d}
                index={i}
                pending={pending}
                onConfirm={() => acceptDx(i)}
                onEdit={pending ? undefined : () => setEditIdx(i)}
                onRemove={() => removeDx(i)}
              />
            );
          })}
        </Reorder.Group>
      )}

      {/* + add via AI — dashed add-row at the bottom of the list */}
      <button
        type="button"
        onClick={runAi}
        disabled={aiLoading}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#3965e1]/40 bg-white py-2.5 text-[13px] font-bold text-[#3965e1] transition hover:border-[#3965e1] hover:bg-[#3965e1]/[0.06] active:scale-[0.99] disabled:opacity-60"
      >
        {aiLoading ? <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} /> : <IconPlus className="h-4 w-4" stroke={2.4} />}
        {aiLoading ? "กำลังให้ AI วิเคราะห์…" : "ให้ AI ช่วยแนะนำ"}
      </button>

      {/* comorbidity quick-add from the chronic problem list */}
      {problemList.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-black/40">โรคประจำตัว:</span>
          {problemList.map((e) => (
            <button
              key={e.code}
              type="button"
              onClick={() => addEntry(e, "problem-list", false)}
              className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[12px] font-semibold text-black/60 transition hover:border-[#3965e1]/40 hover:text-[#3965e1]"
            >
              <IconPlus className="h-3 w-3" stroke={2.4} />
              {e.termTh} <span className="tabular-nums text-black/35">{e.code}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/** Shared chrome for the วินิจฉัย & วางแผน steps — green band + Dr.Note mascot +
 *  wave + title, an A4 "อ่าน transcript" note, the white container, and the
 *  transcript overlay. `children` is the step body, `footer` the action row. */
/** A4-style note card for the medical certificate, sitting beside the visit
 *  summary note. Click opens a read-only preview of the signed/draft cert. */
function CertNoteCard({ cert, patient, onSign }: { cert: MedicalCert; patient: Patient; onSign?: (c: MedicalCert) => void }) {
  const { user } = useUser();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const patientName = `${patient.prefix}${patient.firstName} ${patient.lastName}`;
  const licenseNo = user.providerId ?? "—";
  const licenseDisplay = licenseNo === "—" ? "—" : /^ว/.test(licenseNo) ? licenseNo : `ว.${licenseNo}`;
  const tpl = CERT_TEMPLATE_BY_ID[cert.template];
  const canSign = licenseNo !== "—" && !!cert.diagnosis && (!tpl.usesRest || (cert.restDays > 0 && !!cert.restFrom));

  const sign = () => {
    if (!canSign) {
      toast.error("ลงนามไม่ได้", "ข้อมูลใบรับรองยังไม่ครบ");
      return;
    }
    const signedAt = new Date().toISOString();
    const next: MedicalCert = { ...cert, signed: true, signedBy: user.name, licenseNo, signedAt };
    logCertIssuance({ hn: patient.hn, patientName, template: cert.template, diagnosis: cert.diagnosis, signedBy: user.name, licenseNo, signedAt });
    onSign?.(next);
    toast.success("ลงนามใบรับรองแพทย์แล้ว", `HN ${patient.hn}`);
  };

  return (
    <>
      {/* Front of the stack — covers the summary note. Entrance/exit motion is
          handled by the AnimatePresence wrapper in PlanStepShell. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group/cert absolute inset-0 flex h-[212px] w-[150px] flex-col gap-1.5 overflow-hidden rounded-[6px] rounded-tr-none bg-white p-2.5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.16)] transition-transform duration-300 ease-out"
      >
        <span aria-hidden className="absolute right-0 top-0 h-5 w-5 bg-[#3EAF3F] transition-all duration-200 ease-out group-hover/cert:h-7 group-hover/cert:w-7" />
        <span
          aria-hidden
          className="absolute right-0 top-0 h-5 w-5 transition-all duration-200 ease-out group-hover/cert:h-7 group-hover/cert:w-7"
          style={{ background: "linear-gradient(135deg, #b6b9bf 0%, #dadce0 45%, #ffffff 100%)", clipPath: "polygon(-2% -2% , 102% 102%, -2% 102%)" }}
        />
        <span className="pr-4 text-[11px] font-bold leading-tight text-[#1f7a43]">ใบรับรองแพทย์</span>
        <span className="h-px w-full bg-[#1f9d52]/30" />
        <span className="w-full rounded-full border border-[#1f9d52] py-1 text-center text-[12px] font-bold text-[#1f7a43] transition-colors group-hover/cert:bg-[#1f9d52] group-hover/cert:text-white">
          อ่าน
        </span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
            <div className="flex max-h-[92vh] w-full max-w-[420px] flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex shrink-0 items-center justify-between text-white">
                <h3 className="text-[15px] font-bold">ใบรับรองแพทย์</h3>
                <button type="button" onClick={() => setOpen(false)} aria-label="ปิด" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25">
                  <IconX className="h-5 w-5" stroke={2} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <CertPreview
                  c={cert}
                  patientName={patientName}
                  hospital="โรงพยาบาลตัวอย่าง"
                  doctorName={user.name}
                  licenseNo={licenseDisplay}
                  signatureUrl={user.signatureUrl}
                />
              </div>
              {cert.signed ? (
                <button
                  type="button"
                  onClick={() => toast.success("ส่งใบรับรองเข้าคิวพิมพ์แล้ว", `HN ${patient.hn}`)}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[#3965e1] py-2.5 text-[13px] font-bold text-white transition hover:brightness-110"
                >
                  <IconPrinter className="h-4 w-4" stroke={2.2} /> พิมพ์
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canSign}
                  onClick={sign}
                  className={[
                    "flex shrink-0 items-center justify-center gap-2 rounded-[14px] py-2.5 text-[13px] font-bold transition",
                    canSign ? "bg-[#1f9d52] text-white hover:brightness-110" : "cursor-not-allowed bg-white/30 text-white/60",
                  ].join(" ")}
                >
                  <IconSignature className="h-4 w-4" stroke={2.2} /> ลงลายเซ็น
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function PlanStepShell({
  transcript,
  title,
  mascot = DRNOTE_READY,
  mascotClassName = "left-2",
  accent = "#3EAF3F",
  wave = PLAN_WAVE,
  confetti = false,
  expanded = false,
  onToggleExpand,
  certSlot,
  children,
  footer,
}: {
  transcript: TranscriptData;
  title: string;
  mascot?: string;
  mascotClassName?: string;
  accent?: string;
  wave?: string;
  confetti?: boolean;
  certSlot?: React.ReactNode;
  expanded?: boolean;
  onToggleExpand?: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [hpiShow, setHpiShow] = useState(true);
  return (
    <motion.div
      initial={{ backgroundColor: "#3965e1" }}
      animate={{ backgroundColor: accent }}
      transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
      className="relative flex h-full min-h-0 flex-col rounded-[24px]"
    >
      {/* Dr.Note mascot tucked in the band */}
      <img
        src={mascot}
        alt=""
        className={`pointer-events-none absolute top-2 z-20 h-32 w-auto object-contain ${mascotClassName}`}
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, #000 64%, transparent 94%)",
          maskImage: "linear-gradient(to bottom, #000 64%, transparent 94%)",
        }}
      />
      {confetti && <SuccessConfetti />}
      {/* Green header band — decorative wave + title */}
      <div className="relative z-10 flex h-[72px] shrink-0 items-center overflow-hidden rounded-t-[24px] pl-[120px] pr-[150px]">
        {/* decorative wave — coloured to match the band (`wave` matches `accent`) */}
        <img src={wave} alt="" className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[150px] w-full object-cover opacity-90" />
        <motion.div
          className="relative z-10 flex flex-col items-start gap-1 text-white"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
        >
          <img src={PLAN_HEADER_ICON} alt="" className="h-8 w-8" />
          <span className="text-[13px] font-bold leading-none">{title}</span>
        </motion.div>
      </div>
      {/* Expand/collapse the panel over the model — flush to the right edge */}
      {onToggleExpand && (
        <Tooltip content={expanded ? "ย่อกลับ" : "ขยายเต็มพื้นที่"} placement="left" delay={200} closeDelay={0}>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? "ย่อ" : "ขยายเต็มพื้นที่"}
            style={{ color: accent }}
            className="absolute right-0 top-[36px] z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-l-[16px] bg-white transition hover:bg-slate-100"
          >
            {expanded ? <IconLayoutSidebarRightCollapse className="h-5 w-5" stroke={2} /> : <IconLayoutSidebarRightExpand className="h-5 w-5" stroke={2} />}
          </button>
        </Tooltip>
      )}
      {/* Note cards — when a certificate exists it covers the summary note;
          hovering the group fans the covered summary out to the left. */}
      <div className="group/notes absolute right-[56px] top-3 z-20 h-[212px] w-[150px]">
        {/* Summary note — front when alone; slides BEHIND (covered) + fans left
            on hover when a certificate is stacked on top. */}
        <div
          className={
            certSlot
              ? "absolute inset-0 z-10 -translate-x-3 translate-y-1.5 -rotate-3 scale-[0.97] transition-transform duration-300 ease-out group-hover/notes:translate-x-[-164px] group-hover/notes:translate-y-0 group-hover/notes:rotate-0 group-hover/notes:scale-100"
              : "absolute inset-0 z-20"
          }
        >
          <motion.button
            type="button"
            onClick={() => setShowTranscript(true)}
            initial={{ opacity: 0, y: 96 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="group/sum absolute inset-0 flex h-[212px] w-[150px] flex-col gap-1.5 overflow-hidden rounded-[6px] rounded-tr-none bg-white p-2.5 text-left shadow-[0_2px_10px_rgba(0,0,0,0.12)]"
          >
            {/* dim veil while covered behind the certificate; clears as it fans */}
            {certSlot && (
              <span aria-hidden className="pointer-events-none absolute inset-0 z-20 bg-black/12 backdrop-blur-[1px] transition-opacity duration-300 ease-out group-hover/notes:opacity-0" />
            )}
            <span
              aria-hidden
              className="absolute right-0 top-0 h-5 w-5 transition-all duration-200 ease-out group-hover/sum:h-7 group-hover/sum:w-7"
              style={{ backgroundColor: accent }}
            />
            <span
              aria-hidden
              className="absolute right-0 top-0 h-5 w-5 transition-all duration-200 ease-out group-hover/sum:h-7 group-hover/sum:w-7"
              style={{
                background: "linear-gradient(135deg, #b6b9bf 0%, #dadce0 45%, #ffffff 100%)",
                clipPath: "polygon(-2% -2% , 102% 102%, -2% 102%)",
              }}
            />
            <span className="pr-4 text-[11px] font-bold leading-tight text-[#3965e1]">สรุปการบันทึกผู้ป่วย</span>
            <span className="h-px w-full bg-[#3965e1]/30" />
            <span className="w-full rounded-full border border-[#3965e1] py-1 text-center text-[12px] font-bold text-[#3965e1] transition-colors group-hover/sum:bg-[#3965e1] group-hover/sum:text-white">อ่าน</span>
          </motion.button>
        </div>

        {/* Certificate note — front of the stack (covers the summary). Slides
            in when added, slides DOWN out when removed. */}
        <AnimatePresence>
          {certSlot && (
            <motion.div
              key="cert-note"
              className="absolute inset-0 z-20"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              {certSlot}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* White container — step body + footer + transcript overlay */}
      <div className="relative z-30 mt-2 flex min-h-0 flex-1 flex-col gap-2 rounded-[24px] bg-white p-3">
        {children}
        {footer}

        <AnimatePresence>
          {showTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0 z-40 flex flex-col rounded-[24px] bg-white p-3"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 pb-2">
                <h3 className="text-[15px] font-bold text-[#22202a]">Transcript บทสนทนา</h3>
                <button type="button" onClick={() => setShowTranscript(false)} aria-label="ปิด" className="grid h-9 w-9 place-items-center rounded-full text-black/55 transition hover:bg-black/5">
                  <IconX className="h-5 w-5" stroke={2} />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[16px] bg-white px-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                <TxSection icon={ChiefIcon} title="อาการสำคัญ" className="pt-1" speak={transcript.primaryText ? () => transcript.primaryText : undefined}>
                  {transcript.primaryText ? <p className="text-[14px] leading-relaxed text-[#22202a]">{transcript.primaryText}</p> : <p className="text-[13px] text-black/45">—</p>}
                </TxSection>
                <TxSection
                  icon={HpiIcon}
                  title="History of Present Illness (HPI)"
                  speak={transcript.hpi ? () => transcript.hpi : undefined}
                  accessory={transcript.hpiAnn.annotations.length ? <HpiHlControls ai={transcript.hpiAnn.ai} show={hpiShow} onToggle={() => setHpiShow((v) => !v)} /> : undefined}
                >
                  {transcript.hpi ? (
                    transcript.hpiAnn.annotations.length ? (
                      <HpiHighlighted hpi={transcript.hpi} annotations={transcript.hpiAnn.annotations} ai={transcript.hpiAnn.ai} show={hpiShow} hideControls className="text-[14px] leading-relaxed text-[#22202a]" />
                    ) : (
                      <p className="text-[14px] leading-relaxed text-[#22202a]">{transcript.hpi}</p>
                    )
                  ) : (
                    <p className="text-[13px] text-black/45">—</p>
                  )}
                </TxSection>
                <TxSection icon={HistoryIcon} title="ประวัติการเจ็บป่วย" speak={transcript.pastHistory.length ? () => transcript.pastHistory.join(". ") : undefined}>
                  {transcript.pastHistory.length > 0 ? (
                    <ul className="flex flex-col gap-1.5 text-[14px] leading-relaxed text-[#22202a]">
                      {transcript.pastHistory.map((h, i) => (
                        <li key={i} className="flex items-start gap-2"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-black/25" /><span className="flex-1">{h}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-black/45">—</p>
                  )}
                </TxSection>
                <TxSection icon={MedsIcon} title="ประวัติการใช้ยา" speak={transcript.meds.length ? () => transcript.meds.join(". ") : undefined}>
                  {transcript.meds.length > 0 ? (
                    <ul className="flex flex-col gap-1.5 text-[14px] leading-relaxed text-[#22202a]">
                      {transcript.meds.map((m, i) => (
                        <li key={i} className="flex items-start gap-2"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-black/25" /><span className="flex-1">{m}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-black/45">—</p>
                  )}
                </TxSection>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** Step 3 (การวินิจฉัย ICD-10) — reuses the plan-step shell; the body is the
 *  diagnosis picker. Proceeds to the plan step, drafting the plan (button load). */
function DiagnosisPanel({
  patient,
  transcript,
  diagnoses,
  onDiagnosesChange,
  onResume,
  onProceed,
  expanded = false,
  onToggleExpand,
}: {
  patient: Patient;
  transcript: TranscriptData;
  diagnoses: EncounterDx[];
  onDiagnosesChange: (next: EncounterDx[]) => void;
  onResume: () => void;
  onProceed: () => Promise<void>;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const [planning, setPlanning] = useState(false);
  const hasPrimary = diagnoses.some((d) => d.confirmed !== false && d.rank === "primary");
  return (
    <PlanStepShell
      transcript={transcript}
      title="การวินิจฉัย ICD-10"
      mascot={DRNOTE_DIAGNOSIS}
      mascotClassName="left-5"
      accent="#F68209"
      wave={PLAN_WAVE_ORANGE}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      footer={
        <div className="flex shrink-0 gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="flex flex-1 items-center justify-center gap-2 rounded-[16px] border border-[#d9d9d9] bg-white py-3.5 text-[14px] font-bold text-[#3965e1] transition hover:bg-slate-100"
          >
            <IconChevronLeft className="h-5 w-5" stroke={2} />
            ซักประวัติต่อ
          </button>
          <button
            type="button"
            disabled={planning || !hasPrimary}
            onClick={async () => {
              if (planning) return;
              setPlanning(true);
              await onProceed();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-[16px] bg-[#3965e1] py-3.5 text-[14px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {planning ? (
              <>
                <IconLoader2 className="h-5 w-5 animate-spin" stroke={2} />
                กำลังสร้างแผนการรักษา…
              </>
            ) : (
              <>
                <IconClipboardPlus className="h-5 w-5" stroke={2} />
                วางแผนการรักษา
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <DxSection patient={patient} value={diagnoses} onChange={onDiagnosesChange} transcript={transcript} />
      </div>
    </PlanStepShell>
  );
}

function PlanDraftPanel({
  patient,
  plan,
  transcript,
  diagnoses,
  onResume,
  expanded = false,
  onToggleExpand,
}: {
  patient: Patient;
  plan: TreatmentPlan;
  transcript: TranscriptData;
  diagnoses: EncounterDx[];
  onResume: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const toast = useToast();
  // Only confirmed diagnoses flow downstream (unconfirmed AI suggestions don't).
  const primaryDx = diagnoses.find((d) => d.confirmed !== false && d.rank === "primary");
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState<PlanTab>("med");
  const [draft, setDraft] = useState<TreatmentPlan>(plan);
  // Re-sync the editable copy when a freshly generated plan arrives.
  useEffect(() => {
    setDraft(plan);
  }, [plan]);

  return (
    <PlanStepShell
      transcript={transcript}
      title="สรุปแผนการรักษา"
      confetti
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      certSlot={draft.cert && draft.cert.template !== "none" ? <CertNoteCard cert={draft.cert} patient={patient} onSign={(c) => setDraft((d) => ({ ...d, cert: c }))} /> : null}
      footer={
        editing ? (
          <div className="flex shrink-0 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setDraft(plan);
                setEditing(false);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-[16px] border border-[#d9d9d9] bg-white py-3.5 text-[14px] font-bold text-black/55 transition hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                toast.success("บันทึกแบบร่างแผนแล้ว", `HN ${patient.hn}`);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-[16px] bg-[#3965e1] py-3.5 text-[14px] font-bold text-white transition hover:brightness-110"
            >
              <IconCheck className="h-5 w-5" stroke={2.2} />
              เสร็จสิ้น
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="flex flex-1 items-center justify-center gap-2 rounded-[16px] border border-[#d9d9d9] bg-white py-3.5 text-[14px] font-bold text-[#3965e1] transition hover:bg-slate-100"
            >
              <IconChevronLeft className="h-5 w-5" stroke={2} />
              กลับไปวินิจฉัย
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-[16px] bg-[#3965e1] py-3.5 text-[14px] font-bold text-white transition hover:brightness-110"
            >
              <img src={PLAN_EDIT_ICON} alt="" className="h-5 w-5 [filter:brightness(0)_invert(1)]" />
              แก้ไขแผนการรักษา
            </button>
          </div>
        )
      }
    >
        {/* AI-generated warning */}
        <div className="flex shrink-0 items-center gap-2 rounded-[12px] bg-[#e1a325] px-3 py-2">
          <img src={PLAN_WARN_ICON} alt="" className="h-5 w-5 shrink-0" />
          <p className="text-[14px] font-semibold text-white">รายการถูกสร้างโดย AI โปรดตรวจสอบอย่างละเอียดอีกที</p>
        </div>

        {/* Treatment plan — grouped view, or an editable table when editing */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[16px] bg-white px-0 pb-2.5 pt-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <h3 className="mb-2 text-[14px] font-semibold text-black/60">แบบร่างแผนการรักษา</h3>
          {editing ? (
            <PlanEditor draft={draft} setDraft={setDraft} tab={editTab} setTab={setEditTab} primaryDx={primaryDx} patient={patient} />
          ) : (
            <PlanView plan={draft} primaryDx={primaryDx} />
          )}
        </div>

    </PlanStepShell>
  );
}

// ── CENTER: body model ──────────────────────────────────────────────────────

/** logical icon key (pain-character + finding-type) → Tabler icon component. */
const FINDING_ICON: Record<string, typeof IconCircle> = {
  // pain characters
  circle: IconCircle,
  pinch: IconArrowsMinimize,
  spiral: IconRotateClockwise2,
  flame: IconFlame,
  pin: IconNeedle,
  bolt: IconBolt,
  heartbeat: IconHeartbeat,
  // finding types
  pain: IconActivity,
  swelling: IconArrowsMaximize,
  rash: IconGrain,
  bruise: IconDropletFilled,
  wound: IconBandage,
  mass: IconCircleDot,
  numbness: IconHandStop,
  weakness: IconBattery2,
  deformity: IconBone,
};

/** Screen-space symptom callouts. Lives OUTSIDE the ZoomPan transform: it maps
 *  each region's content point to viewport coordinates using the live transform,
 *  pins the labels to the panel's left/right edges, and draws a leader line to
 *  the region — so the labels stay fully visible at every zoom/pan. */
function SymptomCallouts({
  items,
  tf,
  contentAspect,
  contentMaxHeight,
  vb,
}: {
  items: BodyAnnotation[];
  tf: { scale: number; x: number; y: number; width: number; height: number };
  contentAspect: number;
  contentMaxHeight: number;
  vb: { width: number; height: number };
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offx: number; offy: number } | null>(null);
  const [drag, setDrag] = useState<Record<string, { x: number; y: number }>>({});
  const { width: cw, height: ch, scale, x: tx, y: ty } = tf;
  if (!cw || !ch || !items.length) return null;
  const figH = Math.min(ch, contentMaxHeight);
  const figW = figH * contentAspect;
  const LW = 138;
  const PAD = 6;
  const GAP = 44;
  const ROW = 38;

  const pos = items
    .map((a) => {
      const r = BODY_REGION_BY_ID[a.id];
      if (!r) return null;
      const s = r.shape;
      const cx = s.kind === "ellipse" ? s.cx : s.x + s.w / 2;
      const cy = s.kind === "ellipse" ? s.cy : s.y + s.h / 2;
      const vx = cx / vb.width;
      const vy = cy / vb.height;
      const rx = (cw - figW) / 2 + vx * figW;
      const ry = (ch - figH) / 2 + vy * figH;
      const sx = cw / 2 + (rx - cw / 2) * scale + tx;
      const sy = ch / 2 + (ry - ch / 2) * scale + ty;
      return { a, sx, sy, side: vx < 0.5 ? ("left" as const) : ("right" as const) };
    })
    .filter(Boolean) as { a: BodyAnnotation; sx: number; sy: number; side: "left" | "right" }[];

  const lay = (side: "left" | "right") => {
    const list = pos.filter((p) => p.side === side).sort((a, b) => a.sy - b.sy);
    let prev = -Infinity;
    return list.map((p) => {
      const y = Math.min(ch - ROW - 8, Math.max(8, Math.max(p.sy - ROW / 2, prev + GAP)));
      prev = y;
      return { ...p, ly: y };
    });
  };
  const placed = [...lay("left"), ...lay("right")];

  // Manual drag positions per annotation (top-left of the label box). When set
  // they override the auto layout so the doctor can reposition callouts.
  const boxOf = (p: { a: BodyAnnotation; side: "left" | "right"; ly: number }) => {
    const d = drag[p.a.id];
    if (d) return { x: d.x, y: d.y };
    return { x: p.side === "left" ? PAD : cw - PAD - LW, y: p.ly };
  };
  const boxes = placed.map((p) => ({ ...p, box: boxOf(p) }));

  const onDown = (e: React.PointerEvent, id: string, bx: number, by: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { id, offx: e.clientX - rect.left - bx, offy: e.clientY - rect.top - by };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const dr = dragRef.current;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!dr || !rect) return;
    const x = Math.max(2, Math.min(cw - LW - 2, e.clientX - rect.left - dr.offx));
    const y = Math.max(2, Math.min(ch - ROW - 2, e.clientY - rect.top - dr.offy));
    setDrag((m) => ({ ...m, [dr.id]: { x, y } }));
  };
  const onUp = () => { dragRef.current = null; };

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[3]">
      <svg className="absolute inset-0" width={cw} height={ch}>
        {boxes.map(({ a, sx, sy, box }) => {
          const color = a.color ?? "var(--theme-primary)";
          const ey = box.y + ROW / 2;
          const ex = box.x + LW / 2 < sx ? box.x + LW : box.x; // connect the edge facing the body
          return (
            <g key={`l-${a.id}`}>
              <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={1.4} />
              <circle cx={sx} cy={sy} r={4} fill={color} stroke="#fff" strokeWidth={1.4} />
            </g>
          );
        })}
      </svg>
      {boxes.map(({ a, box }) => {
        const color = a.color ?? "var(--theme-primary)";
        return (
          <div
            key={`t-${a.id}`}
            className="pointer-events-auto absolute flex cursor-grab flex-col items-start text-left active:cursor-grabbing"
            style={{ left: box.x, top: box.y, width: LW, touchAction: "none" }}
            onPointerDown={(e) => onDown(e, a.id, box.x, box.y)}
            onPointerMove={onMove}
            onPointerUp={onUp}
          >
            <span
              style={{
                background: "#fff",
                border: `1.5px solid ${color}`,
                borderRadius: 9,
                padding: "3px 8px",
                fontSize: 12,
                fontWeight: 700,
                color: "#22202a",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                maxWidth: LW,
              }}
            >
              {a.label}
            </span>
            {a.sub && (
              <span style={{ marginTop: 2, fontSize: 11, fontWeight: 600, color, maxWidth: LW }}>{a.sub}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ModelPanel({
  patient: p,
  info,
  liveFindings,
  liveRegions,
  liveHpi,
  recording,
  symptomPlot,
}: {
  patient: Patient;
  info: ConditionInfo;
  liveFindings?: Finding[];
  liveRegions?: Partial<Record<BodyRegionId, number>>;
  /** HPI narrative — pain character + NRS shown on the model are derived from
   *  this so they match what the HPI actually says (while taking history). */
  liveHpi?: string;
  /** Whether the Dr.Note recording is in progress. After it stops, the model
   *  shows leader-line callouts summarising the mapped symptoms. */
  recording?: boolean;
  /** Curated symptom summary (region + phrase) plotted after recording stops. */
  symptomPlot?: SymptomPlotItem[];
}) {
  // visit timeline — pick a date to track findings across visits
  const visits = p.recentVisits;
  const [visitIdx, setVisitIdx] = useState(0);
  const visit = visits[visitIdx];
  const o = visit?.opqrst;

  // Clinical photos pinned to body regions (nurse photographs a wound, etc.),
  // grouped by region across all visits so the viewer can back-track in time.
  const photosByRegion = useMemo(() => {
    const m = new Map<BodyRegionId, RegionPhoto[]>();
    visits.forEach((vt, i) =>
      (vt.attachments ?? []).forEach((a) => {
        const arr = m.get(a.region as BodyRegionId) ?? [];
        arr.push({ date: vt.date, visitIdx: i, label: a.label, url: a.url, note: a.note });
        m.set(a.region as BodyRegionId, arr);
      }),
    );
    return m;
  }, [visits]);
  const currentPhotoRegions = useMemo(
    () => [...new Set((visit?.attachments ?? []).map((a) => a.region as BodyRegionId))],
    [visit],
  );
  const [photoRegion, setPhotoRegion] = useState<BodyRegionId | null>(null);

  // Live transcript region-mapping wins while taking history (model highlights +
  // auto-zooms to where the patient says it hurts); otherwise the stored visit.
  const { highlights: visitHighlights, loading } = useSymptomBodyRegions(visit, p, info);
  const isLive = !!liveRegions && Object.keys(liveRegions).length > 0;
  const highlights = isLive ? liveRegions : visitHighlights;
  const [selected, setSelected] = useState<BodyRegionId | null>(null);
  const [view, setView] = useState<"front" | "back">("front");
  const frontCount = Object.keys(highlights).length;
  // Scale the heat so the strongest region matches the recorded NRS severity
  // → the green→red hue on the model lines up with the severity meter.
  const scaledHighlights = useMemo(() => {
    if (isLive) return highlights; // live intensities are already absolute
    const sev = o?.severity;
    if (sev == null) return highlights;
    const vals = Object.values(highlights);
    const max = vals.length ? Math.max(...vals) : 0;
    if (max <= 0) return highlights;
    const k = sev / 10 / max;
    return Object.fromEntries(
      Object.entries(highlights).map(([id, v]) => [id, Math.min(1, v * k)]),
    ) as typeof highlights;
  }, [highlights, o, isLive]);

  // Auto-zoom target — centre of the strongest symptom region (viewBox-normalised)
  const focus = useMemo(() => {
    const entries = Object.entries(highlights) as [BodyRegionId, number][];
    if (!entries.length) return null;
    const [id] = entries.reduce((m, e) => (e[1] > m[1] ? e : m));
    const r = BODY_REGION_BY_ID[id];
    if (!r) return null;
    const s = r.shape;
    const cx = s.kind === "ellipse" ? s.cx : s.x + s.w / 2;
    const cy = s.kind === "ellipse" ? s.cy : s.y + s.h / 2;
    return { vx: cx / BODY_VIEWBOX.width, vy: cy / BODY_VIEWBOX.height, scale: 1.85 };
  }, [highlights]);

  const maxIntensity = Math.max(0, ...Object.values(highlights));
  // Severity from the HPI narrative wins (matches what's written); fall back to
  // the visit's recorded NRS, then a heat-derived estimate.
  const hpiSeverity = liveHpi ? severityFromText(liveHpi) : null;
  const sevNum =
    hpiSeverity != null
      ? hpiSeverity
      : o?.severity != null
        ? o.severity
        : frontCount > 0
          ? Math.max(1, Math.round(maxIntensity * 10))
          : null;
  const severity = loading ? "กำลังวิเคราะห์อาการ…" : "ไม่พบบริเวณที่มีอาการ";

  // findings — live transcript mapping wins while the doctor is taking history;
  // otherwise fall back to the LLM classification of the selected visit.
  const { findings: visitFindings, loading: findingLoading } = useFindingAnalysis(visit, p, info);
  const findings = liveFindings && liveFindings.length > 0 ? liveFindings : visitFindings;
  const [selIdx, setSelIdx] = useState(0);
  useEffect(() => setSelIdx(0), [findings]);
  const current = findings[selIdx];
  // Pain character: prefer the one described in the HPI narrative so the label
  // matches the write-up; otherwise the finding's own classification.
  const hpiChar = liveHpi && painCharactersFromText(liveHpi).length ? painCharacterFromText(liveHpi) : null;
  const disp = hpiChar
    ? resolveFinding({ type: "pain", painCharacter: hpiChar })
    : current
      ? resolveFinding(current)
      : undefined;

  // After the recording stops, plot the CURATED symptom summary (a few key
  // findings from the history) as leader-line callouts — not one per region.
  // The figure zooms out so the labels are visible.
  const plot = symptomPlot ?? [];
  const annotating = recording === false && plot.length > 0;
  const annotations = useMemo<BodyAnnotation[]>(
    () => (annotating ? plot.map((s) => ({ id: s.id, label: s.label, sub: s.cause, color: disp?.fg })) : []),
    [annotating, plot, disp],
  );
  // Live ZoomPan transform → drives the screen-space callout overlay so the
  // labels stay fully visible (and a constant size) at every zoom/pan.
  const [tf, setTf] = useState({ scale: 1, x: 0, y: 0, width: 0, height: 0 });
  const zoomApi = useRef<ZoomApi | null>(null);
  const annoMaxH = annotating ? 440 : 560;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] bg-white p-5">
      {/* Body model = panel background. The zoomed figure overflows freely but
          is clipped to THIS card; white fades blend it under the controls. */}
      <div className="absolute inset-0 z-0 overflow-visible">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={`${view}-${visitIdx}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center overflow-visible"
          >
            <ZoomPan
              className="flex h-full w-full items-center justify-center overflow-visible"
              focus={view === "front" && !annotating ? focus : null}
              contentAspect={BODY_VIEWBOX.width / BODY_VIEWBOX.height}
              contentMaxHeight={annoMaxH}
              onTransform={setTf}
              apiRef={zoomApi}
            >
              <BodyMap
                view={view}
                selected={view === "front" ? selected : null}
                onSelect={view === "front" ? (id) => setSelected((cur) => (cur === id ? null : id)) : undefined}
                // Only tint the model when there's an actual localized symptom
                // (same signal as the "ไม่มีอาการเฉพาะที่" label). Chronic-disease
                // context alone (e.g. ความดันโลหิตสูง) must NOT colour the chest.
                highlights={view === "front" && disp ? scaledHighlights : undefined}
                highlightColor={view === "front" ? disp?.fg : undefined}
                photoRegions={view === "front" ? currentPhotoRegions : []}
                onPhotoClick={setPhotoRegion}
                className="h-full max-h-[560px]"
              />
            </ZoomPan>
          </motion.div>
        </AnimatePresence>

        {/* Faded edges so the model blends beneath the floating UI */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-32 rounded-t-[24px] bg-gradient-to-b from-white via-white/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 rounded-b-[24px] bg-gradient-to-t from-white via-white/85 to-transparent" />

        {/* Zoom controls — above the fade so they stay crisp */}
        <ZoomControls api={zoomApi} />

        {/* Symptom callouts — screen-space, always visible at any zoom/pan */}
        {view === "front" && annotating && (
          <SymptomCallouts
            items={annotations}
            tf={tf}
            contentAspect={BODY_VIEWBOX.width / BODY_VIEWBOX.height}
            contentMaxHeight={annoMaxH}
            vb={BODY_VIEWBOX}
          />
        )}
      </div>

      {/* Clinical-photo viewer (above everything) */}
      <AnimatePresence>
        {photoRegion && (
          <PhotoViewer
            region={photoRegion}
            photos={photosByRegion.get(photoRegion) ?? []}
            currentVisitIdx={visitIdx}
            onClose={() => setPhotoRegion(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Floating controls — top ── */}
      <div className="relative z-10 flex flex-col">
        {/* Visit-date tabs */}
        {visits.length > 1 && (
          <div className="flex gap-1 overflow-x-auto rounded-[28px] bg-[#ebebec] p-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {visits.map((v, i) => (
              <button
                key={`${v.date}-${i}`}
                type="button"
                onClick={() => setVisitIdx(i)}
                className={[
                  "min-w-[96px] flex-1 shrink-0 whitespace-nowrap rounded-[24px] px-3 py-1.5 text-center text-[12px] transition",
                  i === visitIdx
                    ? "bg-white font-semibold text-[#18181b] shadow-[0px_2px_8px_rgba(0,0,0,0.06)]"
                    : "font-medium text-[#71717a]",
                ].join(" ")}
              >
                {fmtThaiDate(v.date)}
                {i === 0 && " · ล่าสุด"}
              </button>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-2 self-start">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: disp?.bg ?? "#f1f5f9" }}
          >
            {findingLoading ? (
              <IconLoader2 className="h-5 w-5 animate-spin text-[#94a3b8]" stroke={2} />
            ) : disp ? (
              <disp.Icon className="h-5 w-5" stroke={2} style={{ color: disp.fg }} />
            ) : (
              <IconCircle className="h-5 w-5 text-[#94a3b8]" stroke={2} />
            )}
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-bold" style={{ color: disp?.fg ?? "#64748b" }}>
              {findingLoading ? "กำลังวิเคราะห์อาการ…" : disp?.label ?? "ไม่มีอาการเฉพาะที่"}
            </p>
            {!findingLoading && disp && sevNum != null && (
              <p className="text-[11px] text-black/50">ระดับ {sevNum}/10</p>
            )}
          </div>
        </div>

        {/* Finding chips */}
        {findings.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {findings.map((f, i) => {
              const d = resolveFinding(f);
              const active = i === selIdx;
              return (
                <button
                  key={`${f.type}-${f.painCharacter ?? ""}-${i}`}
                  type="button"
                  onClick={() => setSelIdx(i)}
                  className={[
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                    active ? "" : "bg-white/70 text-black/55 backdrop-blur-sm hover:bg-white",
                  ].join(" ")}
                  style={active ? { background: d.bg, color: d.fg } : undefined}
                >
                  <d.Icon className="h-3.5 w-3.5" stroke={2} style={active ? { color: d.fg } : undefined} />
                  {d.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Floating controls — bottom ── */}
      <div className="relative z-10 mt-auto flex flex-col items-center gap-1 pt-3">
        {selected && (
          <p className="text-center text-[11px] font-medium text-black/55">
            {BODY_REGION_BY_ID[selected].labelTh}
          </p>
        )}
        <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
          {(["front", "back"] as const).map((v) => {
            const active = view === v;
            const Icon = v === "front" ? IconUser : IconUserScan;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={[
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition",
                  active ? "bg-[#f2f2f2] text-[#22202a]" : "text-black/45",
                ].join(" ")}
              >
                <Icon
                  className="h-4 w-4"
                  stroke={2}
                  style={{ color: active ? "#22202a" : "#9ca3af" }}
                />
                {v === "front" ? "หน้า" : "หลัง"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** HeroUI-style segmented control. When tabs carry an `icon`, the active tab
 *  grows to show icon + label while the rest collapse to icon-only. */
function Segmented<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; icon?: React.ComponentType<{ className?: string; stroke?: number }> }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const hasIcons = tabs.some((t) => t.icon);
  return (
    <div className="flex w-full items-center gap-0.5 rounded-[28px] bg-[#ebebec] p-1">
      {tabs.map((t) => {
        const active = value === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            aria-label={t.label}
            className={[
              "flex items-center justify-center gap-1.5 rounded-[24px] px-3 py-1.5 text-center text-[13px] font-bold transition-[flex,background,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              // with icons: active grows (label shows), others collapse to icon
              hasIcons ? (active ? "flex-[2_1_0%]" : "flex-[1_1_0%]") : "flex-1",
              active ? "bg-white text-[#18181b] shadow-[0px_2px_8px_rgba(0,0,0,0.06)]" : "text-[#71717a]",
            ].join(" ")}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" stroke={2} />}
            {(active || !hasIcons) && <span className="truncate">{t.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Severity (NRS 0–10) → colour. Low = green, mid = amber, high = red. */
function severityColor(sev: number): string {
  const t = Math.max(0, Math.min(10, sev)) / 10;
  const hue = 140 - 140 * t; // 140° green → 0° red
  return `hsl(${hue}, 75%, 42%)`;
}

/** Pinch / scroll-wheel zoom + drag-pan container. Single-finger taps pass
 *  through to children (so region clicks keep working); panning only kicks in
 *  past a small move threshold while zoomed. */
function ZoomPan({
  children,
  className,
  focus,
  contentAspect = 1,
  contentMaxHeight,
  onScaleChange,
  onTransform,
  apiRef,
}: {
  children: React.ReactNode;
  className?: string;
  /** auto-zoom target — viewBox-normalised point (0..1) + scale */
  focus?: { vx: number; vy: number; scale: number } | null;
  /** rendered content width/height ratio (to locate the figure in the box) */
  contentAspect?: number;
  contentMaxHeight?: number;
  /** notified whenever the zoom scale changes (for zoom-aware overlays). */
  onScaleChange?: (scale: number) => void;
  /** notified with the full transform + element size — lets a screen-space
   *  overlay (symptom callouts) map content points to viewport coordinates. */
  onTransform?: (info: { scale: number; x: number; y: number; width: number; height: number }) => void;
  /** receives the zoom actions so controls can live outside this component
   *  (e.g. above the panel's fade overlay). */
  apiRef?: React.MutableRefObject<ZoomApi | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ scale: 1, x: 0, y: 0 });
  useEffect(() => onScaleChange?.(t.scale), [t.scale, onScaleChange]);
  // report transform + size to a zoom-aware overlay (re-runs on resize too)
  useEffect(() => {
    const el = ref.current;
    if (!el || !onTransform) return;
    const report = () => onTransform({ scale: t.scale, x: t.x, y: t.y, width: el.clientWidth, height: el.clientHeight });
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [t, onTransform]);
  const [panning, setPanning] = useState(false);
  const [autoAnim, setAutoAnim] = useState(false);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDist = useRef<number | null>(null);
  // single-pointer drag candidate → becomes a pan once it moves enough
  const down = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean; id: number } | null>(null);

  const clamp = useCallback((s: { scale: number; x: number; y: number }) => {
    const el = ref.current;
    const scale = Math.min(4, Math.max(1, s.scale));
    if (!el || scale === 1) return { scale, x: 0, y: 0 };
    const maxX = (el.clientWidth * (scale - 1)) / 2;
    const maxY = (el.clientHeight * (scale - 1)) / 2;
    return {
      scale,
      x: Math.min(maxX, Math.max(-maxX, s.x)),
      y: Math.min(maxY, Math.max(-maxY, s.y)),
    };
  }, []);

  // zoom by `factor` keeping the point (px,py — relative to element center) fixed
  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      setT((prev) => {
        const scale = Math.min(4, Math.max(1, prev.scale * factor));
        const k = scale / prev.scale;
        return clamp({ scale, x: px - (px - prev.x) * k, y: py - (py - prev.y) * k });
      });
    },
    [clamp],
  );

  // expose zoom actions so the controls can be rendered above the panel fade.
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      zoomIn: () => { setAutoAnim(false); zoomAt(1.25, 0, 0); },
      zoomOut: () => { setAutoAnim(false); zoomAt(1 / 1.25, 0, 0); },
      reset: () => { setAutoAnim(false); setT({ scale: 1, x: 0, y: 0 }); },
    };
    return () => { if (apiRef) apiRef.current = null; };
  }, [apiRef, zoomAt]);

  // native non-passive wheel listener so we can preventDefault the page zoom
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setAutoAnim(false);
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left - r.width / 2;
      const py = e.clientY - r.top - r.height / 2;
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, px, py);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Auto-zoom to the focus point (e.g. the symptom region) when it changes.
  useEffect(() => {
    const el = ref.current;
    if (!el || !focus) return;
    const id = requestAnimationFrame(() => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw || !ch) return;
      const figH = contentMaxHeight ? Math.min(ch, contentMaxHeight) : ch;
      const figW = figH * contentAspect;
      const regionX = (cw - figW) / 2 + focus.vx * figW;
      const regionY = (ch - figH) / 2 + focus.vy * figH;
      const ox = regionX - cw / 2;
      const oy = regionY - ch / 2;
      setAutoAnim(true);
      setT(clamp({ scale: focus.scale, x: -ox * focus.scale, y: -oy * focus.scale }));
    });
    return () => cancelAnimationFrame(id);
  }, [focus, clamp, contentAspect, contentMaxHeight]);

  const onPointerDown = (e: React.PointerEvent) => {
    setAutoAnim(false);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      down.current = null;
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    } else if (pointers.current.size === 1) {
      down.current = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y, moved: false, id: e.pointerId };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchDist.current != null) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = ref.current!.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - r.left - r.width / 2;
      const my = (a.y + b.y) / 2 - r.top - r.height / 2;
      zoomAt(dist / pinchDist.current, mx, my);
      pinchDist.current = dist;
      return;
    }

    const d = down.current;
    if (!d || d.id !== e.pointerId || t.scale === 1) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 5) {
      d.moved = true;
      setPanning(true);
      ref.current?.setPointerCapture(e.pointerId);
    }
    if (d.moved) setT((prev) => clamp({ ...prev, x: d.tx + dx, y: d.ty + dy }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
    if (down.current?.id === e.pointerId) {
      ref.current?.releasePointerCapture?.(e.pointerId);
      down.current = null;
      setPanning(false);
    }
  };

  const zoomed = t.scale > 1;

  return (
    <div
      ref={ref}
      className={`relative ${className ?? ""}`}
      style={{ touchAction: "none", cursor: panning ? "grabbing" : zoomed ? "grab" : "default" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => {
        setAutoAnim(false);
        setT({ scale: 1, x: 0, y: 0 });
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
          transformOrigin: "center center",
          transition: panning
            ? "none"
            : autoAnim
              ? "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)"
              : "transform 120ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface ZoomApi {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

/** Floating zoom controls — rendered separately from ZoomPan so it can sit
 *  ABOVE the panel's fade overlay (which would otherwise wash it out). */
function ZoomControls({ api }: { api: React.MutableRefObject<ZoomApi | null> }) {
  return (
    <div className="absolute bottom-2 right-2 z-[2] flex flex-col gap-1 rounded-full bg-white/90 p-1 shadow-[0_2px_8px_rgba(0,0,0,0.1)] ring-1 ring-black/5 backdrop-blur-sm">
      <Tooltip content="ขยาย" placement="left" delay={200} closeDelay={0}>
        <ZoomBtn onClick={() => api.current?.zoomIn()} aria-label="ขยาย">
          <IconPlus className="h-4 w-4" stroke={2} />
        </ZoomBtn>
      </Tooltip>
      <Tooltip content="ย่อ" placement="left" delay={200} closeDelay={0}>
        <ZoomBtn onClick={() => api.current?.zoomOut()} aria-label="ย่อ">
          <IconMinus className="h-4 w-4" stroke={2} />
        </ZoomBtn>
      </Tooltip>
      <Tooltip content="รีเซ็ต" placement="left" delay={200} closeDelay={0}>
        <ZoomBtn onClick={() => api.current?.reset()} aria-label="รีเซ็ต">
          <IconZoomReset className="h-4 w-4" stroke={2} />
        </ZoomBtn>
      </Tooltip>
    </div>
  );
}

const ZoomBtn = forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(
  function ZoomBtn({ children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        {...rest}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--theme-neutral)]/70 transition hover:bg-black/5 hover:text-[var(--theme-neutral)]"
      >
        {children}
      </button>
    );
  },
);

interface RegionPhoto {
  date: string;
  visitIdx: number;
  label: string;
  url: string;
  note?: string;
}

/** Photo viewer for a body region — shows the selected photo big and lets the
 *  doctor back-track through the same region's photos from earlier visits. */
function PhotoViewer({
  region,
  photos,
  currentVisitIdx,
  onClose,
}: {
  region: BodyRegionId;
  photos: RegionPhoto[];
  currentVisitIdx: number;
  onClose: () => void;
}) {
  // oldest → newest is nicer for a timeline; visitIdx 0 = latest visit.
  const ordered = useMemo(() => [...photos].sort((a, b) => b.visitIdx - a.visitIdx), [photos]);
  const [sel, setSel] = useState(() => {
    const i = ordered.findIndex((ph) => ph.visitIdx === currentVisitIdx);
    return i >= 0 ? i : ordered.length - 1;
  });
  const cur = ordered[sel];
  const regionLabel = BODY_REGION_BY_ID[region]?.labelTh ?? "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-20 flex flex-col rounded-[20px] bg-white/95 p-3 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">
            <IconCamera className="h-4 w-4" stroke={2} />
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-[#22202a]">รูปบริเวณ{regionLabel}</p>
            <p className="text-[11px] text-black/50">{ordered.length} ภาพ · เทียบย้อนหลังได้</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-black/50 transition hover:bg-black/5"
        >
          <IconX className="h-4 w-4" stroke={2} />
        </button>
      </div>

      {cur && (
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black/5">
            <img src={cur.url} alt={cur.label} className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
              {fmtThaiDate(cur.date)}
              {cur.visitIdx === 0 && " · ล่าสุด"}
            </span>
          </div>
          <p className="mt-1.5 text-[12px] font-semibold text-[#22202a]">{cur.label}</p>
          {cur.note && <p className="text-[11px] leading-snug text-black/55">{cur.note}</p>}
        </div>
      )}

      {ordered.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {ordered.map((ph, i) => (
            <button
              key={`${ph.visitIdx}-${i}`}
              type="button"
              onClick={() => setSel(i)}
              className={`relative shrink-0 overflow-hidden rounded-lg ring-2 transition ${i === sel ? "ring-[var(--theme-primary)]" : "ring-transparent"}`}
            >
              <img src={ph.url} alt="" className="h-12 w-12 object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 text-center text-[9px] font-medium text-white">
                {fmtThaiDate(ph.date).replace(/\s\d{2}$/, "")}
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/** Reveals text with a typewriter effect whenever it changes (e.g. the AI
 *  case-review blurb arrives). First mount shows the text instantly. */
function TypingText({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState(text);
  const [typing, setTyping] = useState(false);
  const prev = useRef(text);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      prev.current = text;
      setShown(text);
      return;
    }
    if (text === prev.current) return;
    prev.current = text;
    setTyping(true);
    setShown("");
    // frame-driven reveal: characters tracked against eased elapsed time so the
    // pace is smooth and consistent regardless of length
    const duration = Math.min(2600, Math.max(800, text.length * 13));
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) * (1 - p); // easeOutQuad
      setShown(text.slice(0, Math.floor(eased * text.length)));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setShown(text);
        setTyping(false);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return (
    <p className={className}>
      {shown}
      {typing && (
        <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-current align-baseline" />
      )}
    </p>
  );
}

// Text styling per highlight kind. Dark category-coloured text on a light
// marker tint keeps WCAG AA+ contrast (symptom 7.6:1 AAA, severity 6.0:1,
// allergy 5.6:1 — all on the marker-over-white background). Weight is a
// redundant, non-colour cue (severity = bold) so the meaning survives for
// colour-blind users and the highlight itself is the primary skim signal.
const HL_TEXT: Record<ReviewHighlight["kind"], string> = {
  symptom: "font-semibold text-[#1e3a8a]",
  severity: "font-bold text-[#991b1b]",
  allergy: "font-semibold text-[#92400e]",
};
const HL_MARKER: Record<ReviewHighlight["kind"], string> = {
  symptom: "rgba(57,101,225,0.22)",
  severity: "rgba(255,56,60,0.24)",
  allergy: "rgba(245,158,11,0.34)",
};

/** Renders the AI review text with key phrases (symptom / severity / allergy)
 *  highlighted so doctors can skim. Highlights are exact substrings of `text`,
 *  and each marker sweeps in left→right, one after another, like a person
 *  drawing highlighter strokes on paper. */
export function HighlightedReview({
  text,
  highlights,
  className,
}: {
  text: string;
  highlights: ReviewHighlight[];
  className?: string;
}) {
  const segments = useMemo(() => {
    const ranges: { start: number; end: number; kind: ReviewHighlight["kind"] }[] = [];
    for (const h of highlights) {
      const i = text.indexOf(h.text);
      if (i < 0) continue;
      const start = i;
      const end = i + h.text.length;
      if (ranges.some((r) => start < r.end && end > r.start)) continue; // drop overlaps
      ranges.push({ start, end, kind: h.kind });
    }
    ranges.sort((a, b) => a.start - b.start);
    const out: { text: string; kind?: ReviewHighlight["kind"] }[] = [];
    let cursor = 0;
    for (const r of ranges) {
      if (r.start > cursor) out.push({ text: text.slice(cursor, r.start) });
      out.push({ text: text.slice(r.start, r.end), kind: r.kind });
      cursor = r.end;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor) });
    return out;
  }, [text, highlights]);

  let markerOrder = 0; // sequential index across highlighted segments only
  return (
    // key by text so a new summary re-runs the highlighter animation from scratch
    <p key={text} className={className}>
      {segments.map((s, i) => {
        if (!s.kind) return <span key={i}>{s.text}</span>;
        const order = markerOrder++;
        return (
          <motion.span
            key={i}
            initial={{ backgroundSize: "0% 78%" }}
            animate={{ backgroundSize: "100% 78%" }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1], delay: 0.5 + order * 0.45 }}
            style={{
              backgroundImage: `linear-gradient(${HL_MARKER[s.kind]}, ${HL_MARKER[s.kind]})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "0 88%",
              borderRadius: 4,
              padding: "0 2px",
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            }}
            className={HL_TEXT[s.kind]}
          >
            {s.text}
          </motion.span>
        );
      })}
    </p>
  );
}

// ── RIGHT: about patient ────────────────────────────────────────────────────

/** Tracks whether a scroll container has more content below the fold. Re-checks
 *  on scroll, resize, and content-size changes. */
export function useScrollOverflow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [update]);
  return { ref, canScrollDown, onScroll: update };
}

export function AboutPanel({ patient: p, encounterDx = [] }: { patient: Patient; encounterDx?: EncounterDx[] }) {
  const [tab, setTab] = useState<"overview" | "dx" | "history" | "lab">("overview");
  const review = useAiCaseReview(p);
  const confirmedDx = encounterDx
    .filter((d) => d.confirmed !== false)
    .slice()
    .sort((a, b) => (a.rank === b.rank ? 0 : a.rank === "primary" ? -1 : 1));
  const ov = useScrollOverflow<HTMLDivElement>();
  const avatarUrl = `https://randomuser.me/api/portraits/${p.gender === "F" ? "women" : "men"}/${parseInt(p.hn.replace(/\D/g, "").slice(-2) || "0", 10) % 90}.jpg`;
  const drugAllergy = p.allergies.filter((a) => DRUG_ALLERGY_RE.test(a.substance));
  const foodAllergy = p.allergies.filter((a) => FOOD_ALLERGY_RE.test(a.substance));
  const abnormalLabs = p.labs.filter((l) => l.abnormal).slice(0, 3);
  const sinceDate = p.recentVisits.length ? fmtThaiDate(p.recentVisits[p.recentVisits.length - 1].date) : "";

  return (
    <div className="absolute inset-0 flex flex-col gap-4">
      {/* Patient header card */}
      <div className="shrink-0 rounded-[20px] bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <img src={avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-black/5" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-black/60">HN {p.hn}</p>
              <p className="truncate text-[15px] font-bold text-[#22202a]">
                {p.prefix}{p.firstName} {p.lastName}
              </p>
            </div>
          </div>
          <span className="shrink-0 self-start rounded-[10px] bg-black/5 px-2.5 py-1 text-[12px] font-semibold text-black/60">
            {INSURANCE_LABEL[p.insurance] ?? p.insurance}
          </span>
        </div>
        <div className="mt-2.5 flex items-stretch gap-4">
          <AboutField label="อายุ">
            {p.age} ปี{" "}
            <span className="text-[13px] font-semibold text-[#22202a]/60">{ageDetail(p.birthDate)}</span>
          </AboutField>
          <AboutField label="เพศ">{p.gender === "M" ? "ชาย" : "หญิง"}</AboutField>
          <AboutField label="หมู่เลือด">{p.bloodType}{p.rh}</AboutField>
        </div>
      </div>

      {/* Tabs */}
      <Segmented
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "overview", label: "ภาพรวม", icon: IconLayoutGrid },
          { key: "dx", label: "วินิจฉัย", icon: IconStethoscope },
          { key: "history", label: "ประวัติ", icon: IconHistory },
          { key: "lab", label: "ผล Lab", icon: IconTestPipe },
        ]}
      />

      {tab === "overview" ? (
        <>
          {/* AI case review card — fills the remaining height. No card padding
              so the abnormal-lab panel is full-bleed (Figma 1396-18849); the AI
              text block carries its own padding instead. Bottom fade + chevron
              hint when there's more to scroll. */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px]">
          <div
            ref={ov.ref}
            onScroll={ov.onScroll}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[24px] bg-white pt-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
          >
            <div className="flex flex-col gap-2 px-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-[14px] font-semibold text-black/60">
                  สรุปเคสโดย AI
                  {review.loading && <IconLoader2 className="h-3.5 w-3.5 animate-spin" stroke={2} />}
                  {review.blurb && <SpeakButton getText={() => review.blurb} />}
                </h3>
                {sinceDate && (
                  <span className="inline-flex items-center rounded-[12px] bg-black/5 px-3 py-1 text-[12px] font-semibold text-black/60">
                    ข้อมูลจาก {sinceDate} ถึงปัจจุบัน
                  </span>
                )}
              </div>
              <HighlightedReview
                text={review.blurb}
                highlights={review.highlights}
                className="text-[14px] font-normal leading-relaxed text-black"
              />
            </div>

            {/* Abnormal labs — gradient purple panel, flush to the card edges.
                grow → fills the gradient down to the bottom when content is short;
                shrink-0 → never shrinks below its content (the card has
                overflow-hidden, which would otherwise let flex shrink+clip the
                labs instead of letting the outer container scroll). */}
            <AbnormalLabsCard labs={abnormalLabs} className="grow shrink-0" />
          </div>
          {/* bottom fade + scroll-down hint — only when more content below */}
          <AnimatePresence>
            {ov.canScrollDown && (
              <>
                <motion.div
                  key="fade"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-9 rounded-b-[24px] bg-gradient-to-t from-white/55 via-white/15 to-transparent"
                />
                <motion.button
                  key="chevron"
                  type="button"
                  onClick={() => ov.ref.current?.scrollBy({ top: 240, behavior: "smooth" })}
                  aria-label="เลื่อนลง"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: [0, 4, 0] }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ y: { repeat: Infinity, duration: 1.3, ease: "easeInOut" }, opacity: { duration: 0.2 } }}
                  className="absolute bottom-3 left-1/2 z-20 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-white text-[#3965e1] shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition hover:bg-slate-50"
                >
                  <IconChevronDown className="h-5 w-5" stroke={2.2} />
                </motion.button>
              </>
            )}
          </AnimatePresence>
          </div>
        </>
      ) : tab === "dx" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-[24px] bg-white p-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <h3 className="text-[14px] font-semibold text-black/60">การวินิจฉัย (ICD-10)</h3>
          {confirmedDx.length > 0 ? (
            confirmedDx.map((d, i) => (
              <div key={`${d.icd10}-${i}`} className="flex items-center gap-2 rounded-[12px] bg-black/[0.02] p-2.5">
                <p className="min-w-0 flex-1 truncate text-[14px] text-[#22202a]">
                  {!d.pending && <span className="font-bold">{d.icd10}</span>}
                  {!d.pending && " "}
                  <span className={d.pending ? "font-bold" : ""}>{d.pending ? `${d.termTh} · รอระบุรหัส` : d.termTh}</span>
                </p>
                <span
                  className={[
                    "shrink-0 rounded-[8px] px-3 py-1 text-[10px] font-semibold",
                    d.rank === "primary" ? "bg-[#3965e1] text-white" : "bg-[#3965e1]/[0.08] text-[#3965e1]",
                  ].join(" ")}
                >
                  {d.rank === "primary" ? "หลัก" : "รอง"}
                </span>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-[13px] text-black/40">ยังไม่มีการวินิจฉัย — เพิ่มในขั้น “วินิจฉัยโรค”</p>
          )}
        </div>
      ) : tab === "history" ? (
        <>
          {/* Allergy / condition chips */}
          <div className="flex items-stretch gap-4">
            <InfoCell label="แพ้ยา" value={drugAllergy.map((a) => a.substance).join(", ") || "ไม่มี"} danger={drugAllergy.length > 0} />
            <InfoCell
              label="แพ้อาหาร"
              value={foodAllergy.map((a) => a.substance).join(", ") || "ไม่มี"}
              danger={foodAllergy.length > 0}
            />
            <InfoCell label="โรคประจำตัว" value={p.diagnoses[0]?.name.split(" (")[0] ?? "ไม่มี"} />
          </div>

          <InfoRow label="ประวัติการเจ็บป่วย" value={p.diagnoses.slice(1).map((d) => d.name).join(", ") || "ไม่มี"} />
          <InfoRow
            label="ประวัติการใช้ยา"
            value={p.medications.map((m) => `${m.drug} ${m.dose}`).join(", ") || "ไม่มี"}
          />
        </>
      ) : (
        <div className="rounded-[24px] bg-white p-4">
          <LabTable labs={p.labs} />
        </div>
      )}
    </div>
  );
}

function AboutField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <span className="text-[12px] font-semibold text-black/60">{label}</span>
      <span className="mt-0.5 text-[13px] font-bold text-[#22202a]">{children}</span>
    </div>
  );
}

function InfoCell({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`flex flex-1 flex-col rounded-[16px] px-4 py-2 ${danger ? "bg-[#ff383c]" : "bg-white"}`}>
      <p className={`text-[13px] font-semibold ${danger ? "text-white" : "text-black/60"}`}>{label}</p>
      <p className={`mt-0.5 truncate text-[14px] font-bold ${danger ? "text-white" : "text-[#22202a]"}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-white px-4 py-2">
      <p className="text-[13px] font-semibold text-black/60">{label}</p>
      <p className="mt-0.5 text-[14px] font-bold text-[#22202a]">{value}</p>
    </div>
  );
}

function LabTable({ labs }: { labs: Patient["labs"] }) {
  if (labs.length === 0) return <p className="text-[12px] text-[var(--theme-neutral)]/45">ไม่มีผลแลป</p>;
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--theme-neutral)]/10">
      <table className="w-full text-left text-[12px]">
        <thead className="bg-[var(--theme-base)]/40 text-[11px] uppercase text-[var(--theme-neutral)]/50">
          <tr>
            <th className="px-3 py-2 font-medium">การตรวจ</th>
            <th className="px-3 py-2 font-medium">ผล</th>
            <th className="px-3 py-2 font-medium">ค่าปกติ</th>
            <th className="px-3 py-2 font-medium">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {labs.map((l, i) => (
            <tr key={i} className="border-t border-[var(--theme-neutral)]/8">
              <td className="px-3 py-2.5 font-medium text-[var(--theme-neutral)]">{l.test}</td>
              <td className={`px-3 py-2.5 font-semibold tabular-nums ${l.abnormal ? "text-[var(--theme-danger)]" : "text-[var(--theme-neutral)]"}`}>
                {l.value} {l.unit}
              </td>
              <td className="px-3 py-2.5 text-[var(--theme-neutral)]/55">{l.referenceRange}</td>
              <td className="px-3 py-2.5">
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    l.abnormal ? "bg-[var(--theme-danger)]/10 text-[var(--theme-danger)]" : "bg-[var(--theme-success)]/10 text-[var(--theme-success)]",
                  ].join(" ")}
                >
                  {l.abnormal ? "ผิดปกติ" : "ปกติ"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function fmtThaiDate(yyyyMmDd: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(yyyyMmDd);
  if (!m) return yyyyMmDd;
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const be = Number(m[1]) + 543;
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${String(be).slice(-2)}`;
}
