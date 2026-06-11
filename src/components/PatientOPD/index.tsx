import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconUser,
  IconShieldCheck,
  IconPill,
  IconHeartbeat,
  IconApple,
  IconStar,
  IconLock,
  IconCalendarEvent,
  IconNote,
  IconPrinter,
  IconClipboardList,
  IconHistory,
  IconUsers,
  IconBuildingHospital,
  IconId,
  IconWorld,
  IconBabyCarriage,
  IconCross,
  IconLanguage,
  IconChevronLeft,
  IconPencil,
  IconCheck,
  IconX,
  IconChevronDown,
} from "@tabler/icons-react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";
import { PATIENTS, type Patient } from "../../data/mock/patients";
import { getPatient } from "../../data/patientStore";
import { useDictationContext } from "../../contexts/DictationContext";
import type { Patient as StoredPatient } from "../../types";

/** Hydrate the rich `mock/patients.ts` Patient shape from the leaner
 *  `types.ts` Patient that lands in the `patientStore` (nurse-registered
 *  patients). Anything the store doesn't know — vitals, diagnoses, labs,
 *  risk flags — is filled with safe empty defaults so the OPD page can
 *  render without `undefined.x` crashes. */
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

// ── Information architecture (desktop-dense) ─────────────────────────────
// The rich nav is preserved: a top tab strip for the 13 top-level
// categories, plus a left section rail with the 8 identity sub-sections.
// Visually, the tab strip is grouped (clinical → care → identity → admin)
// so dense rows are still scannable.

interface TopTab {
  key: string;
  label: string;
  Icon: typeof IconUser;
  /** Visual grouping for the tab strip — keeps the dense list scannable. */
  group: "clinical" | "care" | "identity" | "admin";
}

const TOP_TABS: TopTab[] = [
  { key: "drug-allergy", label: "แพ้ยา", Icon: IconPill, group: "clinical" },
  { key: "food-allergy", label: "แพ้อาหาร", Icon: IconApple, group: "clinical" },
  { key: "chronic", label: "โรคประจำตัว", Icon: IconHeartbeat, group: "clinical" },
  { key: "special", label: "สถานะพิเศษ", Icon: IconStar, group: "clinical" },
  { key: "appointment", label: "นัดหมาย", Icon: IconCalendarEvent, group: "care" },
  { key: "eprescription", label: "ePrescription", Icon: IconClipboardList, group: "care" },
  { key: "note", label: "Note", Icon: IconNote, group: "care" },
  { key: "general", label: "ข้อมูลทั่วไป", Icon: IconUser, group: "identity" },
  { key: "caregiver", label: "ผู้ดูแล", Icon: IconUsers, group: "identity" },
  { key: "rights", label: "สิทธิการรักษา", Icon: IconShieldCheck, group: "admin" },
  { key: "confidential", label: "ข้อมูลปกปิด", Icon: IconLock, group: "admin" },
  { key: "print", label: "พิมพ์เอกสาร", Icon: IconPrinter, group: "admin" },
  { key: "audit", label: "Audit", Icon: IconHistory, group: "admin" },
];

const GROUP_LABEL: Record<TopTab["group"], string> = {
  clinical: "คลินิก",
  care: "การรักษา",
  identity: "ตัวตน",
  admin: "สิทธิ์/เอกสาร",
};

// ── Left rail sections (within General Info) ────────────────────────────
interface Section {
  key: string;
  label: string;
  Icon: typeof IconUser;
  desc: string;
}
const SECTIONS: Section[] = [
  { key: "general", label: "ข้อมูลทั่วไป", Icon: IconUser, desc: "ข้อมูลพื้นฐานที่ใช้ระบุตัวตน" },
  { key: "english", label: "ชื่อภาษาอังกฤษ", Icon: IconLanguage, desc: "ชื่อและที่อยู่ภาษาอังกฤษ" },
  { key: "relatives", label: "ข้อมูลญาติ", Icon: IconUsers, desc: "บิดา มารดา คู่สมรส และผู้ติดต่อ" },
  { key: "social", label: "ข้อมูลทางสังคม", Icon: IconBuildingHospital, desc: "สถานะในครอบครัวและสังคม" },
  { key: "persontype", label: "ประเภทบุคคล", Icon: IconId, desc: "ประเภทบุคคลและสังกัด" },
  { key: "alien", label: "บุคคลต่างด้าว", Icon: IconWorld, desc: "ข้อมูลสำหรับบุคคลต่างด้าว" },
  { key: "birth", label: "ข้อมูลการเกิด", Icon: IconBabyCarriage, desc: "รายละเอียดการเกิดของผู้ป่วย" },
  { key: "death", label: "การเสียชีวิต", Icon: IconCross, desc: "ข้อมูลการเสียชีวิต" },
];

export default function PatientOPD() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { railHidden } = useSidebar();
  const { isRecording, startSession } = useDictationContext();

  // Auto-start dictation when arriving via `?consult=1` (the doctor's
  // "เริ่มตรวจ + ซักประวัติ" CTA from the schedule). Fires once on mount.
  useEffect(() => {
    if (searchParams.get("consult") === "1" && !isRecording) {
      startSession("mic");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { closeTab, activeId, openTab } = useTabs();
  const [activeTab, setActiveTab] = useState("general");
  const [activeSection, setActiveSection] = useState("general");
  const [editMode, setEditMode] = useState(false);

  // Resolve patient — by HN from route. Look in the mock PATIENTS table
  // first; if not found, hydrate a stub from the live patientStore (covers
  // nurse-registered patients with newly minted HNs that aren't in the
  // mock). Falls back to first mock patient when no HN is in the URL.
  const patient = useMemo<Patient | undefined>(() => {
    if (!params.hn) return PATIENTS[0];
    const mock = PATIENTS.find((p) => p.hn === params.hn);
    if (mock) return mock;
    const stored = getPatient(params.hn);
    return stored ? storedToMockPatient(stored) : undefined;
  }, [params.hn]);

  if (!patient) {
    return (
      <div className="min-h-screen w-full bg-[var(--theme-base)] p-8">
        <p className="text-[var(--theme-neutral)]/55">ไม่พบผู้ป่วยรายนี้</p>
      </div>
    );
  }

  // Map the figma's 5 pill tabs onto existing section renderers.
  const mainTabs: PatientMainTab[] = [
    { key: "general", label: "ข้อมูลทั่วไป" },
    { key: "drug-allergy", label: "แพ้ยา · อาหาร" },
    { key: "chronic", label: "โรคประจำตัว" },
    { key: "eprescription", label: "ePrescription" },
    { key: "appointment", label: "นัดหมาย" },
  ];
  const sideTabs: SidePanelTab[] = [
    { key: "visits", label: "ประวัติการมาตรวจ" },
    { key: "labs", label: "ผลแลป" },
    { key: "note", label: "บันทึก" },
  ];

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f4f4f4]">
      <div className="h-16 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-6rem)] mr-4 mt-4 mb-4 gap-4 overflow-hidden transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-[296px]",
        ].join(" ")}
      >
        {/* ── Main column ──────────────────────────────────────────── */}
        <main className="flex min-w-0 min-h-0 flex-1 flex-col gap-4">
          <PatientHeaderCard
            patient={patient}
            editMode={editMode}
            onBack={() => {
              if (activeId) closeTab(activeId);
              openTab("/", { title: "หน้าหลัก" });
            }}
            onToggleEdit={() => setEditMode((v) => !v)}
          />

          <MainTabsCard
            patient={patient}
            editMode={editMode}
            tabs={mainTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </main>

        {/* ── Side panel ───────────────────────────────────────────── */}
        <aside className="hidden w-[400px] min-h-0 shrink-0 lg:flex">
          <SidePanelCard patient={patient} tabs={sideTabs} />
        </aside>
      </div>
    </div>
  );
}

// ── New Figma layout (1148:1869) ─────────────────────────────────────────
// Three-card composition: identity header (top-left), tabbed main
// content (bottom-left), and a tabbed side panel (right).

interface PatientMainTab {
  key: string;
  label: string;
}
interface SidePanelTab {
  key: string;
  label: string;
}

/**
 * Top identity card — avatar on the left + name/subtitle, then a row of
 * key vitals/identifiers on the right. Designed to fit the figma's 100px
 * fixed-height strip while staying scannable.
 */
function PatientHeaderCard({
  patient: p,
  editMode,
  onBack,
  onToggleEdit,
}: {
  patient: Patient;
  editMode: boolean;
  onBack: () => void;
  onToggleEdit: () => void;
}) {
  const avatarUrl = `https://randomuser.me/api/portraits/${p.gender === "F" ? "women" : "men"}/${(parseInt(p.hn.replace(/\D/g, "").slice(-2) || "0", 10)) % 90}.jpg`;
  const subtitle = `HN ${p.hn} · ${p.age} ปี · เพศ${p.gender === "M" ? "ชาย" : "หญิง"} · กรุ๊ปเลือด ${p.bloodType}${p.rh}`;
  return (
    <section className="flex shrink-0 items-center justify-between gap-6 rounded-[24px] bg-white px-6 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <img
          src={avatarUrl}
          alt=""
          className="h-[80px] w-[80px] shrink-0 rounded-full object-cover ring-2 ring-[#f4f4f4]"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[12px] font-medium text-black/55 leading-none">
            ผู้ป่วยที่กำลังตรวจ
          </p>
          <p className="truncate text-[18px] font-bold text-black leading-tight">
            {p.prefix}{p.firstName} {p.lastName}
          </p>
          <p className="truncate text-[12px] text-black/60 leading-tight">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <HeaderStat label="ความดัน" value={`${p.vitals.systolic}/${p.vitals.diastolic}`} unit="mmHg" />
        <HeaderStat label="BMI" value={p.vitals.bmi.toFixed(1)} unit="kg/m²" />
        <HeaderStat label="HR" value={`${p.vitals.heartRate}`} unit="bpm" />
        <HeaderStat label="แพ้ยา" value={p.allergies.length.toString()} unit="รายการ" />
        <HeaderStat label="สิทธิ" value={p.insurance} />

        <div className="flex items-center gap-2 border-l border-black/10 pl-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="กลับ"
            className="flex h-9 items-center gap-1 rounded-full border border-black/10 bg-white px-3 text-[12px] font-medium text-black/70 transition hover:bg-black/5"
          >
            <IconChevronLeft className="h-4 w-4" stroke={1.75} />
            กลับ
          </button>
          <button
            type="button"
            onClick={onToggleEdit}
            className={[
              "flex h-9 items-center gap-1 rounded-full px-3 text-[12px] font-medium transition",
              editMode
                ? "bg-[#3965e1] text-white hover:brightness-105"
                : "border border-black/10 bg-white text-black/70 hover:bg-black/5",
            ].join(" ")}
          >
            {editMode ? <IconCheck className="h-4 w-4" stroke={2} /> : <IconPencil className="h-4 w-4" stroke={1.75} />}
            {editMode ? "บันทึก" : "แก้ไข"}
          </button>
        </div>
      </div>
    </section>
  );
}

function HeaderStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-black/55 leading-none">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-[16px] font-bold text-black leading-none tabular-nums">{value}</span>
        {unit && <span className="text-[10px] text-black/45">{unit}</span>}
      </div>
    </div>
  );
}

/**
 * Main content card — pill-tab strip on top + scrollable content area
 * underneath that reuses the existing section renderers.
 */
function MainTabsCard({
  patient,
  editMode,
  tabs,
  activeTab,
  onTabChange,
}: {
  patient: Patient;
  editMode: boolean;
  tabs: PatientMainTab[];
  activeTab: string;
  onTabChange: (k: string) => void;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white">
      <PillTabBar tabs={tabs} active={activeTab} onChange={onTabChange} className="px-6 pt-5" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_TV }}
          >
            {renderMainTab(activeTab, patient, editMode)}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function renderMainTab(tab: string, patient: Patient, editMode: boolean) {
  switch (tab) {
    case "general":
      return <GeneralInfoSection patient={patient} editMode={editMode} />;
    case "drug-allergy":
      return <AllergiesSection patient={patient} />;
    case "chronic":
      return <ChronicSection patient={patient} />;
    case "eprescription":
      return <PrescriptionSection patient={patient} />;
    case "appointment":
      return <AppointmentSection patient={patient} />;
    default:
      return null;
  }
}

/**
 * Right-rail side card — 3 pill tabs (visits / labs / note) above a
 * scrollable content area. Filled with sensible content per tab so the
 * card never reads as empty.
 */
function SidePanelCard({ patient, tabs }: { patient: Patient; tabs: SidePanelTab[] }) {
  const [active, setActive] = useState(tabs[0].key);
  return (
    <section className="flex min-h-0 w-full flex-col overflow-hidden rounded-[24px] bg-white">
      <PillTabBar tabs={tabs} active={active} onChange={setActive} className="px-5 pt-5" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5 pt-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_TV }}
          >
            {renderSideTab(active, patient)}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function renderSideTab(tab: string, patient: Patient) {
  switch (tab) {
    case "visits":
      return <SideVisitsList patient={patient} />;
    case "labs":
      return <SideLabsList patient={patient} />;
    case "note":
      return <SideNotePad />;
    default:
      return null;
  }
}

function SideVisitsList({ patient: p }: { patient: Patient }) {
  if (p.recentVisits.length === 0) return <EmptyState message="ยังไม่มีประวัติการมาตรวจ" />;
  return (
    <ul className="flex flex-col gap-2">
      {p.recentVisits.map((v, i) => (
        <li
          key={i}
          className="flex flex-col gap-1 rounded-[12px] border border-black/5 bg-[#f9f9f9] px-4 py-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14px] font-semibold text-black">{v.diagnosis}</span>
            <span className="text-[11px] text-black/55">{v.date}</span>
          </div>
          <span className="text-[12px] text-black/65">
            {v.clinic} · CC: {v.chiefComplaint}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SideLabsList({ patient: p }: { patient: Patient }) {
  if (p.labs.length === 0) return <EmptyState message="ยังไม่มีผลแลป" />;
  return (
    <ul className="flex flex-col gap-2">
      {p.labs.map((lab, i) => {
        const valueColor = lab.abnormal ? "text-[#dc2626]" : "text-[#16a34a]";
        return (
          <li
            key={i}
            className="flex items-center justify-between gap-3 rounded-[12px] border border-black/5 bg-[#f9f9f9] px-4 py-3"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[14px] font-semibold text-black">{lab.test}</span>
              <span className="text-[11px] text-black/55">
                {lab.takenAt.slice(0, 10)} · ปกติ {lab.referenceRange}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className={`text-[16px] font-bold tabular-nums ${valueColor}`}>
                {lab.value}
              </span>
              <span className="text-[10px] text-black/45">{lab.unit}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SideNotePad() {
  const [text, setText] = useState(
    "S: ผู้ป่วยมาด้วยอาการ...\nO: \nA: \nP: ",
  );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] font-medium text-black/55">
        SOAP Note — บันทึกการตรวจของวันนี้
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        className="resize-none rounded-[12px] border border-black/10 bg-[#fafafa] p-3 text-[13px] leading-relaxed text-black outline-none focus:border-[#3965e1]"
      />
      <button
        type="button"
        className="self-end rounded-full bg-[#3965e1] px-4 py-2 text-[12px] font-semibold text-white transition hover:brightness-105"
      >
        บันทึก
      </button>
    </div>
  );
}

/** Reusable pill-tab bar — used by both the main card and side panel. */
function PillTabBar({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (k: string) => void;
  className?: string;
}) {
  return (
    <div className={["flex flex-wrap items-center gap-2", className].filter(Boolean).join(" ")}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <motion.button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className={[
              "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full px-4 text-[13px] font-medium transition-colors duration-200",
              isActive
                ? "bg-[#3965e1] text-white"
                : "bg-black/5 text-black/70 hover:bg-black/10",
            ].join(" ")}
          >
            {t.label}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Profile-card header (Mina Winkel layout) ─────────────────────────────
// Gray cover banner with a large circular avatar overlapping the bottom-
// left and identification text inline next to it. Edit / back actions
// hover top-right of the cover so they stay reachable without crowding
// the header itself. Status dot reflects `patient.status` (active = green).

function PatientHeader({
  patient: p,
  onBack,
  editMode,
  onToggleEdit,
}: {
  patient: Patient;
  onBack: () => void;
  editMode: boolean;
  onToggleEdit: () => void;
}) {
  const avatarUrl = `https://randomuser.me/api/portraits/${p.gender === "F" ? "women" : "men"}/${(parseInt(p.hn.replace(/\D/g, "").slice(-2) || "0", 10)) % 90}.jpg`;
  const isActive = p.status === "active";
  const subtitle = `HN ${p.hn} · ${p.age} ปี · เพศ${p.gender === "M" ? "ชาย" : "หญิง"} · กรุ๊ปเลือด ${p.bloodType}${p.rh} · สิทธิ ${p.insurance}`;

  return (
    <header className="relative">
      {/* Gray cover banner */}
      <div className="relative h-[140px] w-full bg-[var(--theme-neutral)]/8">
        {/* Top-right controls */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="กลับ"
            className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 text-[12px] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
          >
            <IconChevronLeft className="h-4 w-4" stroke={1.75} />
            กลับ
          </button>
          <button
            type="button"
            onClick={onToggleEdit}
            className={[
              "flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition",
              editMode
                ? "bg-[var(--theme-primary)] text-white shadow-[var(--theme-shadow-sm)]"
                : "border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] text-[var(--theme-neutral)] hover:bg-[var(--theme-primary-soft)]",
            ].join(" ")}
          >
            {editMode ? <IconCheck className="h-4 w-4" stroke={1.75} /> : <IconPencil className="h-4 w-4" stroke={1.75} />}
            {editMode ? "บันทึก" : "แก้ไข"}
          </button>
        </div>
      </div>

      {/* Identity row: avatar overlaps the banner; name + subtitle sit on
          the right. Stats float on the far right on wider screens. */}
      <div className="flex items-end gap-5 px-8 pb-5">
        <div className="relative -mt-12 shrink-0">
          <img
            src={avatarUrl}
            alt={`${p.firstName} ${p.lastName}`}
            className="h-24 w-24 rounded-full border-4 border-[var(--theme-surface)] bg-[var(--theme-neutral)]/10 object-cover shadow-[var(--theme-shadow-sm)]"
          />
          {/* Verified-style badge — uses status: active = primary blue check,
              non-active = neutral */}
          <span
            className={[
              "absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--theme-surface)]",
              isActive ? "bg-[var(--theme-primary)] text-white" : "bg-[var(--theme-neutral)]/40 text-white",
            ].join(" ")}
            aria-label={isActive ? "ผู้ป่วยใช้บริการอยู่" : "ผู้ป่วยไม่ได้ใช้บริการ"}
          >
            <IconCheck className="h-3.5 w-3.5" stroke={2.6} />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1 pb-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[22px] font-bold text-[var(--theme-neutral)]">
              {p.prefix}
              {p.firstName} {p.lastName}
            </h1>
            <span
              className={[
                "h-2.5 w-2.5 shrink-0 rounded-full",
                isActive ? "bg-[var(--theme-success)]" : "bg-[var(--theme-neutral)]/40",
              ].join(" ")}
              aria-hidden
            />
          </div>
          <p className="truncate text-[13px] text-[var(--theme-neutral)]/65">{subtitle}</p>
        </div>

        {/* Vitals stats on the right */}
        <div className="hidden gap-2 pb-1 sm:flex">
          <Stat label="BP" value={`${p.vitals.systolic}/${p.vitals.diastolic}`} />
          <Stat label="BMI" value={p.vitals.bmi.toFixed(1)} />
          <Stat label="โรคประจำตัว" value={p.diagnoses.length.toString()} />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end rounded-[var(--theme-radius-selector)] bg-[var(--theme-base)] px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-[0.05em] text-[var(--theme-neutral)]/45">
        {label}
      </span>
      <span className="text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)] tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ── Top tab bar ────────────────────────────────────────────────────────────
// Top tab bar — 4 group dropdowns. Each dropdown surfaces the tabs in
// its group; the group that owns the active tab gets a primary-soft
// highlight + shows the active tab's label inline so the doctor always
// sees what's currently in view without opening any menu.
function TopTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: TopTab[];
  active: string;
  onChange: (k: string) => void;
}) {
  const groups: TopTab["group"][] = ["clinical", "care", "identity", "admin"];
  const activeTab = tabs.find((t) => t.key === active);
  return (
    <div className="flex items-center gap-2 border-b border-[var(--theme-neutral)]/10 px-4 py-2.5">
      {groups.map((g) => {
        const groupTabs = tabs.filter((t) => t.group === g);
        if (groupTabs.length === 0) return null;
        const isActiveGroup = activeTab?.group === g;
        return (
          <Dropdown key={g} placement="bottom-start">
            <DropdownTrigger>
              <button
                type="button"
                className={[
                  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition",
                  isActiveGroup
                    ? "bg-[var(--theme-primary-soft)] font-semibold text-[var(--theme-primary)]"
                    : "border border-[var(--theme-neutral)]/15 text-[var(--theme-neutral)]/70 hover:border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary-soft)]/40",
                ].join(" ")}
              >
                <span className="font-semibold">{GROUP_LABEL[g]}</span>
                {isActiveGroup && activeTab && (
                  <>
                    <span className="text-[var(--theme-neutral)]/40">·</span>
                    <span className="inline-flex items-center gap-1 font-medium">
                      <activeTab.Icon className="h-3.5 w-3.5" stroke={1.75} />
                      {activeTab.label}
                    </span>
                  </>
                )}
                <IconChevronDown className="h-3.5 w-3.5 opacity-60" stroke={2} />
              </button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label={GROUP_LABEL[g]}
              selectedKeys={isActiveGroup ? new Set([active]) : new Set()}
              selectionMode="single"
              onAction={(key) => onChange(String(key))}
              itemClasses={{
                base: "data-[selected=true]:bg-[var(--theme-primary-soft)] data-[selected=true]:text-[var(--theme-primary)]",
              }}
            >
              {groupTabs.map((t) => (
                <DropdownItem
                  key={t.key}
                  startContent={<t.Icon className="h-4 w-4" stroke={1.75} />}
                >
                  {t.label}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        );
      })}
    </div>
  );
}

// Left rail for the General tab — keeps the 8 identity sub-sections one
// click away. Desktop-oriented: 240-px column, dense rows with title +
// description on each row.
function SectionRail({
  sections,
  active,
  onChange,
}: {
  sections: Section[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/30 px-3 py-4 lg:flex [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
      {sections.map((s) => {
        const isActive = active === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            className={[
              "flex items-start gap-2.5 rounded-[var(--theme-radius-field)] px-3 py-2.5 text-left transition",
              isActive
                ? "bg-[var(--theme-surface)] shadow-[var(--theme-shadow-sm)]"
                : "hover:bg-[var(--theme-primary-soft)]/40",
            ].join(" ")}
          >
            <s.Icon
              className={[
                "h-4 w-4 shrink-0",
                isActive ? "text-[var(--theme-primary)]" : "text-[var(--theme-neutral)]/55",
              ].join(" ")}
              stroke={1.75}
            />
            <div className="flex min-w-0 flex-col">
              <span
                className={[
                  "truncate text-[length:var(--theme-text-sm)] font-medium",
                  isActive ? "text-[var(--theme-neutral)]" : "text-[var(--theme-neutral)]/70",
                ].join(" ")}
              >
                {s.label}
              </span>
              <span className="line-clamp-1 text-[10px] text-[var(--theme-neutral)]/45">
                {s.desc}
              </span>
            </div>
          </button>
        );
      })}
    </aside>
  );
}

// Routes a (tab, section) pair to its body renderer. Centralized so the
// main JSX stays flat.
function renderTabContent(
  tab: string,
  section: string,
  patient: Patient,
  editMode: boolean,
) {
  if (tab === "general") {
    switch (section) {
      case "general":
        return <GeneralInfoSection patient={patient} editMode={editMode} />;
      case "english":
        return <PlaceholderSection title="ชื่อภาษาอังกฤษ" description="ชื่อและที่อยู่ภาษาอังกฤษ" />;
      case "relatives":
        return <PlaceholderSection title="ข้อมูลญาติ" description="บิดา มารดา คู่สมรส และผู้ติดต่อฉุกเฉิน" />;
      case "social":
        return <PlaceholderSection title="ข้อมูลทางสังคม" description="สถานะในครอบครัวและสังคม" />;
      case "persontype":
        return <PlaceholderSection title="ประเภทบุคคล" description="ประเภทบุคคลและสังกัด" />;
      case "alien":
        return <PlaceholderSection title="บุคคลต่างด้าว" description="ข้อมูลสำหรับบุคคลต่างด้าว" />;
      case "birth":
        return <PlaceholderSection title="ข้อมูลการเกิด" description="รายละเอียดการเกิดของผู้ป่วย" />;
      case "death":
        return <PlaceholderSection title="การเสียชีวิต" description="ข้อมูลการเสียชีวิต" />;
    }
  }
  switch (tab) {
    case "rights":
      return <InsuranceSection patient={patient} />;
    case "drug-allergy":
      return <AllergiesSection patient={patient} />;
    case "chronic":
      return <ChronicSection patient={patient} />;
    case "appointment":
      return <AppointmentSection patient={patient} />;
    case "eprescription":
      return <PrescriptionSection patient={patient} />;
    case "food-allergy":
      return <PlaceholderSection title="แพ้อาหาร" description="รายการอาหารที่ผู้ป่วยแพ้" />;
    case "special":
      return <PlaceholderSection title="สถานะพิเศษ" description="VIP / Bed / High-risk flags" />;
    case "confidential":
      return <PlaceholderSection title="ข้อมูลปกปิด" description="ข้อมูลที่จำกัดการเข้าถึง" />;
    case "print":
      return <PlaceholderSection title="พิมพ์เอกสาร" description="ใบสรุปประวัติ / ใบรับรองแพทย์" />;
    case "audit":
      return <PlaceholderSection title="Audit" description="ประวัติการแก้ไขข้อมูล" />;
    case "caregiver":
      return <PlaceholderSection title="ผู้ดูแล" description="ผู้ดูแลผู้ป่วย" />;
    case "note":
      return <PlaceholderSection title="Note" description="บันทึกผู้ใช้งาน" />;
    default:
      return null;
  }
}

// ── Sections ───────────────────────────────────────────────────────────────

function GeneralInfoSection({ patient: p, editMode }: { patient: Patient; editMode: boolean }) {
  const avatarUrl = `https://randomuser.me/api/portraits/${p.gender === "F" ? "women" : "men"}/${(parseInt(p.hn.replace(/\D/g, "").slice(-2) || "0", 10)) % 90}.jpg`;

  // Usage-style metrics. Translated from the ref's "Account Usage" idea
  // into clinically meaningful counters for a patient: care touchpoints
  // this year vs typical caps for this insurance tier.
  const visitsCount = p.recentVisits.length;
  const diagnosesCount = p.diagnoses.length;
  const meds = p.medications.length;
  const labs = p.labs.length;
  const allergiesCount = p.allergies.length;
  const usage: UsageRow[] = [
    { label: "การมาตรวจปีนี้", value: visitsCount, cap: 24 },
    { label: "ยาที่กำลังใช้", value: meds, cap: 10 },
    { label: "โรคประจำตัว", value: diagnosesCount, cap: 8 },
    { label: "ผลแลปปีนี้", value: labs, cap: 30 },
    { label: "แพ้ยา/อาหาร", value: allergiesCount, cap: 5 },
    { label: "ความเสี่ยง", value: p.riskFlags.length, cap: 6 },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
      {/* Card 1 — Patient owner / responsibility */}
      <Card>
        <CardHeader title="ผู้รับผิดชอบเคส" />
        <div className="flex items-center gap-4 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/30 px-4 py-3">
          <img
            src={avatarUrl}
            alt=""
            className="h-14 w-14 rounded-full object-cover ring-2 ring-[var(--theme-surface)]"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-[15px] font-bold text-[var(--theme-neutral)]">
              {p.prefix}{p.firstName} {p.lastName}
            </p>
            <p className="truncate text-[12px] text-[var(--theme-neutral)]/55">
              HN {p.hn} · {p.email ?? p.phone ?? "—"}
            </p>
          </div>
          <button
            type="button"
            className="h-9 shrink-0 rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3.5 text-[12px] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
          >
            เปลี่ยนแพทย์ประจำ
          </button>
        </div>
      </Card>

      {/* Card 2 — Care usage snapshot, ref's "Account Usage" pattern */}
      <Card>
        <CardHeader
          title="สรุปการใช้บริการ"
          action={
            <button
              type="button"
              className="h-8 rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 text-[12px] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
            >
              ดูประวัติทั้งหมด
            </button>
          }
        />
        <div className="grid grid-cols-1 gap-x-10 gap-y-5 px-1 md:grid-cols-2">
          {usage.map((u) => (
            <UsageBar key={u.label} {...u} />
          ))}
        </div>
      </Card>

      {/* Card 3 — Demographics / settings — read-only grid + Edit */}
      <Card>
        <CardHeader
          title="ข้อมูลผู้ป่วย"
          action={
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 text-[12px] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
            >
              แก้ไข
              <IconPencil className="h-3.5 w-3.5" stroke={1.75} />
            </button>
          }
        />
        <div className="grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">
          <ReadField label="คำนำหน้า · ชื่อ-นามสกุล" value={`${p.prefix}${p.firstName} ${p.lastName}`} editable={editMode} />
          <ReadField label="เลขประจำตัวประชาชน" value={p.citizenId || "—"} editable={false} />
          <ReadField label="วันเกิด" value={p.birthDate} editable={editMode} />
          <ReadField label="อายุ · เพศ" value={`${p.age} ปี · ${p.gender === "M" ? "ชาย" : "หญิง"}`} editable={false} />
          <ReadField label="กรุ๊ปเลือด" value={`${p.bloodType}${p.rh}`} editable={editMode} />
          <ReadField label="เบอร์ติดต่อ" value={p.phone || "—"} editable={editMode} />
          <ReadField label="อีเมล" value={p.email ?? "—"} editable={editMode} />
          <ReadField label="ที่อยู่" value={`${p.address.district}, ${p.address.province}`} editable={editMode} />
          <ReadField label="สิทธิรักษา" value={p.insurance} editable={editMode} />
          <ReadField label="แพทย์ประจำ" value={p.primaryDoctor} editable={editMode} />
          <ReadField label="ลงทะเบียนครั้งแรก" value={p.registeredDate} editable={false} />
          <ReadField label="ตรวจครั้งล่าสุด" value={p.lastVisit} editable={false} />
        </div>
      </Card>

      {/* Card 4 — Latest vitals (kept; same card visual) */}
      <Card>
        <CardHeader title="สัญญาณชีพ (ครั้งล่าสุด)" />
        <div className="grid grid-cols-2 gap-x-10 gap-y-5 md:grid-cols-4">
          <ReadField label="ส่วนสูง" value={`${p.vitals.height} ซม.`} editable={false} />
          <ReadField label="น้ำหนัก" value={`${p.vitals.weight} กก.`} editable={false} />
          <ReadField label="BMI" value={p.vitals.bmi.toFixed(1)} editable={false} />
          <ReadField label="BP" value={`${p.vitals.systolic}/${p.vitals.diastolic}`} editable={false} />
          <ReadField label="HR" value={`${p.vitals.heartRate} bpm`} editable={false} />
          <ReadField label="Temp" value={`${p.vitals.temperature}°C`} editable={false} />
          <ReadField label="วัดเมื่อ" value={p.vitals.measuredAt} editable={false} />
        </div>
      </Card>
    </div>
  );
}

// ── Ref-style card primitives ────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] p-5">
      {children}
    </div>
  );
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-[16px] font-bold text-[var(--theme-neutral)]">{title}</h3>
      {action}
    </div>
  );
}

interface UsageRow { label: string; value: number; cap: number }
function UsageBar({ label, value, cap }: UsageRow) {
  const pct = Math.min(100, Math.round((value / cap) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-[var(--theme-neutral)]">{label}</span>
        <span className="text-[var(--theme-neutral)]/55 tabular-nums">
          {value} of {cap}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--theme-neutral)]/10">
        <div
          className="h-full rounded-full bg-[var(--theme-primary)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ReadField({ label, value, editable }: { label: string; value: string; editable: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-[var(--theme-neutral)]/55">{label}</span>
      {editable ? (
        <input
          type="text"
          defaultValue={value}
          className="h-8 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-2.5 text-[14px] font-semibold text-[var(--theme-neutral)] outline-none focus:border-[var(--theme-primary)]"
        />
      ) : (
        <span className="text-[14px] font-semibold text-[var(--theme-neutral)]">
          {value || "—"}
        </span>
      )}
    </div>
  );
}

function InsuranceSection({ patient: p }: { patient: Patient }) {
  const labels: Record<string, string> = {
    UC: "บัตรทอง (UC)",
    SSO: "ประกันสังคม (SSO)",
    CSMBS: "ข้าราชการ (CSMBS)",
    OOP: "ชำระเงินสด",
    Private: "ประกันเอกชน",
  };
  return (
    <SectionShell title="สิทธิการรักษา" description="สิทธิประโยชน์การรักษาพยาบาลของผู้ป่วย">
      <SubCard title="สิทธิหลัก">
        <FieldGrid>
          <Field label="ประเภทสิทธิ" value={labels[p.insurance] ?? p.insurance} editable={false} />
          <Field label="หน่วยงานต้นสังกัด" value="โรงพยาบาลทดสอบ BMS" editable={false} />
          <Field label="วันที่มีผล" value={p.registeredDate} editable={false} />
          <Field label="สถานะ" value="ใช้งานได้" editable={false} />
        </FieldGrid>
      </SubCard>
    </SectionShell>
  );
}

function AllergiesSection({ patient: p }: { patient: Patient }) {
  return (
    <SectionShell title="ประวัติแพ้ยา" description="ยาที่ผู้ป่วยมีประวัติแพ้ — แสดงเป็นคำเตือนเมื่อสั่งยา">
      {p.allergies.length === 0 ? (
        <EmptyState message="ไม่พบประวัติแพ้ยา" />
      ) : (
        <div className="flex flex-col gap-2">
          {p.allergies.map((a, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-[var(--theme-radius-field)] border border-[var(--theme-error)]/30 bg-[var(--theme-error)]/5 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <IconPill
                  className="h-5 w-5 text-[var(--theme-error)]"
                  stroke={1.75}
                />
                <div className="flex flex-col">
                  <p className="text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
                    {a.substance}
                  </p>
                  <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/60">
                    อาการ: {a.reaction}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[var(--theme-error)]/15 px-2.5 py-0.5 text-[length:var(--theme-text-xs)] font-semibold text-[var(--theme-error)]">
                แพ้
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function ChronicSection({ patient: p }: { patient: Patient }) {
  const severityColor = {
    mild: "var(--theme-success)",
    moderate: "var(--theme-warning)",
    severe: "var(--theme-error)",
  } as const;
  return (
    <SectionShell title="โรคประจำตัว" description="รายการวินิจฉัยที่ผู้ป่วยได้รับ และระดับความรุนแรง">
      {p.diagnoses.length === 0 ? (
        <EmptyState message="ไม่มีโรคประจำตัวบันทึกไว้" />
      ) : (
        <div className="flex flex-col gap-2">
          {p.diagnoses.map((d, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] px-4 py-3"
            >
              <div className="flex flex-col">
                <p className="text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
                  {d.name}
                </p>
                <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                  ICD-10: {d.code} · เริ่ม: {d.onsetDate}
                </p>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-[length:var(--theme-text-xs)] font-semibold"
                style={{
                  backgroundColor: `color-mix(in oklch, ${severityColor[d.severity]}, transparent 80%)`,
                  color: severityColor[d.severity],
                }}
              >
                {d.severity === "mild" ? "เล็กน้อย" : d.severity === "moderate" ? "ปานกลาง" : "รุนแรง"}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function PrescriptionSection({ patient: p }: { patient: Patient }) {
  return (
    <SectionShell title="ePrescription" description="ยาที่ผู้ป่วยกำลังใช้อยู่">
      {p.medications.length === 0 ? (
        <EmptyState message="ไม่มียาที่กำลังสั่งจ่าย" />
      ) : (
        <div className="overflow-hidden rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10">
          <table className="w-full text-left text-[length:var(--theme-text-sm)]">
            <thead className="bg-[var(--theme-base)]/40 text-[length:var(--theme-text-xs)] uppercase text-[var(--theme-neutral)]/55">
              <tr>
                <th className="px-4 py-2 font-medium">ยา</th>
                <th className="px-4 py-2 font-medium">ขนาด</th>
                <th className="px-4 py-2 font-medium">วิธีใช้</th>
                <th className="px-4 py-2 font-medium">เริ่มใช้</th>
              </tr>
            </thead>
            <tbody>
              {p.medications.map((m, i) => (
                <tr
                  key={i}
                  className="border-t border-[var(--theme-neutral)]/5 hover:bg-[var(--theme-primary-soft)]/30"
                >
                  <td className="px-4 py-3 font-medium text-[var(--theme-neutral)]">{m.drug}</td>
                  <td className="px-4 py-3 text-[var(--theme-neutral)]/85">{m.dose}</td>
                  <td className="px-4 py-3 text-[var(--theme-neutral)]/85">{m.frequency}</td>
                  <td className="px-4 py-3 text-[var(--theme-neutral)]/55">{m.startedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionShell>
  );
}

function AppointmentSection({ patient: p }: { patient: Patient }) {
  return (
    <SectionShell title="นัดหมาย" description="รายการนัดของผู้ป่วย">
      {p.nextAppointment ? (
        <div className="flex items-center gap-3 rounded-[var(--theme-radius-field)] border border-[var(--theme-primary)]/30 bg-[var(--theme-primary-soft)]/40 px-4 py-3">
          <IconCalendarEvent
            className="h-5 w-5 text-[var(--theme-primary)]"
            stroke={1.75}
          />
          <div className="flex flex-col">
            <p className="text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
              {p.nextAppointment.date} · {p.nextAppointment.clinic}
            </p>
            <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/60">
              {p.nextAppointment.doctor} · {p.nextAppointment.type}
            </p>
          </div>
        </div>
      ) : (
        <EmptyState message="ยังไม่มีนัดในระบบ" />
      )}

      <SubCard title="การมาตรวจล่าสุด">
        <div className="flex flex-col gap-2">
          {p.recentVisits.map((v, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] px-4 py-3"
            >
              <div className="flex flex-col">
                <p className="text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">
                  {v.diagnosis}
                </p>
                <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                  {v.date} · {v.clinic} · CC: {v.chiefComplaint}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SubCard>
    </SectionShell>
  );
}

function PlaceholderSection({ title, description }: { title: string; description: string }) {
  return (
    <SectionShell title={title} description={description}>
      <EmptyState message="ส่วนนี้ยังไม่มีข้อมูล — รอการพัฒนาต่อ" />
    </SectionShell>
  );
}

// ── Layout primitives ─────────────────────────────────────────────────────

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[length:var(--theme-text-lg)] font-semibold text-[var(--theme-neutral)]">
          {title}
        </h2>
        {description && (
          <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55">
            {description}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/30 p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/45">
        {title}
      </p>
      {children}
    </div>
  );
}

function FieldGrid({
  children,
  cols = 3,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}) {
  const cls = cols === 4 ? "md:grid-cols-4" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  return (
    <div className={`grid grid-cols-1 gap-4 ${cls}`}>{children}</div>
  );
}

function Field({
  label,
  value,
  editable,
  colSpan,
}: {
  label: string;
  value: string;
  editable: boolean;
  colSpan?: number;
}) {
  const className = colSpan === 2 ? "md:col-span-2" : "";
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[length:var(--theme-text-xs)] font-medium text-[var(--theme-neutral)]/60">
        {label}
      </label>
      {editable ? (
        <input
          type="text"
          defaultValue={value}
          className="h-9 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none focus:border-[var(--theme-primary)]"
        />
      ) : (
        <p className="rounded-[var(--theme-radius-field)] bg-[var(--theme-base)]/40 px-3 py-2 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--theme-radius-box)] border border-dashed border-[var(--theme-neutral)]/15 py-12">
      <IconX className="h-5 w-5 text-[var(--theme-neutral)]/30" stroke={1.5} />
      <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/50">
        {message}
      </p>
    </div>
  );
}
