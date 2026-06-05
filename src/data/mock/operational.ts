/**
 * Hospital operations mock data — appointments, queues, no-shows, wait
 * times. Designed so KPI/chart widgets backed by these have realistic
 * shapes: morning peak around 9-10am, no-show rate concentrated in a few
 * clinics, slot utilization 60-90%.
 *
 * All series are generated from a seeded RNG so widgets render the same
 * values every time the page loads within a session.
 */
import { PATIENTS } from "./patients";

export type AppointmentStatus = "scheduled" | "checked_in" | "in_progress" | "done" | "no_show" | "cancelled";

export interface Appointment {
  id: string;
  date: string; // ISO yyyy-mm-dd
  time: string; // HH:mm
  clinic: string;
  doctor: string;
  patientHN: string;
  patientName: string;
  type: "Follow-up" | "New" | "Procedure" | "Vaccine" | "ANC";
  status: AppointmentStatus;
  waitMinutes?: number;
  durationMinutes: number;
}

export interface QueueRow {
  clinic: string;
  waiting: number;
  inProgress: number;
  done: number;
  avgWaitMin: number;
}

export interface NoShowRecord {
  date: string;
  clinic: string;
  scheduled: number;
  noShow: number;
}

const CLINICS = [
  { name: "OPD ทั่วไป", capacity: 50, noShowRate: 0.08 },
  { name: "อายุรกรรม", capacity: 30, noShowRate: 0.06 },
  { name: "DM Clinic", capacity: 20, noShowRate: 0.12 },
  { name: "หัวใจ", capacity: 18, noShowRate: 0.05 },
  { name: "ไต", capacity: 12, noShowRate: 0.07 },
  { name: "เด็ก", capacity: 25, noShowRate: 0.04 },
  { name: "ฝากครรภ์", capacity: 16, noShowRate: 0.03 },
  { name: "ทันตกรรม", capacity: 14, noShowRate: 0.15 },
  { name: "หืด/COPD", capacity: 12, noShowRate: 0.09 },
];

const DOCTORS = ["นพ.ราอูล มันเมาะ", "พญ.สุภาวดี ปิยะรัตน์", "นพ.ธวัชชัย พงษ์สวัสดิ์", "พญ.อรพิน วงศ์ใหญ่", "นพ.กิตติ บุญทวี"];

// Seeded RNG so values don't jitter between renders.
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Today's appointments ──────────────────────────────────────────────────

function generateTodaysAppointments(): Appointment[] {
  const rng = mulberry32(20260605);
  const today = isoToday();
  const out: Appointment[] = [];
  let counter = 0;
  for (const clinic of CLINICS) {
    // Each clinic schedules ~70-90% of its capacity.
    const slots = Math.round(clinic.capacity * (0.7 + rng() * 0.2));
    for (let i = 0; i < slots; i++) {
      const hour = 8 + Math.floor((i / slots) * 8);
      const minute = (i * 7) % 60;
      const p = PATIENTS[Math.floor(rng() * PATIENTS.length)];
      const r = rng();
      let status: AppointmentStatus;
      const nowHour = new Date().getHours();
      if (hour < nowHour - 1) status = r < clinic.noShowRate ? "no_show" : "done";
      else if (hour <= nowHour) status = r < 0.4 ? "in_progress" : r < 0.7 ? "checked_in" : "done";
      else status = r < 0.05 ? "cancelled" : "scheduled";
      out.push({
        id: `apt-${counter++}`,
        date: today,
        time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        clinic: clinic.name,
        doctor: DOCTORS[Math.floor(rng() * DOCTORS.length)],
        patientHN: p.hn,
        patientName: `${p.prefix}${p.firstName} ${p.lastName}`,
        type: r < 0.6 ? "Follow-up" : r < 0.8 ? "New" : r < 0.92 ? "Procedure" : "Vaccine",
        status,
        waitMinutes: status === "done" || status === "in_progress" ? Math.round(10 + rng() * 40) : undefined,
        durationMinutes: 10 + Math.floor(rng() * 20),
      });
    }
  }
  return out;
}

export const TODAY_APPOINTMENTS: Appointment[] = generateTodaysAppointments();

// ── No-show history (last 30 days, per clinic per day) ────────────────────

function generateNoShowHistory(): NoShowRecord[] {
  const rng = mulberry32(778899);
  const out: NoShowRecord[] = [];
  for (let d = 29; d >= 0; d--) {
    const date = isoDaysAgo(d);
    const dow = new Date(date).getDay();
    if (dow === 0) continue; // closed Sundays
    for (const c of CLINICS) {
      const scheduled = Math.round(c.capacity * (0.7 + rng() * 0.25));
      const noShow = Math.round(scheduled * c.noShowRate * (0.6 + rng() * 0.9));
      out.push({ date, clinic: c.name, scheduled, noShow });
    }
  }
  return out;
}
export const NO_SHOW_HISTORY: NoShowRecord[] = generateNoShowHistory();

// ── Aggregators ───────────────────────────────────────────────────────────

export function appointmentsByClinic(): { label: string; value: number }[] {
  const buckets: Record<string, number> = {};
  for (const a of TODAY_APPOINTMENTS) buckets[a.clinic] = (buckets[a.clinic] ?? 0) + 1;
  return Object.entries(buckets).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function appointmentsByStatus(): { label: string; value: number }[] {
  const LABELS: Record<AppointmentStatus, string> = {
    scheduled: "รอเช็คอิน",
    checked_in: "เช็คอินแล้ว",
    in_progress: "กำลังตรวจ",
    done: "ตรวจเสร็จ",
    no_show: "No-show",
    cancelled: "ยกเลิก",
  };
  const buckets: Record<string, number> = {};
  for (const a of TODAY_APPOINTMENTS) {
    const lbl = LABELS[a.status];
    buckets[lbl] = (buckets[lbl] ?? 0) + 1;
  }
  return Object.entries(buckets).map(([label, value]) => ({ label, value }));
}

export function appointmentsByHour(): { label: string; value: number; x: number }[] {
  const buckets: Record<number, number> = {};
  for (const a of TODAY_APPOINTMENTS) {
    const h = parseInt(a.time.slice(0, 2), 10);
    buckets[h] = (buckets[h] ?? 0) + 1;
  }
  return Object.entries(buckets)
    .map(([h, value]) => ({ label: `${h}:00`, value, x: parseInt(h, 10) }))
    .sort((a, b) => a.x - b.x);
}

/** 14-day appointment volume trend. */
export function appointmentsTrend(): { label: string; value: number; x: string }[] {
  const rng = mulberry32(112233);
  return Array.from({ length: 14 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (13 - i));
    const dow = day.getDay();
    const base = dow === 0 ? 0 : dow === 6 ? 60 : 145 + Math.sin(i / 2) * 18 + (rng() - 0.5) * 12;
    return {
      label: `${day.getDate()}/${day.getMonth() + 1}`,
      value: Math.round(base),
      x: day.toISOString().slice(0, 10),
    };
  });
}

export function liveQueueByClinic(): QueueRow[] {
  const rows: QueueRow[] = [];
  for (const c of CLINICS) {
    const apts = TODAY_APPOINTMENTS.filter((a) => a.clinic === c.name);
    const waiting = apts.filter((a) => a.status === "scheduled" || a.status === "checked_in").length;
    const inProgress = apts.filter((a) => a.status === "in_progress").length;
    const done = apts.filter((a) => a.status === "done").length;
    const waits = apts.filter((a) => a.waitMinutes != null).map((a) => a.waitMinutes ?? 0);
    const avgWait = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;
    rows.push({ clinic: c.name, waiting, inProgress, done, avgWaitMin: avgWait });
  }
  return rows.sort((a, b) => b.waiting - a.waiting);
}

/** No-show rate (%) per clinic across the last 30 days. */
export function noShowRateByClinic(): { label: string; value: number }[] {
  const buckets: Record<string, { sch: number; ns: number }> = {};
  for (const r of NO_SHOW_HISTORY) {
    const b = (buckets[r.clinic] ??= { sch: 0, ns: 0 });
    b.sch += r.scheduled;
    b.ns += r.noShow;
  }
  return Object.entries(buckets)
    .map(([label, { sch, ns }]) => ({ label, value: +((ns / sch) * 100).toFixed(1) }))
    .sort((a, b) => b.value - a.value);
}

/** No-show count per day for the last 30 days. */
export function noShowTrend(): { label: string; value: number; x: string }[] {
  const buckets: Record<string, number> = {};
  for (const r of NO_SHOW_HISTORY) buckets[r.date] = (buckets[r.date] ?? 0) + r.noShow;
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => {
      const d = new Date(date);
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, value, x: date };
    });
}

/** Slot utilization (%) = scheduled / capacity per clinic. */
export function slotUtilization(): { label: string; value: number }[] {
  const todayByClinic: Record<string, number> = {};
  for (const a of TODAY_APPOINTMENTS) todayByClinic[a.clinic] = (todayByClinic[a.clinic] ?? 0) + 1;
  return CLINICS.map((c) => ({
    label: c.name,
    value: +(((todayByClinic[c.name] ?? 0) / c.capacity) * 100).toFixed(1),
  })).sort((a, b) => b.value - a.value);
}

/** Today's no-show count vs yesterday for KPI delta. */
export function todayNoShowKPI(): { value: number; previous: number } {
  const todayCount = TODAY_APPOINTMENTS.filter((a) => a.status === "no_show").length;
  const yesterday = NO_SHOW_HISTORY.filter((r) => r.date === isoDaysAgo(1)).reduce((s, r) => s + r.noShow, 0);
  return { value: todayCount, previous: yesterday };
}

/** Average wait time across all completed/in-progress appointments today. */
export function todayAverageWaitKPI(): { value: number; previous: number } {
  const waits = TODAY_APPOINTMENTS.filter((a) => a.waitMinutes != null).map((a) => a.waitMinutes ?? 0);
  const value = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;
  return { value, previous: value + 4 };
}
