/**
 * Longitudinal clinical mock data — derived from the baseline `PATIENTS`
 * catalog. Each function below produces a time series (labs, vitals) or a
 * deeper visit history per patient, generated deterministically from the
 * patient's diagnoses + baseline vitals so trend charts behave realistically:
 *   - DM patients show HbA1c hovering 7-9%, drifting with control
 *   - HT patients show systolic that responds to the time-since-onset
 *   - CKD patients show creatinine drifting upward
 *   - Visit frequency tracks severity (severe → monthly, mild → quarterly)
 *
 * Generation uses a per-patient seeded RNG so values are stable across
 * renders without hand-typing every point.
 */
import { PATIENTS, type Patient } from "./patients";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LabSeriesPoint {
  test: string;
  value: number;
  unit: string;
  abnormal: boolean;
  takenAt: string; // ISO yyyy-mm-dd
}

export interface VitalSeriesPoint {
  date: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  weight: number;
  bmi: number;
}

export interface DetailedVisit {
  visitId: string;
  date: string;
  time: string;
  clinic: string;
  doctor: string;
  chiefComplaint: string;
  vitals: { systolic: number; diastolic: number; hr: number; temp: number };
  diagnoses: { code: string; name: string }[];
  orders: string[];
  notes: string;
  waitTimeMin: number;
  visitMinutes: number;
  disposition: "ส่งกลับบ้าน" | "admit" | "refer" | "นัดติดตาม";
}

// ── Seeded RNG (mulberry32) ───────────────────────────────────────────────
// We don't want trends to wobble between renders, so each patient gets a
// deterministic RNG seeded from their id.
function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
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

function monthsAgoIso(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(15);
  return d.toISOString().slice(0, 10);
}
function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Patient-level generators ───────────────────────────────────────────────

function hasDx(p: Patient, prefix: string): boolean {
  return p.diagnoses.some((d) => d.code.startsWith(prefix));
}

/** 12 monthly lab points for each relevant test, anchored to the patient's
 *  latest lab and drifted backward in time. */
export function labHistoryFor(p: Patient): LabSeriesPoint[] {
  const rng = mulberry32(seedFromId(p.id));
  const out: LabSeriesPoint[] = [];

  const push = (test: string, unit: string, abnormalThreshold: (v: number) => boolean, anchor: number, drift: number, noise: number) => {
    for (let m = 11; m >= 0; m--) {
      const trend = anchor + drift * m + (rng() - 0.5) * noise;
      const value = +trend.toFixed(test === "HbA1c" ? 1 : test === "Creatinine" ? 2 : 0);
      out.push({ test, value, unit, abnormal: abnormalThreshold(value), takenAt: monthsAgoIso(m) });
    }
  };

  if (hasDx(p, "E11") || hasDx(p, "E10")) {
    const latest = p.labs.find((l) => l.test === "HbA1c")?.value ?? 7.5;
    const controlled = !p.riskFlags.includes("dm-uncontrolled");
    push("HbA1c", "%", (v) => v >= 6.5, latest, controlled ? 0.04 : -0.02, 0.5);
    push("FBS", "mg/dL", (v) => v > 100, p.labs.find((l) => l.test === "FBS")?.value ?? 130, controlled ? 0.6 : -0.4, 12);
  }
  if (hasDx(p, "E78")) {
    push("LDL", "mg/dL", (v) => v >= 100, p.labs.find((l) => l.test === "LDL")?.value ?? 130, 1.5, 10);
  }
  if (hasDx(p, "N18")) {
    push("Creatinine", "mg/dL", (v) => v > 1.2, p.labs.find((l) => l.test === "Creatinine")?.value ?? 1.4, -0.02, 0.12);
  }
  if (hasDx(p, "I10") || hasDx(p, "I11")) {
    // No specific lab — fall back to a CBC marker so the patient has SOMETHING
    push("Hb", "g/dL", (v) => v < 12, 13.5, 0.05, 0.4);
  }
  return out;
}

/** 12 monthly vitals snapshots — BP/weight track diagnoses + time. */
export function vitalHistoryFor(p: Patient): VitalSeriesPoint[] {
  const rng = mulberry32(seedFromId(p.id) ^ 0xa1b2c3);
  const out: VitalSeriesPoint[] = [];
  const baseS = p.vitals.systolic;
  const baseD = p.vitals.diastolic;
  const baseW = p.vitals.weight;
  const heightM = p.vitals.height / 100;
  const htUncontrolled = p.riskFlags.includes("ht-uncontrolled");

  for (let m = 11; m >= 0; m--) {
    const sysDrift = htUncontrolled ? -0.3 * m : 0.4 * m;
    const systolic = Math.round(baseS + sysDrift + (rng() - 0.5) * 8);
    const diastolic = Math.round(baseD + sysDrift * 0.5 + (rng() - 0.5) * 6);
    const heartRate = Math.round(p.vitals.heartRate + (rng() - 0.5) * 8);
    const weight = +(baseW + (rng() - 0.5) * 1.5 - m * 0.05).toFixed(1);
    const bmi = +(weight / (heightM * heightM)).toFixed(1);
    out.push({ date: monthsAgoIso(m), systolic, diastolic, heartRate, weight, bmi });
  }
  return out;
}

const CLINICS = ["DM Clinic", "อายุรกรรม", "OPD ทั่วไป", "หัวใจ", "ไต", "หืด/COPD", "Well baby", "ฝากครรภ์"];
const COMPLAINTS_BY_GROUP: Record<string, string[]> = {
  DM: ["ติดตามผล HbA1c", "ปลายมือชา", "ตามัวลง", "เท้าชา", "ปวดน่อง", "เหนื่อยง่าย"],
  HT: ["ติดตามความดัน", "ปวดศีรษะ", "เวียนหัว", "มือชา", "ใจสั่น"],
  Cardiac: ["เจ็บแน่นหน้าอก", "เหนื่อยง่าย", "บวมเท้า", "ใจสั่น", "นอนราบไม่ได้"],
  Respiratory: ["หอบเหนื่อย", "ไอเรื้อรัง", "เสมหะ", "หายใจไม่อิ่ม"],
  CKD: ["ติดตาม creatinine", "บวมเท้า", "ปัสสาวะน้อย", "เพลีย"],
  Endocrine: ["ตรวจระดับฮอร์โมน", "ผมร่วง", "น้ำหนักขึ้น"],
  Pregnancy: ["ฝากครรภ์", "ตรวจ ultrasound", "เด็กดิ้นน้อย"],
  Mental: ["ตรวจติดตามอาการ", "นอนไม่หลับ", "เครียด"],
  Other: ["ตรวจสุขภาพ", "ฉีดวัคซีน", "เปลี่ยนยา", "ปวดท้อง", "ไข้", "ผื่นแพ้"],
};
const ORDERS_POOL = ["CBC", "FBS", "HbA1c", "Lipid profile", "Creatinine", "Urinalysis", "EKG", "Chest X-ray", "BUN", "Electrolytes"];

function groupFor(p: Patient): keyof typeof COMPLAINTS_BY_GROUP {
  const codes = p.diagnoses.map((d) => d.code);
  if (codes.some((c) => c.startsWith("E11") || c.startsWith("E10"))) return "DM";
  if (codes.some((c) => c.startsWith("I20") || c.startsWith("I25") || c.startsWith("I48"))) return "Cardiac";
  if (codes.some((c) => c.startsWith("J44") || c.startsWith("J45"))) return "Respiratory";
  if (codes.some((c) => c.startsWith("N18"))) return "CKD";
  if (codes.some((c) => c.startsWith("E03") || c.startsWith("E05"))) return "Endocrine";
  if (codes.some((c) => c.startsWith("F"))) return "Mental";
  if (codes.some((c) => c.startsWith("Z34"))) return "Pregnancy";
  if (codes.some((c) => c.startsWith("I10"))) return "HT";
  return "Other";
}

/** 10-15 visit history per patient over the past 18 months. Severity dials
 *  frequency: severe → ~every 4 weeks, moderate → every 8, mild → every 12. */
export function visitHistoryFor(p: Patient): DetailedVisit[] {
  const rng = mulberry32(seedFromId(p.id) ^ 0xdeadbeef);
  const severity = p.diagnoses[0]?.severity ?? "mild";
  const intervalDays = severity === "severe" ? 28 : severity === "moderate" ? 56 : 90;
  const visitCount = severity === "severe" ? 14 : severity === "moderate" ? 11 : 8;
  const group = groupFor(p);
  const complaints = COMPLAINTS_BY_GROUP[group] ?? COMPLAINTS_BY_GROUP.Other;
  const primaryClinic = group === "DM" ? "DM Clinic" : group === "Cardiac" ? "หัวใจ" : group === "Respiratory" ? "หืด/COPD" : group === "CKD" ? "ไต" : group === "Pregnancy" ? "ฝากครรภ์" : "อายุรกรรม";

  const out: DetailedVisit[] = [];
  for (let i = visitCount - 1; i >= 0; i--) {
    const daysBack = i * intervalDays + Math.round((rng() - 0.5) * 5);
    if (daysBack < 0) continue;
    const useAcute = rng() < 0.25;
    const clinic = useAcute ? CLINICS[Math.floor(rng() * CLINICS.length)] : primaryClinic;
    const cc = complaints[Math.floor(rng() * complaints.length)];
    const hour = 8 + Math.floor(rng() * 9);
    const minute = Math.floor(rng() * 60);
    const orders: string[] = [];
    const orderCount = 1 + Math.floor(rng() * 3);
    for (let o = 0; o < orderCount; o++) {
      const pick = ORDERS_POOL[Math.floor(rng() * ORDERS_POOL.length)];
      if (!orders.includes(pick)) orders.push(pick);
    }
    out.push({
      visitId: `${p.id}-v${i}`,
      date: daysAgoIso(daysBack),
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      clinic,
      doctor: p.primaryDoctor,
      chiefComplaint: cc,
      vitals: {
        systolic: p.vitals.systolic + Math.round((rng() - 0.5) * 10),
        diastolic: p.vitals.diastolic + Math.round((rng() - 0.5) * 8),
        hr: p.vitals.heartRate + Math.round((rng() - 0.5) * 8),
        temp: +(36.5 + (rng() - 0.5) * 0.6).toFixed(1),
      },
      diagnoses: p.diagnoses.slice(0, 2).map((d) => ({ code: d.code, name: d.name })),
      orders,
      notes: `${cc} — ${p.diagnoses[0]?.name ?? "ตรวจสุขภาพ"}`,
      waitTimeMin: 8 + Math.floor(rng() * 30),
      visitMinutes: 10 + Math.floor(rng() * 25),
      disposition: rng() < 0.04 ? "admit" : rng() < 0.08 ? "refer" : rng() < 0.7 ? "นัดติดตาม" : "ส่งกลับบ้าน",
    });
  }
  return out;
}

// ── Pre-computed maps (built once on import) ──────────────────────────────

export const LAB_HISTORY: Record<string, LabSeriesPoint[]> = Object.fromEntries(
  PATIENTS.map((p) => [p.id, labHistoryFor(p)]),
);
export const VITAL_HISTORY: Record<string, VitalSeriesPoint[]> = Object.fromEntries(
  PATIENTS.map((p) => [p.id, vitalHistoryFor(p)]),
);
export const VISIT_HISTORY: Record<string, DetailedVisit[]> = Object.fromEntries(
  PATIENTS.map((p) => [p.id, visitHistoryFor(p)]),
);

// ── Aggregators ───────────────────────────────────────────────────────────

/** Monthly average HbA1c across DM patients — replaces the old sine mock. */
export function hba1cAvgByMonth(): { label: string; value: number }[] {
  return monthlyLabAvg("HbA1c");
}
/** Monthly average LDL across patients with E78. */
export function ldlAvgByMonth(): { label: string; value: number }[] {
  return monthlyLabAvg("LDL");
}
/** Monthly average creatinine across CKD patients. */
export function creatinineAvgByMonth(): { label: string; value: number }[] {
  return monthlyLabAvg("Creatinine");
}

function monthlyLabAvg(test: string): { label: string; value: number }[] {
  const buckets: Record<string, number[]> = {};
  for (const points of Object.values(LAB_HISTORY)) {
    for (const pt of points) {
      if (pt.test !== test) continue;
      const ym = pt.takenAt.slice(0, 7);
      (buckets[ym] ??= []).push(pt.value);
    }
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, vals]) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const [y, m] = ym.split("-");
      const label = `${parseInt(m, 10)}/${(parseInt(y, 10) + 543).toString().slice(2)}`;
      return { label, value: +avg.toFixed(test === "Creatinine" ? 2 : 1) };
    });
}

/** Monthly average systolic across hypertensive patients. */
export function systolicAvgByMonth(): { label: string; value: number }[] {
  const buckets: Record<string, number[]> = {};
  for (const p of PATIENTS) {
    if (!hasDx(p, "I10") && !hasDx(p, "I11")) continue;
    for (const v of VITAL_HISTORY[p.id]) {
      const ym = v.date.slice(0, 7);
      (buckets[ym] ??= []).push(v.systolic);
    }
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, vals]) => {
      const [y, m] = ym.split("-");
      const label = `${parseInt(m, 10)}/${(parseInt(y, 10) + 543).toString().slice(2)}`;
      return { label, value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };
    });
}

/** Visit volume per month across all patients. */
export function visitVolumeByMonth(): { label: string; value: number }[] {
  const buckets: Record<string, number> = {};
  for (const visits of Object.values(VISIT_HISTORY)) {
    for (const v of visits) {
      const ym = v.date.slice(0, 7);
      buckets[ym] = (buckets[ym] ?? 0) + 1;
    }
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, value]) => {
      const [y, m] = ym.split("-");
      return { label: `${parseInt(m, 10)}/${(parseInt(y, 10) + 543).toString().slice(2)}`, value };
    });
}

/** Top chief complaints across all detailed visits. */
export function topComplaints(limit = 8): { label: string; value: number }[] {
  const buckets: Record<string, number> = {};
  for (const visits of Object.values(VISIT_HISTORY)) {
    for (const v of visits) buckets[v.chiefComplaint] = (buckets[v.chiefComplaint] ?? 0) + 1;
  }
  return Object.entries(buckets)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/** Visit volume by clinic. */
export function visitsByClinic(): { label: string; value: number }[] {
  const buckets: Record<string, number> = {};
  for (const visits of Object.values(VISIT_HISTORY)) {
    for (const v of visits) buckets[v.clinic] = (buckets[v.clinic] ?? 0) + 1;
  }
  return Object.entries(buckets)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Average wait time across clinics, derived from real visit records. */
export function waitTimeByClinic(): { label: string; value: number }[] {
  const buckets: Record<string, number[]> = {};
  for (const visits of Object.values(VISIT_HISTORY)) {
    for (const v of visits) (buckets[v.clinic] ??= []).push(v.waitTimeMin);
  }
  return Object.entries(buckets)
    .map(([label, vals]) => ({
      label,
      value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }))
    .sort((a, b) => b.value - a.value);
}

// ── Patient lookup ────────────────────────────────────────────────────────
// LLM can pass `filters: { patient_name, patient_hn, patient_id }` and we
// resolve to a single Patient. Name match is loose: removes whitespace, then
// substring match across both name orderings.

export function resolvePatient(filters: Record<string, unknown> | undefined): Patient | null {
  if (!filters) return null;
  const id = filters.patient_id ?? filters.patientId;
  if (typeof id === "string") {
    const p = PATIENTS.find((x) => x.id === id);
    if (p) return p;
  }
  const hn = filters.patient_hn ?? filters.patientHN ?? filters.hn;
  if (typeof hn === "string") {
    const p = PATIENTS.find((x) => x.hn === hn);
    if (p) return p;
  }
  const name = filters.patient_name ?? filters.patientName ?? filters.name;
  if (typeof name === "string") {
    const norm = name.replace(/\s+/g, "").replace(/^(นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.|คุณ)/, "");
    const p = PATIENTS.find((x) => {
      const full1 = `${x.firstName}${x.lastName}`;
      const full2 = `${x.lastName}${x.firstName}`;
      return full1.includes(norm) || full2.includes(norm) || norm.includes(x.firstName);
    });
    if (p) return p;
  }
  return null;
}

/** Recent abnormal lab count per test, across the last 30 days. */
export function recentAbnormalLabsByTest(): { label: string; value: number }[] {
  const cutoff = daysAgoIso(30);
  const buckets: Record<string, number> = {};
  for (const points of Object.values(LAB_HISTORY)) {
    for (const pt of points) {
      if (!pt.abnormal) continue;
      if (pt.takenAt < cutoff) continue;
      buckets[pt.test] = (buckets[pt.test] ?? 0) + 1;
    }
  }
  return Object.entries(buckets)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
