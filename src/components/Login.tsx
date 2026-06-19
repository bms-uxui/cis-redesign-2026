import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button, Select, SelectItem } from "@heroui/react";
import {
  IconStethoscope,
  IconHeartFilled,
  IconPill,
  IconUserPlus,
  IconSettings,
  IconEye,
  IconEyeOff,
  IconCircleCheckFilled,
  IconArrowRight,
  IconArrowLeft,
  IconBuildingHospital,
  IconBuilding,
  IconDoor,
  IconId,
  IconX,
  IconMapPin,
  IconMail,
  IconPhone,
  IconBrandLine,
} from "@tabler/icons-react";
import { useUser } from "../contexts/UserContext";
import type { UserRole } from "../contexts/UserContext";
import {
  ROLES,
  DEMO_ACCOUNTS,
  BRANCHES,
  DEPARTMENTS,
  roomsForDept,
  DEFAULT_DEPT,
  type RoleMeta,
} from "../data/mock/auth";
import LOGO from "../assets/figma/login/ehp-logo-dark.png";
import HERO from "../assets/figma/login/image15.png";
import FEATURE_BG from "../assets/figma/login/feature-card.png";
import PROMO from "../assets/figma/login/promo.png";
import PROVIDER_ID from "../assets/figma/login/provider-id.png";

/**
 * Login landing — Figma 1177:2133 ("เข้าสู่ระบบ EHP CIS").
 *
 * Full-page layout: sticky top nav → hero (login form + doctors illustration
 * over a faint green grid) → green feature-cards section → promo banner →
 * footer. The "ทดลองตามบทบาท" role menu is embedded in the form (the added
 * "เมนู"): picking a role swaps the prefilled demo account, and signing in
 * sets the user in UserContext (doctors land in the doctor workspace).
 */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EHP_GREEN = "#8fc635";
const EHP_RED = "#e81531";
const ACCENT = "#1f9d4d";

const ROLE_ICON: Record<
  UserRole,
  { Icon: typeof IconStethoscope; tint: string; bg: string }
> = {
  doctor: { Icon: IconStethoscope, tint: "#1f9d4d", bg: "#e7f6ec" },
  nurse: { Icon: IconHeartFilled, tint: "#e8557e", bg: "#fdeaf0" },
  pharmacist: { Icon: IconPill, tint: "#e08a1e", bg: "#fdf0dd" },
  reception: { Icon: IconUserPlus, tint: "#3485ff", bg: "#e6effe" },
  admin: { Icon: IconSettings, tint: "#8b5cf6", bg: "#efe9fd" },
};

const FEATURES = [
  "การใช้โปรแกรมคลินิก EHP-CIS",
  "ขั้นตอนการปิดสิทธิ (ยืนยันตัวตนหลังเข้ารับบริการ)",
  "การยกเลิกใบแจ้งหนี้ และยกเลิกการโอนรายการ",
  "การออกใบเสร็จรับเงิน และเอกสารทางการเงิน",
];
const FEATURE_DESC =
  "ระบบ EHP CIS คือ ระบบบริหารจัดการคลินิก ที่เก็บข้อมูลไว้บน Cloud สามารถเข้าใช้งานระบบ EHP CIS ผ่าน Browser ได้ที่ cis.ehp.co.th/ehp/ ซึ่งการเข้างานในครั้งแรกต้องติดตั้ง EHP Client Agent ก่อน แล้วในการเข้าใช้งานครั้งถัดไปไม่ต้องติดตั้งซ้ำ";

// Faint scattered green squares for the hero grid motif — pale EHP green,
// clustered top-left / mid-left / top-centre like the Figma "grid blocks".
const SQ = 84; // square edge, matches the 80px grid
const SQUARES = [
  // top-left cluster
  { top: 4, left: 14, o: 0.26 },
  { top: 13, left: 9, o: 0.14 },
  { top: 13, left: 19, o: 0.1 },
  { top: 22, left: 4, o: 0.1 },
  { top: 22, left: 14, o: 0.18 },
  // mid-left
  { top: 58, left: 5, o: 0.12 },
  { top: 68, left: 11, o: 0.22 },
  { top: 77, left: 6, o: 0.1 },
  // top-centre (behind the road)
  { top: 5, left: 40, o: 0.12 },
  { top: 1, left: 46, o: 0.2 },
  { top: 30, left: 33, o: 0.1 },
];

export default function Login() {
  const { login } = useUser();
  const [role, setRole] = useState<UserRole>("doctor");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<"password" | "provider">(
    "password"
  );
  const [username, setUsername] = useState(DEMO_ACCOUNTS.doctor.username);
  const [password, setPassword] = useState("demo-password");
  const [providerId, setProviderId] = useState(DEMO_ACCOUNTS.doctor.providerId);
  const [showPw, setShowPw] = useState(false);

  const account = DEMO_ACCOUNTS[role];

  const pickRole = (r: RoleMeta) => {
    setRole(r.role);
    setUsername(DEMO_ACCOUNTS[r.role].username);
    setPassword("demo-password");
    setProviderId(DEMO_ACCOUNTS[r.role].providerId);
  };

  const enter = (ctx: { branch: string; department: string; room: string }) =>
    login({
      name: account.name,
      title: account.title,
      email: account.email,
      role: account.role,
      initials: account.initials,
      providerId: providerId.trim() || account.providerId,
      branch: ctx.branch,
      department: ctx.department,
      room: ctx.room,
    });

  return (
    <div className="fixed inset-0 overflow-y-auto bg-white">
      {/* ── Top nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white/90 px-6 py-3 backdrop-blur-md sm:px-16">
        <img src={LOGO} alt="Excellent Health Platform" className="h-9 w-auto" />
        <button
          type="button"
          className="rounded-full bg-black px-8 py-3 text-[15px] font-medium text-white transition hover:bg-black/85"
        >
          ติดต่อเรา
        </button>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden lg:min-h-[540px]">
        {/* Faint grid + scattered pale-green squares */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(rgba(36,97,61,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(36,97,61,0.045) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage:
              "linear-gradient(to bottom, #000 55%, transparent 92%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 hidden lg:block">
          {SQUARES.map((sq, i) => (
            <span
              key={i}
              className="absolute rounded-xs"
              style={{
                top: `${sq.top}%`,
                left: `${sq.left}%`,
                width: SQ,
                height: SQ,
                background: `rgba(143,198,53,${sq.o})`,
              }}
            />
          ))}
        </div>

        {/* Hero illustration — bleeds off the right edge */}
        <img
          src={HERO}
          alt="ทีมแพทย์ดูแลผู้ป่วย"
          className="pointer-events-none absolute bottom-0 right-[-24%] hidden w-[84%] max-w-none object-contain object-bottom-right lg:block xl:right-[-18%] xl:w-[78%]"
        />

        <div className="relative px-6 py-12 sm:px-16 lg:py-16">
          {/* Left — form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="w-full max-w-[360px]"
          >
            <p className="text-[20px] font-medium text-black">ยินดีต้อนรับสู่</p>
            <p className="text-[56px] font-bold leading-none tracking-tight">
              <span style={{ color: EHP_GREEN }}>EHP</span>{" "}
              <span style={{ color: EHP_RED }}>CIS</span>
            </p>
            <p className="mt-2 text-[16px] text-black/70">
              ระบบบริหารจัดการคลินิก
            </p>

            {/* Credentials — username+password, or a single Provider ID
                field when the user switches to Provider-ID login. Labels are
                rendered above each field (HeroUI labelPlacement absolutely-
                positions and would overlap the subtitle). */}
            <div className="mt-7 space-y-4">
              {loginMode === "password" ? (
                <>
                  <div className="space-y-2">
                    <FieldLabel text="บัญชีผู้ใช้งาน" htmlFor="login-username" />
                    <Input
                      id="login-username"
                      aria-label="บัญชีผู้ใช้งาน"
                      placeholder="Username"
                      value={username}
                      onValueChange={setUsername}
                      variant="bordered"
                      radius="lg"
                      classNames={{
                        inputWrapper:
                          "h-12 min-h-12 px-3 border-black/[0.08] bg-white shadow-[0px_2px_2px_rgba(0,0,0,0.04),0px_1px_1px_rgba(0,0,0,0.06)] data-[hover=true]:border-black/20 group-data-[focus=true]:!border-[#1f9d4d]",
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel text="รหัสผ่าน" htmlFor="login-password" />
                    <Input
                      id="login-password"
                      aria-label="รหัสผ่าน"
                      placeholder="Password"
                      value={password}
                      onValueChange={setPassword}
                      type={showPw ? "text" : "password"}
                      variant="bordered"
                      radius="lg"
                      endContent={
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                          className="text-black/40 hover:text-black/70"
                        >
                          {showPw ? (
                            <IconEyeOff size={18} />
                          ) : (
                            <IconEye size={18} />
                          )}
                        </button>
                      }
                      classNames={{
                        inputWrapper:
                          "h-12 min-h-12 px-3 border-black/[0.08] bg-white shadow-[0px_2px_2px_rgba(0,0,0,0.04),0px_1px_1px_rgba(0,0,0,0.06)] data-[hover=true]:border-black/20 group-data-[focus=true]:!border-[#1f9d4d]",
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <FieldLabel text="Provider ID" htmlFor="login-provider" />
                  <Input
                    id="login-provider"
                    aria-label="Provider ID"
                    placeholder="เลขที่ผู้ให้บริการ / ใบประกอบวิชาชีพ"
                    value={providerId}
                    onValueChange={setProviderId}
                    variant="bordered"
                    radius="lg"
                    startContent={
                      <IconId size={18} className="text-black/40" />
                    }
                    classNames={{
                      inputWrapper:
                        "h-12 min-h-12 px-3 border-black/[0.08] bg-white shadow-[0px_2px_2px_rgba(0,0,0,0.04),0px_1px_1px_rgba(0,0,0,0.06)] data-[hover=true]:border-black/20 group-data-[focus=true]:!border-[#1f9d4d]",
                    }}
                  />
                </div>
              )}
            </div>

            <Button
              onPress={() => setPickerOpen(true)}
              radius="full"
              className="mt-5 h-12 w-full bg-[#3485ff] text-[16px] font-medium text-white shadow-[0_10px_24px_rgba(52,133,255,0.3)]"
            >
              เข้าสู่ระบบ
            </Button>
            {/* Separator */}
            <div className="mt-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-[13px] text-black/40">หรือ</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>

            {/* Provider ID — branded button (Figma 1182:5475). Opens the same
                role picker as the primary sign-in. */}
            <button
              type="button"
              onClick={() => {
                setLoginMode("provider");
                setPickerOpen(true);
              }}
              aria-label="เข้าสู่ระบบด้วย Provider ID"
              className="mt-3 flex h-12 w-full items-center justify-center rounded-full border border-[#28a440] bg-white px-6 shadow-[0px_4px_12px_rgba(0,133,91,0.12)] transition hover:bg-[#28a440]/4 active:scale-[0.99]"
            >
              <img
                src={PROVIDER_ID}
                alt="Provider ID"
                className="h-7 w-auto object-contain"
              />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Feature cards section ───────────────────────────────────── */}
      <section className="rounded-t-[40px] bg-gradient-to-b from-[#8fc635] to-[#f7fcfa] to-[44%] px-6 pb-20 pt-16 sm:px-16">
        <div className="mx-auto max-w-[1312px]">
          <h2 className="text-[28px] font-bold leading-snug text-white sm:text-[36px]">
            เรียนรู้ทุกฟีเจอร์ที่ EHP จะช่วยคุณทำงานได้ดียิ่งขึ้น
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((title, i) => (
              <article
                key={i}
                className="group relative flex h-[400px] flex-col justify-end overflow-hidden rounded-[32px] p-6 shadow-[0px_4px_24px_rgba(0,0,0,0.25)]"
              >
                <img
                  src={FEATURE_BG}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/65" />
                <div className="relative">
                  <h3 className="text-[22px] font-bold leading-snug text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.2)]">
                    {title}
                  </h3>
                  <p className="mt-3 line-clamp-4 text-[15px] leading-relaxed text-white/80">
                    {FEATURE_DESC}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Promo banner */}
          <img
            src={PROMO}
            alt="โปรโมชันสำหรับลูกค้าใหม่ · รับสิทธิ์ทดลองใช้ฟรีทันที"
            className="mt-12 w-full rounded-[28px] object-cover shadow-[0px_4px_24px_rgba(0,0,0,0.15)]"
          />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-white px-6 py-12 sm:px-16">
        <div className="mx-auto max-w-[1312px]">
          <img src={LOGO} alt="" className="h-8 w-auto" />
          <h3 className="mt-4 text-[18px] font-bold text-[#111]">
            บริษัท เอ็กเซลเลนท์ เฮลท์ แพลตฟอร์ม จำกัด
          </h3>
          <p className="mt-1 text-[14px] text-black/55">
            วันเวลาทำการตั้งแต่ จันทร์ - ศุกร์ เวลา 08.30 - 17.30 น.
          </p>
          <div className="mt-4 grid gap-2 text-[14px] text-black/70">
            <span className="flex items-start gap-2">
              <IconMapPin size={18} className="mt-0.5 shrink-0 text-[#1f9d4d]" />
              1768 อาคารไทยซัมมิท ทาวเวอร์ ถนนเพชรบุรีตัดใหม่ แขวงบางกะปิ เขตห้วยขวาง
              กรุงเทพมหานคร 10310
            </span>
            <span className="flex items-center gap-2">
              <IconMail size={18} className="shrink-0 text-[#1f9d4d]" />
              info@ehp.co.th
            </span>
            <span className="flex items-center gap-2">
              <IconPhone size={18} className="shrink-0 text-[#1f9d4d]" />
              02-257-7000
            </span>
            <span className="flex items-center gap-2">
              <IconBrandLine size={18} className="shrink-0 text-[#1f9d4d]" />
              @ehpsupport
            </span>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-black/10 pt-5 text-[13px] text-black/45 sm:flex-row sm:items-center sm:justify-between">
            <span>©2024 Excellent Health Platform, All rights reserved.</span>
            <button type="button" className="text-left hover:text-black/70">
              นโยบายคุ้มครองข้อมูลส่วนบุคคล
            </button>
          </div>
        </div>
      </footer>

      {/* Role picker — opens after pressing "เข้าสู่ระบบ" */}
      <RolePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        role={role}
        onPick={pickRole}
        account={account}
        onConfirm={enter}
      />
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function FieldLabel({ text, htmlFor }: { text: string; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[16px] font-medium text-[#18181b]"
    >
      {text} <span className="text-[14px] text-[#ff383c]">*</span>
    </label>
  );
}

function RolePicker({
  open,
  onClose,
  role,
  onPick,
  account,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  role: UserRole;
  onPick: (r: RoleMeta) => void;
  account: { name: string; title: string; initials: string };
  onConfirm: (ctx: {
    branch: string;
    department: string;
    room: string;
  }) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [branch, setBranch] = useState(BRANCHES[0].code);
  const [dept, setDept] = useState(DEFAULT_DEPT.doctor);
  const [room, setRoom] = useState(roomsForDept(DEFAULT_DEPT.doctor)[0].code);
  const rooms = roomsForDept(dept);

  // Reset to the role step every time the modal opens.
  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const goWorkStep = () => {
    const d = DEFAULT_DEPT[role];
    setDept(d);
    setRoom(roomsForDept(d)[0].code);
    setStep(2);
  };

  const changeDept = (code: string) => {
    setDept(code);
    setRoom(roomsForDept(code)[0]?.code ?? "");
  };

  const confirm = () =>
    onConfirm({
      branch: BRANCHES.find((b) => b.code === branch)?.name ?? "",
      department: DEPARTMENTS.find((d) => d.code === dept)?.name ?? "",
      room: rooms.find((r) => r.code === room)?.name ?? "",
    });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="เลือกบทบาทและที่ทำงาน"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="w-full max-w-[420px] overflow-hidden rounded-3xl bg-white p-5 shadow-[0_30px_80px_rgba(20,80,40,0.25)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-black/55">
                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    aria-label="ย้อนกลับ"
                    className="grid h-6 w-6 place-items-center rounded-full text-black/45 hover:bg-black/5 hover:text-black/70"
                  >
                    <IconArrowLeft size={16} />
                  </button>
                )}
                <IconSettings size={15} style={{ color: ACCENT }} />
                {step === 1 ? "DEMO · ทดลองตามบทบาท" : "เลือกหน่วยงาน · ที่ทำงาน"}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิด"
                className="grid h-7 w-7 place-items-center rounded-full text-black/40 hover:bg-black/5 hover:text-black/70"
              >
                <IconX size={18} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="roles"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  {/* Role grid */}
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {ROLES.map((r) => {
                      const active = r.role === role;
                      const { Icon, tint, bg } = ROLE_ICON[r.role];
                      const isAdmin = r.role === "admin";
                      return (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => onPick(r)}
                          className={`relative flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${
                            isAdmin ? "col-span-2" : ""
                          } ${
                            active
                              ? "border-[#1f9d4d] bg-[#1f9d4d]/[0.06]"
                              : "border-black/10 bg-white hover:border-black/20"
                          }`}
                        >
                          <span
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                            style={{ background: bg, color: tint }}
                          >
                            <Icon size={18} />
                          </span>
                          <span className="min-w-0 leading-tight">
                            <span className="block text-[14px] font-semibold text-[#111]">
                              {r.label}
                            </span>
                            <span className="block text-[12px] text-black/45">
                              {r.sub}
                            </span>
                          </span>
                          {active && (
                            <IconCircleCheckFilled
                              size={18}
                              className="absolute right-2.5 top-2.5 text-[#1f9d4d]"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected demo account — continue to work step */}
                  <button
                    type="button"
                    onClick={goWorkStep}
                    className="group mt-3 flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-white p-3 text-left transition hover:border-[#1f9d4d] hover:bg-[#1f9d4d]/[0.04]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#34a853] to-[#1f7d3f] text-[15px] font-semibold text-white">
                      {account.initials}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[15px] font-semibold text-[#111]">
                        {account.name}
                      </span>
                      <span className="block truncate text-[12px] text-black/50">
                        {account.title}
                      </span>
                    </span>
                    <IconArrowRight
                      size={20}
                      className="text-black/30 transition group-hover:translate-x-0.5 group-hover:text-[#1f9d4d]"
                    />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="work"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  {/* Selected account summary */}
                  <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#1f9d4d]/[0.06] p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#34a853] to-[#1f7d3f] text-[13px] font-semibold text-white">
                      {account.initials}
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-[14px] font-semibold text-[#111]">
                        {account.name}
                      </span>
                      <span className="block truncate text-[12px] text-black/50">
                        {account.title}
                      </span>
                    </span>
                  </div>

                  {/* Branch / Department / Room selects */}
                  <div className="mt-4 space-y-3.5">
                    <WorkSelect
                      label="สาขา / หน่วยบริการ"
                      icon={<IconBuildingHospital size={18} />}
                      selected={branch}
                      onChange={setBranch}
                      items={BRANCHES.map((b) => ({
                        key: b.code,
                        label: b.name,
                      }))}
                    />
                    <WorkSelect
                      label="หน่วยงาน"
                      icon={<IconBuilding size={18} />}
                      selected={dept}
                      onChange={changeDept}
                      items={DEPARTMENTS.map((d) => ({
                        key: d.code,
                        label: d.name,
                      }))}
                    />
                    <WorkSelect
                      label="ห้องทำงาน"
                      icon={<IconDoor size={18} />}
                      selected={room}
                      onChange={setRoom}
                      items={rooms.map((r) => ({ key: r.code, label: r.name }))}
                    />
                  </div>

                  <Button
                    onPress={confirm}
                    radius="full"
                    isDisabled={!branch || !dept || !room}
                    className="mt-5 h-12 w-full bg-[#3485ff] text-[16px] font-medium text-white shadow-[0_10px_24px_rgba(52,133,255,0.3)]"
                    endContent={<IconArrowRight size={18} />}
                  >
                    เข้าสู่ระบบ
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WorkSelect({
  label,
  icon,
  selected,
  onChange,
  items,
}: {
  label: string;
  icon: React.ReactNode;
  selected: string;
  onChange: (key: string) => void;
  items: { key: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[13px] font-medium text-black/70">{label}</span>
      <Select
        aria-label={label}
        selectedKeys={selected ? [selected] : []}
        onSelectionChange={(keys) => {
          const k = Array.from(keys)[0];
          if (k != null) onChange(String(k));
        }}
        variant="bordered"
        radius="lg"
        startContent={<span className="text-black/40">{icon}</span>}
        classNames={{
          trigger:
            "h-12 min-h-12 border-black/[0.08] bg-white data-[hover=true]:border-black/20 data-[open=true]:!border-[#1f9d4d]",
          value: "text-[14px] text-[#111]",
        }}
      >
        {items.map((it) => (
          <SelectItem key={it.key} textValue={it.label}>
            {it.label}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}
