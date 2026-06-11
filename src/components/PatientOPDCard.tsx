import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { IconUserPlus } from "@tabler/icons-react";
import SaveCommitOverlay from "./SaveCommitOverlay";
import { takeFreshSave } from "../data/freshSaveHandoff";
import { Input, Select, SelectItem, Textarea, Checkbox, Button, Tabs, Tab } from "@heroui/react";
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
  IconPencil,
  IconFingerprint,
  IconUser,
  IconCalendarEvent,
  IconCreditCard,
} from "@tabler/icons-react";
import {
  addPatient,
  getPatient,
  getStoredProfile,
  nextHN,
  saveProfile,
  updatePatient,
  usePatients,
} from "../data/patientStore";
import { emptyProfile, getPatientProfile } from "../data/patientProfiles";
import { useToast } from "../contexts/ToastContext";
import type {
  OPDAllergy,
  OPDListKey,
  OPDListRow,
  OPDRight,
  Patient,
  StoredProfile,
} from "../types";
import DictationButton from "./DictationButton";
import DocumentDropZone from "./DocumentDropZone";
import HERO_BG from "../assets/figma/hero-bg.jpg";
import CARD_SMARTCARD from "../assets/figma/card-smartcard.jpg";
import CARD_APPOINTMENT from "../assets/figma/card-appointment.jpg";
import ICON_WINDOWS from "../assets/figma/icon-windows.svg";
import ICON_CALENDAR_EVENT from "../assets/figma/icon-calendar-event.svg";

const LEFT_TABS = [
  "ข้อมูลทั่วไป",
  "สิทธิการรักษา",
  "การแพ้ยา",
  "โรคประจำตัว",
  "การแพ้อาหาร",
  "สถานะพิเศษ",
  "ข้อมูลปกปิด",
  "การนัดหมาย",
  "Note",
  "การพิมพ์เอกสาร",
  "ePrescription",
  "Audit",
  "ผู้ดูแล",
] as const;
type LeftTab = (typeof LEFT_TABS)[number];

const GENERAL_SUBTABS = [
  { key: "patient", label: "ข้อมูลผู้ป่วย" },
  { key: "kin", label: "ข้อมูลญาติ" },
  { key: "social", label: "ข้อมูลทางสังคม" },
  { key: "personType", label: "ประเภทบุคคล" },
  { key: "alien", label: "บุคคลต่างด้าว" },
  { key: "birth", label: "ข้อมูลการเกิด" },
  { key: "death", label: "การเสียชีวิต" },
  { key: "english", label: "ชื่อภาษาอังกฤษ" },
  { key: "other", label: "ข้อมูลอื่นๆ" },
] as const;
type SubTab = (typeof GENERAL_SUBTABS)[number]["key"];

const OPT = {
  prefix: ["นาย", "นาง", "นางสาว", "เด็กชาย", "เด็กหญิง"],
  gender: ["ชาย", "หญิง"],
  blood: ["A", "B", "AB", "O"],
  rh: ["Rh+", "Rh-"],
  religion: ["พุทธ", "อิสลาม", "คริสต์", "ฮินดู", "ซิกข์", "ไม่นับถือศาสนา", "อื่นๆ"],
  marital: ["โสด", "สมรส", "หม้าย", "หย่าร้าง", "แยกกันอยู่", "สมณะ"],
  race: ["ไทย", "ลาว", "กัมพูชา", "เมียนมา", "มาเลเซีย", "จีน", "เวียดนาม", "อื่นๆ"],
  relation: ["บิดา", "มารดา", "บุตร/ธิดา", "คู่สมรส", "พี่/น้อง", "ญาติ", "เพื่อน", "อื่นๆ"],
  familyStatus: ["หัวหน้าครอบครัว", "คู่สมรส", "บุตร", "ญาติ", "ผู้อาศัย"],
  personStatus: ["มีชีวิต", "เสียชีวิต", "ย้ายที่อยู่", "สาบสูญ"],
  personType: ["ประชาชนทั่วไป", "ข้าราชการ", "พนักงานรัฐวิสาหกิจ", "พระภิกษุ/สามเณร", "บุคคลต่างด้าว"],
  community: ["ไม่มี", "อสม.", "ผู้นำชุมชน", "กรรมการหมู่บ้าน"],
  alien: ["ไม่ใช่", "แรงงานต่างด้าว", "ผู้ลี้ภัย", "นักท่องเที่ยว"],
  deathPlace: ["โรงพยาบาล", "บ้าน", "ระหว่างนำส่ง", "สถานที่อื่น"],
  deathSource: ["ใบมรณบัตร", "ญาติแจ้ง", "เจ้าหน้าที่"],
  education: ["ไม่ได้เรียน", "ประถมศึกษา", "มัธยมศึกษา", "ปวช./ปวส.", "ปริญญาตรี", "สูงกว่าปริญญาตรี"],
  language: ["ไทย", "อังกฤษ", "ลาว", "เขมร", "จีน", "มลายู"],
  skin: ["ขาว", "ผิวสองสี", "คล้ำ", "ดำแดง"],
  rightCodes: [
    { code: "01", name: "ชำระเงินเอง" },
    { code: "10", name: "บัตรทอง" },
    { code: "20", name: "ประกันสังคม" },
    { code: "30", name: "ข้าราชการ (เบิกจ่ายตรง)" },
    { code: "40", name: "ประกันแรงงานต่างด้าว" },
    { code: "50", name: "พ.ร.บ.รถ" },
    { code: "60", name: "ต้นสังกัด" },
    { code: "99", name: "สิทธิว่าง" },
  ],
};

const SPAN: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
};

interface Form {
  values: Record<string, string>;
  flags: Record<string, boolean>;
}

function blankForm(p: Patient | undefined): Form {
  return {
    values: {
      prefix: p?.prefix ?? "",
      firstName: p?.firstName ?? "",
      lastName: p?.lastName ?? "",
      cid: p?.cid ?? "",
      gender: p?.gender === "female" ? "หญิง" : p?.gender === "male" ? "ชาย" : "",
      birthdate: p?.birthdate ?? "",
      religion: p?.religion ?? "",
      nationality: p?.nationality ?? "ไทย",
      blood: p?.bloodGroup ?? "",
      rh: p?.rh ? `Rh${p.rh}` : "",
      marital: p?.marital ?? "",
      occupation: p?.occupation ?? "",
      mobilePhone: p?.phone ?? "",
    },
    flags: {},
  };
}

/* ============================================================
   Top app nav (matches the Home design)
   ============================================================ */


/* ============================================================
   Action cards (smartcard + appointment)
   ============================================================ */

interface ActionCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  buttonIcon: ReactNode;
  image: string;
  fadeColor: string;
}

function ActionCard({ title, description, buttonLabel, buttonIcon, image, fadeColor }: ActionCardProps) {
  return (
    <div
      className="relative flex items-center overflow-hidden rounded-[32px] border border-[#d9d9d9] py-6 pl-6"
      style={{ backgroundColor: fadeColor }}
    >
      <div className="relative z-10 flex w-[239px] flex-col gap-6">
        <div className="flex flex-col gap-4">
          <p className="text-xl font-medium text-black">{title}</p>
          <p className="text-base text-black">{description}</p>
        </div>
        <button className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          {buttonIcon}
          <span className="whitespace-nowrap text-xs font-medium text-black">{buttonLabel}</span>
        </button>
      </div>
      <div className="absolute right-[-28px] top-1/2 h-[216px] w-[324px] -translate-y-1/2">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(-90deg, rgba(255,255,255,0) 29.68%, ${fadeColor} 100%)`,
          }}
        />
      </div>
    </div>
  );
}

function ActionCards() {
  return (
    <div className="grid grid-cols-2 gap-5">
      <ActionCard
        title="อ่านบัตรประชาชน"
        description="นำบัตรประชาชนใส่ในเครื่องสแกนบัตร"
        buttonLabel="รองรับเฉพาะ Windows"
        buttonIcon={<img src={ICON_WINDOWS} alt="" className="h-5 w-5" />}
        image={CARD_SMARTCARD}
        fadeColor="#f8f8f8"
      />
      <ActionCard
        title="จองนัดออนไลน์"
        description="เลือกผู้ป่วยที่นัดหมายทางออนไลน์"
        buttonLabel="เลือกจากการนัดหมาย"
        buttonIcon={<img src={ICON_CALENDAR_EVENT} alt="" className="h-5 w-5" />}
        image={CARD_APPOINTMENT}
        fadeColor="#f8f8f8"
      />
    </div>
  );
}

/* ============================================================
   Main page
   ============================================================ */

export default function PatientOPDCard() {
  const { hn: hnParam } = useParams<{ hn: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  usePatients();

  // Fresh-save welcome overlay — when navigated here from /patient/new the
  // sender stashes the field list in a module-scoped handoff store keyed by
  // HN (history.pushState can't clone React component refs). We pull it out
  // once on mount so refresh doesn't replay it.
  const [freshSave] = useState(() =>
    hnParam ? takeFreshSave(hnParam) : undefined,
  );
  const [showSaveOverlay, setShowSaveOverlay] = useState(Boolean(freshSave));

  const isNew = !hnParam || hnParam === "new";
  const [hn, setHn] = useState(() => (isNew ? nextHN() : hnParam!));

  const patient = useMemo(() => (isNew ? undefined : getPatient(hn)), [isNew, hn]);
  const stored = useMemo<StoredProfile | undefined>(
    () => (isNew ? undefined : getStoredProfile(hn)),
    [isNew, hn],
  );
  const seed = useMemo(() => (isNew ? emptyProfile : getPatientProfile(hn) ?? emptyProfile), [isNew, hn]);

  const [form, setForm] = useState<Form>(() => {
    const base = blankForm(patient);
    return {
      values: { ...seed.form, ...stored?.form, ...base.values },
      flags: { ...seed.flags, ...stored?.flags, ...base.flags },
    };
  });

  const [rights, setRights] = useState<OPDRight[]>(stored?.rights ?? seed.rights);
  const [drugAllergies, setDrugAllergies] = useState<OPDAllergy[]>(
    stored?.drugAllergies ?? seed.drugAllergies,
  );
  const [lists, setLists] = useState<Partial<Record<OPDListKey, OPDListRow[]>>>(
    stored?.lists ?? seed.lists,
  );

  const [leftTab, setLeftTab] = useState<LeftTab>("ข้อมูลทั่วไป");
  const [subTab, setSubTab] = useState<SubTab>("patient");

  const setV = (k: string, v: string) =>
    setForm((f) => ({ ...f, values: { ...f.values, [k]: v } }));
  const setF = (k: string, v: boolean) =>
    setForm((f) => ({ ...f, flags: { ...f.flags, [k]: v } }));

  function save() {
    const v = form.values;
    if (!v.firstName || !v.lastName) {
      toast.error("ข้อมูลไม่ครบ", "กรุณาระบุชื่อ-นามสกุล");
      return;
    }
    const gender: Patient["gender"] = v.gender === "หญิง" ? "female" : "male";
    const blood = (v.blood || undefined) as Patient["bloodGroup"];
    const rh = v.rh === "Rh-" ? "-" : v.rh === "Rh+" ? "+" : undefined;

    if (isNew) {
      const created: Patient = {
        hn,
        cid: v.cid || "",
        prefix: v.prefix || "นาย",
        firstName: v.firstName,
        lastName: v.lastName,
        gender,
        birthdate: v.birthdate || "2000-01-01",
        bloodGroup: blood,
        rh,
        religion: v.religion,
        nationality: v.nationality,
        marital: v.marital,
        occupation: v.occupation,
        phone: v.mobilePhone,
        status: "active",
        totalVisits: 0,
      };
      addPatient(created);
      saveProfile(hn, form.values, form.flags, { rights, drugAllergies, lists });
      toast.success("บันทึกสำเร็จ", `เพิ่มผู้ป่วย HN ${hn}`);
      setHn(hn);
      navigate(`/opd/${hn}`, { replace: true });
    } else {
      updatePatient(hn, {
        prefix: v.prefix,
        firstName: v.firstName,
        lastName: v.lastName,
        cid: v.cid,
        gender,
        birthdate: v.birthdate,
        bloodGroup: blood,
        rh,
        religion: v.religion,
        nationality: v.nationality,
        marital: v.marital,
        occupation: v.occupation,
        phone: v.mobilePhone,
      });
      saveProfile(hn, form.values, form.flags, { rights, drugAllergies, lists });
      toast.success("บันทึกสำเร็จ", `อัปเดต HN ${hn}`);
    }
  }

  useEffect(() => {
    if (isNew) return;
    const t = window.setTimeout(() => {
      saveProfile(hn, form.values, form.flags, { rights, drugAllergies, lists });
    }, 400);
    return () => window.clearTimeout(t);
  }, [hn, isNew, form, rights, drugAllergies, lists]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <div className="fixed inset-0 z-0">
        <img src={HERO_BG} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      {/* Spacer so the page content clears the persistent global header. */}
      <div className="h-[60px] shrink-0" aria-hidden />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* White card panel */}
        <div className="flex min-h-0 flex-1 flex-col rounded-t-[32px] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.08)]">
          {/* Page header — non-scrolling band */}
          <div className="flex shrink-0 items-center justify-between px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <Button
                isIconOnly
                variant="light"
                radius="full"
                className="bg-sky-50 text-[#3485ff]"
                onPress={() => navigate("/")}
                aria-label="back"
              >
                <IconArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                OPD Registry / เวชระเบียนผู้ป่วย
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <DocumentDropZone
                onApply={(fields) =>
                  setForm((f) => ({
                    ...f,
                    values: { ...f.values, ...fields },
                  }))
                }
              />
              <DictationButton
                prompt="บันทึกเวชระเบียนผู้ป่วยนอก โรงพยาบาล. Mixed Thai and English clinical speech. Keep English medical terms in English script (e.g., hypertension, diabetes mellitus, CBC, aspirin, paracetamol). Do not transliterate English to Thai characters."
                onResult={(text) =>
                  setForm((f) => ({
                    ...f,
                    values: {
                      ...f.values,
                      note: [f.values.note, text].filter(Boolean).join("\n"),
                    },
                  }))
                }
              />
              <Button
                color="primary"
                radius="lg"
                className="bg-[#3485ff]"
                startContent={<IconDeviceFloppy className="h-5 w-5" />}
                onPress={save}
              >
                บันทึก
              </Button>
            </div>
          </div>

          {/* Body: rail (sticky) | (cards + tabs + forms) — only right column scrolls */}
          <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr] gap-6 px-8">
          {/* Left rail */}
          <aside className="min-h-0 overflow-y-auto pb-24">
            <p className="mb-4 text-base font-medium text-black/60">เมนูทั้งหมด</p>
            <ul className="flex flex-col gap-2" role="tablist" aria-label="OPD sections">
              {LEFT_TABS.map((t) => {
                const active = leftTab === t;
                return (
                  <li key={t}>
                    <button
                      role="tab"
                      aria-selected={active}
                      onClick={() => setLeftTab(t)}
                      className={`flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-base font-medium transition ${
                        active
                          ? "bg-[rgba(52,133,255,0.05)] text-[#3485ff]"
                          : "text-black hover:bg-black/5"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          active ? "bg-[#3485ff]" : "bg-transparent"
                        }`}
                      />
                      {t}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Right column: cards → tabs → forms */}
          <section className="flex min-h-0 flex-col gap-6 overflow-y-auto pb-24 pr-2">
            <ActionCards />
            {leftTab === "ข้อมูลทั่วไป" && (
              <>
                <SubTabs current={subTab} onChange={setSubTab} />
                <GeneralPane
                  sub={subTab}
                  form={form}
                  setV={setV}
                  setF={setF}
                  hn={hn}
                  drugAllergies={drugAllergies}
                  setDrugAllergies={setDrugAllergies}
                  onOpenAllergyTab={() => setLeftTab("การแพ้ยา")}
                />
              </>
            )}
            {leftTab === "สิทธิการรักษา" && (
              <RightsTab rights={rights} setRights={setRights} />
            )}
            {leftTab === "การแพ้ยา" && (
              <AllergyTab list={drugAllergies} setList={setDrugAllergies} />
            )}
            {leftTab === "โรคประจำตัว" && (
              <ListTab
                tab="chronic"
                title="โรคประจำตัว"
                columns={[
                  { key: "name", label: "ชื่อโรค", span: 2 },
                  { key: "icd", label: "รหัส ICD-10" },
                  { key: "note", label: "หมายเหตุ", span: 3, area: true },
                ]}
                lists={lists}
                setLists={setLists}
              />
            )}
            {leftTab === "การแพ้อาหาร" && (
              <ListTab
                tab="food-allergy"
                title="การแพ้อาหาร"
                columns={[
                  { key: "food", label: "ชื่ออาหารที่แพ้", span: 2 },
                  { key: "symptom", label: "อาการที่แพ้" },
                  { key: "note", label: "หมายเหตุ", area: true },
                ]}
                lists={lists}
                setLists={setLists}
              />
            )}
            {leftTab === "สถานะพิเศษ" && (
              <ListTab
                tab="special"
                title="สถานะพิเศษ"
                columns={[
                  {
                    key: "status",
                    label: "สถานะพิเศษ",
                    options: ["ผู้สูงอายุ", "ผู้พิการ", "ผู้ป่วยติดเตียง", "หญิงตั้งครรภ์"],
                  },
                  { key: "note", label: "หมายเหตุ", span: 2, area: true },
                ]}
                lists={lists}
                setLists={setLists}
              />
            )}
            {leftTab === "ข้อมูลปกปิด" && (
              <ListTab
                tab="confidential"
                title="ข้อมูลปกปิด"
                columns={[{ key: "text", label: "รายละเอียดข้อมูลปกปิด", span: 3, area: true }]}
                lists={lists}
                setLists={setLists}
              />
            )}
            {leftTab === "การนัดหมาย" && (
              <ListTab
                tab="appointment"
                title="การนัดหมาย"
                columns={[
                  { key: "status", label: "สถานะ" },
                  { key: "visitDate", label: "วันที่ตรวจ", date: true },
                  { key: "nextDate", label: "นัดครั้งถัดไป", date: true },
                  { key: "nextTime", label: "เวลา" },
                  { key: "doctor", label: "แพทย์" },
                  { key: "clinic", label: "คลินิก" },
                  { key: "cause", label: "เหตุผลการนัด", span: 2, area: true },
                ]}
                lists={lists}
                setLists={setLists}
              />
            )}
            {leftTab === "Note" && (
              <ListTab
                tab="note"
                title="Note"
                columns={[
                  { key: "date", label: "วันที่", date: true },
                  { key: "author", label: "ผู้เขียน" },
                  { key: "note", label: "ข้อความ Note", span: 3, area: true },
                ]}
                lists={lists}
                setLists={setLists}
              />
            )}
            {leftTab === "ผู้ดูแล" && (
              <ListTab
                tab="caregiver"
                title="ผู้ดูแล"
                columns={[
                  { key: "relation", label: "ความสัมพันธ์", options: OPT.relation },
                  { key: "prefix", label: "คำนำหน้า", options: OPT.prefix },
                  { key: "firstName", label: "ชื่อ" },
                  { key: "lastName", label: "นามสกุล" },
                  { key: "cid", label: "เลขบัตรประชาชน" },
                  { key: "phone", label: "เบอร์โทรศัพท์" },
                  { key: "address", label: "ที่อยู่", span: 3, area: true },
                ]}
                lists={lists}
                setLists={setLists}
              />
            )}
            {(leftTab === "การพิมพ์เอกสาร" ||
              leftTab === "ePrescription" ||
              leftTab === "Audit") && (
              <Panel title={leftTab}>
                <p className="py-12 text-center text-gray-500">หน้านี้อยู่ระหว่างพัฒนา</p>
              </Panel>
            )}
          </section>
        </div>
        </div>
      </div>

      </div>

      <SaveCommitOverlay
        open={showSaveOverlay}
        module={{
          label: "ทะเบียนผู้ป่วย",
          sublabel: patient
            ? `HN ${patient.hn} • ${patient.firstName} ${patient.lastName}`
            : `HN ${hn}`,
          Icon: IconUserPlus,
          accent: "violet",
        }}
        fields={freshSave?.fields ?? []}
        duration={2200}
        onComplete={() => setShowSaveOverlay(false)}
      />
    </div>
  );
}

/* ============================================================
   Sub-tabs for "ข้อมูลทั่วไป"
   ============================================================ */

function SubTabs({ current, onChange }: { current: SubTab; onChange: (s: SubTab) => void }) {
  return (
    <Tabs
      variant="solid"
      radius="full"
      selectedKey={current}
      onSelectionChange={(k) => onChange(k as SubTab)}
      aria-label="General info sub sections"
      classNames={{
        tabList: "gap-0.5 bg-black/5 px-2 py-1",
        tab: "h-8 px-3 data-[hover-unselected=true]:opacity-100",
        tabContent:
          "text-sm text-[#71717a] group-data-[selected=true]:font-medium group-data-[selected=true]:text-[#18181b]",
        cursor: "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
      }}
    >
      {GENERAL_SUBTABS.map((t) => (
        <Tab key={t.key} title={t.label} />
      ))}
    </Tabs>
  );
}

/* ============================================================
   General pane (photo + fingerprint column + form grid)
   ============================================================ */

interface GeneralPaneProps {
  sub: SubTab;
  form: Form;
  setV: (k: string, v: string) => void;
  setF: (k: string, v: boolean) => void;
  hn: string;
  drugAllergies: OPDAllergy[];
  setDrugAllergies: (l: OPDAllergy[]) => void;
  onOpenAllergyTab?: () => void;
}

function GeneralPane({ sub, form, setV, setF, hn, drugAllergies, setDrugAllergies, onOpenAllergyTab }: GeneralPaneProps) {
  return (
    <div className="grid grid-cols-[220px_1fr] gap-5">
      {/* Photo column (HN sits above the placeholders only on the patient sub-tab) */}
      <div className="flex flex-col gap-3">
        {sub === "patient" && (
          <Field label="HN" required>
            <div className="flex gap-1.5">
              <Input
                value={hn}
                isReadOnly
                size="sm"
                radius="md"
                variant="flat"
                classNames={{ inputWrapper: "h-[50px] min-h-[50px] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.06)] data-[hover=true]:bg-white" }}
              />
              <Button size="sm" className="shrink-0 rounded-lg bg-[#3485ff] px-3 text-xs font-medium text-white">
                กำหนดเอง
              </Button>
            </div>
          </Field>
        )}
        <div className="flex aspect-square w-full items-center justify-center rounded-[32px] bg-gray-100 text-gray-400">
          <IconUser className="h-12 w-12" stroke={1.5} />
        </div>
        <div className="flex aspect-square w-full items-center justify-center rounded-[32px] bg-gray-100 text-gray-400">
          <IconFingerprint className="h-12 w-12" stroke={1.5} />
        </div>
      </div>

      {/* Form content */}
      <div>
        {sub === "patient" && (
          <PatientForm
            form={form}
            setV={setV}
            setF={setF}
            drugAllergies={drugAllergies}
            setDrugAllergies={setDrugAllergies}
            onOpenAllergyTab={onOpenAllergyTab}
          />
        )}
        {sub === "kin" && <KinForm form={form} setV={setV} />}
        {sub === "social" && <SocialForm form={form} setV={setV} setF={setF} />}
        {sub === "personType" && <PersonTypeForm form={form} setV={setV} />}
        {sub === "alien" && <AlienForm form={form} setV={setV} />}
        {sub === "birth" && <BirthForm form={form} setV={setV} />}
        {sub === "death" && <DeathForm form={form} setV={setV} setF={setF} />}
        {sub === "english" && <EnglishForm form={form} setV={setV} />}
        {sub === "other" && <OtherForm form={form} setV={setV} setF={setF} />}
      </div>
    </div>
  );
}

/* ============================================================
   Sub-tab forms
   ============================================================ */

function PatientForm({
  form,
  setV,
  setF,
  drugAllergies,
  setDrugAllergies,
  onOpenAllergyTab,
}: {
  form: Form;
  setV: (k: string, v: string) => void;
  setF: (k: string, v: boolean) => void;
  drugAllergies: OPDAllergy[];
  setDrugAllergies: (l: OPDAllergy[]) => void;
  onOpenAllergyTab?: () => void;
}) {
  const v = form.values;
  return (
    <Grid cols={5}>
      <SelectField label="คำนำหน้า" value={v.prefix} onChange={(x) => setV("prefix", x)} options={OPT.prefix} required />
      <TextField label="ชื่อ" value={v.firstName} onChange={(x) => setV("firstName", x)} required />
      <TextField label="นามสกุล" value={v.lastName} onChange={(x) => setV("lastName", x)} required />
      <TextField label="บัตรประชาชน" value={v.cid} onChange={(x) => setV("cid", x)} required span={2} />
      <Field label="วันเกิด" required>
        <Input
          type={form.flags.dobUnsure ? "text" : "date"}
          value={form.flags.dobUnsure ? "" : v.birthdate ?? ""}
          onValueChange={(x) => setV("birthdate", x)}
          isReadOnly={!!form.flags.dobUnsure}
          placeholder={form.flags.dobUnsure ? "ไม่ทราบ" : "dd/mm/yyyy"}
          size="sm"
          radius="md"
          variant="flat"
          classNames={{ inputWrapper: "h-[50px] min-h-[50px] bg-white pr-1 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.06)] data-[hover=true]:bg-white" }}
          startContent={<IconCalendarEvent className="h-4 w-4 text-gray-400" stroke={1.75} />}
          endContent={
            <ToggleChip active={!!form.flags.dobUnsure} onClick={() => setF("dobUnsure", !form.flags.dobUnsure)}>
              ไม่ทราบ
            </ToggleChip>
          }
        />
      </Field>
      <Field label="เวลาเกิด" required>
        <Input
          type={form.flags.tobUnsure ? "text" : "time"}
          value={form.flags.tobUnsure ? "" : v.birthtime ?? ""}
          onValueChange={(x) => setV("birthtime", x)}
          isReadOnly={!!form.flags.tobUnsure}
          placeholder={form.flags.tobUnsure ? "ไม่ทราบ" : "hh:mm"}
          size="sm"
          radius="md"
          variant="flat"
          classNames={{ inputWrapper: "h-[50px] min-h-[50px] bg-white pr-1 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.06)] data-[hover=true]:bg-white" }}
          endContent={
            <ToggleChip active={!!form.flags.tobUnsure} onClick={() => setF("tobUnsure", !form.flags.tobUnsure)}>
              ไม่ทราบ
            </ToggleChip>
          }
        />
      </Field>

      <SelectField label="เพศกำเนิด" value={v.gender} onChange={(x) => setV("gender", x)} options={OPT.gender} required />
      <SelectField label="เชื้อชาติ" value={v.race} onChange={(x) => setV("race", x)} options={OPT.race} required />
      <SelectField label="สัญชาติ" value={v.nationality} onChange={(x) => setV("nationality", x)} options={OPT.race} required />
      <SelectField label="ศาสนา" value={v.religion} onChange={(x) => setV("religion", x)} options={OPT.religion} required />
      <TextField label="จำนวนพี่น้อง" value={v.siblingsCount} onChange={(x) => setV("siblingsCount", x)} required />
      <TextField label="บุตรคนที่" value={v.childOrder} onChange={(x) => setV("childOrder", x)} required />

      <SelectField label="หมู่เลือด" value={v.blood} onChange={(x) => setV("blood", x)} options={OPT.blood} required />
      <SelectField label="Rh" value={v.rh} onChange={(x) => setV("rh", x)} options={OPT.rh} required />
      <Field label="การแพ้ยา" span={3} required>
        <Input
          value={drugAllergies.map((a) => a.data.drug).filter(Boolean).join(", ")}
          onValueChange={(text) => {
            // Quick-entry: comma-separated drug names → rebuild the
            // OPDAllergy list. Existing entries keep their id + extra
            // fields (severity, reaction, etc.) so the user doesn't
            // lose detail when adding/removing names from this shortcut
            // input. New names get a fresh id and an empty data shell.
            const names = text
              .split(/[,，]/)
              .map((s) => s.trim())
              .filter(Boolean);
            const byDrug = new Map(
              drugAllergies.map((a) => [a.data.drug?.trim() ?? "", a]),
            );
            const next: OPDAllergy[] = names.map((name) => {
              const existing = byDrug.get(name);
              if (existing) return existing;
              return {
                id: `da_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                data: { drug: name },
                flags: {},
              };
            });
            setDrugAllergies(next);
          }}
          placeholder="พิมพ์ชื่อยา คั่นด้วยจุลภาค เช่น Penicillin, NSAIDs"
          size="sm"
          radius="md"
          variant="flat"
          classNames={{
            inputWrapper:
              "h-[50px] min-h-[50px] bg-white pr-1 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.06)] data-[hover=true]:bg-white",
          }}
          endContent={
            <button
              type="button"
              onClick={onOpenAllergyTab}
              className="shrink-0 rounded-md bg-[#3485ff] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#2670e8]"
            >
              จัดการ
            </button>
          }
        />
      </Field>

      <SelectField label="สถานภาพ" value={v.marital} onChange={(x) => setV("marital", x)} options={OPT.marital} required />
      <Field label="ผู้แจ้ง" span={3} required>
        <Input
          value={v.reporterName ?? ""}
          onValueChange={(x) => setV("reporterName", x)}
          size="sm"
          radius="md"
          variant="flat"
          classNames={{ inputWrapper: "h-[50px] min-h-[50px] bg-white pr-1 shadow-[0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.06)] data-[hover=true]:bg-white" }}
          endContent={
            <button className="shrink-0 rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              ที่อยู่
            </button>
          }
        />
      </Field>
      <SelectField label="ความสัมพันธ์" value={v.reporterRelation} onChange={(x) => setV("reporterRelation", x)} options={OPT.relation} required />
    </Grid>
  );
}

function KinForm({ form, setV }: { form: Form; setV: (k: string, v: string) => void }) {
  const v = form.values;
  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        { k: "father", label: "บิดา", cid: true },
        { k: "mother", label: "มารดา", cid: true },
        { k: "spouse", label: "คู่สมรส", cid: true },
        { k: "contact", label: "ผู้ติดต่อ", cid: false },
      ].map((g) => (
        <div key={g.k} className="rounded-[32px] border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-gray-700">{g.label}</p>
          <Grid cols={2}>
            <TextField label="ชื่อ" value={v[`${g.k}FirstName`]} onChange={(x) => setV(`${g.k}FirstName`, x)} />
            <TextField label="นามสกุล" value={v[`${g.k}LastName`]} onChange={(x) => setV(`${g.k}LastName`, x)} />
            {g.cid ? (
              <TextField label="เลขบัตรประชาชน" value={v[`${g.k}Cid`]} onChange={(x) => setV(`${g.k}Cid`, x)} span={2} />
            ) : (
              <SelectField
                label="ความสัมพันธ์"
                value={v.contactRelation}
                onChange={(x) => setV("contactRelation", x)}
                options={OPT.relation}
                span={2}
              />
            )}
            <TextField label="เบอร์โทรศัพท์" value={v[`${g.k}Phone`]} onChange={(x) => setV(`${g.k}Phone`, x)} span={2} />
          </Grid>
        </div>
      ))}
    </div>
  );
}

function SocialForm({
  form,
  setV,
  setF,
}: {
  form: Form;
  setV: (k: string, v: string) => void;
  setF: (k: string, v: boolean) => void;
}) {
  const v = form.values;
  return (
    <Grid cols={3}>
      <SelectField label="สถานะในครอบครัว" value={v.familyStatus} onChange={(x) => setV("familyStatus", x)} options={OPT.familyStatus} />
      <SelectField label="สถานะบุคคล" value={v.personStatus} onChange={(x) => setV("personStatus", x)} options={OPT.personStatus} />
      <SelectField label="การศึกษา" value={v.education} onChange={(x) => setV("education", x)} options={OPT.education} />
      <SelectField label="ชนิดบุคคลต่างด้าว" value={v.alienKindSocial} onChange={(x) => setV("alienKindSocial", x)} options={OPT.alien} />
      <SelectField label="ตำแหน่งในชุมชน" value={v.community} onChange={(x) => setV("community", x)} options={OPT.community} span={2} />
      <CheckboxField label="อยู่ในเขตรับผิดชอบ" checked={!!form.flags.inResponsibleAreaSocial} onChange={(x) => setF("inResponsibleAreaSocial", x)} span={3} />
    </Grid>
  );
}

function PersonTypeForm({ form, setV }: { form: Form; setV: (k: string, v: string) => void }) {
  const v = form.values;
  return (
    <Grid cols={3}>
      <SelectField label="ประเภทบุคคล" value={v.personType} onChange={(x) => setV("personType", x)} options={OPT.personType} span={2} />
      <TextField label="เลขที่ข้าราชการ" value={v.govNo} onChange={(x) => setV("govNo", x)} />
      <TextField label="สังกัดหลัก" value={v.affilMain} onChange={(x) => setV("affilMain", x)} />
      <TextField label="สังกัดรอง" value={v.affilSub} onChange={(x) => setV("affilSub", x)} span={2} />
    </Grid>
  );
}

function AlienForm({ form, setV }: { form: Form; setV: (k: string, v: string) => void }) {
  const v = form.values;
  return (
    <Grid cols={3}>
      <SelectField label="ชนิดบุคคลต่างด้าว" value={v.alienKind} onChange={(x) => setV("alienKind", x)} options={OPT.alien} />
      <TextField label="เลขที่หนังสือเดินทาง" value={v.passport} onChange={(x) => setV("passport", x)} />
      <TextField label="ประเทศต้นทาง" value={v.originCountry} onChange={(x) => setV("originCountry", x)} />
      <TextField label="ใบอนุญาตทำงาน" value={v.workPermit} onChange={(x) => setV("workPermit", x)} />
      <TextField label="วันที่อนุญาตเข้าประเทศ" type="date" value={v.entryDate} onChange={(x) => setV("entryDate", x)} />
      <TextField label="วันหมดอายุ" type="date" value={v.permitExpire} onChange={(x) => setV("permitExpire", x)} />
    </Grid>
  );
}

function BirthForm({ form, setV }: { form: Form; setV: (k: string, v: string) => void }) {
  const v = form.values;
  return (
    <Grid cols={3}>
      <TextField label="สถานที่เกิด" value={v.birthPlace} onChange={(x) => setV("birthPlace", x)} span={2} />
      <TextField label="น้ำหนักแรกเกิด (กรัม)" value={v.birthWeight} onChange={(x) => setV("birthWeight", x)} />
      <TextField label="เลขที่สูติบัตร" value={v.birthCertNo} onChange={(x) => setV("birthCertNo", x)} />
      <TextField label="แพทย์ผู้ทำคลอด" value={v.birthDoctor} onChange={(x) => setV("birthDoctor", x)} span={2} />
      <TextField label="ลำดับการเกิด (ครรภ์ที่)" value={v.birthOrder} onChange={(x) => setV("birthOrder", x)} />
      <TextField label="อายุครรภ์ (สัปดาห์)" value={v.gestationWeeks} onChange={(x) => setV("gestationWeeks", x)} />
    </Grid>
  );
}

function DeathForm({
  form,
  setV,
  setF,
}: {
  form: Form;
  setV: (k: string, v: string) => void;
  setF: (k: string, v: boolean) => void;
}) {
  const v = form.values;
  return (
    <Grid cols={3}>
      <TextField label="วันที่เสียชีวิต" type="date" value={v.deathDate} onChange={(x) => setV("deathDate", x)} />
      <TextField label="เวลาเสียชีวิต" type="time" value={v.deathTime} onChange={(x) => setV("deathTime", x)} />
      <SelectField label="สถานที่เสียชีวิต" value={v.deathPlace} onChange={(x) => setV("deathPlace", x)} options={OPT.deathPlace} />
      <SelectField label="แหล่งข้อมูล" value={v.deathSource} onChange={(x) => setV("deathSource", x)} options={OPT.deathSource} />
      <TextField label="เลขที่ใบมรณบัตร" value={v.deathCertNo} onChange={(x) => setV("deathCertNo", x)} span={2} />
      <CheckboxField label="ไม่ทราบรายละเอียด" checked={!!form.flags.deathUnknown} onChange={(x) => setF("deathUnknown", x)} span={3} />
      <TextField label="สาเหตุการตาย (ICD-10)" value={v.deathIcd} onChange={(x) => setV("deathIcd", x)} span={3} />
      <TextAreaField label="สาเหตุหลักการเสียชีวิต / รายละเอียด" value={v.deathCause} onChange={(x) => setV("deathCause", x)} span={3} />
    </Grid>
  );
}

function EnglishForm({ form, setV }: { form: Form; setV: (k: string, v: string) => void }) {
  const v = form.values;
  return (
    <Grid cols={4}>
      <TextField label="Prefix" value={v.enPrefix} onChange={(x) => setV("enPrefix", x)} />
      <TextField label="First Name" value={v.enFirstName} onChange={(x) => setV("enFirstName", x)} />
      <TextField label="Middle Name" value={v.enMiddleName} onChange={(x) => setV("enMiddleName", x)} />
      <TextField label="Last Name" value={v.enLastName} onChange={(x) => setV("enLastName", x)} />
      <TextAreaField label="Address" value={v.enAddress} onChange={(x) => setV("enAddress", x)} span={4} />
    </Grid>
  );
}

function OtherForm({
  form,
  setV,
  setF,
}: {
  form: Form;
  setV: (k: string, v: string) => void;
  setF: (k: string, v: boolean) => void;
}) {
  const v = form.values;
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-gray-800">ที่อยู่</h3>
      <Grid cols={4}>
        <TextField label="บ้านเลขที่" value={v.houseNo} onChange={(x) => setV("houseNo", x)} />
        <TextField label="หมู่" value={v.moo} onChange={(x) => setV("moo", x)} />
        <TextField label="ถนน" value={v.road} onChange={(x) => setV("road", x)} />
        <TextField label="ซอย" value={v.soi} onChange={(x) => setV("soi", x)} />
        <TextField label="ตำบล" value={v.subdistrict} onChange={(x) => setV("subdistrict", x)} />
        <TextField label="อำเภอ" value={v.district} onChange={(x) => setV("district", x)} />
        <TextField label="จังหวัด" value={v.province} onChange={(x) => setV("province", x)} />
        <TextField label="รหัสไปรษณีย์" value={v.postal} onChange={(x) => setV("postal", x)} />
        <TextField label="ประเทศ" value={v.country} onChange={(x) => setV("country", x)} span={2} />
      </Grid>

      <div className="mt-4 flex items-center gap-6">
        <Checkbox isSelected={!!form.flags.fileDestroyed} onValueChange={(b) => setF("fileDestroyed", b)} size="sm">
          แฟ้มถูกทำลาย
        </Checkbox>
        <Checkbox isSelected={!!form.flags.inResponsibleArea} onValueChange={(b) => setF("inResponsibleArea", b)} size="sm">
          อยู่ในเขตความรับผิดชอบ
        </Checkbox>
        <Checkbox isSelected={!!form.flags.consentGiven} onValueChange={(b) => setF("consentGiven", b)} size="sm">
          ผู้ป่วยยินยอมเปิดเผยข้อมูล
        </Checkbox>
      </div>

      <h3 className="mb-3 mt-6 text-sm font-medium text-gray-800">ข้อมูลอื่น ๆ</h3>
      <Grid cols={4}>
        <TextField label="โทรศัพท์บ้าน" value={v.homePhone} onChange={(x) => setV("homePhone", x)} />
        <TextField label="มือถือ" value={v.mobilePhone} onChange={(x) => setV("mobilePhone", x)} />
        <TextField label="เบอร์ที่ทำงาน" value={v.workPhone} onChange={(x) => setV("workPhone", x)} />
        <TextField label="E-mail" value={v.email} onChange={(x) => setV("email", x)} />
        <TextField label="Passport" value={v.passportOther} onChange={(x) => setV("passportOther", x)} />
        <TextField label="เลขที่อ้างอิง" value={v.refNo} onChange={(x) => setV("refNo", x)} />
        <SelectField label="ภาษาหลัก" value={v.language} onChange={(x) => setV("language", x)} options={OPT.language} />
        <SelectField label="สีผิว" value={v.skin} onChange={(x) => setV("skin", x)} options={OPT.skin} />
        <TextField label="ชื่อเล่น" value={v.nickname} onChange={(x) => setV("nickname", x)} />
        <TextField label="ที่ทำงาน" value={v.workplace} onChange={(x) => setV("workplace", x)} span={3} />
      </Grid>
    </div>
  );
}

/* ============================================================
   Rights / Allergy / Generic list tabs (unchanged behavior)
   ============================================================ */

function RightsTab({ rights, setRights }: { rights: OPDRight[]; setRights: (r: OPDRight[]) => void }) {
  const [editing, setEditing] = useState<OPDRight | null>(null);
  function commit(r: OPDRight) {
    if (rights.find((x) => x.id === r.id)) setRights(rights.map((x) => (x.id === r.id ? r : x)));
    else setRights([...rights, r]);
    setEditing(null);
  }
  return (
    <Panel
      title="สิทธิการรักษา"
      action={
        <Button
          size="sm"
          color="primary"
          className="bg-[#3485ff]"
          startContent={<IconPlus className="h-4 w-4" />}
          onPress={() =>
            setEditing({ id: `r${Date.now()}`, code: "", name: "", no: "", begin: "", expire: "" })
          }
        >
          เพิ่มสิทธิ
        </Button>
      }
    >
      {rights.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">ยังไม่มีรายการสิทธิ</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">รหัส</th>
              <th>สิทธิ</th>
              <th>เลขที่</th>
              <th>เริ่ม</th>
              <th>หมดอายุ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rights.map((r) => (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="py-2">{r.code}</td>
                <td>{r.name}</td>
                <td>{r.no}</td>
                <td>{r.begin}</td>
                <td>{r.expire}</td>
                <td className="text-right">
                  <Button isIconOnly size="sm" variant="light" onPress={() => setEditing(r)}>
                    <IconPencil className="h-4 w-4" />
                  </Button>
                  <Button isIconOnly size="sm" variant="light" onPress={() => setRights(rights.filter((x) => x.id !== r.id))}>
                    <IconTrash className="h-4 w-4 text-rose-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <Grid cols={3}>
            <SelectField
              label="สิทธิการรักษา"
              value={editing.code}
              onChange={(c) => {
                const found = OPT.rightCodes.find((x) => x.code === c);
                setEditing({ ...editing, code: c, name: found?.name ?? editing.name });
              }}
              options={OPT.rightCodes.map((x) => `${x.code} ${x.name}`)}
              span={2}
            />
            <TextField label="เลขที่" value={editing.no} onChange={(x) => setEditing({ ...editing, no: x })} />
            <TextField label="เริ่มต้น" type="date" value={editing.begin} onChange={(x) => setEditing({ ...editing, begin: x })} />
            <TextField label="หมดอายุ" type="date" value={editing.expire} onChange={(x) => setEditing({ ...editing, expire: x })} />
          </Grid>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="flat" onPress={() => setEditing(null)}>ยกเลิก</Button>
            <Button size="sm" color="primary" className="bg-[#3485ff]" onPress={() => commit(editing)}>บันทึก</Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function AllergyTab({ list, setList }: { list: OPDAllergy[]; setList: (l: OPDAllergy[]) => void }) {
  const [editing, setEditing] = useState<OPDAllergy | null>(null);
  function commit(a: OPDAllergy) {
    if (list.find((x) => x.id === a.id)) setList(list.map((x) => (x.id === a.id ? a : x)));
    else setList([...list, a]);
    setEditing(null);
  }
  return (
    <Panel
      title="การแพ้ยา / สารก่อภูมิแพ้"
      action={
        <Button
          size="sm"
          color="primary"
          className="bg-[#3485ff]"
          startContent={<IconPlus className="h-4 w-4" />}
          onPress={() => setEditing({ id: `a${Date.now()}`, data: {}, flags: {} })}
        >
          เพิ่มการแพ้
        </Button>
      }
    >
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">ยังไม่มีรายการแพ้ยา</p>
      ) : (
        <ul className="space-y-2">
          {list.map((a) => (
            <li key={a.id} className="flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 p-3">
              <div className="text-sm">
                <p className="font-medium text-rose-700">{a.data.drug || "—"}</p>
                <p className="text-rose-600">อาการ: {a.data.symptom || "—"} · ความรุนแรง: {a.data.seriousness || "—"}</p>
                <p className="text-xs text-rose-500">รายงาน: {a.data.reportDate} โดย {a.data.reporter}</p>
              </div>
              <div className="flex gap-1">
                <Button isIconOnly size="sm" variant="light" onPress={() => setEditing(a)}>
                  <IconPencil className="h-4 w-4" />
                </Button>
                <Button isIconOnly size="sm" variant="light" onPress={() => setList(list.filter((x) => x.id !== a.id))}>
                  <IconTrash className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <Grid cols={3}>
            <TextField label="วันที่รายงาน" type="date" value={editing.data.reportDate ?? ""} onChange={(x) => setEditing({ ...editing, data: { ...editing.data, reportDate: x } })} />
            <TextField label="ผู้รายงาน" value={editing.data.reporter ?? ""} onChange={(x) => setEditing({ ...editing, data: { ...editing.data, reporter: x } })} span={2} />
            <TextField label="ยา / สาร" value={editing.data.drug ?? ""} onChange={(x) => setEditing({ ...editing, data: { ...editing.data, drug: x } })} span={2} />
            <TextField label="ประเภท" value={editing.data.type ?? ""} onChange={(x) => setEditing({ ...editing, data: { ...editing.data, type: x } })} />
            <TextField label="อาการ" value={editing.data.symptom ?? ""} onChange={(x) => setEditing({ ...editing, data: { ...editing.data, symptom: x } })} span={2} />
            <TextField label="ความรุนแรง" value={editing.data.seriousness ?? ""} onChange={(x) => setEditing({ ...editing, data: { ...editing.data, seriousness: x } })} />
            <TextAreaField label="หมายเหตุ" value={editing.data.note ?? ""} onChange={(x) => setEditing({ ...editing, data: { ...editing.data, note: x } })} span={3} />
          </Grid>
          <div className="mt-3 flex items-center justify-between">
            <Checkbox
              isSelected={!!editing.flags.banned}
              onValueChange={(b) => setEditing({ ...editing, flags: { ...editing.flags, banned: b } })}
              size="sm"
            >
              ห้ามใช้ยานี้
            </Checkbox>
            <div className="flex gap-2">
              <Button size="sm" variant="flat" onPress={() => setEditing(null)}>ยกเลิก</Button>
              <Button size="sm" color="primary" className="bg-[#3485ff]" onPress={() => commit(editing)}>บันทึก</Button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

interface ColSpec {
  key: string;
  label: string;
  span?: number;
  area?: boolean;
  date?: boolean;
  options?: string[];
}

function ListTab({
  tab,
  title,
  columns,
  lists,
  setLists,
}: {
  tab: OPDListKey;
  title: string;
  columns: ColSpec[];
  lists: Partial<Record<OPDListKey, OPDListRow[]>>;
  setLists: (l: Partial<Record<OPDListKey, OPDListRow[]>>) => void;
}) {
  const rows = lists[tab] ?? [];
  const [editing, setEditing] = useState<OPDListRow | null>(null);
  function update(next: OPDListRow[]) {
    setLists({ ...lists, [tab]: next });
  }
  function commit(r: OPDListRow) {
    if (rows.find((x) => x.id === r.id)) update(rows.map((x) => (x.id === r.id ? r : x)));
    else update([...rows, r]);
    setEditing(null);
  }
  function remove(id: string) {
    update(rows.filter((x) => x.id !== id));
  }

  return (
    <Panel
      title={title}
      action={
        <Button
          size="sm"
          color="primary"
          className="bg-[#3485ff]"
          startContent={<IconPlus className="h-4 w-4" />}
          onPress={() => setEditing({ id: `l${Date.now()}`, data: {} })}
        >
          เพิ่มรายการ
        </Button>
      }
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">ยังไม่มีรายการ</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              {columns.map((c) => (
                <th key={c.key} className="py-2">{c.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100">
                {columns.map((c) => (
                  <td key={c.key} className="py-2">{r.data[c.key] || "—"}</td>
                ))}
                <td className="text-right">
                  <Button isIconOnly size="sm" variant="light" onPress={() => setEditing(r)}>
                    <IconPencil className="h-4 w-4" />
                  </Button>
                  <Button isIconOnly size="sm" variant="light" onPress={() => remove(r.id)}>
                    <IconTrash className="h-4 w-4 text-rose-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <Grid cols={3}>
            {columns.map((c) => {
              const v = editing.data[c.key] ?? "";
              const set = (x: string) => setEditing({ ...editing, data: { ...editing.data, [c.key]: x } });
              if (c.area) return <TextAreaField key={c.key} label={c.label} value={v} onChange={set} span={c.span} />;
              if (c.options) return <SelectField key={c.key} label={c.label} value={v} onChange={set} options={c.options} span={c.span} />;
              if (c.date) return <TextField key={c.key} label={c.label} value={v} onChange={set} type="date" span={c.span} />;
              return <TextField key={c.key} label={c.label} value={v} onChange={set} span={c.span} />;
            })}
          </Grid>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="flat" onPress={() => setEditing(null)}>ยกเลิก</Button>
            <Button size="sm" color="primary" className="bg-[#3485ff]" onPress={() => commit(editing)}>บันทึก</Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ============================================================
   Tiny UI primitives
   ============================================================ */

function Panel({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[32px] border border-gray-200 bg-white p-5">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-gray-800">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Grid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const colsClass =
    cols === 5
      ? "grid-cols-5"
      : cols === 4
        ? "grid-cols-4"
        : cols === 2
          ? "grid-cols-2"
          : "grid-cols-3";
  return <div className={`grid gap-3 ${colsClass}`}>{children}</div>;
}

function Field({
  label,
  children,
  span = 1,
  required,
}: {
  label: string;
  children: ReactNode;
  span?: number;
  required?: boolean;
}) {
  return (
    <div className={SPAN[span] ?? "col-span-1"}>
      <label className="mb-2 flex items-center gap-1 text-sm font-medium text-[#18181b]">
        {label} {required && <span className="text-[#ff383c]">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  span,
  required,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  type?: string;
  span?: number;
  required?: boolean;
}) {
  return (
    <Field label={label} span={span} required={required}>
      <Input size="sm" type={type} value={value ?? ""} onValueChange={onChange} radius="md" variant="flat" classNames={{ inputWrapper: "h-[50px] min-h-[50px] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.06)] data-[hover=true]:bg-white" }} />
    </Field>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  span,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  span?: number;
}) {
  return (
    <Field label={label} span={span}>
      <Textarea size="sm" value={value ?? ""} onValueChange={onChange} radius="md" variant="flat" classNames={{ inputWrapper: "h-[50px] min-h-[50px] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.06)] data-[hover=true]:bg-white" }} minRows={2} />
    </Field>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  span,
  required,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: string[];
  span?: number;
  required?: boolean;
}) {
  return (
    <Field label={label} span={span} required={required}>
      <Select
        size="sm"
        selectedKeys={value ? new Set([value]) : new Set()}
        onSelectionChange={(keys) => {
          const k = Array.from(keys as Set<string>)[0] ?? "";
          onChange(k);
        }}
        radius="md"
        variant="flat"
        classNames={{ trigger: "h-[50px] min-h-[50px] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.06)] data-[hover=true]:bg-white", value: "text-sm" }}
        aria-label={label}
        placeholder="Select one"
      >
        {options.map((o) => (
          <SelectItem key={o}>{o}</SelectItem>
        ))}
      </Select>
    </Field>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
  span,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  span?: number;
}) {
  return (
    <div className={`${SPAN[span ?? 1]} flex items-center`}>
      <Checkbox isSelected={checked} onValueChange={onChange} size="sm">
        {label}
      </Checkbox>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-md border px-3 text-xs transition ${
        active
          ? "border-sky-300 bg-sky-100 text-sky-700"
          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
