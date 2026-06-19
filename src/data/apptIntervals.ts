/**
 * Follow-up appointment intervals for auto-scheduling in the treatment plan.
 * The AI proposes an interval (in days) based on the visit; the UI maps it to
 * the nearest preset chip and computes a concrete date the doctor can confirm.
 */

export interface ApptInterval {
  key: string;
  label: string;
  days: number;
}

export const APPT_INTERVALS: ApptInterval[] = [
  { key: "1w", label: "1 สัปดาห์", days: 7 },
  { key: "2w", label: "2 สัปดาห์", days: 14 },
  { key: "1m", label: "1 เดือน", days: 30 },
  { key: "2m", label: "2 เดือน", days: 60 },
  { key: "3m", label: "3 เดือน", days: 90 },
  { key: "6m", label: "6 เดือน", days: 180 },
];

export type AppointmentType =
  | "follow-up"  // ติดตามอาการ
  | "lab-result" // ฟังผล
  | "chronic"    // ติดตามเรื้อรัง
  | "dressing"   // ทำแผล
  | "injection"  // ฉีด/ให้ยา
  | "procedure"  // หัตถการ
  | "referral";  // ส่งต่อ/ปรึกษา

export const APPT_TYPES: { key: AppointmentType; label: string }[] = [
  { key: "follow-up", label: "ติดตามอาการ" },
  { key: "lab-result", label: "ฟังผล" },
  { key: "chronic", label: "ติดตามเรื้อรัง" },
  { key: "dressing", label: "ทำแผล" },
  { key: "injection", label: "ฉีด/ให้ยา" },
  { key: "procedure", label: "หัตถการ" },
  { key: "referral", label: "ส่งต่อ/ปรึกษา" },
];

/** Structured appointment stored on the treatment plan. */
export interface PlanAppt {
  /** YYYY-MM-DD — auto-computed from the interval, editable by the doctor. */
  date: string;
  /** chosen interval preset (or "custom" when the date was hand-picked). */
  intervalKey: string;
  clinic: string;
  doctor: string;
  type: string;
  note?: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDaysISO(days: number, from?: string): string {
  const base = from ? new Date(from) : new Date();
  base.setDate(base.getDate() + days);
  return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(base.getDate())}`;
}

/** Map an arbitrary day count to the closest preset key. */
export function nearestIntervalKey(days: number): string {
  let best = APPT_INTERVALS[0];
  for (const it of APPT_INTERVALS) {
    if (Math.abs(it.days - days) < Math.abs(best.days - days)) best = it;
  }
  return best.key;
}

export const APPT_INTERVAL_BY_KEY: Record<string, ApptInterval> = Object.fromEntries(
  APPT_INTERVALS.map((i) => [i.key, i]),
);
