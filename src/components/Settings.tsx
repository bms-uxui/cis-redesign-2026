import { useMemo, useState } from "react";
import {
  IconUser,
  IconSettings2,
  IconChevronDown,
  IconInfoCircle,
  IconWorld,
  IconLanguage,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { Switch, Avatar, Button } from "@heroui/react";
import AVATAR from "../assets/figma/ellipse-avatar.png";
import { useToast } from "../contexts/ToastContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useTheme } from "../contexts/ThemeContext";
import ThemeStudio from "./settings/ThemeStudio";

const PREFS_KEY = "ehp-cis.settings.prefs";

interface Prefs {
  language: string;
  timezone: string;
  truncate: boolean;
  spellcheck: boolean;
  hideTimes: boolean;
  showTimes: boolean;
}

const DEFAULT_PREFS: Prefs = {
  language: "ภาษาไทย",
  timezone: "UTC +07:00 — กรุงเทพฯ",
  truncate: true,
  spellcheck: true,
  hideTimes: true,
  showTimes: true,
};

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // ignore quota / private-mode failures
  }
}

interface NavItemFlat {
  key: string;
  label: string;
  Icon: typeof IconUser;
}

const NAV: NavItemFlat[] = [
  { key: "user", label: "เกี่ยวกับผู้ใช้", Icon: IconUser },
  { key: "system", label: "ระบบ", Icon: IconSettings2 },
];

export default function Settings() {
  const toast = useToast();
  const { collapsed: sidebarCollapsed, railHidden } = useSidebar();
  const {
    isDirty: themeDirty,
    commit: commitTheme,
    discard: discardTheme,
  } = useTheme();
  const [activeNav, setActiveNav] = useState("user");

  // Saved snapshot reflects what's on disk; draft is the user's current
  // edits. Save copies draft → saved + localStorage; Cancel resets draft.
  const [savedPrefs, setSavedPrefs] = useState<Prefs>(() => loadPrefs());
  const [draft, setDraft] = useState<Prefs>(savedPrefs);

  const prefsDirty = useMemo(
    () =>
      draft.language !== savedPrefs.language ||
      draft.timezone !== savedPrefs.timezone ||
      draft.truncate !== savedPrefs.truncate ||
      draft.spellcheck !== savedPrefs.spellcheck ||
      draft.hideTimes !== savedPrefs.hideTimes ||
      draft.showTimes !== savedPrefs.showTimes,
    [draft, savedPrefs],
  );
  const isDirty = prefsDirty || themeDirty;

  const updateDraft = <K extends keyof Prefs>(key: K, value: Prefs[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    savePrefs(draft);
    setSavedPrefs(draft);
    commitTheme();
    toast.success(
      "บันทึกการตั้งค่าเรียบร้อย",
      "การตั้งค่าและธีมของคุณถูกบันทึกแล้ว",
    );
  };

  const handleCancel = () => {
    setDraft(savedPrefs);
    discardTheme();
  };

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      {/* Reserve space for the floating TopBar card (top-4 + h-16 = 80px) */}
      <div className="h-20 shrink-0" aria-hidden />

      <div
        className={[
          "mr-4 pb-4 pt-4 transition-[margin] duration-300 ease-out",
          railHidden
            ? "ml-4"
            : sidebarCollapsed
              ? "ml-[106px]"
              : "ml-[370px]",
        ].join(" ")}
      >
        {/* Two-column sheet — same rounded-3xl + soft shadow as Home cards.
            Fixed to the remaining viewport height so the sidebar stays put
            while only <main> scrolls. */}
        <div className="grid h-[calc(100vh-7rem)] grid-cols-[240px_1fr] overflow-hidden rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] shadow-sm">
          {/* Sidebar — mirrors Home's left nav. Independent overflow so it
              never grows the page; in practice the nav is short enough not
              to need to scroll. */}
          <aside className="overflow-y-auto border-r border-[var(--theme-neutral)]/15 px-4 py-6">
            <nav className="flex flex-col gap-2">
              {NAV.map((it) => {
                const active = activeNav === it.key;
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => setActiveNav(it.key)}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "flex h-[50px] items-center gap-2 rounded-lg px-4 py-3 text-left text-[14px] font-medium transition",
                      active
                        ? "bg-[var(--theme-primary-soft)] text-[var(--theme-neutral)]"
                        : "text-[var(--theme-neutral)] hover:bg-[var(--theme-primary-soft)]",
                    ].join(" ")}
                  >
                    <it.Icon className="h-5 w-5 shrink-0" stroke={1.6} />
                    <span>{it.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right column wraps the scrollable content plus a floating save bar */}
          <div className="relative flex min-h-0 flex-col">
            {/* Main content — the only scrollable area */}
            <main className="flex-1 overflow-y-auto px-8 pb-8 pt-20">
            {/* Avatar */}
            <Row
              title="รูปประจำตัว"
              description="เลือกรูปที่บ่งบอกตัวตนหรือแบรนด์ของคุณ"
            >
              <Field label="รูปภาพ">
                <div className="flex items-center gap-3">
                  <Avatar src={AVATAR} className="h-12 w-12" />
                  <Button
                    variant="bordered"
                    radius="full"
                    className="h-11 border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-4 text-[14px] font-medium text-[var(--theme-neutral)] data-[hover=true]:bg-[var(--theme-primary-soft)]"
                    startContent={<IconUpload className="h-4 w-4" stroke={1.75} />}
                  >
                    อัปโหลดรูป
                  </Button>
                  <button
                    type="button"
                    aria-label="ลบรูป"
                    title="ลบรูป"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--theme-neutral)]/15 text-[#ef4444] transition hover:bg-red-50"
                  >
                    <IconTrash className="h-4 w-4" stroke={1.75} />
                  </button>
                </div>
                <p className="mt-2 text-[12px] text-[var(--theme-neutral)]/55">
                  รองรับเฉพาะไฟล์ .JPG, JPEG หรือ PNG ขนาดไม่เกิน 2 MB
                </p>
              </Field>
            </Row>

            {/* Theme — rich generator with presets, all tokens, and radius */}
            <Row title="ธีม" description="ปรับแต่งสีและรูปร่างของอินเทอร์เฟซ">
              <ThemeStudio />
            </Row>

            {/* Language & Region */}
            <Row
              title="ภาษาและภูมิภาค"
              description="ปรับแต่งภาษาและภูมิภาคของคุณ"
            >
              <div className="flex flex-col gap-4">
                <Field label="ภาษา">
                  <SelectLike
                    value={draft.language}
                    onClick={() => updateDraft("language", draft.language)}
                    leading={<IconLanguage className="h-4 w-4" stroke={1.75} />}
                  />
                </Field>
                <Field label="เขตเวลา">
                  <SelectLike
                    value={draft.timezone}
                    onClick={() => updateDraft("timezone", draft.timezone)}
                    leading={<IconWorld className="h-4 w-4" stroke={1.75} />}
                  />
                </Field>
              </div>
            </Row>

            {/* Editor view options */}
            <Row
              title={
                <span className="inline-flex items-center gap-1.5">
                  ตัวเลือกการแสดงผลของตัวแก้ไข
                  <IconInfoCircle className="h-4 w-4 text-[var(--theme-neutral)]/40" stroke={1.75} />
                </span>
              }
              description="คำอธิบายสั้น ๆ"
            >
              <div className="flex flex-col gap-4">
                <ToggleRow
                  title="ตัดข้อความแปลที่ยาวในตัวแก้ไข"
                  description="ปรับแต่งสไตล์ทั่วทั้งระบบได้ง่าย"
                  value={draft.truncate}
                  onChange={(v) => updateDraft("truncate", v)}
                />
                <ToggleRow
                  title="แสดงข้อผิดพลาดการสะกดและไวยากรณ์ในตัวแก้ไข"
                  description="ปรับแต่งสไตล์ทั่วทั้งระบบได้ง่าย"
                  value={draft.spellcheck}
                  onChange={(v) => updateDraft("spellcheck", v)}
                />
                <button
                  type="button"
                  className="flex h-11 w-full items-center rounded-lg border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-4 text-left text-[14px] text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
                >
                  แก้ไขโปรไฟล์คีย์ลัด
                </button>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-[13px] font-medium text-[var(--theme-primary)] underline-offset-2 hover:underline"
                  >
                    ดูคีย์ลัดที่ใช้ได้
                  </button>
                </div>
              </div>
            </Row>

            {/* Time Entry Settings */}
            <Row
              title={
                <span className="inline-flex items-center gap-1.5">
                  การตั้งค่าการบันทึกเวลา
                  <IconInfoCircle className="h-4 w-4 text-[var(--theme-neutral)]/40" stroke={1.75} />
                </span>
              }
              description="กำหนดวิธีบันทึกเวลามาตรฐานที่ทีมควรใช้"
              last
            >
              <div className="flex flex-col gap-3">
                <p className="text-[14px] font-medium text-[var(--theme-neutral)]/60">โหมดเริ่มต้น</p>
                <div className="flex items-center gap-3">
                  <Switch
                    isSelected={draft.hideTimes}
                    onValueChange={(v) => updateDraft("hideTimes", v)}
                    size="sm"
                    color="primary"
                  />
                  <span className="text-[14px] font-medium text-[var(--theme-neutral)]">
                    ซ่อนเวลาเริ่มและสิ้นสุด
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    isSelected={draft.showTimes}
                    onValueChange={(v) => updateDraft("showTimes", v)}
                    size="sm"
                    color="primary"
                  />
                  <span className="text-[14px] font-medium text-[var(--theme-neutral)]">
                    แสดงเวลาเริ่มและสิ้นสุด
                  </span>
                </div>
              </div>
            </Row>
            </main>

            {/* Floating save bar — pill anchored to the top-right of the
                content column, stays visible while <main> scrolls. The
                pt-20 on <main> keeps the first row clear of the bar. */}
            <div className="pointer-events-none absolute right-6 top-6 z-10 flex">
              <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)]/95 px-3 py-2 backdrop-blur">
                <Button
                  variant="light"
                  radius="full"
                  isDisabled={!isDirty}
                  className="h-10 px-5 text-[14px] font-medium text-[var(--theme-neutral)] data-[hover=true]:bg-[var(--theme-primary-soft)]"
                  onPress={handleCancel}
                >
                  ยกเลิก
                </Button>
                <Button
                  radius="full"
                  isDisabled={!isDirty}
                  className="h-10 px-6 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: "var(--theme-primary)" }}
                  onPress={handleSave}
                >
                  บันทึกการเปลี่ยนแปลง
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  title,
  description,
  children,
  last,
}: {
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section
      className={[
        "grid grid-cols-[1fr_1.4fr] gap-10 py-7",
        last ? "" : "border-b border-[var(--theme-neutral)]/15",
      ].join(" ")}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-[16px] font-bold text-[var(--theme-neutral)]">{title}</h3>
        <p className="text-[13px] text-[var(--theme-neutral)]/55">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[14px] font-medium text-[var(--theme-neutral)]/60">{label}</p>
      {children}
    </div>
  );
}

function SelectLike({
  value,
  onClick,
  leading,
}: {
  value: string;
  onClick: () => void;
  leading?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 text-left text-[14px] text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
    >
      <span className="flex items-center gap-2">
        {leading}
        <span>{value}</span>
      </span>
      <IconChevronDown className="h-4 w-4 text-[var(--theme-neutral)]/50" stroke={1.75} />
    </button>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="pt-0.5">
        <Switch
          isSelected={value}
          onValueChange={onChange}
          size="sm"
          color="primary"
        />
      </div>
      <div className="flex flex-col">
        <p className="text-[14px] font-medium text-[var(--theme-neutral)]">{title}</p>
        <p className="text-[12px] text-[var(--theme-neutral)]/55">{description}</p>
      </div>
    </div>
  );
}
