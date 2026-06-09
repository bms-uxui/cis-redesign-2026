import { useMemo, useState } from "react";
import { useParams } from "react-router";
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
} from "@tabler/icons-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";
import { PATIENTS, type Patient } from "../../data/mock/patients";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Top tabs (mirrors the reference) ────────────────────────────────────
interface TopTab {
  key: string;
  label: string;
  Icon: typeof IconUser;
}
const TOP_TABS: TopTab[] = [
  { key: "general", label: "ข้อมูลทั่วไป", Icon: IconUser },
  { key: "rights", label: "สิทธิการรักษา", Icon: IconShieldCheck },
  { key: "drug-allergy", label: "แพ้ยา", Icon: IconPill },
  { key: "chronic", label: "โรคประจำตัว", Icon: IconHeartbeat },
  { key: "food-allergy", label: "แพ้อาหาร", Icon: IconApple },
  { key: "special", label: "สถานะพิเศษ", Icon: IconStar },
  { key: "confidential", label: "ข้อมูลปกปิด", Icon: IconLock },
  { key: "appointment", label: "นัดหมาย", Icon: IconCalendarEvent },
  { key: "note", label: "Note", Icon: IconNote },
  { key: "print", label: "พิมพ์เอกสาร", Icon: IconPrinter },
  { key: "eprescription", label: "ePrescription", Icon: IconClipboardList },
  { key: "audit", label: "Audit", Icon: IconHistory },
  { key: "caregiver", label: "ผู้ดูแล", Icon: IconUsers },
];

// ── Left rail sections (within General Info) ────────────────────────────
interface Section {
  key: string;
  label: string;
  Icon: typeof IconUser;
  desc: string;
}
const SECTIONS: Section[] = [
  { key: "general", label: "ข้อมูลทั่วไป", Icon: IconUser, desc: "ข้อมูลพื้นฐานที่ใช้ระบุตัวตน" },
  { key: "relatives", label: "ข้อมูลญาติ", Icon: IconUsers, desc: "บิดา มารดา คู่สมรส และผู้ติดต่อ" },
  { key: "social", label: "ข้อมูลทางสังคม", Icon: IconBuildingHospital, desc: "สถานะในครอบครัวและสังคม" },
  { key: "persontype", label: "ประเภทบุคคล", Icon: IconId, desc: "ประเภทบุคคลและสังกัด" },
  { key: "alien", label: "บุคคลต่างด้าว", Icon: IconWorld, desc: "ข้อมูลสำหรับบุคคลต่างด้าว" },
  { key: "birth", label: "ข้อมูลการเกิด", Icon: IconBabyCarriage, desc: "รายละเอียดการเกิดของผู้ป่วย" },
  { key: "death", label: "การเสียชีวิต", Icon: IconCross, desc: "ข้อมูลการเสียชีวิต" },
  { key: "english", label: "ชื่อภาษาอังกฤษ", Icon: IconLanguage, desc: "ชื่อและที่อยู่ภาษาอังกฤษ" },
];

export default function PatientOPD() {
  const params = useParams();
  const { collapsed: sidebarCollapsed, railHidden } = useSidebar();
  const { closeTab, activeId, openTab } = useTabs();
  const [activeTab, setActiveTab] = useState("general");
  const [activeSection, setActiveSection] = useState("general");
  const [editMode, setEditMode] = useState(false);

  // Resolve patient — by HN from route, fall back to first patient.
  const patient = useMemo<Patient | undefined>(() => {
    if (params.hn) return PATIENTS.find((p) => p.hn === params.hn);
    return PATIENTS[0];
  }, [params.hn]);

  if (!patient) {
    return (
      <div className="min-h-screen w-full bg-[var(--theme-base)] p-8">
        <p className="text-[var(--theme-neutral)]/55">ไม่พบผู้ป่วยรายนี้</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      <div className="h-20 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-7rem)] mr-4 mt-4 mb-4 overflow-hidden rounded-[24px] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] transition-[margin] duration-300 ease-out",
          railHidden
            ? "ml-4"
            : sidebarCollapsed
              ? "ml-[106px]"
              : "ml-[370px]",
        ].join(" ")}
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          {/* Patient header strip */}
          <PatientHeader
            patient={patient}
            onBack={() => {
              if (activeId) closeTab(activeId);
              openTab("/", { title: "หน้าหลัก" });
            }}
            editMode={editMode}
            onToggleEdit={() => setEditMode((v) => !v)}
          />

          {/* Top tabs */}
          <TopTabBar
            tabs={TOP_TABS}
            active={activeTab}
            onChange={setActiveTab}
          />

          {/* Two-column body */}
          <div className="flex min-h-0 flex-1">
            {/* Section rail (only on General tab) */}
            {activeTab === "general" && (
              <SectionRail
                sections={SECTIONS}
                active={activeSection}
                onChange={setActiveSection}
              />
            )}

            {/* Content area */}
            <div className="flex flex-1 flex-col overflow-y-auto px-8 py-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${activeSection}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: EASE_TV }}
                >
                  {activeTab === "general" && activeSection === "general" && (
                    <GeneralInfoSection patient={patient} editMode={editMode} />
                  )}
                  {activeTab === "general" && activeSection === "relatives" && (
                    <PlaceholderSection title="ข้อมูลญาติ" description="บิดา มารดา คู่สมรส และผู้ติดต่อฉุกเฉิน" />
                  )}
                  {activeTab === "general" && activeSection === "social" && (
                    <PlaceholderSection title="ข้อมูลทางสังคม" description="สถานะในครอบครัวและสังคม" />
                  )}
                  {activeTab === "general" && activeSection === "persontype" && (
                    <PlaceholderSection title="ประเภทบุคคล" description="ประเภทบุคคลและสังกัด" />
                  )}
                  {activeTab === "general" && activeSection === "alien" && (
                    <PlaceholderSection title="บุคคลต่างด้าว" description="ข้อมูลสำหรับบุคคลต่างด้าว" />
                  )}
                  {activeTab === "general" && activeSection === "birth" && (
                    <PlaceholderSection title="ข้อมูลการเกิด" description="รายละเอียดการเกิดของผู้ป่วย" />
                  )}
                  {activeTab === "general" && activeSection === "death" && (
                    <PlaceholderSection title="การเสียชีวิต" description="ข้อมูลการเสียชีวิต" />
                  )}
                  {activeTab === "general" && activeSection === "english" && (
                    <PlaceholderSection title="ชื่อภาษาอังกฤษ" description="ชื่อและที่อยู่ภาษาอังกฤษ" />
                  )}

                  {activeTab === "rights" && <InsuranceSection patient={patient} />}
                  {activeTab === "drug-allergy" && <AllergiesSection patient={patient} />}
                  {activeTab === "chronic" && <ChronicSection patient={patient} />}
                  {activeTab === "food-allergy" && <PlaceholderSection title="แพ้อาหาร" description="รายการอาหารที่ผู้ป่วยแพ้" />}
                  {activeTab === "special" && <PlaceholderSection title="สถานะพิเศษ" description="VIP / Bed / High-risk flags" />}
                  {activeTab === "confidential" && <PlaceholderSection title="ข้อมูลปกปิด" description="ข้อมูลที่จำกัดการเข้าถึง" />}
                  {activeTab === "appointment" && <AppointmentSection patient={patient} />}
                  {activeTab === "note" && <PlaceholderSection title="Note" description="บันทึกผู้ใช้งาน" />}
                  {activeTab === "print" && <PlaceholderSection title="พิมพ์เอกสาร" description="ใบสรุปประวัติ / ใบรับรองแพทย์" />}
                  {activeTab === "eprescription" && <PrescriptionSection patient={patient} />}
                  {activeTab === "audit" && <PlaceholderSection title="Audit" description="ประวัติการแก้ไขข้อมูล" />}
                  {activeTab === "caregiver" && <PlaceholderSection title="ผู้ดูแล" description="ผู้ดูแลผู้ป่วย" />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Header strip ───────────────────────────────────────────────────────────
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
  return (
    <header className="flex items-center gap-4 border-b border-[var(--theme-neutral)]/10 px-6 py-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="กลับ"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--theme-radius-selector)] text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
      >
        <IconChevronLeft className="h-5 w-5" stroke={1.75} />
      </button>
      <img
        src={`https://randomuser.me/api/portraits/${p.gender === "F" ? "women" : "men"}/${(parseInt(p.hn.replace(/\D/g, "").slice(-2) || "0", 10)) % 90}.jpg`}
        alt={`${p.firstName} ${p.lastName}`}
        className="h-12 w-12 shrink-0 rounded-full bg-[var(--theme-neutral)]/8 object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-[length:var(--theme-text-lg)] font-semibold text-[var(--theme-neutral)]">
          {p.prefix}
          {p.firstName} {p.lastName}
        </p>
        <p className="truncate text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
          HN {p.hn} · {p.age} ปี · เพศ{p.gender === "M" ? "ชาย" : "หญิง"} · กรุ๊ปเลือด {p.bloodType}
          {p.rh} · สิทธิ {p.insurance}
        </p>
      </div>

      {/* Quick stats */}
      <div className="hidden gap-2 sm:flex">
        <Stat label="BP" value={`${p.vitals.systolic}/${p.vitals.diastolic}`} />
        <Stat label="BMI" value={p.vitals.bmi.toFixed(1)} />
        <Stat label="โรคประจำตัว" value={p.diagnoses.length.toString()} />
      </div>

      <button
        type="button"
        onClick={onToggleEdit}
        className={[
          "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--theme-radius-field)] px-3 text-[length:var(--theme-text-sm)] font-medium transition",
          editMode
            ? "bg-[var(--theme-primary)] text-white"
            : "border border-[var(--theme-neutral)]/15 text-[var(--theme-neutral)] hover:bg-[var(--theme-primary-soft)]",
        ].join(" ")}
      >
        {editMode ? <IconCheck className="h-4 w-4" stroke={1.75} /> : <IconPencil className="h-4 w-4" stroke={1.75} />}
        {editMode ? "บันทึก" : "แก้ไข"}
      </button>
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
function TopTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: TopTab[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--theme-neutral)]/10 px-4 py-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--theme-radius-field)] px-3 py-1.5 text-[length:var(--theme-text-sm)] transition",
              isActive
                ? "bg-[var(--theme-primary-soft)] font-medium text-[var(--theme-primary)]"
                : "text-[var(--theme-neutral)]/70 hover:bg-[var(--theme-primary-soft)]/40 hover:text-[var(--theme-neutral)]",
            ].join(" ")}
          >
            <t.Icon className="h-4 w-4" stroke={1.75} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Section rail ───────────────────────────────────────────────────────────
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
    <aside className="hidden w-[260px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/30 px-3 py-4 lg:flex [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
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

// ── Sections ───────────────────────────────────────────────────────────────

function GeneralInfoSection({ patient: p, editMode }: { patient: Patient; editMode: boolean }) {
  return (
    <SectionShell title="ข้อมูลทั่วไป" description="ข้อมูลพื้นฐานที่ใช้ระบุตัวตนผู้ป่วย">
      <FieldGrid>
        <Field label="HN" value={p.hn} editable={false} />
        <Field label="เลขประจำตัวประชาชน" value={p.citizenId} editable={false} />
        <Field label="คำนำหน้า" value={p.prefix} editable={editMode} />
        <Field label="ชื่อ" value={p.firstName} editable={editMode} />
        <Field label="นามสกุล" value={p.lastName} editable={editMode} />
        <Field label="วันเกิด" value={p.birthDate} editable={editMode} />
        <Field label="อายุ" value={`${p.age} ปี`} editable={false} />
        <Field label="เพศ" value={p.gender === "M" ? "ชาย" : "หญิง"} editable={editMode} />
        <Field label="กรุ๊ปเลือด" value={`${p.bloodType}${p.rh}`} editable={editMode} />
        <Field label="เบอร์ติดต่อ" value={p.phone} editable={editMode} />
        <Field label="อีเมล" value={p.email ?? "—"} editable={editMode} />
        <Field
          label="ที่อยู่"
          value={`${p.address.district}, ${p.address.province}`}
          editable={editMode}
          colSpan={2}
        />
        <Field label="สิทธิรักษา" value={p.insurance} editable={editMode} />
        <Field label="หมอประจำ" value={p.primaryDoctor} editable={editMode} />
        <Field
          label="ลงทะเบียนครั้งแรก"
          value={p.registeredDate}
          editable={false}
        />
        <Field label="ตรวจครั้งล่าสุด" value={p.lastVisit} editable={false} />
      </FieldGrid>

      {/* Vitals card */}
      <SubCard title="Vital signs (ครั้งล่าสุด)">
        <FieldGrid cols={4}>
          <Field label="ส่วนสูง" value={`${p.vitals.height} ซม.`} editable={false} />
          <Field label="น้ำหนัก" value={`${p.vitals.weight} กก.`} editable={false} />
          <Field label="BMI" value={p.vitals.bmi.toFixed(1)} editable={false} />
          <Field label="BP" value={`${p.vitals.systolic}/${p.vitals.diastolic}`} editable={false} />
          <Field label="HR" value={`${p.vitals.heartRate} bpm`} editable={false} />
          <Field label="Temp" value={`${p.vitals.temperature}°C`} editable={false} />
          <Field label="วัดเมื่อ" value={p.vitals.measuredAt} editable={false} colSpan={2} />
        </FieldGrid>
      </SubCard>
    </SectionShell>
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
