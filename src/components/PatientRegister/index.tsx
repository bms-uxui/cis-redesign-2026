import { useState } from "react";
import { motion } from "framer-motion";
import { IconPlus, IconTrash, IconUser } from "@tabler/icons-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Registered patients (mirrors the Figma reference data) ──────────────────
interface RegisteredPatient {
  name: string;
  cid: string;
  hn: string;
  lastVisit: string;
}

const REGISTERED: RegisteredPatient[] = [
  { name: "นางสาวอรทัย จันทร์ประเสริฐ", cid: "1309901234567", hn: "0812345678", lastVisit: "05 ก.ย. 2568" },
  { name: "นายปริญญา วัฒนชัย", cid: "1356701234567", hn: "0856789012", lastVisit: "09 ก.พ. 2568" },
  { name: "นางสาวธนิดา หาญกล้า", cid: "1334509876543", hn: "0845678901", lastVisit: "28 ธ.ค. 2569" },
  { name: "นายสุนทร พงษ์พิทักษ์", cid: "1312901234567", hn: "0801234567", lastVisit: "11 ก.ค. 2570" },
  { name: "นายวีรยุทธ เจริญสุข", cid: "1311209876543", hn: "0898765432", lastVisit: "22 ม.ค. 2570" },
  { name: "นางสาวปวีณา ศรีสวัสดิ์", cid: "1345609876541", hn: "0865432198", lastVisit: "15 ส.ค. 2567" },
  { name: "นายธนกร สิงห์ทอง", cid: "1324501234789", hn: "0823456789", lastVisit: "30 เม.ย. 2569" },
  { name: "นางสาวพรทิพย์ บุญญาภิบาล", cid: "1387609876543", hn: "0834567890", lastVisit: "17 ต.ค. 2571" },
  { name: "นางสาวกาญจนา พูลสุข", cid: "1378609876543", hn: "0878901234", lastVisit: "04 มี.ค. 2567" },
  { name: "นายธวัชชัย บุญรักษา", cid: "1345901234567", hn: "0890123456", lastVisit: "23 พ.ย. 2568" },
  { name: "นางสาวสุมิตรา ศรีทอง", cid: "1367809876543", hn: "0823456780", lastVisit: "07 ส.ค. 2570" },
  { name: "นายวรพล เกษมสุข", cid: "1304501234567", hn: "0834567891", lastVisit: "19 เม.ย. 2569" },
  { name: "นางสาวปิยนุช แก้วประเสริฐ", cid: "1328609876543", hn: "0812345679", lastVisit: "01 ก.พ. 2571" },
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

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      <div className="h-20 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-7rem)] mr-4 mt-4 mb-4 overflow-hidden rounded-[24px] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-[296px]",
        ].join(" ")}
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-start justify-between gap-4 p-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[length:var(--theme-text-xl)] font-bold leading-tight text-[var(--theme-neutral)]">
                ทะเบียนรายชื่อผู้ป่วย
              </h1>
              <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55">
                รายชื่อผู้ป่วยที่ดำเนินการลงทะเบียนเข้าสู่ระบบเรียบร้อยแล้ว
              </p>
            </div>
            <button
              type="button"
              onClick={() => openTab("/patient/new", { title: "ลงทะเบียนผู้ป่วยใหม่" })}
              className="flex h-[42px] shrink-0 items-center gap-2 rounded-full bg-[var(--theme-primary)] px-5 text-[length:var(--theme-text-sm)] font-semibold text-white transition hover:brightness-105 active:scale-[0.98]"
            >
              <IconPlus className="h-4 w-4" stroke={2} />
              ลงทะเบียนผู้ป่วยใหม่
            </button>
          </header>

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
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-20">
                <IconUser className="h-6 w-6 text-[var(--theme-neutral)]/25" stroke={1.5} />
                <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/50">
                  ยังไม่มีรายชื่อผู้ป่วย
                </p>
              </div>
            ) : (
              rows.map((r, i) => (
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
                    {r.lastVisit}
                  </span>

                  <button
                    type="button"
                    aria-label={`ลบ ${r.name}`}
                    onClick={() => setRows((prev) => prev.filter((p) => p.cid !== r.cid))}
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--theme-radius-selector)] text-[var(--theme-neutral)]/35 transition hover:bg-[var(--theme-error)]/10 hover:text-[var(--theme-error)]"
                  >
                    <IconTrash className="h-[18px] w-[18px]" stroke={1.75} />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
