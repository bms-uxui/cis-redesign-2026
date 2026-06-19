import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconUser,
  IconSettings2,
  IconChevronDown,
  IconInfoCircle,
  IconWorld,
  IconLanguage,
  IconTrash,
  IconUpload,
  IconVolume,
} from "@tabler/icons-react";
import { Switch, Avatar, Button } from "@heroui/react";
import AVATAR from "../assets/figma/ellipse-avatar.png";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "../contexts/UserContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useTheme } from "../contexts/ThemeContext";
import ThemeStudio from "./settings/ThemeStudio";
import { PREFS_KEY, PREFS_EVENT } from "../services/ttsPrefs";
import { FONT_OPTIONS, DEFAULT_FONT_ID, applyFont, loadFontId } from "../services/fontPrefs";

interface Prefs {
  language: string;
  timezone: string;
  truncate: boolean;
  spellcheck: boolean;
  hideTimes: boolean;
  showTimes: boolean;
  ttsEnabled: boolean;
  ttsVoice: string;
  ttsSpeed: number;
  fontFamily: string;
}

const DEFAULT_PREFS: Prefs = {
  language: "ภาษาไทย",
  timezone: "UTC +07:00 — กรุงเทพฯ",
  truncate: true,
  spellcheck: true,
  hideTimes: true,
  showTimes: true,
  ttsEnabled: true,
  ttsVoice: "female",
  ttsSpeed: 1,
  fontFamily: DEFAULT_FONT_ID,
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
  const { user, setSignature } = useUser();
  const sigInputRef = useRef<HTMLInputElement>(null);
  const { railHidden } = useSidebar();

  const onPickSignature = (file?: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      toast.error("ไฟล์ไม่รองรับ", "รองรับเฉพาะ .PNG หรือ .JPG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกินไป", "ขนาดต้องไม่เกิน 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSignature(String(reader.result));
      toast.success("บันทึกลายเซ็นแล้ว", "จะปรากฏบนใบรับรองแพทย์");
    };
    reader.readAsDataURL(file);
  };
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
      draft.showTimes !== savedPrefs.showTimes ||
      draft.ttsEnabled !== savedPrefs.ttsEnabled ||
      draft.ttsVoice !== savedPrefs.ttsVoice ||
      draft.ttsSpeed !== savedPrefs.ttsSpeed ||
      draft.fontFamily !== savedPrefs.fontFamily,
    [draft, savedPrefs],
  );
  const isDirty = prefsDirty || themeDirty;

  // Live-preview the font as the draft changes; revert to the saved font on
  // unmount (covers navigating away without saving).
  useEffect(() => {
    applyFont(draft.fontFamily);
  }, [draft.fontFamily]);
  useEffect(() => {
    return () => applyFont(loadFontId());
  }, []);

  const updateDraft = <K extends keyof Prefs>(key: K, value: Prefs[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    savePrefs(draft);
    setSavedPrefs(draft);
    commitTheme();
    window.dispatchEvent(new CustomEvent(PREFS_EVENT));
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
      <div className="h-16 shrink-0" aria-hidden />

      <div
        className={[
          "mr-4 pb-4 pt-4 transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-4 lg:ml-[296px]",
        ].join(" ")}
      >
        {/* Two-column sheet — same rounded-3xl + soft shadow as Home cards.
            Fixed to the remaining viewport height so the sidebar stays put
            while only <main> scrolls. */}
        <div className="grid h-[calc(100vh-6rem)] grid-cols-[240px_1fr] overflow-hidden rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] shadow-sm">
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
            {activeNav === "user" && (
              <>
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

            {/* Doctor signature — stamped on the medical certificate */}
            <Row
              title="ลายเซ็นแพทย์"
              description="อัปโหลดรูปลายเซ็นเพื่อใช้ลงนามบนใบรับรองแพทย์"
            >
              <Field label="รูปลายเซ็น">
                <input
                  ref={sigInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    onPickSignature(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-28 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[var(--theme-neutral)]/20 bg-[var(--theme-surface)]">
                    {user.signatureUrl ? (
                      <img src={user.signatureUrl} alt="ลายเซ็น" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[11px] text-[var(--theme-neutral)]/40">ยังไม่มี</span>
                    )}
                  </div>
                  <Button
                    variant="bordered"
                    radius="full"
                    onPress={() => sigInputRef.current?.click()}
                    className="h-11 border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-4 text-[14px] font-medium text-[var(--theme-neutral)] data-[hover=true]:bg-[var(--theme-primary-soft)]"
                    startContent={<IconUpload className="h-4 w-4" stroke={1.75} />}
                  >
                    อัปโหลดลายเซ็น
                  </Button>
                  {user.signatureUrl && (
                    <button
                      type="button"
                      aria-label="ลบลายเซ็น"
                      title="ลบลายเซ็น"
                      onClick={() => {
                        setSignature(null);
                        toast.success("ลบลายเซ็นแล้ว");
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--theme-neutral)]/15 text-[#ef4444] transition hover:bg-red-50"
                    >
                      <IconTrash className="h-4 w-4" stroke={1.75} />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[12px] text-[var(--theme-neutral)]/55">
                  แนะนำพื้นหลังโปร่งใส (PNG) ขนาดไม่เกิน 2 MB
                </p>
              </Field>
            </Row>

            {/* Theme — rich generator with presets, all tokens, and radius */}
            <Row title="ธีม" description="ปรับแต่งสีและรูปร่างของอินเทอร์เฟซ">
              <ThemeStudio />
            </Row>

            {/* Font family — previews each option in its own typeface */}
            <Row title="แบบอักษร" description="เลือกฟอนต์ที่ใช้แสดงผลทั้งระบบ">
              <div className="grid grid-cols-2 gap-2.5">
                {FONT_OPTIONS.map((f) => {
                  const active = draft.fontFamily === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateDraft("fontFamily", f.id)}
                      style={{ fontFamily: f.stack }}
                      className={[
                        "flex flex-col items-start gap-0.5 rounded-[var(--theme-radius-field)] border px-3.5 py-2.5 text-left transition",
                        active
                          ? "border-[var(--theme-primary)] bg-[var(--theme-primary-soft)] ring-1 ring-[var(--theme-primary)]"
                          : "border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] hover:bg-[var(--theme-primary-soft)]",
                      ].join(" ")}
                    >
                      <span className="text-[14px] font-semibold text-[var(--theme-neutral)]">{f.label}</span>
                      <span className="text-[13px] text-[var(--theme-neutral)]/55">สวัสดี Aa ก ข ค 123</span>
                    </button>
                  );
                })}
              </div>
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
              </>
            )}

            {activeNav === "system" && (
              <>
                {/* Text-to-speech (อ่านออกเสียงข้อความที่เลือก) */}
                <Row
                  title={
                    <span className="inline-flex items-center gap-1.5">
                      การอ่านออกเสียงข้อความ
                      <IconVolume className="h-4 w-4 text-[var(--theme-neutral)]/40" stroke={1.75} />
                    </span>
                  }
                  description="เลือกข้อความในหน้าใดก็ได้เพื่อฟังเสียงอ่านภาษาไทย (Text-to-Speech)"
                  last
                >
                  <div className="flex flex-col gap-4">
                    <ToggleRow
                      title="เปิดใช้การอ่านออกเสียงข้อความที่เลือก"
                      description="แสดงปุ่ม “ฟังเสียง” เมื่อมีการไฮไลต์ข้อความ"
                      value={draft.ttsEnabled}
                      onChange={(v) => updateDraft("ttsEnabled", v)}
                    />
                    <div
                      className={[
                        "flex flex-col gap-4 transition",
                        draft.ttsEnabled ? "" : "pointer-events-none opacity-50",
                      ].join(" ")}
                    >
                      <Field label="เสียงผู้อ่าน">
                        <Segmented
                          value={draft.ttsVoice}
                          onChange={(v) => updateDraft("ttsVoice", v)}
                          options={[
                            { value: "female", label: "หญิง" },
                            { value: "male", label: "ชาย" },
                            { value: "female_sofia", label: "นุ่มนวล" },
                          ]}
                        />
                      </Field>
                      <Field label="ความเร็วในการอ่าน">
                        <Segmented
                          value={draft.ttsSpeed}
                          onChange={(v) => updateDraft("ttsSpeed", v)}
                          options={[
                            { value: 0.75, label: "0.75×" },
                            { value: 1, label: "1×" },
                            { value: 1.25, label: "1.25×" },
                            { value: 1.5, label: "1.5×" },
                          ]}
                        />
                      </Field>
                    </div>
                  </div>
                </Row>
              </>
            )}
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

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={[
              "rounded-md px-3.5 py-1.5 text-[13px] font-medium transition",
              active
                ? "bg-[var(--theme-primary)] text-white"
                : "text-[var(--theme-neutral)]/65 hover:bg-[var(--theme-primary-soft)]",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
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
