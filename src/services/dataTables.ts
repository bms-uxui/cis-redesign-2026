/**
 * Raw data tables exposed to the chat assistant.
 *
 * Replaces the hand-curated aggregator catalog (DATA_SOURCES) for chat: instead
 * of pre-computing answers and forcing the LLM to pick one, we ship the raw
 * rows and let the LLM filter / count / group / summarize directly from the
 * user's prompt. This works because the mock dataset is small (~25 patients,
 * a few hundred visits) — for production-scale data we'd push filters down.
 *
 * Each table here is just an array of plain objects. The TABLE_REGISTRY
 * exposes a name, a description, and a `getRows()` accessor; the system
 * prompt embeds the field list so the LLM knows what columns it can use.
 */
import { PATIENTS } from "../data/mock/patients";
import {
  LAB_HISTORY,
  VITAL_HISTORY,
  VISIT_HISTORY,
} from "../data/mock/clinical";
import {
  TODAY_APPOINTMENTS,
  NO_SHOW_HISTORY,
} from "../data/mock/operational";

export interface TableDef {
  name: string;
  description: string;
  /** Field-by-field schema doc the LLM sees. Free text — no parsing. */
  fields: { name: string; doc: string }[];
  /** Returns the rows. Plain JSON-serializable. */
  getRows: () => unknown[];
}

// ── Per-patient flattening helpers ────────────────────────────────────────
// LAB_HISTORY / VITAL_HISTORY / VISIT_HISTORY are keyed by patient id; we
// flatten them into single arrays with a `patient_id` field so the LLM can
// join back to `patients` if needed.

function flattenLabs() {
  const out: Array<Record<string, unknown>> = [];
  for (const p of PATIENTS) {
    for (const lab of LAB_HISTORY[p.id] ?? []) {
      out.push({ patient_id: p.id, patient_hn: p.hn, ...lab });
    }
  }
  return out;
}
function flattenVitals() {
  const out: Array<Record<string, unknown>> = [];
  for (const p of PATIENTS) {
    for (const v of VITAL_HISTORY[p.id] ?? []) {
      out.push({ patient_id: p.id, patient_hn: p.hn, ...v });
    }
  }
  return out;
}
function flattenVisits() {
  const out: Array<Record<string, unknown>> = [];
  for (const p of PATIENTS) {
    for (const v of VISIT_HISTORY[p.id] ?? []) {
      out.push({ patient_id: p.id, patient_hn: p.hn, ...v });
    }
  }
  return out;
}

// ── Registry ──────────────────────────────────────────────────────────────

export const TABLE_REGISTRY: Record<string, TableDef> = {
  patients: {
    name: "patients",
    description: "ผู้ป่วยทั้งหมดในระบบ (active + discharged + deceased). Source of truth สำหรับข้อมูลรายบุคคล: demographic, diagnoses, allergies, medications, labs ล่าสุด, risk flags",
    fields: [
      { name: "id", doc: "patient id (เช่น 'p001')" },
      { name: "hn", doc: "Hospital number (8 หลัก, เช่น '00012345')" },
      { name: "citizenId", doc: "เลขบัตรประชาชน" },
      { name: "prefix / firstName / lastName", doc: "ชื่อไทย" },
      { name: "birthDate / age", doc: "วันเกิด ISO + อายุปี" },
      { name: "gender", doc: "'M' | 'F'" },
      { name: "bloodType / rh", doc: "'A'|'B'|'AB'|'O' + '+'|'-'" },
      { name: "phone / email / address", doc: "ติดต่อ + {district, province}" },
      { name: "insurance", doc: "'UC'|'SSO'|'CSMBS'|'OOP'|'Private'" },
      { name: "status", doc: "'active'|'discharged'|'deceased'" },
      { name: "registeredDate / lastVisit", doc: "วันลงทะเบียน + วันตรวจล่าสุด (ISO)" },
      { name: "primaryDoctor", doc: "ชื่อหมอประจำ" },
      { name: "vitals", doc: "{ height, weight, bmi, systolic, diastolic, heartRate, temperature, measuredAt } — snapshot ล่าสุด" },
      { name: "diagnoses", doc: "Diagnosis[] — { code (ICD-10), name, onsetDate, severity }" },
      { name: "allergies", doc: "Allergy[] — { substance, reaction } (ว่างถ้าไม่มีประวัติแพ้)" },
      { name: "medications", doc: "Medication[] — { drug, dose, frequency, startedAt }" },
      { name: "labs", doc: "LabResult[] — ผลแลปล่าสุดต่อ test { test, value, unit, referenceRange, abnormal, takenAt }" },
      { name: "recentVisits", doc: "VisitSummary[] — สรุปการเข้าตรวจล่าสุด" },
      { name: "nextAppointment", doc: "{ date, clinic, doctor, type } | undefined" },
      { name: "riskFlags", doc: "RiskFlag[] — 'dm-uncontrolled' | 'ht-uncontrolled' | 'ckd-stage3' | 'ckd-stage4' | 'fall-risk' | 'polypharmacy' | 'missed-followup' | 'smoker' | 'obesity'" },
    ],
    getRows: () => PATIENTS,
  },

  visits: {
    name: "visits",
    description: "ประวัติการเข้าตรวจรายครั้ง flatten จาก VISIT_HISTORY ของผู้ป่วยทุกคน — 8-14 visits ต่อคน ครอบคลุม 18 เดือนล่าสุด",
    fields: [
      { name: "patient_id / patient_hn", doc: "ลิงก์กลับไปที่ patients" },
      { name: "visitId", doc: "id ของ visit" },
      { name: "date / time", doc: "วันที่ + เวลา (HH:mm)" },
      { name: "clinic", doc: "ชื่อคลินิก" },
      { name: "doctor", doc: "ชื่อหมอ" },
      { name: "chiefComplaint", doc: "อาการสำคัญ (ภาษาไทย)" },
      { name: "vitals", doc: "{ systolic, diastolic, hr, temp } ณ เวลาตรวจ" },
      { name: "diagnoses", doc: "{ code, name }[] ที่ถูกบันทึกใน visit นั้น" },
      { name: "orders", doc: "string[] — ออเดอร์ที่สั่ง เช่น 'CBC', 'EKG'" },
      { name: "notes", doc: "บันทึกย่อ" },
      { name: "waitTimeMin / visitMinutes", doc: "รอ vs ตรวจ (นาที)" },
      { name: "disposition", doc: "'ส่งกลับบ้าน' | 'admit' | 'refer' | 'นัดติดตาม'" },
    ],
    getRows: flattenVisits,
  },

  appointments_today: {
    name: "appointments_today",
    description: "นัดของวันนี้ทั้งระบบ ~150 นัด ครอบ 9 คลินิก",
    fields: [
      { name: "id / date / time", doc: "id + วันที่ + เวลา HH:mm" },
      { name: "clinic / doctor", doc: "ชื่อคลินิก + ชื่อหมอ" },
      { name: "patientHN / patientName", doc: "ลิงก์ + ชื่อผู้ป่วย" },
      { name: "type", doc: "'Follow-up' | 'New' | 'Procedure' | 'Vaccine' | 'ANC'" },
      { name: "status", doc: "'scheduled'|'checked_in'|'in_progress'|'done'|'no_show'|'cancelled'" },
      { name: "waitMinutes / durationMinutes", doc: "เวลารอ + เวลาตรวจ" },
    ],
    getRows: () => TODAY_APPOINTMENTS,
  },

  lab_history: {
    name: "lab_history",
    description: "ผลแลปย้อนหลังรายเดือน 12 จุดต่อ test ต่อผู้ป่วย (HbA1c สำหรับ DM, LDL สำหรับ E78, Creatinine สำหรับ CKD, Hb สำหรับ HT)",
    fields: [
      { name: "patient_id / patient_hn", doc: "ลิงก์กลับไป patients" },
      { name: "test", doc: "ชื่อ test เช่น 'HbA1c', 'LDL', 'Creatinine', 'Hb', 'FBS'" },
      { name: "value / unit", doc: "ค่า + หน่วย" },
      { name: "abnormal", doc: "boolean — true ถ้าออกนอก reference range" },
      { name: "takenAt", doc: "วันที่เก็บ ISO yyyy-mm-dd" },
    ],
    getRows: flattenLabs,
  },

  vital_history: {
    name: "vital_history",
    description: "Vitals snapshot รายเดือน 12 จุดต่อผู้ป่วย — ใช้ดู trend BP/น้ำหนัก",
    fields: [
      { name: "patient_id / patient_hn", doc: "ลิงก์" },
      { name: "date", doc: "ISO yyyy-mm-dd" },
      { name: "systolic / diastolic", doc: "BP" },
      { name: "heartRate", doc: "bpm" },
      { name: "weight / bmi", doc: "kg + BMI" },
    ],
    getRows: flattenVitals,
  },

  no_show_history: {
    name: "no_show_history",
    description: "บันทึกการขาดนัด 30 วันย้อนหลัง รายคลินิกรายวัน",
    fields: [
      { name: "date", doc: "ISO yyyy-mm-dd" },
      { name: "clinic", doc: "ชื่อคลินิก" },
      { name: "scheduled / noShow", doc: "นัดทั้งหมด + จำนวน no-show วันนั้น" },
    ],
    getRows: () => NO_SHOW_HISTORY,
  },
};

/** Build the schema documentation block for the system prompt. */
export function buildTableSchemaDoc(): string {
  const lines: string[] = [];
  for (const t of Object.values(TABLE_REGISTRY)) {
    lines.push(`## table: ${t.name}`);
    lines.push(t.description);
    lines.push("Fields:");
    for (const f of t.fields) lines.push(`  - ${f.name}: ${f.doc}`);
    const sample = t.getRows()[0];
    if (sample) {
      lines.push(`Sample row (1 of ${t.getRows().length}):`);
      lines.push("```json");
      lines.push(JSON.stringify(sample, null, 2));
      lines.push("```");
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Fetch raw rows for a table name. Returns null if the table doesn't exist. */
export function fetchTable(name: string): unknown[] | null {
  const def = TABLE_REGISTRY[name];
  if (!def) return null;
  return def.getRows();
}

export function tableNames(): string[] {
  return Object.keys(TABLE_REGISTRY);
}
