import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion, type Variants } from "framer-motion";
import { useSidebar } from "../contexts/SidebarContext";
import { searchMenuEntries, type MenuEntry } from "./Sidebar/menuIndex";
import {
  IconSearch,
  IconUserPlus,
  IconVideo,
  IconBuildingHospital,
  IconReceipt2,
  IconStethoscope,
  IconClipboardText,
  IconCalendarEvent,
  IconBed,
  IconActivity,
  IconReportMedical,
  IconPill,
  IconCapsule,
  IconFileText,
  IconBrain,
  IconSparkles,
} from "@tabler/icons-react";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_TV } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

interface FeaturedTile {
  label: string;
  Icon: typeof IconUserPlus;
  to: string;
  tint: string;
  badge?: string;
}

const FEATURED: FeaturedTile[] = [
  { label: "ลงทะเบียนผู้ป่วยใหม่", Icon: IconUserPlus, to: "/patient/new", tint: "bg-[#3485ff]" },
  { label: "บันทึก SOAP", Icon: IconSparkles, to: "/soap", tint: "bg-[#8b5cf6]" },
  { label: "Telehealth", Icon: IconVideo, to: "/patient", tint: "bg-[#f59e0b]" },
  { label: "One Stop Service", Icon: IconBuildingHospital, to: "/patient", tint: "bg-[#10b981]", badge: "Beta" },
  { label: "Claims Submission", Icon: IconReceipt2, to: "/patient", tint: "bg-[#ef4444]" },
];

interface RecentRow {
  label: string;
  Icon: typeof IconUserPlus;
  to: string;
  tint: string;
  group: string;
  usedAgo: string;
}

const RECENT: RecentRow[] = [
  { label: "บันทึกประวัติ", group: "ระเบียนผู้ป่วยนอก", Icon: IconClipboardText, to: "/patient", tint: "bg-[#3485ff]", usedAgo: "45 นาทีที่แล้ว" },
  { label: "ส่งตรวจ", group: "ระเบียนผู้ป่วยนอก", Icon: IconStethoscope, to: "/patient", tint: "bg-[#3485ff]", usedAgo: "1 ชั่วโมงที่แล้ว" },
  { label: "การนัดหมาย", group: "ระเบียนผู้ป่วยนอก", Icon: IconCalendarEvent, to: "/patient", tint: "bg-[#3485ff]", usedAgo: "19 ชั่วโมงที่แล้ว" },
  { label: "การเข้ารับบริการ", group: "ระเบียนผู้ป่วยใน", Icon: IconBed, to: "/patient", tint: "bg-[#10b981]", usedAgo: "20 ชั่วโมงที่แล้ว" },
  { label: "การรักษา", group: "ระเบียนผู้ป่วยใน", Icon: IconActivity, to: "/patient", tint: "bg-[#10b981]", usedAgo: "2 วันที่แล้ว" },
  { label: "ติดตามผล", group: "ระเบียนผู้ป่วยใน", Icon: IconReportMedical, to: "/patient", tint: "bg-[#10b981]", usedAgo: "2 วันที่แล้ว" },
  { label: "สั่งจ่ายยา", group: "การจัดการยา", Icon: IconPill, to: "/patient", tint: "bg-[#8b5cf6]", usedAgo: "3 วันที่แล้ว" },
  { label: "การใช้ยา", group: "การจัดการยา", Icon: IconCapsule, to: "/patient", tint: "bg-[#8b5cf6]", usedAgo: "5 วันที่แล้ว" },
  { label: "การบันทึกประวัติยา", group: "การจัดการยา", Icon: IconFileText, to: "/patient", tint: "bg-[#8b5cf6]", usedAgo: "1 สัปดาห์ที่แล้ว" },
];

export default function AllMenus() {
  const navigate = useNavigate();
  const { railHidden, openMenu, pushRecent } =
    useSidebar();
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;

  // When the user types, search the full sidebar menu index — same behavior
  // as the global ⌘/ palette. When empty, fall back to the curated
  // Featured + Recent surfaces below.
  const searchResults = useMemo<MenuEntry[]>(() => {
    if (!isSearching) return [];
    return searchMenuEntries(query).entries.slice(0, 50);
  }, [query, isSearching]);

  const handleSelect = (entry: MenuEntry) => {
    openMenu(entry.railKey, entry.childKey);
    pushRecent(entry.id);
  };

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      {/* Reserve space for the floating TopBar card (top-4 + h-16 = 80px) */}
      <div className="h-16 shrink-0" aria-hidden />

      <div
        className={[
          "flex h-[calc(100vh-6rem)] mr-4 mt-4 mb-4 overflow-hidden rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-[296px]",
        ].join(" ")}
      >
        <div className="mx-auto flex h-full w-full max-w-[960px] flex-col gap-6 overflow-y-auto px-8 pb-8 pt-16 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {/* Context line — matches Figma's "Create file in:" header */}
        <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/60">
          เริ่มงานใหม่ใน{" "}
          <span className="font-medium text-[var(--theme-neutral)]">
            โรงพยาบาลทดสอบ BMS · OPD
          </span>
        </p>

        {/* Search — drives the same menu index as the global ⌘/ palette,
            so typing here finds every rail and panel item across the app. */}
        <div className="relative">
          <IconSearch
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--theme-neutral)]/40"
            stroke={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาเมนูทั้งระบบ..."
            autoFocus
            className="h-12 w-full rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] pl-11 pr-4 text-[length:var(--theme-text-md)] text-[var(--theme-neutral)] placeholder:text-[var(--theme-neutral)]/40 outline-none transition focus:border-[var(--theme-primary)] focus:shadow-[0_0_0_3px_var(--theme-primary-soft)]"
          />
        </div>

        {isSearching ? (
          <section className="flex flex-col gap-2">
            <p className="text-[length:var(--theme-text-xs)] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/45">
              ผลการค้นหา ({searchResults.length})
            </p>
            <div className="flex flex-col">
              {searchResults.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleSelect(entry)}
                  className="group flex items-center gap-4 rounded-[var(--theme-radius-field)] px-3 py-2.5 text-left transition hover:bg-[var(--theme-primary-soft)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--theme-radius-field)] bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]">
                    <IconSearch className="h-4 w-4" stroke={1.75} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">
                      {entry.label}
                    </span>
                    {entry.breadcrumb && (
                      <span className="truncate text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                        {entry.breadcrumb}
                      </span>
                    )}
                  </span>
                </button>
              ))}
              {searchResults.length === 0 && (
                <p className="py-6 text-center text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/50">
                  ไม่พบเมนูที่ตรงกับ "{query}"
                </p>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* Featured action tiles */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-3 gap-3 sm:grid-cols-6"
            >
              {FEATURED.map((f) => (
                <motion.button
                  key={f.label}
                  variants={fadeUp}
                  type="button"
                  onClick={() => navigate(f.to)}
                  className="group relative flex h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border border-[#e5e7eb] bg-[var(--theme-surface)] px-3 py-4 text-center transition hover:-translate-y-0.5 hover:border-[#9db6fb] hover:shadow-[0_8px_24px_rgba(157,182,251,0.25)]"
                >
                  {f.badge && (
                    <span className="absolute right-2 top-2 rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-[var(--theme-neutral)]/60">
                      {f.badge}
                    </span>
                  )}
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${f.tint} text-white`}
                  >
                    <f.Icon className="h-6 w-6" stroke={1.75} />
                  </span>
                  <span className="text-[13px] font-medium leading-tight text-[var(--theme-neutral)]">
                    {f.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>

            {/* Recent menus list */}
            <section className="flex flex-col gap-2">
              <p className="text-[13px] text-[var(--theme-neutral)]/60">เมนูล่าสุด</p>
              <div className="flex flex-col">
                {RECENT.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => navigate(r.to)}
                    className="group grid grid-cols-[44px_1fr_auto] items-center gap-4 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--theme-primary-soft)]"
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-lg ${r.tint} text-white`}
                    >
                      <r.Icon className="h-5 w-5" stroke={1.75} />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[14px] font-medium text-[var(--theme-neutral)]">
                        {r.label}
                      </span>
                      <span className="text-[12px] text-[var(--theme-neutral)]/50">{r.group}</span>
                    </span>
                    <span className="text-[12px] text-[var(--theme-neutral)]/50">{r.usedAgo}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
