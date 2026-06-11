import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  IconPlus,
  IconDotsVertical,
  IconUser,
  IconArrowUp,
  IconMicrophone,
  IconPlayerStopFilled,
  IconLoader2,
  IconPhoto,
  IconFileText,
  IconTrash,
  IconGitMerge,
  IconPrinter,
  IconRefresh,
  IconQrcode,
  IconAmbulance,
} from "@tabler/icons-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";
import { useDictation } from "../../hooks/useDictation";
import DateRangePicker from "../DateRangePicker";
import RegisterRoleModal from "../RegisterRoleModal";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Registered patients (mirrors the Figma reference data) ──────────────────
interface RegisteredPatient {
  name: string;
  cid: string;
  hn: string;
  lastVisit: string;
  time: string;
}

const REGISTERED: RegisteredPatient[] = [
  { name: "นางสาวอรทัย จันทร์ประเสริฐ", cid: "1309901234567", hn: "0812345678", lastVisit: "05 ก.ย. 2568", time: "09:24 น." },
  { name: "นายปริญญา วัฒนชัย", cid: "1356701234567", hn: "0856789012", lastVisit: "09 ก.พ. 2568", time: "13:05 น." },
  { name: "นางสาวธนิดา หาญกล้า", cid: "1334509876543", hn: "0845678901", lastVisit: "28 ธ.ค. 2569", time: "10:47 น." },
  { name: "นายสุนทร พงษ์พิทักษ์", cid: "1312901234567", hn: "0801234567", lastVisit: "11 ก.ค. 2570", time: "08:30 น." },
  { name: "นายวีรยุทธ เจริญสุข", cid: "1311209876543", hn: "0898765432", lastVisit: "22 ม.ค. 2570", time: "15:12 น." },
  { name: "นางสาวปวีณา ศรีสวัสดิ์", cid: "1345609876541", hn: "0865432198", lastVisit: "15 ส.ค. 2567", time: "11:58 น." },
  { name: "นายธนกร สิงห์ทอง", cid: "1324501234789", hn: "0823456789", lastVisit: "30 เม.ย. 2569", time: "14:03 น." },
  { name: "นางสาวพรทิพย์ บุญญาภิบาล", cid: "1387609876543", hn: "0834567890", lastVisit: "17 ต.ค. 2571", time: "09:50 น." },
  { name: "นางสาวกาญจนา พูลสุข", cid: "1378609876543", hn: "0878901234", lastVisit: "04 มี.ค. 2567", time: "16:21 น." },
  { name: "นายธวัชชัย บุญรักษา", cid: "1345901234567", hn: "0890123456", lastVisit: "23 พ.ย. 2568", time: "10:15 น." },
  { name: "นางสาวสุมิตรา ศรีทอง", cid: "1367809876543", hn: "0823456780", lastVisit: "07 ส.ค. 2570", time: "13:42 น." },
  { name: "นายวรพล เกษมสุข", cid: "1304501234567", hn: "0834567891", lastVisit: "19 เม.ย. 2569", time: "08:55 น." },
  { name: "นางสาวปิยนุช แก้วประเสริฐ", cid: "1328609876543", hn: "0812345679", lastVisit: "01 ก.พ. 2571", time: "14:38 น." },
];

// Gender-matched portrait photo, deterministic per patient so it never shuffles.
function avatarUrl(name: string, index: number): string {
  const isMale = name.startsWith("นาย") || name.startsWith("เด็กชาย") || name.startsWith("ด.ช.");
  const bucket = isMale ? "men" : "women";
  const n = (index * 7 + 3) % 90; // spread across the portrait set
  return `https://randomuser.me/api/portraits/${bucket}/${n}.jpg`;
}

export default function PatientRegister() {
  const { railHidden } = useSidebar();
  const { openTab } = useTabs();
  const [rows, setRows] = useState<RegisteredPatient[]>(REGISTERED);
  const [query, setQuery] = useState("");
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  // Voice search — records, transcribes (Thai), and drops the text into the
  // search box live. Isolated from the clinical-note dictation session.
  const voice = useDictation({
    language: "th",
    prompt:
      "ค้นหาผู้ป่วย: ชื่อ-นามสกุล, เลขบัตรประชาชน (CID), HN. Thai names and digits.",
    onPartial: (_chunk, full) => setQuery(full),
    onResult: (full) => setQuery(full),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.cid.includes(q) ||
        r.hn.includes(q),
    );
  }, [rows, query]);

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      <div className="h-16 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-6rem)] mr-4 mt-4 mb-4 overflow-hidden rounded-[24px] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-[296px]",
        ].join(" ")}
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-start justify-between gap-4 p-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[length:var(--theme-text-xl)] font-bold leading-tight text-[var(--theme-neutral)]">
                ทะเบียนผู้ป่วย
              </h1>
              <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55">
                รายชื่อผู้ป่วยที่ดำเนินการลงทะเบียนเข้าสู่ระบบเรียบร้อยแล้ว
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRoleModalOpen(true)}
              className="flex h-[42px] shrink-0 items-center gap-2 rounded-full bg-[var(--theme-primary)] px-5 text-[length:var(--theme-text-sm)] font-semibold text-white transition hover:brightness-105 active:scale-[0.98]"
            >
              <IconPlus className="h-4 w-4" stroke={2} />
              ลงทะเบียนผู้ป่วยใหม่
            </button>
          </header>

          {/* Filter / search bar (from Figma — colors mapped to design system) */}
          <div className="flex items-center gap-3 px-4 pb-3">
            {/* Search field with inline send button */}
            <div className="flex h-12 flex-1 items-center rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] pl-5 pr-1.5 transition focus-within:border-[var(--theme-primary)] focus-within:shadow-[0_0_0_3px_var(--theme-primary-soft)]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา HN, เลขบัตรประชาชน, ชื่อ-นามสกุล..."
                className="h-full flex-1 bg-transparent text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none placeholder:text-[var(--theme-neutral)]/45"
              />
              <button
                type="button"
                aria-label="ค้นหา"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary)] text-white transition hover:brightness-105 active:scale-95"
              >
                <IconArrowUp className="h-5 w-5" stroke={2} />
              </button>
            </div>

            {/* Voice search (speech-to-text) */}
            <button
              type="button"
              onClick={() => voice.toggle("mic")}
              disabled={voice.status === "requesting"}
              aria-label={voice.isActive ? "หยุดบันทึกเสียง" : "ค้นหาด้วยเสียง"}
              aria-pressed={voice.isActive}
              title={
                voice.status === "transcribing"
                  ? "กำลังถอดเสียง…"
                  : voice.isActive
                    ? "กำลังฟัง… แตะเพื่อหยุด"
                    : "ค้นหาด้วยเสียง"
              }
              className={[
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition",
                voice.isActive
                  ? "border-[var(--theme-error)] bg-[var(--theme-error)] text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--theme-error)_25%,transparent)]"
                  : "border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] text-[var(--theme-neutral)]/70 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]",
                voice.status === "requesting" ? "opacity-60" : "",
              ].join(" ")}
            >
              {voice.status === "transcribing" ? (
                <IconLoader2 className="h-5 w-5 animate-spin" stroke={1.75} />
              ) : voice.isActive ? (
                <IconPlayerStopFilled className="h-5 w-5" />
              ) : (
                <IconMicrophone className="h-5 w-5" stroke={1.75} />
              )}
            </button>

            {/* Date range picker (Figma 1086:2035 — themed) */}
            <DateRangePicker
              className="w-[300px] shrink-0"
              defaultValue={{
                start: new Date(2026, 5, 12), // 12 มิ.ย. 2569
                end: new Date(2026, 6, 12), //   12 ก.ค. 2569
              }}
            />
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[minmax(0,1.4fr)_1fr_1fr_1fr_44px] items-center gap-4 border-y border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/30 px-4 py-3">
            <span className="pl-[52px] text-[length:var(--theme-text-xs)] font-semibold uppercase tracking-[0.04em] text-[var(--theme-neutral)]/55">
              ชื่อ-นามสกุลผู้รับบริการ
            </span>
            <span className="text-[length:var(--theme-text-xs)] font-semibold uppercase tracking-[0.04em] text-[var(--theme-neutral)]/55">
              CID
            </span>
            <span className="text-[length:var(--theme-text-xs)] font-semibold uppercase tracking-[0.04em] text-[var(--theme-neutral)]/55">
              HN
            </span>
            <span className="text-[length:var(--theme-text-xs)] font-semibold uppercase tracking-[0.04em] text-[var(--theme-neutral)]/55">
              วันที่รับบริการล่าสุด
            </span>
            <span aria-hidden />
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-20">
                <IconUser className="h-6 w-6 text-[var(--theme-neutral)]/25" stroke={1.5} />
                <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/50">
                  {query.trim() ? "ไม่พบรายชื่อที่ค้นหา" : "ยังไม่มีรายชื่อผู้ป่วย"}
                </p>
              </div>
            ) : (
              filtered.map((r, i) => (
                <motion.div
                  key={r.cid}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: EASE_TV, delay: Math.min(i * 0.02, 0.2) }}
                  className="group grid grid-cols-[minmax(0,1.4fr)_1fr_1fr_1fr_44px] items-center gap-4 border-b border-[var(--theme-neutral)]/8 px-4 py-4 transition hover:bg-[var(--theme-primary-soft)]/30"
                >
                  {/* Name + photo */}
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarUrl(r.name, i)}
                      alt={r.name}
                      loading="lazy"
                      className="h-10 w-10 shrink-0 rounded-full bg-[var(--theme-neutral)]/8 object-cover"
                    />
                    <span className="truncate text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">
                      {r.name}
                    </span>
                  </div>

                  <span className="truncate text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/80 tabular-nums">
                    {r.cid}
                  </span>
                  <span className="truncate text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/80 tabular-nums">
                    {r.hn}
                  </span>
                  <span className="truncate text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/80">
                    {r.lastVisit} {r.time}
                  </span>

                  <RowActionMenu
                    name={r.name}
                    onDelete={() =>
                      setRows((prev) => prev.filter((p) => p.cid !== r.cid))
                    }
                  />
                </motion.div>
              ))
            )}
          </div>

          {/* Count footer (Figma 1107:2032) — synced to the live data */}
          <div className="flex shrink-0 items-center gap-2 border-t border-[var(--theme-neutral)]/10 px-4 py-2.5 text-[length:var(--theme-text-sm)]">
            <span className="font-medium text-[var(--theme-neutral)]/80">
              แสดง {filtered.length.toLocaleString("en-US")} ราย
            </span>
            <span className="text-[var(--theme-neutral)]/50">
              จากทั้งหมด {rows.length.toLocaleString("en-US")} ราย
            </span>
          </div>
        </div>
      </div>

      <RegisterRoleModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
      />
    </div>
  );
}

// ── Row action menu (kebab dropdown) ────────────────────────────────────────
interface ActionItem {
  key: string;
  label: string;
  Icon: typeof IconPhoto;
  danger?: boolean;
  run?: () => void;
}

function RowActionMenu({
  name,
  onDelete,
}: {
  name: string;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_W = 224;
  const MENU_H = 360;

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    // Flip upward when there isn't room below.
    const top =
      r.bottom + MENU_H > window.innerHeight ? r.top - MENU_H - 6 : r.bottom + 6;
    const left = Math.max(8, r.right - MENU_W);
    setCoords({ top, left });
  };

  const toggle = () => setOpen((v) => !v);

  // Position before paint whenever the menu opens (no flicker, works even
  // when opened programmatically).
  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const items: ActionItem[] = [
    { key: "photo", label: "Photo", Icon: IconPhoto },
    { key: "emr", label: "EMR", Icon: IconFileText },
    { key: "merge", label: "รวมข้อมูล", Icon: IconGitMerge },
    { key: "print", label: "พิมพ์", Icon: IconPrinter },
    { key: "reset", label: "Reset", Icon: IconRefresh },
    { key: "qr", label: "Mobile QR Code", Icon: IconQrcode },
    { key: "accident", label: "ส่งตรวจอุบัติเหตุ", Icon: IconAmbulance },
    { key: "delete", label: "ลบข้อมูล", Icon: IconTrash, danger: true, run: onDelete },
  ];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`ตัวเลือกสำหรับ ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={[
          "flex h-9 w-9 items-center justify-center rounded-[var(--theme-radius-selector)] transition",
          open
            ? "bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]"
            : "text-[var(--theme-neutral)]/40 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]",
        ].join(" ")}
      >
        <IconDotsVertical className="h-[18px] w-[18px]" stroke={1.75} />
      </button>

      {open &&
        createPortal(
          <motion.div
            ref={menuRef}
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.14, ease: EASE_TV }}
            style={{ top: coords.top, left: coords.left, width: MENU_W }}
            className="fixed z-[200] rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/12 bg-[var(--theme-surface)] p-1.5 shadow-[var(--theme-shadow-md)]"
          >
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  it.run?.();
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center gap-2.5 rounded-[var(--theme-radius-field)] px-3 py-2 text-left text-[length:var(--theme-text-sm)] transition",
                  it.danger
                    ? "text-[var(--theme-error)] hover:bg-[var(--theme-error)]/10"
                    : "text-[var(--theme-neutral)] hover:bg-[var(--theme-primary-soft)]",
                ].join(" ")}
              >
                <it.Icon
                  className={[
                    "h-[18px] w-[18px] shrink-0",
                    it.danger
                      ? "text-[var(--theme-error)]"
                      : "text-[var(--theme-neutral)]/55",
                  ].join(" ")}
                  stroke={1.75}
                />
                {it.label}
              </button>
            ))}
          </motion.div>,
          document.body,
        )}
    </>
  );
}
