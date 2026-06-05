import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  IconBell,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconLayoutGrid,
  IconList,
  IconPhone,
  IconMessageCircle,
  IconVideo,
  IconSearch,
} from "@tabler/icons-react";
import { useSidebar } from "../contexts/SidebarContext";
import { useUser } from "../contexts/UserContext";
import AVATAR from "./../assets/figma/ellipse-avatar.png";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ── Mock appointment data ───────────────────────────────────────────────────
interface Appointment {
  id: string;
  patient: string;
  role: string;
  startHour: number; // e.g. 12.17 = 12:10
  endHour: number;
  type: "primary" | "secondary";
  related?: string;
}

const APPOINTMENTS: Appointment[] = [
  { id: "a1", patient: "คุณสมหญิง ใจดี", role: "OPD — ตรวจรักษา", startHour: 12.17, endHour: 13.17, type: "primary" },
  { id: "a2", patient: "คุณวิชัย วัฒนสุข", role: "ติดตามผลเบาหวาน", startHour: 13.75, endHour: 14.58, type: "secondary", related: "a1" },
  { id: "a3", patient: "คุณปริชาติ พิทักษ์", role: "ตรวจสุขภาพประจำปี", startHour: 13.25, endHour: 14.25, type: "secondary" },
];

const HOURS = [12, 12.5, 13, 13.5, 14, 14.5];

const SCHEDULE = [
  { date: "20", day: "ส", label: "ตรวจ OPD ทั่วไป", with: "ดูแลโดย นพ.โจ" },
  { date: "24", day: "พ", label: "ปรึกษาผู้ป่วยเบาหวาน", with: "ทีม Endo" },
  { date: "29", day: "จ", label: "ประชุมประจำสัปดาห์", with: "หัวหน้าแผนก" },
];

const MONTHS = [
  { label: "August", active: false, faded: true },
  { label: "September", active: false },
  { label: "October", active: false },
  { label: "November", active: true },
  { label: "December", active: false },
  { label: "January", active: false },
  { label: "February", active: false, faded: true },
];

const DAYS = [
  { date: 16, day: "Mon", active: false, faded: true },
  { date: 17, day: "Tue", active: false },
  { date: 18, day: "Wed", active: false },
  { date: 19, day: "Thu", active: false, soft: true },
  { date: 20, day: "Fri", active: false },
  { date: 21, day: "Sat", active: true },
  { date: 22, day: "Sun", active: false },
  { date: 23, day: "Mon", active: false, soft: true },
  { date: 24, day: "Tue", active: false },
  { date: 25, day: "Wed", active: false },
  { date: 26, day: "Thu", active: false, faded: true },
];

export default function DoctorSchedule() {
  const { collapsed: sidebarCollapsed, railHidden } = useSidebar();
  const { user } = useUser();
  const [view, setView] = useState<"grid" | "list">("list");

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      <div className="h-20 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-7rem)] mr-4 mt-4 mb-4 overflow-hidden rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] transition-[margin] duration-300 ease-out",
          railHidden
            ? "ml-4"
            : sidebarCollapsed
              ? "ml-[106px]"
              : "ml-[370px]",
        ].join(" ")}
      >
        {/* Main column */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-10 py-10 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {/* Header */}
          <header className="mb-8 flex items-start justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-[length:var(--theme-text-2xl)] font-bold text-[var(--theme-neutral)]">
                ผู้ป่วยของวันนี้ <span className="font-normal text-[var(--theme-neutral)]/55">ตามคิวเวลานัด</span>
              </h1>
              <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55">
                ดูรายชื่อผู้ป่วยและช่วงเวลานัดของวันนี้แบบไทม์ไลน์
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <IconButton aria={"ค้นหา"}>
                <IconSearch className="h-5 w-5" stroke={1.75} />
              </IconButton>
              <IconButton aria={"การแจ้งเตือน"}>
                <IconBell className="h-5 w-5" stroke={1.75} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--theme-error)]" />
              </IconButton>
            </div>
          </header>

          {/* Filter row: month picker + period + view toggle */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/70">
              <button type="button" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--theme-radius-selector)] hover:bg-[var(--theme-primary-soft)]">
                <IconChevronLeft className="h-4 w-4" stroke={1.75} />
              </button>
              <span className="font-medium text-[var(--theme-neutral)]">November 2025</span>
              <button type="button" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--theme-radius-selector)] hover:bg-[var(--theme-primary-soft)]">
                <IconChevronRight className="h-4 w-4" stroke={1.75} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="flex h-9 items-center gap-2 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]">
                สัปดาห์นี้
                <IconChevronDown className="h-3.5 w-3.5 text-[var(--theme-neutral)]/55" stroke={1.75} />
              </button>
              <div className="flex h-9 items-center rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-0.5">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={[
                    "flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--theme-radius-selector)] transition",
                    view === "grid" ? "bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]" : "text-[var(--theme-neutral)]/55",
                  ].join(" ")}
                >
                  <IconLayoutGrid className="h-4 w-4" stroke={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={[
                    "flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--theme-radius-selector)] transition",
                    view === "list" ? "bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]" : "text-[var(--theme-neutral)]/55",
                  ].join(" ")}
                >
                  <IconList className="h-4 w-4" stroke={1.75} />
                </button>
              </div>
            </div>
          </div>

          {/* Month strip */}
          <div className="mb-3 flex items-end justify-between text-[length:var(--theme-text-xs)] uppercase tracking-[0.05em]">
            {MONTHS.map((m) => (
              <span
                key={m.label}
                className={[
                  m.faded ? "text-[var(--theme-neutral)]/25" : m.active ? "font-semibold text-[var(--theme-neutral)]" : "text-[var(--theme-neutral)]/55",
                ].join(" ")}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Day strip */}
          <div className="mb-10 flex items-center justify-between gap-2">
            {DAYS.map((d) => (
              <button
                key={`${d.date}-${d.day}`}
                type="button"
                className={[
                  "group flex h-[64px] w-[52px] flex-col items-center justify-center gap-0.5 rounded-full transition",
                  d.active
                    ? "bg-[var(--theme-surface)] ring-1 ring-[var(--theme-neutral)]/10 shadow-[var(--theme-shadow-sm)]"
                    : d.soft
                      ? "bg-[var(--theme-primary-soft)]"
                      : d.faded
                        ? "opacity-30"
                        : "hover:bg-[var(--theme-primary-soft)]",
                ].join(" ")}
              >
                <span className={[
                  "text-[length:var(--theme-text-lg)] font-semibold",
                  d.active ? "text-[var(--theme-neutral)]" : "text-[var(--theme-neutral)]/70",
                ].join(" ")}>
                  {d.date}
                </span>
                <span className={[
                  "text-[10px] uppercase tracking-[0.05em]",
                  d.active ? "font-semibold text-[var(--theme-primary)]" : "text-[var(--theme-neutral)]/45",
                ].join(" ")}>
                  {d.day}
                </span>
              </button>
            ))}
          </div>

          {/* Timeline */}
          <Timeline />
        </main>

        {/* Right sidebar */}
        <aside className="hidden w-[320px] shrink-0 flex-col gap-6 border-l border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 px-6 py-10 lg:flex">
          {/* Doctor card */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <img
                src={user.avatarUrl ?? AVATAR}
                alt=""
                className="h-24 w-24 rounded-full object-cover ring-4 ring-[var(--theme-surface)]"
              />
              <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--theme-primary)] text-[10px] font-bold text-white ring-2 ring-[var(--theme-surface)]">
                {user.name.slice(0, 1)}
              </span>
            </div>
            <div className="text-center">
              <p className="text-[length:var(--theme-text-md)] font-semibold text-[var(--theme-neutral)]">
                {user.name}
              </p>
              <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                {user.title}
              </p>
            </div>
          </div>

          {/* Monthly schedule */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
                ตารางประจำเดือน
              </p>
              <button type="button" className="text-[var(--theme-neutral)]/45" aria-label="ตัวเลือก">⋯</button>
            </div>
            <div className="flex flex-col gap-2">
              {SCHEDULE.map((s) => (
                <div key={s.date} className="flex items-start gap-3 rounded-[var(--theme-radius-field)] bg-[var(--theme-surface)] px-3 py-2.5">
                  <div className="flex w-10 shrink-0 flex-col items-center rounded-[var(--theme-radius-selector)] bg-[var(--theme-primary-soft)] py-1.5">
                    <span className="text-[length:var(--theme-text-md)] font-bold text-[var(--theme-neutral)]">{s.date}</span>
                    <span className="text-[10px] uppercase text-[var(--theme-primary)]">{s.day}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">{s.label}</p>
                    <p className="truncate text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">{s.with}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Active patients */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
                ผู้ป่วยที่ Active
              </p>
              <button type="button" className="text-[var(--theme-neutral)]/45" aria-label="ตัวเลือก">⋯</button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[length:var(--theme-text-xl)] font-bold text-[var(--theme-neutral)]">128</span>
              <span className="rounded-full bg-[var(--theme-success)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--theme-success)]">↑ 2.46%</span>
            </div>
            <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--theme-primary-soft)]">
              <span className="h-full" style={{ width: "50%", background: "var(--theme-primary)" }} />
              <span className="h-full" style={{ width: "32%", background: "color-mix(in oklch, var(--theme-primary), white 35%)" }} />
              <span className="h-full" style={{ width: "18%", background: "color-mix(in oklch, var(--theme-primary), white 60%)" }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[var(--theme-neutral)]/55">
              <span>OPD 50%</span>
              <span>IPD 32%</span>
              <span>Telehealth 18%</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function IconButton({ children, aria }: { children: React.ReactNode; aria: string }) {
  return (
    <button
      type="button"
      aria-label={aria}
      className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
    >
      {children}
    </button>
  );
}

function Timeline() {
  // Layout: hour labels at top, two-row appointment area below.
  const rangeStart = HOURS[0];
  const rangeEnd = HOURS[HOURS.length - 1] + 0.5;
  const span = rangeEnd - rangeStart;

  const pct = (h: number) => ((h - rangeStart) / span) * 100;

  // Group appointments into rows so overlaps don't collide.
  const rows = useMemo<Appointment[][]>(() => {
    const sorted = [...APPOINTMENTS].sort((a, b) => a.startHour - b.startHour);
    const out: Appointment[][] = [];
    for (const a of sorted) {
      let placed = false;
      for (const row of out) {
        const overlaps = row.some((x) => a.startHour < x.endHour && a.endHour > x.startHour);
        if (!overlaps) {
          row.push(a);
          placed = true;
          break;
        }
      }
      if (!placed) out.push([a]);
    }
    return out;
  }, []);

  return (
    <div className="relative">
      {/* Hour labels */}
      <div className="relative mb-3 h-5">
        {HOURS.map((h) => {
          const left = pct(h);
          const display = `${Math.floor(h).toString().padStart(2, "0")}:${(h % 1 ? "30" : "00")}`;
          return (
            <span
              key={h}
              className="absolute -translate-x-1/2 text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55"
              style={{ left: `${left}%` }}
            >
              {display}
            </span>
          );
        })}
      </div>

      {/* Vertical grid lines */}
      <div className="relative h-[280px] rounded-[var(--theme-radius-box)]">
        {HOURS.map((h) => (
          <span
            key={h}
            aria-hidden
            className="absolute top-0 bottom-0 w-px bg-[var(--theme-neutral)]/8"
            style={{ left: `${pct(h)}%` }}
          />
        ))}

        {/* Now indicator at 12:47 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE_TV }}
          className="absolute top-[-28px] flex flex-col items-center"
          style={{ left: `${pct(12.78)}%`, transform: "translateX(-50%)" }}
        >
          <span className="rounded-full bg-[var(--theme-primary)] px-2 py-0.5 text-[length:var(--theme-text-xs)] font-semibold text-white">
            12:47
          </span>
          <span className="mt-1 h-[300px] w-px bg-[var(--theme-primary)]/40" />
        </motion.div>

        {/* Appointment cards */}
        <div className="absolute inset-0 flex flex-col gap-3 py-4">
          {rows.map((row, ri) => (
            <div key={ri} className="relative h-20">
              {row.map((a) => {
                const left = pct(a.startHour);
                const width = pct(a.endHour) - left;
                const primary = a.type === "primary";
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE_TV }}
                    className={[
                      "absolute top-0 flex h-full items-center gap-3 rounded-[var(--theme-radius-field)] px-3 py-2",
                      primary
                        ? "bg-[var(--theme-primary)] text-white shadow-[var(--theme-shadow-md)]"
                        : "bg-[var(--theme-surface)] text-[var(--theme-neutral)] ring-1 ring-[var(--theme-neutral)]/10",
                    ].join(" ")}
                    style={{ left: `${left}%`, width: `${width}%`, minWidth: 240 }}
                  >
                    <img src={AVATAR} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-[length:var(--theme-text-sm)] font-semibold">{a.patient}</p>
                      <p className={[
                        "truncate text-[length:var(--theme-text-xs)]",
                        primary ? "text-white/75" : "text-[var(--theme-neutral)]/55",
                      ].join(" ")}>
                        {hourLabel(a.startHour)} – {hourLabel(a.endHour)} · {a.role}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions card for primary appointment */}
      <div className="mt-4 flex w-[280px] items-center gap-2 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] px-3 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">
            คุณสมหญิง ใจดี
          </p>
          <p className="truncate text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
            HN 00123 · OPD ตรวจรักษา
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <SmallAction><IconPhone className="h-3.5 w-3.5" stroke={1.75} /></SmallAction>
          <SmallAction><IconMessageCircle className="h-3.5 w-3.5" stroke={1.75} /></SmallAction>
          <SmallAction><IconVideo className="h-3.5 w-3.5" stroke={1.75} /></SmallAction>
        </div>
      </div>
    </div>
  );
}

function SmallAction({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[var(--theme-primary-soft)] text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary)]/15"
    >
      {children}
    </button>
  );
}

function hourLabel(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}
