import { useState } from "react";
import {
  Button,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Tabs,
  Tab,
  Card,
  CardBody,
  CardHeader,
  Avatar,
  Badge,
  Chip,
  Divider,
} from "@heroui/react";
import {
  Menu,
  Cloud,
  Search,
  UserPlus,
  Save,
  ClipboardList,
  Bell,
  ChevronDown,
  ChevronRight,
  Home,
  FolderOpen,
  FileText,
  Briefcase,
  Database,
  Activity,
  Settings as SettingsIcon,
  FileCheck,
  Building2,
  Share2,
  BarChart3,
  Package,
  Video,
  Cog,
  Image as ImageIcon,
  Upload,
  Camera,
  IdCard,
  CalendarDays,
  PencilLine,
  RefreshCw,
  X,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Leaf = { label: string; active?: boolean };
type Branch = { label: string; icon: React.ReactNode; children?: Leaf[] };

const menu: Branch[] = [
  { label: "Home", icon: <Home className="w-4 h-4" /> },
  {
    label: "OPD Registry",
    icon: <FolderOpen className="w-4 h-4" />,
    children: [
      { label: "เวชระเบียนผู้ป่วย", active: true },
      { label: "ทะเบียนผู้ป่วย" },
      { label: "ส่งตรวจผู้ป่วย" },
      { label: "ทะเบียนผู้มารับบริการ" },
      { label: "ทะเบียนนัดหมาย" },
      { label: "ทะเบียนผู้ป่วยโรคเรื้อรัง" },
      { label: "ทะเบียนนัดหมายฟอกเลือด" },
    ],
  },
  { label: "Workbench", icon: <Briefcase className="w-4 h-4" /> },
  { label: "Data Export", icon: <Database className="w-4 h-4" /> },
  { label: "EPIDEM", icon: <Activity className="w-4 h-4" /> },
  { label: "Setting", icon: <SettingsIcon className="w-4 h-4" /> },
  { label: "Claims Submission", icon: <FileCheck className="w-4 h-4" /> },
  { label: "PCU", icon: <Building2 className="w-4 h-4" /> },
  { label: "Referral", icon: <Share2 className="w-4 h-4" /> },
  { label: "Report", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Inventory", icon: <Package className="w-4 h-4" /> },
  { label: "Telehealth", icon: <Video className="w-4 h-4" /> },
  { label: "System", icon: <Cog className="w-4 h-4" /> },
];

const subTabs = [
  { key: "general", label: "ข้อมูลทั่วไป", icon: <User className="w-4 h-4" /> },
  { key: "rights", label: "สิทธิการรักษา", icon: <FileCheck className="w-4 h-4" /> },
  { key: "drugAllergy", label: "การแพ้ยา", icon: <AlertCircle className="w-4 h-4" /> },
  { key: "chronic", label: "โรคประจำตัว", icon: <Heart className="w-4 h-4" /> },
  { key: "foodAllergy", label: "การแพ้อาหาร", icon: <AlertCircle className="w-4 h-4" /> },
  { key: "special", label: "สถานะพิเศษ", icon: <Sparkles className="w-4 h-4" /> },
  { key: "private", label: "ข้อมูลปกปิด", icon: <FileText className="w-4 h-4" /> },
  { key: "appointment", label: "การนัดหมาย", icon: <CalendarDays className="w-4 h-4" /> },
  { key: "note", label: "Note", icon: <FileText className="w-4 h-4" /> },
  { key: "print", label: "การพิมพ์เอกสาร", icon: <FileText className="w-4 h-4" /> },
  { key: "rx", label: "ePrescription", icon: <FileText className="w-4 h-4" /> },
  { key: "audit", label: "Audit", icon: <CheckCircle2 className="w-4 h-4" /> },
  { key: "caretaker", label: "ผู้ดูแล", icon: <User className="w-4 h-4" /> },
];

const relTabs = [
  "ข้อมูลญาติ",
  "ข้อมูลทางสังคม",
  "ประเภทบุคคล",
  "บุคคลอ้างอิง",
  "ข้อมูลการเกิด",
  "การเสียชีวิต",
  "ชื่อภาษาต่างประเทศ",
];

/* ===================== Form atoms ===================== */

const inputClassNames = {
  label: "text-[12.5px] font-medium text-default-700",
  inputWrapper:
    "h-11 bg-white border border-default-200 shadow-xs hover:border-primary-400 group-data-[focus=true]:border-primary-500 group-data-[focus=true]:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]",
  input: "text-[13.5px]",
};

const selectClassNames = {
  label: "text-[12.5px] font-medium text-default-700",
  trigger:
    "h-11 bg-white border border-default-200 shadow-xs data-[hover=true]:border-primary-400 data-[open=true]:border-primary-500 data-[open=true]:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]",
  value: "text-[13.5px]",
};

function TInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      size="md"
      variant="bordered"
      radius="lg"
      labelPlacement="outside"
      classNames={inputClassNames}
      {...props}
    />
  );
}

function TSelect(props: React.ComponentProps<typeof Select>) {
  return (
    <Select
      size="md"
      variant="bordered"
      radius="lg"
      labelPlacement="outside"
      classNames={selectClassNames}
      {...props}
    />
  );
}

function Req() {
  return <span className="text-danger-500 ml-0.5">*</span>;
}

function SectionHeader({
  icon,
  title,
  subtitle,
  accent = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent?: "primary" | "success" | "warning" | "secondary";
}) {
  const accents = {
    primary: "bg-primary-50 text-primary-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    secondary: "bg-secondary-50 text-secondary-600",
  };
  return (
    <CardHeader className="pb-3 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accents[accent]}`}>
        {icon}
      </div>
      <div className="flex-1">
        <h2 className="text-[15px] font-semibold text-default-900 leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-[12px] text-default-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </CardHeader>
  );
}

function SubsectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-default-500">
        {children}
      </span>
      <Divider className="flex-1" />
    </div>
  );
}

function NavBranch({ b }: { b: Branch }) {
  const [open, setOpen] = useState(b.label === "OPD Registry");
  const hasChildren = !!b.children?.length;
  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-default-700 hover:bg-default-100 transition-colors"
      >
        <span className="text-default-500">{b.icon}</span>
        <span className="flex-1 text-left">{b.label}</span>
        {hasChildren && (
          <span className="text-default-400">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        )}
      </button>
      {hasChildren && open && (
        <div className="ml-3 mt-0.5 mb-1 pl-3 border-l border-default-200 space-y-0.5">
          {b.children!.map((c) => (
            <button
              key={c.label}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] transition-colors ${
                c.active
                  ? "bg-primary-50 text-primary-700 font-semibold"
                  : "text-default-600 hover:bg-default-100"
              }`}
            >
              {c.active && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
              <span className={c.active ? "" : "pl-3.5"}>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== Page ===================== */

export default function PatientRegistry() {
  const [gender, setGender] = useState<string | null>(null);

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-[#f4f6fb] to-[#eef2f9] text-default-900 flex flex-col">
      {/* ============== Top bar ============== */}
      <header className="h-14 bg-linear-to-r from-[#3b82f6] via-[#2563eb] to-[#1d4ed8] text-white flex items-center px-3 gap-3 shadow-lg sticky top-0 z-30">
        <Button isIconOnly size="sm" variant="light" className="text-white hover:bg-white/10">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 pr-3">
          <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
            <Cloud className="w-5 h-5" />
          </div>
          <span className="text-[17px] font-bold tracking-wide">BMS Cloud</span>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 border-l border-white/20">
          <span className="text-[14px] font-medium opacity-95">เวชระเบียนผู้ป่วย</span>
        </div>
        <div className="flex-1 max-w-xl mx-2">
          <Input
            size="sm"
            radius="full"
            placeholder="ค้นหาเมนู / ผู้ป่วย / สิทธิการรักษา..."
            startContent={<Search className="w-4 h-4 text-default-400" />}
            classNames={{
              inputWrapper: "h-9 bg-white/95 shadow-none border-0",
              input: "text-[13px]",
            }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" radius="full" className="h-9 bg-white/15 text-white hover:bg-white/25 backdrop-blur" startContent={<UserPlus className="w-4 h-4" />}>
            ลงทะเบียนใหม่
          </Button>
          <Button size="sm" radius="full" className="h-9 bg-white text-primary-700 font-semibold shadow-sm" startContent={<Save className="w-4 h-4" />}>
            บันทึก
          </Button>
          <Button size="sm" radius="full" className="h-9 bg-white/15 text-white hover:bg-white/25 backdrop-blur" endContent={<ChevronDown className="w-4 h-4" />}>
            Task
          </Button>
          <Button size="sm" radius="full" className="h-9 bg-white/15 text-white hover:bg-white/25 backdrop-blur" startContent={<ClipboardList className="w-4 h-4" />}>
            EMR
          </Button>
        </div>
        <Badge content="1" color="danger" size="sm" placement="top-right">
          <Button isIconOnly size="sm" variant="light" className="text-white hover:bg-white/10">
            <Bell className="w-5 h-5" />
          </Button>
        </Badge>
        <div className="flex items-center gap-2 pl-2 pr-1 border-l border-white/20 ml-1">
          <Avatar size="sm" className="bg-white/90 ring-2 ring-white/40" />
          <div className="text-right leading-tight hidden lg:block">
            <div className="text-[13px] font-semibold">HN 000829203</div>
            <div className="text-[11px] opacity-80">กำหนดเลข HN ใหม่เอง</div>
          </div>
          <ChevronDown className="w-4 h-4 opacity-80" />
        </div>
      </header>

      <div className="flex-1 flex">
        {/* ============== Sidebar ============== */}
        <aside className="w-[260px] shrink-0 bg-white border-r border-default-100 flex flex-col">
          <div className="px-4 py-4 border-b border-default-100">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="relative">
                <Avatar
                  size="lg"
                  className="w-20 h-20 text-2xl bg-linear-to-br from-cyan-300 to-blue-500 text-white ring-4 ring-primary-50"
                />
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-success-500 ring-2 ring-white" />
              </div>
              <div className="text-[13px] font-bold text-primary-700">ehp@99999.148.201</div>
              <div className="text-[12px] text-success-600 font-semibold">โรงพยาบาลทดสอบBMS</div>
              <div className="text-[12px] text-warning-600">นายทดสอบ cis [00001]</div>
              <div className="text-[12px] text-default-700 font-semibold">201 ประชาสัมพันธ์/สาขา BMS</div>
            </div>
          </div>
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-default-500 uppercase">
            เมนูหลัก
          </div>
          <nav className="flex-1 overflow-auto px-2 pb-3 space-y-0.5">
            {menu.map((b) => (
              <NavBranch key={b.label} b={b} />
            ))}
          </nav>
          <div className="border-t border-default-100 px-4 py-2 text-[11px] text-default-500">
            <div>Version 2.0.0</div>
            <div>© 2024 BMS Cloud. All rights reserved.</div>
          </div>
        </aside>

        {/* ============== Main ============== */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 px-6 py-5 space-y-4 overflow-auto">
            {/* Hero header */}
            <Card shadow="sm" radius="lg" className="border border-default-100 overflow-hidden">
              <CardBody className="bg-linear-to-r from-primary-50 via-white to-purple-50/40 flex flex-row items-center justify-between gap-4 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center shadow-md shadow-primary-500/30">
                    <ClipboardList className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-[24px] font-bold text-default-900 leading-tight">
                      ข้อมูลเวชระเบียน
                    </h1>
                    <p className="text-[13px] text-default-500 mt-1 flex items-center gap-2">
                      บันทึก และแก้ไข ข้อมูลเวชระเบียนผู้ป่วย
                      <Chip size="sm" color="primary" variant="flat" className="h-5">โหมดแก้ไข</Chip>
                    </p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[11px] text-default-500">เลขประจำตัวผู้ป่วย</div>
                    <div className="text-[20px] font-bold text-primary-700 tabular-nums">000829203</div>
                  </div>
                  <Checkbox size="sm" classNames={{ label: "text-[12px]" }}>เปิด visit หลังจากบันทึก</Checkbox>
                </div>
              </CardBody>
            </Card>

            {/* Sub-tabs */}
            <Card shadow="sm" radius="lg" className="border border-default-100">
              <div className="px-2 overflow-x-auto">
                <Tabs
                  size="md"
                  variant="underlined"
                  color="primary"
                  aria-label="Patient sections"
                  defaultSelectedKey="general"
                  classNames={{
                    tabList: "gap-1 px-0 py-0",
                    tab: "h-12 px-3 text-[13px] w-auto data-[hover=true]:opacity-100",
                    cursor: "bg-primary-500 h-[3px]",
                    tabContent:
                      "flex items-center gap-1.5 group-data-[selected=true]:text-primary-600 group-data-[selected=true]:font-semibold",
                  }}
                >
                  {subTabs.map((t) => (
                    <Tab
                      key={t.key}
                      title={
                        <div className="flex items-center gap-1.5">
                          {t.icon}
                          {t.label}
                        </div>
                      }
                    />
                  ))}
                </Tabs>
              </div>
            </Card>

            <div className="grid grid-cols-12 gap-4">
              {/* ============== General Info ============== */}
              <Card shadow="sm" radius="lg" className="col-span-12 xl:col-span-8 border border-default-100">
                <SectionHeader
                  icon={<User className="w-5 h-5" />}
                  title="ข้อมูลทั่วไป"
                  subtitle="กรอกข้อมูลส่วนตัวของผู้ป่วย"
                />
                <Divider />
                <CardBody className="space-y-5 pt-4">
                  {/* Identity */}
                  <div>
                    <SubsectionLabel>ข้อมูลประจำตัว</SubsectionLabel>
                    <div className="grid grid-cols-12 gap-3 mt-3">
                      <div className="col-span-12 md:col-span-3">
                        <TSelect label={<span>คำนำหน้า<Req /></span>} placeholder="เลือก" aria-label="คำนำหน้า">
                          {["นาย", "นาง", "นางสาว", "เด็กชาย", "เด็กหญิง"].map((it) => (
                            <SelectItem key={it}>{it}</SelectItem>
                          ))}
                        </TSelect>
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <TInput label={<span>ชื่อ<Req /></span>} placeholder="ชื่อจริง" />
                      </div>
                      <div className="col-span-12 md:col-span-5">
                        <TInput label={<span>นามสกุล<Req /></span>} placeholder="นามสกุล" />
                      </div>

                      <div className="col-span-12 md:col-span-5">
                        <TInput
                          label={<span>เลขบัตรประชาชน<Req /></span>}
                          placeholder="เลข 13 หลัก"
                          startContent={<IdCard className="w-4 h-4 text-default-400" />}
                          endContent={
                            <Button size="sm" radius="md" className="h-7 min-w-0 px-2.5 bg-primary-500 text-white font-bold">
                              G
                            </Button>
                          }
                        />
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <TInput
                          label="วันเกิด"
                          placeholder="dd/mm/yyyy"
                          startContent={<Calendar className="w-4 h-4 text-default-400" />}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-3">
                        <div className="block text-[12.5px] font-medium text-default-700 mb-1.5">เพศ</div>
                        <div className="flex gap-1.5">
                          {[
                            { v: "ชาย", color: "primary" as const },
                            { v: "หญิง", color: "danger" as const },
                          ].map((g) => (
                            <button
                              key={g.v}
                              onClick={() => setGender(g.v)}
                              className={`flex-1 h-11 rounded-lg border text-[13px] font-medium transition-all ${
                                gender === g.v
                                  ? g.color === "primary"
                                    ? "bg-primary-500 border-primary-500 text-white shadow-md shadow-primary-500/30"
                                    : "bg-danger-500 border-danger-500 text-white shadow-md shadow-danger-500/30"
                                  : "bg-white border-default-200 text-default-700 hover:border-default-300"
                              }`}
                            >
                              {g.v}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <TInput label="เวลาเกิด" placeholder="hh:mm" startContent={<Calendar className="w-4 h-4 text-default-400" />} />
                      </div>
                      <div className="col-span-12 md:col-span-8">
                        <TSelect label="อาชีพ" placeholder="เลือกอาชีพ" aria-label="อาชีพ">
                          {["ข้าราชการ", "พนักงานบริษัท", "ค้าขาย", "เกษตรกร", "นักเรียน/นักศึกษา", "อื่นๆ"].map((it) => (
                            <SelectItem key={it}>{it}</SelectItem>
                          ))}
                        </TSelect>
                      </div>
                    </div>
                  </div>

                  {/* Demographics */}
                  <div>
                    <SubsectionLabel>ข้อมูลประชากร</SubsectionLabel>
                    <div className="grid grid-cols-12 gap-3 mt-3">
                      <div className="col-span-6 md:col-span-3">
                        <TSelect label="เชื้อชาติ" placeholder="เลือก" aria-label="เชื้อชาติ">
                          {["ไทย", "จีน", "อื่นๆ"].map((it) => <SelectItem key={it}>{it}</SelectItem>)}
                        </TSelect>
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <TSelect label="สัญชาติ" placeholder="เลือก" aria-label="สัญชาติ">
                          {["ไทย", "อื่นๆ"].map((it) => <SelectItem key={it}>{it}</SelectItem>)}
                        </TSelect>
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <TSelect label="ศาสนา" placeholder="เลือก" aria-label="ศาสนา">
                          {["พุทธ", "คริสต์", "อิสลาม", "อื่นๆ"].map((it) => <SelectItem key={it}>{it}</SelectItem>)}
                        </TSelect>
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <TInput label="จำนวนพี่น้อง" placeholder="0" />
                      </div>
                      <div className="col-span-12 md:col-span-3">
                        <TSelect label="สถานภาพ" placeholder="เลือก" aria-label="สถานภาพ">
                          {["โสด", "สมรส", "หย่า", "หม้าย"].map((it) => <SelectItem key={it}>{it}</SelectItem>)}
                        </TSelect>
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <TInput label="บุตรคนที่" placeholder="0" />
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <TSelect label="หมู่เลือด" placeholder="เลือก" aria-label="หมู่เลือด">
                          {["A", "B", "AB", "O"].map((it) => <SelectItem key={it}>{it}</SelectItem>)}
                        </TSelect>
                      </div>
                      <div className="col-span-12 md:col-span-3">
                        <TSelect label="Rh" placeholder="Rh" aria-label="Rh">
                          {["+", "−"].map((it) => <SelectItem key={it}>{it}</SelectItem>)}
                        </TSelect>
                      </div>
                    </div>
                  </div>

                  {/* Alerts/Allergies */}
                  <div>
                    <SubsectionLabel>การแพ้ยา</SubsectionLabel>
                    <div className="grid grid-cols-12 gap-3 mt-3">
                      <div className="col-span-12 md:col-span-9">
                        <TInput
                          label="ระบุการแพ้ยา"
                          placeholder="พิมพ์ชื่อยา หรือกดปุ่มจัดการการแพ้ยา"
                          startContent={<AlertCircle className="w-4 h-4 text-warning-500" />}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-3 flex items-end">
                        <Button color="warning" variant="flat" radius="lg" className="h-11 w-full font-semibold" startContent={<AlertCircle className="w-4 h-4" />}>
                          จัดการการแพ้ยา
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Informant */}
                  <div>
                    <SubsectionLabel>ผู้แจ้ง</SubsectionLabel>
                    <div className="grid grid-cols-12 gap-3 mt-3">
                      <div className="col-span-12 md:col-span-5">
                        <TInput
                          label="ผู้แจ้ง"
                          placeholder="ชื่อผู้แจ้ง"
                          endContent={
                            <Button isIconOnly size="sm" variant="light" className="h-7 w-7 min-w-0 text-default-500">
                              <Home className="w-4 h-4" />
                            </Button>
                          }
                        />
                      </div>
                      <div className="col-span-12 md:col-span-7">
                        <TSelect label="ความสัมพันธ์" placeholder="เลือกความสัมพันธ์" aria-label="ความสัมพันธ์">
                          {["บิดา", "มารดา", "คู่สมรส", "บุตร", "อื่นๆ"].map((it) => <SelectItem key={it}>{it}</SelectItem>)}
                        </TSelect>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* ============== Photo + Signature ============== */}
              <div className="col-span-12 xl:col-span-4 flex flex-col gap-3">
                <Card shadow="sm" radius="lg" className="border border-default-100">
                  <SectionHeader
                    icon={<Camera className="w-5 h-5" />}
                    title="รูปผู้ป่วย"
                    subtitle="อัพโหลดหรือถ่ายภาพผู้ป่วย"
                    accent="secondary"
                  />
                  <Divider />
                  <CardBody className="items-center text-center gap-3 py-5">
                    <div className="w-32 h-32 rounded-full bg-linear-to-br from-default-50 to-default-100 border-2 border-dashed border-default-300 flex flex-col items-center justify-center text-default-400 hover:border-primary-400 hover:bg-primary-50/30 transition-colors cursor-pointer group">
                      <ImageIcon className="w-9 h-9 group-hover:text-primary-500 transition-colors" />
                      <div className="text-[11px] mt-1 group-hover:text-primary-600">คลิกเพื่ออัพโหลด</div>
                    </div>
                    <div className="flex gap-2 w-full">
                      <Button color="primary" radius="lg" className="flex-1 h-10 font-medium" startContent={<Upload className="w-4 h-4" />}>
                        Upload
                      </Button>
                      <Button variant="bordered" radius="lg" className="flex-1 h-10 font-medium bg-white" startContent={<Camera className="w-4 h-4" />}>
                        Webcam
                      </Button>
                    </div>
                  </CardBody>
                </Card>

                <Card shadow="sm" radius="lg" className="border border-default-100">
                  <SectionHeader
                    icon={<PencilLine className="w-5 h-5" />}
                    title="ลายมือชื่อ"
                    subtitle="ลายเซ็นของผู้ป่วย"
                    accent="warning"
                  />
                  <Divider />
                  <CardBody className="items-center text-center gap-3 py-5">
                    <div className="w-full h-28 rounded-xl bg-linear-to-br from-default-50 to-default-100 border-2 border-dashed border-default-300 flex flex-col items-center justify-center text-default-400 hover:border-warning-400 hover:bg-warning-50/30 transition-colors cursor-pointer group">
                      <PencilLine className="w-9 h-9 group-hover:text-warning-500 transition-colors" />
                      <div className="text-[11px] mt-1 group-hover:text-warning-600">คลิกเพื่ออัพโหลดลายมือชื่อ</div>
                    </div>
                    <Button color="warning" variant="flat" radius="lg" className="w-full h-10 font-medium" startContent={<Upload className="w-4 h-4" />}>
                      อัพโหลดลายมือชื่อ
                    </Button>
                  </CardBody>
                </Card>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="bordered" radius="lg" className="h-11 bg-white font-medium" startContent={<IdCard className="w-4 h-4 text-primary-500" />}>
                    อ่านบัตรประชาชน
                  </Button>
                  <Button variant="bordered" radius="lg" className="h-11 bg-white font-medium" startContent={<CalendarDays className="w-4 h-4 text-success-500" />}>
                    จอง นัด Online
                  </Button>
                </div>
              </div>

              {/* ============== Address ============== */}
              <Card shadow="sm" radius="lg" className="col-span-12 xl:col-span-8 border border-default-100">
                <SectionHeader
                  icon={<MapPin className="w-5 h-5" />}
                  title="ที่อยู่ปัจจุบัน"
                  subtitle="ที่อยู่สำหรับติดต่อและส่งเอกสาร"
                  accent="success"
                />
                <Divider />
                <CardBody className="space-y-4 pt-4">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-6 md:col-span-3">
                      <TInput label="บ้านเลขที่" placeholder="123" />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <TInput label="หมู่" placeholder="0" />
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <TInput label="ถนน" placeholder="ชื่อถนน" />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <TInput label="ซอย" placeholder="ชื่อซอย" />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <TSelect label="จังหวัด" placeholder="เลือกจังหวัด" aria-label="จังหวัด">
                        {[]}
                      </TSelect>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <TSelect label="อำเภอ" placeholder="เลือกอำเภอ" aria-label="อำเภอ">
                        {[]}
                      </TSelect>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <TSelect label="ตำบล" placeholder="เลือกตำบล" aria-label="ตำบล">
                        {[]}
                      </TSelect>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <TInput label="รหัสไปรษณีย์" placeholder="10000" />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <TSelect label="ประเทศ" placeholder="เลือกประเทศ" aria-label="ประเทศ">
                        {[]}
                      </TSelect>
                    </div>
                    <div className="col-span-12 md:col-span-4 flex items-end">
                      <Button variant="flat" color="primary" radius="lg" className="h-11 w-full font-medium" startContent={<Home className="w-4 h-4" />}>
                        ที่อยู่ตามทะเบียนบ้าน
                      </Button>
                    </div>

                    <div className="col-span-12">
                      <Card shadow="none" className="bg-danger-50/40 border border-danger-100">
                        <CardBody className="py-2.5 flex flex-row items-center gap-3">
                          <Checkbox size="sm" color="danger" classNames={{ label: "text-[13px] font-medium" }}>
                            แฟ้มถูกทำลาย
                          </Checkbox>
                          <span className="text-[12px] text-default-600">วันที่</span>
                          <Input
                            size="sm"
                            variant="bordered"
                            radius="md"
                            placeholder="dd/mm/yyyy"
                            startContent={<Calendar className="w-3.5 h-3.5 text-default-400" />}
                            classNames={{ inputWrapper: "h-9 bg-white", input: "text-[12.5px]" }}
                            className="w-44"
                          />
                        </CardBody>
                      </Card>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* ============== Other Info ============== */}
              <Card shadow="sm" radius="lg" className="col-span-12 xl:col-span-4 border border-default-100">
                <SectionHeader
                  icon={<Phone className="w-5 h-5" />}
                  title="ข้อมูลอื่นๆ"
                  subtitle="ข้อมูลติดต่อและรายละเอียดเพิ่มเติม"
                  accent="primary"
                />
                <Divider />
                <CardBody className="space-y-3 pt-4">
                  <div className="flex flex-col gap-2">
                    <Checkbox size="sm" defaultSelected color="primary" classNames={{ label: "text-[13px] font-medium" }}>
                      อยู่ในเขตความรับผิดชอบ
                    </Checkbox>
                    <Checkbox size="sm" color="danger" classNames={{ label: "text-[13px] font-medium" }}>
                      ผู้ป่วยคดีความ
                    </Checkbox>
                  </div>
                  <Divider />
                  <TInput label="โทรศัพท์บ้าน" placeholder="02-xxx-xxxx" startContent={<Phone className="w-4 h-4 text-default-400" />} />
                  <TInput label="มือถือ" placeholder="08x-xxx-xxxx" startContent={<Phone className="w-4 h-4 text-default-400" />} />
                  <TInput label="โทรที่ทำงาน" placeholder="02-xxx-xxxx" startContent={<Phone className="w-4 h-4 text-default-400" />} />
                  <TInput label="E-mail" placeholder="example@email.com" startContent={<Mail className="w-4 h-4 text-default-400" />} />
                  <TInput label="เลขที่ Passport" placeholder="A1234567" />
                  <div className="grid grid-cols-2 gap-2">
                    <TSelect label="ภาษาหลัก" placeholder="ไทย" aria-label="ภาษาหลัก">
                      {["ไทย", "อังกฤษ"].map((it) => <SelectItem key={it}>{it}</SelectItem>)}
                    </TSelect>
                    <TSelect label="สีผิว" placeholder="เลือก" aria-label="สีผิว">
                      {["ขาว", "เหลือง", "ดำ"].map((it) => <SelectItem key={it}>{it}</SelectItem>)}
                    </TSelect>
                  </div>
                  <TInput label="เลขที่อ้างอิง" placeholder="-" />
                  <TInput label="ชื่อเล่น" placeholder="-" />
                  <TInput label="ที่ทำงาน" placeholder="-" />
                </CardBody>
              </Card>

              {/* ============== Relatives ============== */}
              <Card shadow="sm" radius="lg" className="col-span-12 border border-default-100">
                <SectionHeader
                  icon={<User className="w-5 h-5" />}
                  title="ข้อมูลครอบครัวและผู้ติดต่อ"
                  subtitle="บุคคลในครอบครัวและผู้ติดต่อสำหรับกรณีฉุกเฉิน"
                  accent="secondary"
                />
                <Divider />
                <CardBody className="pt-3">
                  <div className="overflow-x-auto">
                    <Tabs
                      size="md"
                      variant="solid"
                      color="primary"
                      radius="full"
                      aria-label="Patient relatives"
                      classNames={{
                        tabList: "gap-1 px-0 bg-default-100/60 p-1",
                        tab: "h-9 px-4 text-[13px] w-auto",
                        cursor: "shadow-sm",
                      }}
                    >
                      {relTabs.map((t) => (
                        <Tab key={t} title={t}>
                          <div className="pt-5 grid grid-cols-1 gap-3">
                            {[
                              { name: "ชื่อบิดา", color: "text-primary-600" },
                              { name: "ชื่อมารดา", color: "text-danger-600" },
                              { name: "ชื่อคู่สมรส", color: "text-success-600" },
                              { name: "ชื่อผู้ติดต่อ", color: "text-secondary-600" },
                            ].map((r) => (
                              <div key={r.name} className="grid grid-cols-12 gap-3 items-end bg-default-50/50 rounded-xl p-3 border border-default-100">
                                <div className="col-span-12 md:col-span-2">
                                  <div className={`text-[12.5px] font-semibold ${r.color} mb-2 flex items-center gap-1.5`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    {r.name}
                                  </div>
                                </div>
                                <div className="col-span-12 md:col-span-3">
                                  <TInput label="ชื่อ" placeholder="ชื่อ" />
                                </div>
                                <div className="col-span-12 md:col-span-3">
                                  <TInput label="นามสกุล" placeholder="นามสกุล" />
                                </div>
                                {r.name === "ชื่อผู้ติดต่อ" ? (
                                  <div className="col-span-12 md:col-span-4">
                                    <TSelect label="ความสัมพันธ์" placeholder="เลือกความสัมพันธ์" aria-label="ความสัมพันธ์">
                                      {["บิดา", "มารดา", "คู่สมรส", "บุตร", "อื่นๆ"].map((it) => <SelectItem key={it}>{it}</SelectItem>)}
                                    </TSelect>
                                  </div>
                                ) : (
                                  <>
                                    <div className="col-span-8 md:col-span-3">
                                      <TInput label="เลขที่บัตรประชาชน" placeholder="เลข 13 หลัก" />
                                    </div>
                                    <div className="col-span-4 md:col-span-1">
                                      <Button isIconOnly variant="flat" color="primary" radius="lg" className="h-11 w-full" aria-label="เปิดเวชระเบียน">
                                        <FileText className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </Tab>
                      ))}
                    </Tabs>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* ============== Bottom action bar ============== */}
          <div className="bg-white/80 backdrop-blur border-t border-default-200 px-6 py-3 flex items-center justify-between gap-3 sticky bottom-0">
            <div className="text-[12px] text-default-500">
              <span className="font-medium">ข้อมูลถูกแก้ไขล่าสุด:</span> เมื่อสักครู่ • ระบบบันทึกอัตโนมัติ
            </div>
            <div className="flex items-center gap-2">
              <Button variant="bordered" radius="lg" className="h-11 px-6 bg-white font-medium" startContent={<X className="w-4 h-4" />}>
                ยกเลิก
              </Button>
              <Button radius="lg" className="h-11 px-6 bg-secondary-500 hover:bg-secondary-600 text-white font-semibold shadow-md shadow-secondary-500/30" startContent={<RefreshCw className="w-4 h-4" />}>
                ล้างข้อมูล
              </Button>
              <Button color="success" radius="lg" className="h-11 px-8 text-white font-semibold shadow-md shadow-success-500/30" startContent={<Save className="w-4 h-4" />}>
                บันทึกข้อมูล
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
