// ── Doctor roster / shift-management mock ──────────────────────────────────
// Weekly duty roster: who is on which shift, on-call, on leave, plus pending
// shift-swap requests and per-doctor workload. All client-side mock; swap the
// seed/helpers for a real API later without touching the UI.

export interface RosterDoctor {
  id: string;
  name: string; // full Thai name incl. prefix
  short: string; // first name only, for chips
  specialty: string;
  color: string; // accent for chips / workload bars
}

export const ROSTER_DOCTORS: RosterDoctor[] = [
  { id: "d1", name: "นพ.ราอูล มันเมาะ", short: "ราอูล", specialty: "อายุรกรรม", color: "#3485ff" },
  { id: "d2", name: "พญ.สุภาวดี ปิยะรัตน์", short: "สุภาวดี", specialty: "กุมารเวชกรรม", color: "#db2777" },
  { id: "d3", name: "นพ.ธวัชชัย พงษ์สวัสดิ์", short: "ธวัชชัย", specialty: "ศัลยกรรม", color: "#16a34a" },
  { id: "d4", name: "พญ.อรพิน วงศ์ใหญ่", short: "อรพิน", specialty: "สูตินรีเวช", color: "#7c3aed" },
  { id: "d5", name: "นพ.กิตติ บุญทวี", short: "กิตติ", specialty: "อายุรศาสตร์หัวใจ", color: "#ea580c" },
  { id: "d6", name: "พญ.นภัสสร ใจดี", short: "นภัสสร", specialty: "เวชปฏิบัติทั่วไป", color: "#0891b2" },
];

export function findDoctor(id: string): RosterDoctor | undefined {
  return ROSTER_DOCTORS.find((d) => d.id === id);
}

export interface ShiftDef {
  key: string;
  label: string;
  time: string;
  start: number; // 24h start hour (calendar Y position)
  end: number; // 24h end hour (capped at the calendar's bottom)
}

export const SHIFTS: ShiftDef[] = [
  { key: "morning", label: "เวรเช้า", time: "08:00–12:00", start: 8, end: 12 },
  { key: "afternoon", label: "เวรบ่าย", time: "13:00–16:00", start: 13, end: 16 },
  { key: "evening", label: "เวรนอกเวลา", time: "16:00–20:00", start: 16, end: 20 },
  { key: "night", label: "เวรดึก / on-call", time: "20:00–24:00", start: 20, end: 24 },
];

export function findShift(key: string): ShiftDef | undefined {
  return SHIFTS.find((s) => s.key === key);
}

export const ROOMS = ["OPD 1", "OPD 2", "ER", "หอผู้ป่วย"];

export type DutyKind = "duty" | "oncall";

export interface RosterEntry {
  id: string;
  doctorId: string;
  dateKey: string; // yyyy-mm-dd
  shiftKey: string;
  room: string;
  kind: DutyKind;
}

export type LeaveType = "ลาพักร้อน" | "ลากิจ" | "ลาป่วย" | "ประชุม/อบรม";

export interface LeaveEntry {
  id: string;
  doctorId: string;
  dateKey: string;
  type: LeaveType;
}

export type SwapStatus = "pending" | "approved" | "rejected";

export interface SwapRequest {
  id: string;
  entryId: string; // the roster entry being given up
  fromDoctorId: string;
  toDoctorId: string;
  reason: string;
  status: SwapStatus;
}

function eid(dateKey: string, shiftKey: string, doctorId: string) {
  return `${dateKey}__${shiftKey}__${doctorId}`;
}

/** Deterministically populate a week of duty so any selected week is filled.
 *  Each day gets two doctors on morning/afternoon, one on evening, and one
 *  on-call at night — rotated by day index so the grid looks like a real roster. */
export function seedRoster(weekKeys: string[]): RosterEntry[] {
  const N = ROSTER_DOCTORS.length;
  const out: RosterEntry[] = [];
  weekKeys.forEach((dateKey, i) => {
    const pick = (n: number) => ROSTER_DOCTORS[(i + n) % N];
    const add = (doc: RosterDoctor, shiftKey: string, room: string, kind: DutyKind) =>
      out.push({ id: eid(dateKey, shiftKey, doc.id), doctorId: doc.id, dateKey, shiftKey, room, kind });

    add(pick(0), "morning", "OPD 1", "duty");
    add(pick(1), "morning", "OPD 2", "duty");
    add(pick(2), "afternoon", "OPD 1", "duty");
    // weekends run lighter — single afternoon cover
    if (i < 5) add(pick(3), "afternoon", "OPD 2", "duty");
    add(pick(4), "evening", "ER", "duty");
    add(pick(5), "night", "หอผู้ป่วย", "oncall");
  });
  return out;
}

/** Leave + swap seeds are relative to the week (indices into weekKeys). */
export function seedLeaves(weekKeys: string[]): LeaveEntry[] {
  const mk = (i: number, doctorId: string, type: LeaveType): LeaveEntry => ({
    id: `lv-${i}-${doctorId}`,
    doctorId,
    dateKey: weekKeys[i],
    type,
  });
  return [mk(2, "d3", "ประชุม/อบรม"), mk(3, "d2", "ลากิจ"), mk(5, "d5", "ลาพักร้อน")];
}

export function seedSwaps(weekKeys: string[]): SwapRequest[] {
  return [
    {
      id: "sw-1",
      entryId: eid(weekKeys[3], "morning", ROSTER_DOCTORS[3 % ROSTER_DOCTORS.length].id),
      fromDoctorId: ROSTER_DOCTORS[3 % ROSTER_DOCTORS.length].id,
      toDoctorId: "d6",
      reason: "ติดนัดผู้ป่วยนอก",
      status: "pending",
    },
    {
      id: "sw-2",
      entryId: eid(weekKeys[1], "evening", ROSTER_DOCTORS[(1 + 4) % ROSTER_DOCTORS.length].id),
      fromDoctorId: ROSTER_DOCTORS[(1 + 4) % ROSTER_DOCTORS.length].id,
      toDoctorId: "d1",
      reason: "ขอสลับกับเวรบ่ายสัปดาห์หน้า",
      status: "pending",
    },
  ];
}
