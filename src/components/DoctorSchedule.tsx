/**
 * Doctor workspace — Figma 1138:1728.
 *
 * Layout (desktop):
 *   ┌──────────────────────────────────────────┬──────────────────┐
 *   │ HERO BANNER (dark green, greeting copy)  │ DONUT CHART      │
 *   │                                          │ (10 เคส today,   │
 *   │                                          │  next case row)  │
 *   ├──────────────────────────────────────────┼──────────────────┤
 *   │ Calendar header row                      │ WIDGETS card     │
 *   │  [Mon][Tue][Wed][THU ●][Fri][Sat][Sun]   │ (skeleton +      │
 *   │ Calendar body row                        │  เพิ่ม link)     │
 *   │  [9 เคส][18 เคส][24 เคส][event list][…]  │                  │
 *   └──────────────────────────────────────────┴──────────────────┘
 *
 * Selected day uses orange (#d97706); unselected days show a "X เคส"
 * count pill in their body. First event in the selected list is the
 * "active" one — it gets a white bg + a blue "ดูประวัติคนไข้" CTA.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTabs } from "../contexts/TabsContext";
import {
  Modal,
  ModalContent,
  ModalBody,
    ModalFooter,
  ModalHeader,
  Button,
} from "@heroui/react";
import { IconCheck, IconMicrophone, IconPlayerPlay, IconLoader2, IconChevronDown, IconCalendarEvent, IconCalendarClock } from "@tabler/icons-react";
import DoctorRoster from "./DoctorRosterSchedule";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";
import { useSidebar } from "../contexts/SidebarContext";
import { useUser } from "../contexts/UserContext";
import { TODAY_APPOINTMENTS, type Appointment } from "../data/mock/operational";
import { PATIENTS } from "../data/mock/patients";
import {
  useAiCaseReview,
  HighlightedReview,
  AbnormalLabsCard,
  fmtThaiDate,
  useScrollOverflow,
} from "./PatientOPD";
import SpeakButton from "./SpeakButton";
import { useNurseHandoffs, handoffToAppointment } from "../data/nurseHandoff";
import BANNER_FIG_ORB from "../assets/figma/banner-fig-orb.png";
import BANNER_FIG_DESK from "../assets/figma/banner-fig-desk.png";

// ── Date helpers ──────────────────────────────────────────────────────────

const TH_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const TH_DOW_LONG = [
  "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์",
];

/**
 * Thai day-of-week colors (สีประจำวัน), tuned to the same tonal weight as
 * the Figma's Thursday amber so the selected-day banner reads with the
 * same visual heft regardless of which day is in focus. `bg` is the
 * solid header tint; `tint` is the very-soft body background; `soft` is
 * the wash on hover/secondary surfaces.
 */
const DAY_COLORS: { bg: string; tint: string; soft: string }[] = [
  { bg: "#ca8a04", tint: "rgba(202,138,4,0.04)", soft: "rgba(202,138,4,0.10)" }, // จันทร์ — เหลือง
  { bg: "#db2777", tint: "rgba(219,39,119,0.04)", soft: "rgba(219,39,119,0.10)" }, // อังคาร — ชมพู
  { bg: "#16a34a", tint: "rgba(22,163,74,0.04)", soft: "rgba(22,163,74,0.10)" }, // พุธ — เขียว
  { bg: "#d97706", tint: "rgba(217,119,6,0.04)", soft: "rgba(217,119,6,0.10)" }, // พฤหัสบดี — ส้ม
  { bg: "#0284c7", tint: "rgba(2,132,199,0.04)", soft: "rgba(2,132,199,0.10)" }, // ศุกร์ — ฟ้า
  { bg: "#7c3aed", tint: "rgba(124,58,237,0.04)", soft: "rgba(124,58,237,0.10)" }, // เสาร์ — ม่วง
  { bg: "#dc2626", tint: "rgba(220,38,38,0.04)", soft: "rgba(220,38,38,0.10)" }, // อาทิตย์ — แดง
];

function weekOf(ref: Date): Date[] {
  const d = new Date(ref);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return x;
  });
}

function fmtDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtThaiShort(d: Date) {
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]}`;
}

/** Single source of truth for "done" — used by EventRow's corner flag
 *  and the calendar's pending/done filter chips. */
function isAppointmentDone(a: Appointment): boolean {
  return a.status === "done" || (a.time >= "08:00" && a.time <= "08:40");
}

type CaseFilter = "pending" | "done" | "all";

// ── Component ─────────────────────────────────────────────────────────────

export default function DoctorSchedule() {
  const { railHidden } = useSidebar();
  const { user } = useUser();
  const { openTab } = useTabs();
  const handoffs = useNurseHandoffs();

  // Top-level view: patient appointments calendar vs doctor-roster management.
  const [view, setView] = useState<"appointments" | "roster">("appointments");

  const myAppointments = useMemo(() => {
    const mine = [...handoffs.map(handoffToAppointment), ...TODAY_APPOINTMENTS].filter(
      (a) => a.doctor === user.name,
    );
    if (mine.length > 0) return mine;
    // Every doctor must have cases: if the logged-in doctor isn't in the
    // seeded roster (e.g. the demo "พญ. ศิรินทร์ ภัทรกุล"), borrow the first
    // roster doctor's full day and relabel it to them.
    const fallbackDoctor = TODAY_APPOINTMENTS[0]?.doctor;
    return [
      ...handoffs.map(handoffToAppointment).filter((a) => a.doctor === user.name),
      ...TODAY_APPOINTMENTS.filter((a) => a.doctor === fallbackDoctor).map((a) => ({
        ...a,
        doctor: user.name,
      })),
    ];
  }, [handoffs, user.name]);

  // Open a patient in its OWN tab (browser-tab model) so the schedule tab
  // stays put and the calendar icon always returns here.
  const openPatient = (hn: string, consult = false) => {
    const name = myAppointments.find((a) => a.patientHN === hn)?.patientName ?? "ผู้ป่วย";
    openTab(`/opd/${hn}${consult ? "/consult" : ""}`, { title: name });
  };

  const today = new Date();
  const week = useMemo(() => weekOf(today), []);
  const [selectedIdx, setSelectedIdx] = useState(((today.getDay() + 6) % 7));
  const selectedDate = week[selectedIdx];

  const byDate = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of myAppointments) {
      const list = m.get(a.date) ?? [];
      list.push(a);
      m.set(a.date, list);
    }
    for (const list of m.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return m;
  }, [myAppointments]);

  const dayEvents = byDate.get(fmtDateKey(selectedDate)) ?? [];

  const [selectedApt, setSelectedApt] = useState<string | null>(null);
  const selectedAppointment = useMemo(
    () => myAppointments.find((a) => a.id === selectedApt) ?? null,
    [selectedApt, myAppointments],
  );

  // Top-of-list is treated as the "active" event by default; clicking
  // another row promotes it.
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const effectiveHighlight = highlightedId ?? dayEvents[0]?.id ?? null;

  // Aggregate "today" counters for the donut chart.
  const todayKey = fmtDateKey(today);
  const todayList = byDate.get(todayKey) ?? [];
  const doneCount = todayList.filter((a) => a.status === "done").length;
  const pendingCount = todayList.length - doneCount;
  const totalToday = todayList.length;

  // Next case = first non-finished appointment today.
  const nextCase = useMemo(
    () =>
      todayList
        .filter((a) => a.status !== "done" && a.status !== "cancelled")
        .sort((a, b) => a.time.localeCompare(b.time))[0],
    [todayList],
  );

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f4f4f4]">
      <div className="h-16 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-6rem)] mr-4 mt-4 mb-4 gap-4 overflow-hidden transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-4 lg:ml-[296px]",
        ].join(" ")}
      >
        {/* ── Left rail — today overview ───────────────────────────── */}
        <aside className="hidden w-[400px] min-h-0 shrink-0 flex-col overflow-hidden xl:flex">
          <NextCasePanel
            doneCount={doneCount}
            pendingCount={pendingCount}
            total={totalToday}
            nextCase={nextCase}
            onOpenPatient={(hn) => openPatient(hn)}
          />
        </aside>

        {/* ── Main column — doctor-roster scheduler ────────────────── */}
        <main className="flex min-w-0 min-h-0 flex-1 flex-col gap-4">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white">
            <DoctorRoster appointments={todayList} onOpenCase={(hn) => openPatient(hn)} />
          </section>
        </main>
      </div>

      <AppointmentDetailModal
        appointment={selectedAppointment}
        onClose={() => setSelectedApt(null)}
        onOpenPatient={(hn) => {
          setSelectedApt(null);
          openPatient(hn);
        }}
        onStartConsult={(hn) => {
          setSelectedApt(null);
          openPatient(hn, true);
        }}
      />
    </div>
  );
}

// ── View switch (appointments ↔ roster) ────────────────────────────────────

function ViewTabs({
  value,
  onChange,
}: {
  value: "appointments" | "roster";
  onChange: (v: "appointments" | "roster") => void;
}) {
  const tabs = [
    { key: "appointments" as const, label: "นัดผู้ป่วย", icon: IconCalendarEvent },
    { key: "roster" as const, label: "จัดเวรแพทย์", icon: IconCalendarClock },
  ];
  return (
    <div className="flex shrink-0 items-center gap-1 self-start rounded-full bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      {tabs.map((t) => {
        const active = value === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition",
              active ? "bg-[#21502c] text-white" : "text-black/45 hover:text-black/70",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" stroke={2} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Hero banner ───────────────────────────────────────────────────────────

/** Time-of-day Thai greeting (เช้า / บ่าย / เย็น). */
function greetingByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "สวัสดีตอนเช้า";
  if (h < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

function HeroBanner({ doctorName }: { doctorName: string }) {
  // Figma 1480:3935 — green base, white top-left triangle, grass orb + desk
  // illustration bottom-right, greeting/name/department text top-left.
  return (
    <section className="relative w-full shrink-0 overflow-hidden rounded-b-[24px] bg-[#21502c]">
      {/* White overlay with a diagonal right edge — green base shows as a wedge
          on the right (backing the illustration). Raise the bottom point (60%)
          to push the green band further right. */}
      <div
        className="pointer-events-none absolute inset-0 bg-white"
        style={{ clipPath: "polygon(0 0, 100% 0, 60% 100%, 0 100%)" }}
      />

      {/* Grass orb + desk illustration — anchored top-right, scales to the
          banner height (which is driven by the text). */}
      <div className="pointer-events-none absolute aspect-square" style={{ right: "0%", bottom: "0%", height: "94%" }}>
        {/* orb (cropped exactly as Figma) */}
        <div className="absolute left-0 top-0 overflow-hidden" style={{ width: "91.03%", aspectRatio: "1" }}>
          <img src={BANNER_FIG_ORB} alt="" className="absolute max-w-none select-none" style={{ left: "-42.86%", top: "-55.56%", width: "198.41%" }} />
        </div>
        {/* desk object */}
        <div className="absolute overflow-hidden" style={{ left: "8.15%", top: "9.63%", right: 0, bottom: 0 }}>
          <img src={BANNER_FIG_DESK} alt="" className="absolute inset-0 h-full w-full select-none" />
        </div>
      </div>

      {/* greeting · doctor name (bold) · department — in flow so it drives the
          banner height (no fixed aspect → stretches to the text). */}
      <div className="relative z-10 flex flex-col gap-0.5 py-6 pl-6 text-[#1f1f1f]" style={{ width: "62%" }}>
        <p className="text-[14px] font-medium">{greetingByHour()}</p>
        <p className="text-[24px] font-bold leading-tight">{doctorName}</p>
        <p className="text-[14px]">แผนกผู้ป่วยนอก OPD</p>
      </div>
    </section>
  );
}

// ── Calendar — header row ─────────────────────────────────────────────────

function CalendarHeaderRow({
  week,
  selectedIdx,
  byDate,
  onSelectDay,
}: {
  week: Date[];
  selectedIdx: number;
  byDate: Map<string, Appointment[]>;
  onSelectDay: (i: number) => void;
}) {
  const gridTemplate = week
    .map((_, i) => (i === selectedIdx ? "minmax(320px,2.2fr)" : "minmax(0,1fr)"))
    .join(" ");
  return (
    <div
      className="grid transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {week.map((d, i) => {
        const isSelected = i === selectedIdx;
        const count = (byDate.get(fmtDateKey(d)) ?? []).length;
        return (
          <motion.button
            key={`h-${i}`}
            type="button"
            onClick={() => onSelectDay(i)}
            whileHover={isSelected ? undefined : { y: -1 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={[
              "flex items-start justify-between gap-2 px-6 py-4 text-left -mr-px last:mr-0 transition-colors duration-300",
              isSelected
                ? "cursor-default"
                : "cursor-pointer border-[0.5px] border-[#d9d9d9] bg-white hover:bg-[#f9f9f9]",
            ].join(" ")}
            style={isSelected ? { background: DAY_COLORS[i].bg } : undefined}
          >
            <div className={["flex flex-col gap-1", isSelected ? "items-start" : "items-center w-full"].join(" ")}>
              <p
                className={[
                  "text-[16px] leading-tight transition-colors duration-300",
                  isSelected ? "font-bold text-white" : "font-medium text-black",
                ].join(" ")}
              >
                {TH_DOW_LONG[i]}
              </p>
              <p
                className={[
                  "text-[14px] leading-tight transition-colors duration-300",
                  isSelected ? "text-white/80" : "text-black/60",
                ].join(" ")}
              >
                {fmtThaiShort(d)}
              </p>
            </div>
            <AnimatePresence initial={false}>
              {isSelected && count > 0 && (
                <motion.span
                  key="count-pill"
                  initial={{ opacity: 0, scale: 0.85, x: 4 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.85, x: 4 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="flex shrink-0 items-center justify-center rounded-[16px] bg-white/15 px-6 py-2 text-[14px] font-medium text-white whitespace-nowrap"
                >
                  {count} เคส
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Calendar — body row ───────────────────────────────────────────────────

function CalendarBodyRow({
  week,
  selectedIdx,
  byDate,
  dayEvents,
  effectiveHighlight,
  onSelectDay,
  onSelectEvent,
  onOpenDetail,
}: {
  week: Date[];
  selectedIdx: number;
  byDate: Map<string, Appointment[]>;
  dayEvents: Appointment[];
  effectiveHighlight: string | null;
  onSelectDay: (i: number) => void;
  onSelectEvent: (id: string) => void;
  onOpenDetail: (hn: string) => void;
}) {
  const gridTemplate = week
    .map((_, i) => (i === selectedIdx ? "minmax(320px,2.2fr)" : "minmax(0,1fr)"))
    .join(" ");
  return (
    <div
      className="grid min-h-0 flex-1 transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {week.map((d, i) => {
        const isSelected = i === selectedIdx;
        const dayKey = fmtDateKey(d);
        const events = byDate.get(dayKey) ?? [];

        if (isSelected) {
          return (
            <SelectedDayColumn
              key={`b-${i}`}
              dayKey={dayKey}
              tint={DAY_COLORS[i].tint}
              accent={DAY_COLORS[i].bg}
              dayEvents={dayEvents}
              effectiveHighlight={effectiveHighlight}
              onSelectEvent={onSelectEvent}
              onOpenDetail={onOpenDetail}
            />
          );
        }

        // Inactive day body — figma shows a centered "X เคส" count pill.
        return (
          <motion.button
            key={`b-${i}`}
            type="button"
            onClick={() => onSelectDay(i)}
            whileHover={{ backgroundColor: "#f9f9f9" }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="flex min-h-0 cursor-pointer items-start border-[0.5px] border-[#d9d9d9] bg-white p-4 -mr-px last:mr-0"
            aria-label={`เลือก ${TH_DOW_LONG[i]}`}
          >
            <motion.span
              whileHover={{ scale: 1.04 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="flex w-full items-center justify-center rounded-[16px] bg-black/5 px-6 py-2 text-[14px] font-medium text-black whitespace-nowrap"
            >
              {events.length} เคส
            </motion.span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Selected day column — filter chips + animated event list ────────────

function SelectedDayColumn({
  dayKey,
  tint,
  accent,
  dayEvents,
  effectiveHighlight,
  onSelectEvent,
  onOpenDetail,
}: {
  dayKey: string;
  tint: string;
  accent: string;
  dayEvents: Appointment[];
  effectiveHighlight: string | null;
  onSelectEvent: (id: string) => void;
  onOpenDetail: (hn: string) => void;
}) {
  const [filter, setFilter] = useState<CaseFilter>("pending");

  const counts = useMemo(() => {
    let done = 0;
    for (const a of dayEvents) if (isAppointmentDone(a)) done++;
    return { done, pending: dayEvents.length - done, all: dayEvents.length };
  }, [dayEvents]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return dayEvents;
    const wantDone = filter === "done";
    return dayEvents.filter((a) => isAppointmentDone(a) === wantDone);
  }, [dayEvents, filter]);

  return (
    <div
      className="flex min-h-0 flex-col border-[0.5px] border-[#d9d9d9] -mr-px last:mr-0"
      style={{ background: tint }}
    >
      {/* Filter chips — pending first (default), then done, then all. */}
      <div className="flex items-center gap-2 border-b border-[#d9d9d9]/60 px-4 pt-4 pb-3">
        <FilterChip
          label="รอตรวจ"
          count={counts.pending}
          active={filter === "pending"}
          accent={accent}
          onClick={() => setFilter("pending")}
        />
        <FilterChip
          label="ตรวจแล้ว"
          count={counts.done}
          active={filter === "done"}
          accent="#16a34a"
          onClick={() => setFilter("done")}
        />
        <FilterChip
          label="ทั้งหมด"
          count={counts.all}
          active={filter === "all"}
          accent="#3965e1"
          onClick={() => setFilter("all")}
        />
      </div>

      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${dayKey}-${filter}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-2"
          >
            {filteredEvents.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-black/55">
                {filter === "pending"
                  ? "ไม่มีเคสรอตรวจ"
                  : filter === "done"
                    ? "ยังไม่มีเคสที่ตรวจแล้ว"
                    : "ไม่มีนัดในวันนี้"}
              </p>
            ) : (
              filteredEvents.map((a, idx) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.06 + idx * 0.035,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <EventRow
                    appointment={a}
                    highlighted={a.id === effectiveHighlight}
                    onSelect={() => onSelectEvent(a.id)}
                    onOpenDetail={() => onOpenDetail(a.patientHN)}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  accent,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className={[
        "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors duration-200",
        active
          ? "text-white"
          : "bg-white text-black/70 hover:bg-white hover:text-black",
      ].join(" ")}
      style={active ? { background: accent } : undefined}
    >
      {label}
      <span
        className={[
          "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold transition-colors duration-200",
          active ? "bg-white/20 text-white" : "bg-black/5 text-black/65",
        ].join(" ")}
      >
        {count}
      </span>
    </motion.button>
  );
}

// ── Event row inside the selected day column ─────────────────────────────

function EventRow({
  appointment: a,
  highlighted,
  onSelect,
  onOpenDetail,
}: {
  appointment: Appointment;
  highlighted: boolean;
  /** Highlight-only — fires when the row is focused or click-with-modifier. */
  onSelect: () => void;
  /** Primary navigation — fires on whole-row click + Enter. */
  onOpenDetail: () => void;
}) {
  const isDone = isAppointmentDone(a);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // Modifier-click promotes the row to "selected" without navigating
        // (useful for keyboard/screen-reader users who want to inspect).
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          onSelect();
          return;
        }
        onOpenDetail();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onOpenDetail();
        } else if (e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={[
        "group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-[16px] px-4 py-3 transition",
        highlighted ? "bg-white" : "bg-white/60 hover:bg-white",
      ].join(" ")}
    >
      {/* Top-right corner flag — green triangle stamp with a check icon
          sitting near the corner. Reads as "ตรวจแล้ว" status without
          taking inline space. */}
      {isDone && (
        <span
          className="pointer-events-none absolute right-0 top-0 h-8 w-8"
          aria-label="ตรวจแล้ว"
        >
          <span
            className="absolute right-0 top-0 block h-0 w-0"
            style={{
              borderTop: "32px solid #16a34a",
              borderLeft: "32px solid transparent",
            }}
          />
          <IconCheck
            className="absolute right-0.5 top-0.5 h-3 w-3 text-white"
            stroke={3}
          />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-[12px] font-medium text-black/60 leading-none">
          {a.time} น.
        </p>
        <p className="truncate text-[16px] font-medium text-black leading-tight">
          {a.patientName}
        </p>
        <p className="truncate text-[14px] text-black/60 leading-none">
          {a.type}
        </p>
      </div>
      {/* CTA appears only on hover (or keyboard focus) — keeps the list
          calm and lets the selected row stay visually clean. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetail();
        }}
        className="shrink-0 rounded-full bg-[#3965e1] px-4 py-2 text-[12px] font-medium text-white opacity-0 transition hover:brightness-105 focus-visible:opacity-100 group-hover:opacity-100"
      >
        ดูประวัติคนไข้
      </button>
    </div>
  );
}

// ── Next case row (right rail's donut card) ──────────────────────────────
// Mirrors EventRow's visual contract — same padding, hover-only CTA,
// optional "ตรวจแล้ว" corner flag — but renders on the gray "เคสถัดไป"
// surface inside the donut card.
function NextCaseRow({
  appointment: a,
  onOpenDetail,
}: {
  appointment: Appointment;
  onOpenDetail: () => void;
}) {
  const isDone = isAppointmentDone(a);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      className="group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-[16px] bg-[#f6f6f6] px-4 py-3 transition hover:bg-[#eeeeee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3965e1]/40"
    >
      {isDone && (
        <span
          className="pointer-events-none absolute right-0 top-0 h-8 w-8"
          aria-label="ตรวจแล้ว"
        >
          <span
            className="absolute right-0 top-0 block h-0 w-0"
            style={{
              borderTop: "32px solid #16a34a",
              borderLeft: "32px solid transparent",
            }}
          />
          <IconCheck
            className="absolute right-0.5 top-0.5 h-3 w-3 text-white"
            stroke={3}
          />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-[12px] font-medium text-black/60 leading-none">
          {a.time} น.
        </p>
        <p className="truncate text-[16px] font-medium text-black leading-tight">
          {a.patientName}
        </p>
        <p className="truncate text-[14px] text-black/60 leading-none">
          {a.type}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenDetail}
        className="shrink-0 rounded-full bg-[#3965e1] px-4 py-2 text-[12px] font-medium text-white opacity-0 transition hover:brightness-105 focus-visible:opacity-100 group-hover:opacity-100"
      >
        ดูประวัติคนไข้
      </button>
    </div>
  );
}

// ── Right rail — donut chart card ────────────────────────────────────────

/** True once the ref'd element has a non-zero box. Gates recharts so it never
 *  mounts at 0×0 (hidden/animating column) → silences the width(0)/height(0)
 *  console spam. */
function useHasSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setOk(el.clientWidth > 0 && el.clientHeight > 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ok] as const;
}

/** Single combined rail panel: today's gauge + เคสถัดไป appointment, then the
 *  next case's AI review (same hook/markup as the patient-detail card). The
 *  duplicate next-case patient row inside the AI block is intentionally omitted
 *  — the เคสถัดไป appointment above already identifies the patient. */
function NextCasePanel({
  doneCount,
  pendingCount,
  total,
  nextCase,
  onOpenPatient,
}: {
  doneCount: number;
  pendingCount: number;
  total: number;
  nextCase: Appointment | undefined;
  onOpenPatient: (hn: string) => void;
}) {
  const { user } = useUser();

  // Next case's AI review — identical hook + render to the detail panel.
  const patient = useMemo(
    () => (nextCase ? PATIENTS.find((p) => p.hn === nextCase.patientHN) : undefined),
    [nextCase],
  );
  const review = useAiCaseReview(patient);
  const abnormalLabs = patient ? patient.labs.filter((l) => l.abnormal).slice(0, 3) : [];
  const sinceDate =
    patient && patient.recentVisits.length ? fmtThaiDate(patient.recentVisits[patient.recentVisits.length - 1].date) : "";

  const ov = useScrollOverflow<HTMLDivElement>();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px]">
    <section
      ref={ov.ref}
      onScroll={ov.onScroll}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-[24px] bg-white py-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
    >
      {/* greeting banner — full-bleed, flush to the panel's top/left/right */}
      <div className="-mt-4">
        <HeroBanner doctorName={user.name} />
      </div>

      {/* Next in queue — patient profile of the upcoming case */}
      <div className="flex flex-col gap-2 px-4">
        <p className="text-[14px] font-semibold text-black">คิวถัดไป</p>
        {nextCase ? (
          <NextCaseRow appointment={nextCase} onOpenDetail={() => onOpenPatient(nextCase.patientHN)} />
        ) : (
          <div className="rounded-[16px] bg-[#f6f6f6] px-4 py-3 text-center text-[12px] text-black/55">ไม่มีคิวถัดไป</div>
        )}
      </div>

      {/* AI review of the next case — only when there's a known patient */}
      {nextCase && patient && (
        <>
          <div className="flex flex-col gap-2">
            {/* title + chip stacked (column is narrow) */}
            <div className="flex flex-col gap-1.5 px-4">
              <h3 className="flex items-center gap-1.5 text-[14px] font-semibold text-black/60">
                สรุปเคสโดย AI
                {review.loading && <IconLoader2 className="h-3.5 w-3.5 animate-spin" stroke={2} />}
                {review.blurb && <SpeakButton getText={() => review.blurb} />}
              </h3>
              {sinceDate && (
                <span className="inline-flex w-fit items-center rounded-[12px] bg-black/5 px-3 py-1 text-[12px] font-semibold text-black/60">
                  ข้อมูลจาก {sinceDate} ถึงปัจจุบัน
                </span>
              )}
            </div>

            <HighlightedReview
              text={review.blurb}
              highlights={review.highlights}
              className="px-4 text-[14px] font-normal leading-relaxed text-black"
            />

            {/* Abnormal labs — shared gradient purple panel (Figma 1396-18849).
                Direct child of the unpadded review column so w-full spans the
                full panel edge-to-edge; flex-1 fills the gradient to the bottom. */}
            <AbnormalLabsCard labs={abnormalLabs} className="-mb-4 grow shrink-0 rounded-b-none" />
          </div>
        </>
      )}
    </section>
      {/* bottom fade + scroll-down hint — only when more content below */}
      <AnimatePresence>
        {ov.canScrollDown && (
          <>
            <motion.div
              key="fade"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-9 rounded-b-[24px] bg-gradient-to-t from-white/55 via-white/15 to-transparent"
            />
            <motion.button
              key="chevron"
              type="button"
              onClick={() => ov.ref.current?.scrollBy({ top: 240, behavior: "smooth" })}
              aria-label="เลื่อนลง"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: [0, 4, 0] }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ y: { repeat: Infinity, duration: 1.3, ease: "easeInOut" }, opacity: { duration: 0.2 } }}
              className="absolute bottom-3 left-1/2 z-20 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-white text-[#3965e1] shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition hover:bg-slate-50"
            >
              <IconChevronDown className="h-5 w-5" stroke={2.2} />
            </motion.button>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Legend({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="block h-3 w-3 rounded-full"
        style={{ background: dotColor }}
        aria-hidden
      />
      <span className="text-[14px] text-[#5f6368]">{label}</span>
    </div>
  );
}


// ── Appointment detail modal ─────────────────────────────────────────────

const STATUS_PILL: Record<string, { label: string; tint: string }> = {
  scheduled: { label: "นัด", tint: "bg-[var(--theme-neutral)]/15 text-[var(--theme-neutral)]/70" },
  checked_in: { label: "รอตรวจ", tint: "bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]" },
  in_progress: { label: "กำลังตรวจ", tint: "bg-[#f5a524]/20 text-[#b06d00]" },
  done: { label: "เสร็จแล้ว", tint: "bg-[var(--theme-success)]/15 text-[var(--theme-success)]" },
  no_show: { label: "ขาดนัด", tint: "bg-[var(--theme-error)]/15 text-[var(--theme-error)]" },
  cancelled: { label: "ยกเลิก", tint: "bg-[var(--theme-neutral)]/10 text-[var(--theme-neutral)]/45" },
};

function AppointmentDetailModal({
  appointment,
  onClose,
  onOpenPatient,
  onStartConsult,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onOpenPatient: (hn: string) => void;
  onStartConsult: (hn: string) => void;
}) {
  const a = appointment;
  const pill = a ? STATUS_PILL[a.status] : null;
  const endTime = useMemo(() => {
    if (!a) return "";
    const start = new Date(`${a.date}T${a.time}:00`);
    const end = new Date(start.getTime() + a.durationMinutes * 60_000);
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  }, [a]);

  return (
    <Modal
      isOpen={!!a}
      onClose={onClose}
      placement="center"
      classNames={{
        base: "bg-[var(--theme-surface)] text-[var(--theme-neutral)]",
        backdrop: "bg-black/40",
      }}
    >
      <ModalContent>
        {a && (
          <>
            <ModalHeader className="flex items-center justify-between gap-3">
              <div className="flex flex-col leading-tight">
                <span className="text-[16px] font-bold">{a.patientName}</span>
                <span className="text-[12px] font-medium text-[var(--theme-neutral)]/55">
                  HN {a.patientHN}
                </span>
              </div>
              {pill && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${pill.tint}`}
                >
                  {pill.label}
                </span>
              )}
            </ModalHeader>
            <ModalBody className="text-[13px]">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <DetailRow label="เวลานัด" value={`${a.time} - ${endTime}`} />
                <DetailRow label="ระยะเวลา" value={`${a.durationMinutes} นาที`} />
                <DetailRow label="คลินิก" value={a.clinic} />
                <DetailRow label="ประเภท" value={a.type} />
                <DetailRow label="แพทย์ผู้ตรวจ" value={a.doctor} />
                {a.waitMinutes !== undefined && (
                  <DetailRow label="เวลารอ" value={`${a.waitMinutes} นาที`} />
                )}
              </dl>
            </ModalBody>
            <ModalFooter className="flex-wrap justify-end gap-2">
              <Button variant="flat" onPress={onClose}>
                ปิด
              </Button>
              <Button variant="bordered" onPress={() => onOpenPatient(a.patientHN)}>
                เปิดเวชระเบียน
              </Button>
              {a.status === "checked_in" && (
                <Button
                  color="primary"
                  className="bg-[#1ebfbf] text-white"
                  startContent={<IconPlayerPlay className="h-4 w-4" stroke={2} />}
                  onPress={() => onStartConsult(a.patientHN)}
                >
                  เริ่มตรวจ + ซักประวัติ
                </Button>
              )}
              {a.status === "in_progress" && (
                <Button
                  color="primary"
                  className="bg-[#1ebfbf] text-white"
                  startContent={<IconMicrophone className="h-4 w-4" stroke={2} />}
                  onPress={() => onStartConsult(a.patientHN)}
                >
                  ดำเนินการต่อ
                </Button>
              )}
              {a.status === "scheduled" && (
                <span className="self-center text-[12px] text-[var(--theme-neutral)]/55">
                  รอเคาน์เตอร์เช็คอินคนไข้
                </span>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-medium text-[var(--theme-neutral)]/55">{label}</dt>
      <dd className="text-[13px] font-semibold text-[var(--theme-neutral)]">{value}</dd>
    </div>
  );
}
