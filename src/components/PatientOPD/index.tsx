import { useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { useState } from "react";
import {
  IconChevronLeft,
  IconDownload,
  IconHistory,
  IconScan,
  IconActivity,
  IconAlertCircle,
  IconMoodSmile,
  IconCircleCheck,
  IconAlertTriangle,
  IconArrowUpRight,
  IconUser,
  IconCalendar,
  IconStethoscope,
  IconPill,
  IconSparkles,
  IconLoader2,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";
import { chatJSON } from "../../services/ai/llm";
import { PATIENTS, type Patient } from "../../data/mock/patients";
import { getPatient } from "../../data/patientStore";
import type { Patient as StoredPatient } from "../../types";
import DrNoteConsult from "./DrNoteConsult";

/** Hydrate the rich `mock/patients.ts` Patient shape from the leaner
 *  `types.ts` Patient that lands in the `patientStore` (nurse-registered
 *  patients). Anything the store doesn't know — vitals, diagnoses, labs,
 *  risk flags — is filled with safe empty defaults so the page can render
 *  without `undefined.x` crashes. */
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
      height: 0,
      weight: 0,
      bmi: 0,
      systolic: 0,
      diastolic: 0,
      heartRate: 0,
      temperature: 0,
      measuredAt: new Date().toISOString(),
    },
    diagnoses: [],
    allergies: [],
    medications: [],
    labs: [],
    recentVisits: [],
    riskFlags: [],
  };
}

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Condition knowledge (symptoms / care / complications) ─────────────────
// Keyed by ICD-10 prefix of the primary diagnosis. Drives the right rail +
// home-care section. Falls back to a generic entry for anything unmapped.

interface ConditionInfo {
  /** Human title for the analysis report header. */
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
      { label: "ปัสสาวะบ่อย" },
      { label: "กระหายน้ำมาก" },
      { label: "อ่อนเพลีย" },
      { label: "ตาพร่ามัว" },
      { label: "แผลหายช้า" },
    ],
    seeDoctorIf: [
      "น้ำตาลในเลือดสูงเกิน 250 mg/dL",
      "ชาปลายมือปลายเท้า",
      "แผลที่เท้าหายช้าหรือมีการติดเชื้อ",
    ],
    homeCare: {
      warn: "หลีกเลี่ยงอาหารหวาน แป้งขัดสี และเครื่องดื่มน้ำตาลสูง",
      tips: [
        "ออกกำลังกายสม่ำเสมออย่างน้อย 150 นาที/สัปดาห์",
        "ตรวจน้ำตาลปลายนิ้วตามที่แพทย์สั่ง",
        "รับประทานยาให้ตรงเวลาและสม่ำเสมอ",
      ],
    },
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
      { label: "ปวดตึงท้ายทอย" },
      { label: "เวียนศีรษะ" },
      { label: "ใจสั่น" },
      { label: "ตาพร่า" },
    ],
    seeDoctorIf: [
      "ความดันสูงเกิน 180/110 mmHg",
      "เจ็บแน่นหน้าอก หายใจลำบาก",
      "แขนขาอ่อนแรงหรือพูดไม่ชัด",
    ],
    homeCare: {
      warn: "ลดอาหารเค็มและโซเดียมสูง งดสูบบุหรี่และแอลกอฮอล์",
      tips: ["วัดความดันที่บ้านสม่ำเสมอ", "ควบคุมน้ำหนัก", "กินยาความดันต่อเนื่อง"],
    },
    complications: [
      { name: "โรคหลอดเลือดสมอง", desc: "ความดันสูงเพิ่มความเสี่ยงต่อภาวะสมองขาดเลือด" },
      { name: "หัวใจโต / หัวใจล้มเหลว", desc: "หัวใจทำงานหนักขึ้นจากความดันที่สูงเรื้อรัง" },
    ],
  },
};

const DEFAULT_CONDITION: ConditionInfo = {
  title: "รายงานวิเคราะห์ผู้ป่วย",
  blurb:
    "สรุปผลตรวจและการประเมินทางคลินิกของผู้ป่วย เพื่อช่วยแพทย์ในการวินิจฉัยและวางแผนการดูแลรักษา",
  symptoms: [{ label: "อ่อนเพลีย" }, { label: "เบื่ออาหาร" }],
  seeDoctorIf: ["อาการแย่ลงอย่างรวดเร็ว", "มีไข้สูงต่อเนื่อง", "ปวดรุนแรงผิดปกติ"],
  homeCare: {
    tips: ["พักผ่อนให้เพียงพอ", "ดื่มน้ำมาก ๆ", "ติดตามอาการและมาตามนัด"],
  },
  complications: [],
};

function conditionFor(p: Patient): ConditionInfo {
  const code = p.diagnoses[0]?.code ?? "";
  const prefix = code.split(".")[0];
  return CONDITION_INFO[prefix] ?? DEFAULT_CONDITION;
}

/** AI-generated report title + blurb from the patient's chart. Seeds with
 *  the static condition copy, then replaces it once the model responds.
 *  Re-runs when the patient (HN) changes. */
function useAiReportSummary(patient: Patient | undefined): {
  title: string;
  blurb: string;
  loading: boolean;
  aiGenerated: boolean;
} {
  const [state, setState] = useState({
    title: DEFAULT_CONDITION.title,
    blurb: DEFAULT_CONDITION.blurb,
    aiGenerated: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patient) return;
    let cancelled = false;
    const fb = conditionFor(patient);
    // Show the static copy immediately while the model works.
    setState({ title: fb.title, blurb: fb.blurb, aiGenerated: false });

    const dx =
      patient.diagnoses.map((d) => `${d.name} (${d.code})`).join(", ") || "ไม่มีการวินิจฉัยบันทึกไว้";
    const abn =
      patient.labs
        .filter((l) => l.abnormal)
        .map((l) => `${l.test} ${l.value} ${l.unit} (ปกติ ${l.referenceRange})`)
        .join("; ") || "ไม่มีผลแลปผิดปกติ";
    const v = patient.vitals;
    const ctx =
      `เพศ${patient.gender === "M" ? "ชาย" : "หญิง"} อายุ ${patient.age} ปี\n` +
      `การวินิจฉัย: ${dx}\n` +
      `ผลแลปผิดปกติ: ${abn}\n` +
      `สัญญาณชีพ: BP ${v.systolic}/${v.diastolic} mmHg, BMI ${v.bmi}, HR ${v.heartRate} bpm\n` +
      `แพ้ยา/อาหาร: ${patient.allergies.map((a) => a.substance).join(", ") || "ไม่มี"}`;

    setLoading(true);
    chatJSON<{ title?: string; blurb?: string }>(
      [
        {
          role: "system",
          content:
            "คุณคือ AI ผู้ช่วยแพทย์ในระบบ CIS ของโรงพยาบาลไทย สรุปหัวเรื่องรายงานวิเคราะห์ผู้ป่วยจากข้อมูลที่ให้ " +
            "Output ONLY JSON: {\"title\":\"...\",\"blurb\":\"...\"}. " +
            "title: ชื่อรายงานสั้น ๆ ตามระบบ/โรคหลัก เช่น 'รายงานวิเคราะห์เมตาบอลิก' หรือ 'รายงานวิเคราะห์หลอดเลือดและหัวใจ' (≤ 30 อักษร). " +
            "blurb: 1-2 ประโยคภาษาไทยคลินิก อธิบายภาพรวมความเสี่ยงและความสำคัญทางคลินิกของเคสนี้ตามข้อมูลจริง ห้ามแต่งข้อมูลที่ไม่ได้ระบุ.",
        },
        { role: "user", content: ctx },
      ],
      { temperature: 0.3, maxTokens: 400, fast: true },
    )
      .then((r) => {
        if (cancelled) return;
        const title = typeof r?.title === "string" ? r.title.trim() : "";
        const blurb = typeof r?.blurb === "string" ? r.blurb.trim() : "";
        if (title || blurb) {
          setState({ title: title || fb.title, blurb: blurb || fb.blurb, aiGenerated: true });
        }
      })
      .catch(() => {
        // Keep the static fallback already shown.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patient?.hn]);

  return { ...state, loading };
}

// ── Derived status chips ──────────────────────────────────────────────────

type Tone = "good" | "warn" | "bad";
const TONE_CLASS: Record<Tone, string> = {
  good: "text-[var(--theme-success)]",
  warn: "text-[var(--theme-warning)]",
  bad: "text-[var(--theme-error)]",
};

function riskOf(p: Patient): { label: string; tone: Tone } {
  const severe = p.riskFlags.filter((f) => f.includes("uncontrolled") || f.includes("stage4")).length;
  const n = p.riskFlags.length;
  if (severe >= 2 || n >= 4) return { label: "สูง", tone: "bad" };
  if (severe >= 1 || n >= 2) return { label: "ปานกลาง", tone: "warn" };
  return { label: "ต่ำ", tone: "good" };
}

function wellnessOf(p: Patient): { label: string; tone: Tone } {
  const abn = p.labs.filter((l) => l.abnormal).length;
  if (abn >= 3 || p.riskFlags.length >= 3) return { label: "ต้องดูแล", tone: "bad" };
  if (abn >= 1 || p.riskFlags.length >= 1) return { label: "พอใช้", tone: "warn" };
  return { label: "ดี", tone: "good" };
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function PatientOPD() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { railHidden } = useSidebar();
  const { closeTab, activeId, openTab } = useTabs();
  const [tab, setTab] = useState<"results" | "diagnosis">("diagnosis");
  const [consultOpen, setConsultOpen] = useState(false);

  // Open the Dr. Note consult when arriving via `?consult=1` (the doctor's
  // "เริ่มตรวจ" CTA from the schedule). Fires once on mount.
  useEffect(() => {
    if (searchParams.get("consult") === "1") setConsultOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patient = useMemo<Patient | undefined>(() => {
    if (!params.hn) return PATIENTS[0];
    const mock = PATIENTS.find((p) => p.hn === params.hn);
    if (mock) return mock;
    const stored = getPatient(params.hn);
    return stored ? storedToMockPatient(stored) : undefined;
  }, [params.hn]);

  const ai = useAiReportSummary(patient);

  if (!patient) {
    return (
      <div className="min-h-screen w-full bg-[var(--theme-base)] p-8">
        <p className="text-[var(--theme-neutral)]/55">ไม่พบผู้ป่วยรายนี้</p>
      </div>
    );
  }

  const info = conditionFor(patient);
  // Patient is opened in its own tab from the schedule — close it and return
  // to the (intact) schedule tab.
  const onBack = () => {
    if (activeId) closeTab(activeId);
    openTab("/schedule", { title: "ตารางเวร" });
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f4f4f4]">
      <div className="h-16 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-6rem)] mr-4 mt-4 mb-4 gap-4 overflow-hidden transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-4 lg:ml-[296px]",
        ].join(" ")}
      >
        {/* ── Main column ──────────────────────────────────────────── */}
        <main className="flex min-w-0 min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <HeaderCard patient={patient} />

          <section className="flex flex-col gap-5 rounded-[24px] bg-white p-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 text-[13px] font-medium text-[var(--theme-primary)] hover:underline"
              >
                <IconChevronLeft className="h-4 w-4" stroke={2} />
                ย้อนกลับ
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <ToolbarButton icon={IconDownload} label="ดาวน์โหลดรายงาน" />
                <ToolbarButton icon={IconHistory} label="ประวัติ" />
                <button
                  type="button"
                  onClick={() => setConsultOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-110"
                >
                  <IconScan className="h-4 w-4" stroke={2} />
                  เริ่มซักประวัติ
                </button>
              </div>
            </div>

            {/* Title + blurb + status chips */}
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-[560px]">
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] font-bold text-[var(--theme-neutral)]">{ai.title}</h1>
                  {ai.loading ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--theme-primary)]">
                      <IconLoader2 className="h-3 w-3 animate-spin" stroke={2} />
                      AI กำลังสรุป
                    </span>
                  ) : (
                    ai.aiGenerated && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--theme-primary)]">
                        <IconSparkles className="h-3 w-3" stroke={2} />
                        สรุปโดย AI
                      </span>
                    )
                  )}
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--theme-neutral)]/60">
                  {ai.blurb}
                </p>
              </div>
              <div className="flex items-center gap-7">
                {(() => {
                  const risk = riskOf(patient);
                  const wellness = wellnessOf(patient);
                  const abn = patient.labs.filter((l) => l.abnormal).length;
                  return (
                    <>
                      <StatusChip icon={IconActivity} label="ความเสี่ยง" value={risk.label} tone={risk.tone} />
                      <StatusChip
                        icon={IconAlertCircle}
                        label="ความผิดปกติ"
                        value={abn === 0 ? "ไม่มี" : `${abn} รายการ`}
                        tone={abn > 0 ? "warn" : "good"}
                      />
                      <StatusChip
                        icon={IconMoodSmile}
                        label="สุขภาพโดยรวม"
                        value={wellness.label}
                        tone={wellness.tone}
                      />
                    </>
                  );
                })()}
              </div>
            </div>

            {patient.allergies.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--theme-error)]/25 bg-[var(--theme-error)]/5 px-4 py-2.5 text-[13px] text-[var(--theme-error)]">
                <IconAlertTriangle className="h-4 w-4 shrink-0" stroke={1.75} />
                <span>
                  แพ้ยา/อาหาร:{" "}
                  <strong>{patient.allergies.map((a) => a.substance).join(", ")}</strong>
                </span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-[var(--theme-neutral)]/10">
              <TabButton active={tab === "results"} onClick={() => setTab("results")}>
                ผลตรวจ
              </TabButton>
              <TabButton active={tab === "diagnosis"} onClick={() => setTab("diagnosis")}>
                การวินิจฉัย
              </TabButton>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: EASE_TV }}
              >
                {tab === "diagnosis" ? (
                  <DiagnosisPanel patient={patient} info={info} />
                ) : (
                  <ResultsPanel patient={patient} />
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        </main>

        {/* ── Right rail ───────────────────────────────────────────── */}
        <aside className="hidden w-[420px] min-h-0 shrink-0 flex-col gap-4 overflow-y-auto xl:flex [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <RightRail patient={patient} info={info} />
        </aside>
      </div>

      <DrNoteConsult
        open={consultOpen}
        patient={patient}
        onClose={() => setConsultOpen(false)}
      />
    </div>
  );
}

// ── Header card ────────────────────────────────────────────────────────────

function HeaderCard({ patient: p }: { patient: Patient }) {
  const avatarUrl = `https://randomuser.me/api/portraits/${p.gender === "F" ? "women" : "men"}/${(parseInt(p.hn.replace(/\D/g, "").slice(-2) || "0", 10)) % 90}.jpg`;
  return (
    <section className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[24px] bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <img
          src={avatarUrl}
          alt=""
          className="h-[56px] w-[56px] shrink-0 rounded-2xl object-cover ring-1 ring-black/5"
        />
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-black/45">HN {p.hn}</span>
          <span className="text-[18px] font-bold text-black leading-tight">
            {p.prefix}
            {p.firstName} {p.lastName}
          </span>
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-x-8 gap-y-3">
        <HeaderField icon={IconCalendar} label="อายุ" value={`${p.age} ปี`} />
        <HeaderField icon={IconCalendar} label="วันเกิด" value={fmtDate(p.birthDate)} />
        <HeaderField icon={IconUser} label="เพศ" value={p.gender === "M" ? "ชาย" : "หญิง"} />
        <HeaderField icon={IconStethoscope} label="แพทย์" value={p.primaryDoctor} />
        <HeaderField icon={IconActivity} label="สิทธิ" value={p.insurance} />
      </div>
    </section>
  );
}

function HeaderField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IconUser;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-medium text-black/45">{label}</span>
      <span className="flex items-center gap-1.5 text-[14px] font-semibold text-black">
        <Icon className="h-4 w-4 text-black/40" stroke={1.75} />
        {value}
      </span>
    </div>
  );
}

function fmtDate(yyyyMmDd: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(yyyyMmDd);
  if (!m) return yyyyMmDd || "—";
  return `${m[3].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[1]}`;
}

// ── Toolbar / chips / tabs ──────────────────────────────────────────────────

function ToolbarButton({ icon: Icon, label }: { icon: typeof IconUser; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--theme-neutral)]/15 bg-white px-4 py-2.5 text-[13px] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
    >
      <Icon className="h-4 w-4 text-[var(--theme-neutral)]/55" stroke={1.75} />
      {label}
    </button>
  );
}

function StatusChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof IconUser;
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-[var(--theme-neutral)]/45">{label}</span>
      <span className={`flex items-center gap-1.5 text-[15px] font-bold ${TONE_CLASS[tone]}`}>
        <Icon className="h-4 w-4" stroke={1.75} />
        {value}
      </span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative pb-2.5 text-[14px] font-medium transition",
        active
          ? "text-[var(--theme-primary)]"
          : "text-[var(--theme-neutral)]/55 hover:text-[var(--theme-neutral)]",
      ].join(" ")}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--theme-primary)]" />
      )}
    </button>
  );
}

// ── Diagnosis panel ──────────────────────────────────────────────────────────

function DiagnosisPanel({ patient: p, info }: { patient: Patient; info: ConditionInfo }) {
  const dx = p.diagnoses[0];
  const abnormal = p.labs.filter((l) => l.abnormal);
  return (
    <div className="flex flex-col gap-6 pt-2">
      <div>
        <h2 className="text-[18px] font-bold text-[var(--theme-neutral)]">
          การวินิจฉัยเบื้องต้น:{" "}
          <span className="text-[var(--theme-primary)]">{dx?.name ?? "—"}</span>
        </h2>
        {dx && (
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--theme-neutral)]/65">
            รหัสวินิจฉัย {dx.code} · เริ่มเป็นเมื่อ {fmtDate(dx.onsetDate)} · ความรุนแรง
            {dx.severity === "mild" ? "เล็กน้อย" : dx.severity === "moderate" ? "ปานกลาง" : "รุนแรง"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-[14px] font-bold text-[var(--theme-neutral)]">ทำไม?</h3>
          <ul className="flex flex-col gap-2.5">
            {(abnormal.length > 0
              ? abnormal.map((l) => `${l.test} ผิดปกติ — ${l.value} ${l.unit} (ปกติ ${l.referenceRange})`)
              : p.diagnoses.map((d) => `มีประวัติ ${d.name}`)
            ).map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-[13.5px] text-[var(--theme-neutral)]/75">
                <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-warning)]" stroke={1.75} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-[14px] font-bold text-[var(--theme-neutral)]">พบแพทย์เมื่อ:</h3>
          <ul className="flex flex-col gap-2.5">
            {info.seeDoctorIf.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-[13.5px] text-[var(--theme-neutral)]/75">
                <IconCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-primary)]" stroke={1.75} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {dx && (
        <span className="w-fit rounded-lg bg-[var(--theme-base)] px-3 py-1.5 text-[12px] font-medium text-[var(--theme-neutral)]/60">
          {dx.code} · {dx.name}
        </span>
      )}

      <div className="border-t border-[var(--theme-neutral)]/10 pt-5">
        <h3 className="mb-2 text-[15px] font-bold text-[var(--theme-neutral)]">การดูแลที่บ้าน</h3>
        <p className="text-[14px] leading-relaxed text-[var(--theme-neutral)]/65">
          ผู้ป่วยส่วนใหญ่สามารถดูแลตัวเองที่บ้านได้ ควบคู่กับการรับประทานยาและติดตามอาการตามแพทย์นัด
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {info.homeCare.warn && (
            <div className="flex items-start gap-2 text-[13.5px] text-[var(--theme-neutral)]/75">
              <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-warning)]" stroke={1.75} />
              <span>{info.homeCare.warn}</span>
            </div>
          )}
          {info.homeCare.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-[13.5px] text-[var(--theme-neutral)]/75">
              <IconCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-success)]" stroke={1.75} />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Results panel ────────────────────────────────────────────────────────────

function ResultsPanel({ patient: p }: { patient: Patient }) {
  const vitals = [
    { label: "ความดันโลหิต", value: `${p.vitals.systolic}/${p.vitals.diastolic}`, unit: "mmHg" },
    { label: "BMI", value: p.vitals.bmi.toFixed(1), unit: "kg/m²" },
    { label: "ชีพจร", value: `${p.vitals.heartRate}`, unit: "bpm" },
    { label: "อุณหภูมิ", value: `${p.vitals.temperature}`, unit: "°C" },
    { label: "ส่วนสูง", value: `${p.vitals.height}`, unit: "ซม." },
    { label: "น้ำหนัก", value: `${p.vitals.weight}`, unit: "กก." },
  ];
  return (
    <div className="flex flex-col gap-6 pt-2">
      <div>
        <h3 className="mb-3 text-[14px] font-bold text-[var(--theme-neutral)]">สัญญาณชีพ</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {vitals.map((v) => (
            <div key={v.label} className="rounded-xl border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/30 px-4 py-3">
              <p className="text-[11px] font-medium text-[var(--theme-neutral)]/55">{v.label}</p>
              <p className="mt-0.5 text-[18px] font-bold text-[var(--theme-neutral)] tabular-nums">
                {v.value} <span className="text-[11px] font-medium text-[var(--theme-neutral)]/45">{v.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-[14px] font-bold text-[var(--theme-neutral)]">ผลแลป</h3>
        {p.labs.length === 0 ? (
          <p className="text-[13px] text-[var(--theme-neutral)]/45">ไม่มีผลแลป</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--theme-neutral)]/10">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-[var(--theme-base)]/40 text-[11px] uppercase text-[var(--theme-neutral)]/50">
                <tr>
                  <th className="px-4 py-2 font-medium">การตรวจ</th>
                  <th className="px-4 py-2 font-medium">ผล</th>
                  <th className="px-4 py-2 font-medium">ค่าปกติ</th>
                  <th className="px-4 py-2 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {p.labs.map((l, i) => (
                  <tr key={i} className="border-t border-[var(--theme-neutral)]/8">
                    <td className="px-4 py-3 font-medium text-[var(--theme-neutral)]">{l.test}</td>
                    <td className={`px-4 py-3 font-semibold tabular-nums ${l.abnormal ? "text-[var(--theme-error)]" : "text-[var(--theme-neutral)]"}`}>
                      {l.value} {l.unit}
                    </td>
                    <td className="px-4 py-3 text-[var(--theme-neutral)]/55">{l.referenceRange}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          l.abnormal
                            ? "bg-[var(--theme-error)]/10 text-[var(--theme-error)]"
                            : "bg-[var(--theme-success)]/10 text-[var(--theme-success)]",
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
        )}
      </div>

      <div>
        <h3 className="mb-3 text-[14px] font-bold text-[var(--theme-neutral)]">ยาที่ใช้ประจำ</h3>
        {p.medications.length === 0 ? (
          <p className="text-[13px] text-[var(--theme-neutral)]/45">ไม่มีรายการยา</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {p.medications.map((m, i) => (
              <li key={i} className="flex items-center gap-2 text-[13.5px] text-[var(--theme-neutral)]/80">
                <IconPill className="h-4 w-4 shrink-0 text-[var(--theme-primary)]" stroke={1.75} />
                <span>
                  {m.drug} {m.dose} · {m.frequency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Right rail: common symptoms + body placeholder + complications ──────────

function RightRail({ patient: p, info }: { patient: Patient; info: ConditionInfo }) {
  // Complications = condition-specific + the patient's OTHER active diagnoses.
  const others = p.diagnoses.slice(1).map((d) => ({ name: d.name, desc: `รหัส ${d.code}` }));
  const complications = [...info.complications, ...others];
  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col rounded-[24px] bg-white p-6">
        <h2 className="text-[20px] font-bold text-[var(--theme-neutral)]">อาการที่พบบ่อย</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--theme-neutral)]/55">
          อาการที่พบได้บ่อย ความเสี่ยงที่อาจเกิด และแนวทางปฏิบัติสำหรับผู้ป่วยกลุ่มนี้
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {info.symptoms.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--theme-neutral)]/12 bg-[var(--theme-base)]/40 px-3 py-2 text-[13px] font-medium text-[var(--theme-neutral)]/75"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--theme-primary)]" />
              {s.label}
            </span>
          ))}
        </div>

        {/* Body figure — reserved blank area (no 3D asset). */}
        <div className="mt-4 flex-1 rounded-2xl bg-[var(--theme-base)]/40" />
      </section>

      <section className="rounded-[24px] bg-white p-6">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/50">
          ภาวะแทรกซ้อนที่อาจเกิด
        </h3>
        {complications.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--theme-neutral)]/45">ไม่มีภาวะแทรกซ้อนที่บันทึกไว้</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {complications.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/20 p-4"
              >
                <p className="text-[15px] font-semibold text-[var(--theme-neutral)]">{c.name}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--theme-neutral)]/60">{c.desc}</p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--theme-primary)] hover:underline"
                >
                  ดูเพิ่มเติม
                  <IconArrowUpRight className="h-3.5 w-3.5" stroke={2} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
