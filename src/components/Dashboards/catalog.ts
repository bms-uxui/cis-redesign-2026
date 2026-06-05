import type {
  DataSourceDef,
  DataSourceResult,
  WidgetKind,
} from "./types";
import {
  countActive,
  patientsByDiagnosisGroup,
  patientsByAgeBand,
  patientsByInsurance,
  topMedications,
  riskDistribution,
  missedFollowupList,
  patientList,
} from "../../data/mock/patients";
import {
  hba1cAvgByMonth,
  ldlAvgByMonth,
  creatinineAvgByMonth,
  systolicAvgByMonth,
  visitVolumeByMonth,
  topComplaints,
  visitsByClinic,
  waitTimeByClinic,
  recentAbnormalLabsByTest,
  resolvePatient,
  LAB_HISTORY,
  VITAL_HISTORY,
  VISIT_HISTORY,
} from "../../data/mock/clinical";
import {
  TODAY_APPOINTMENTS,
  appointmentsByClinic,
  appointmentsByStatus,
  appointmentsByHour,
  appointmentsTrend,
  liveQueueByClinic,
  noShowRateByClinic,
  noShowTrend,
  slotUtilization,
  todayNoShowKPI,
  todayAverageWaitKPI,
} from "../../data/mock/operational";

/**
 * Catalogs the LLM is told to compose from. Two principles:
 *   1. Widget kinds are fixed — the renderer rejects unknown kinds.
 *   2. Data sources are predefined queries. The LLM picks an id +
 *      filters/group-by; it does NOT write SQL.
 */

export const WIDGET_KINDS: { id: WidgetKind; label: string; description: string }[] = [
  { id: "kpi", label: "KPI", description: "Single number with optional delta vs previous period" },
  { id: "line-chart", label: "Line Chart", description: "Time series — value over time" },
  { id: "bar-chart", label: "Bar Chart", description: "Categorical — value per category" },
  { id: "table", label: "Table", description: "List of records with columns" },
];

export const DATA_SOURCES: DataSourceDef[] = [
  {
    id: "appointments.today",
    description: "นัดผู้ป่วยของวันนี้",
    dimensions: ["clinic", "doctor", "status", "hour"],
    measures: ["count", "avg_wait_time_min"],
    filterOptions: {
      status: ["scheduled", "checked_in", "no_show", "done"],
    },
  },
  {
    id: "appointments.trend",
    description: "ปริมาณนัดย้อนหลัง 14 วัน",
    dimensions: ["day", "clinic"],
    measures: ["count"],
  },
  {
    id: "patients.active",
    description: "ผู้ป่วยที่ active แยกตามกลุ่มโรค",
    dimensions: ["diagnosis_group", "age_band"],
    measures: ["count"],
  },
  {
    id: "lab_results.recent",
    description: "ผลแลปย้อนหลัง 30 วัน (รายการ)",
    dimensions: ["test", "abnormal"],
    measures: ["count"],
  },
  {
    id: "no_show.list",
    description: "รายชื่อผู้ป่วย no-show",
    dimensions: ["patient", "clinic", "scheduled_time"],
    measures: ["count"],
  },
  {
    id: "patients.list",
    description: "รายชื่อผู้ป่วย active พร้อม vital + สิทธิ",
    dimensions: ["age", "gender", "insurance"],
    measures: ["count"],
  },
  {
    id: "patients.insurance",
    description: "สัดส่วนสิทธิรักษาของผู้ป่วย",
    dimensions: ["insurance"],
    measures: ["count"],
  },
  {
    id: "patients.risk",
    description: "การกระจายของกลุ่มเสี่ยง (DM ควบคุมไม่ได้, ขาดนัด, etc.)",
    dimensions: ["risk_flag"],
    measures: ["count"],
  },
  {
    id: "patients.missed",
    description: "ผู้ป่วยที่ขาดนัด / ติดตามไม่ได้",
    dimensions: ["patient", "doctor", "diagnosis"],
    measures: ["count"],
  },
  {
    id: "medications.top",
    description: "ยาที่สั่งจ่ายบ่อยที่สุด",
    dimensions: ["drug"],
    measures: ["count"],
  },
  {
    id: "labs.hba1c_trend",
    description: "ค่าเฉลี่ย HbA1c ของผู้ป่วยเบาหวานย้อนหลัง 12 เดือน",
    dimensions: ["month"],
    measures: ["avg"],
  },
  {
    id: "labs.ldl_trend",
    description: "ค่าเฉลี่ย LDL (cholesterol) ย้อนหลัง 12 เดือน",
    dimensions: ["month"],
    measures: ["avg"],
  },
  {
    id: "labs.creatinine_trend",
    description: "ค่าเฉลี่ย Creatinine ของผู้ป่วย CKD ย้อนหลัง 12 เดือน",
    dimensions: ["month"],
    measures: ["avg"],
  },
  {
    id: "vitals.systolic_trend",
    description: "ค่าเฉลี่ย systolic BP ของผู้ป่วย HT ย้อนหลัง 12 เดือน",
    dimensions: ["month"],
    measures: ["avg"],
  },
  {
    id: "visits.volume_by_month",
    description: "ปริมาณการเข้าตรวจรายเดือน",
    dimensions: ["month"],
    measures: ["count"],
  },
  {
    id: "visits.top_complaints",
    description: "อาการสำคัญที่พบบ่อยที่สุดจาก visit history",
    dimensions: ["complaint"],
    measures: ["count"],
  },
  {
    id: "visits.by_clinic",
    description: "ปริมาณการเข้าตรวจรายคลินิก (รวมทั้งหมด)",
    dimensions: ["clinic"],
    measures: ["count"],
  },
  {
    id: "visits.wait_time_by_clinic",
    description: "เวลารอเฉลี่ยรายคลินิก",
    dimensions: ["clinic"],
    measures: ["avg_wait_time_min"],
  },
  {
    id: "operational.queue",
    description: "คิวสด ณ ตอนนี้ — รอ/กำลังตรวจ/เสร็จ ต่อคลินิก",
    dimensions: ["clinic"],
    measures: ["waiting", "in_progress", "done", "avg_wait_time_min"],
  },
  {
    id: "operational.no_show_rate",
    description: "อัตรา no-show (%) รายคลินิก 30 วันล่าสุด",
    dimensions: ["clinic"],
    measures: ["pct"],
  },
  {
    id: "operational.no_show_trend",
    description: "จำนวน no-show ย้อนหลัง 30 วัน",
    dimensions: ["day"],
    measures: ["count"],
  },
  {
    id: "operational.slot_utilization",
    description: "อัตราใช้สล็อต (scheduled / capacity) รายคลินิก",
    dimensions: ["clinic"],
    measures: ["pct"],
  },

  // ── Per-patient sources (REQUIRE filter: patient_name | patient_hn) ─────
  {
    id: "patient.profile",
    description: "ข้อมูลพื้นฐานของผู้ป่วยรายบุคคล (ชื่อ/อายุ/เพศ/สิทธิ/กรุ๊ปเลือด/Dx). ต้องใส่ filter patient_name หรือ patient_hn",
    dimensions: [],
    measures: [],
  },
  {
    id: "patient.diagnoses",
    description: "รายการโรคประจำตัวของผู้ป่วยรายบุคคล. ต้องใส่ filter patient_name หรือ patient_hn",
    dimensions: [],
    measures: [],
  },
  {
    id: "patient.medications",
    description: "รายการยาที่ผู้ป่วยรายบุคคลใช้อยู่. ต้องใส่ filter patient_name หรือ patient_hn",
    dimensions: [],
    measures: [],
  },
  {
    id: "patient.visits",
    description: "ประวัติการเข้าตรวจของผู้ป่วยรายบุคคล (12 เดือนล่าสุด). ต้องใส่ filter patient_name หรือ patient_hn",
    dimensions: [],
    measures: [],
  },
  {
    id: "patient.vitals_trend",
    description: "Trend BP/HR/น้ำหนัก ของผู้ป่วยรายบุคคล 12 เดือน. ใช้ metric: systolic | diastolic | weight | bmi | heart_rate. ต้องใส่ filter patient_name หรือ patient_hn",
    dimensions: ["month"],
    measures: ["systolic", "diastolic", "weight", "bmi", "heart_rate"],
  },
  {
    id: "patient.labs_trend",
    description: "Trend ผลแลปของผู้ป่วยรายบุคคล 12 เดือน. ใช้ metric: HbA1c | FBS | LDL | Creatinine | Hb. ต้องใส่ filter patient_name หรือ patient_hn",
    dimensions: ["month"],
    measures: ["HbA1c", "FBS", "LDL", "Creatinine", "Hb"],
  },
  {
    id: "patient.risk_kpi",
    description: "จำนวน risk flag ของผู้ป่วยรายบุคคล (KPI). ต้องใส่ filter patient_name หรือ patient_hn",
    dimensions: [],
    measures: ["count"],
  },
];

// ── Mock data ─────────────────────────────────────────────────────────────
// Returns deterministic plausible values per source. Swap with Supabase
// queries later; the shape of `DataSourceResult` stays the same so widgets
// don't need to change.

export function queryDataSource(
  source: string,
  options: { groupBy?: string; metric?: string; filters?: Record<string, unknown> } = {},
): DataSourceResult {
  switch (source) {
    case "appointments.today":
      if (options.groupBy === "clinic") return { points: appointmentsByClinic() };
      if (options.groupBy === "hour") return { points: appointmentsByHour() };
      if (options.groupBy === "status") return { points: appointmentsByStatus() };
      if (options.metric === "avg_wait_time_min") {
        const w = todayAverageWaitKPI();
        return { kpi: { value: w.value, previous: w.previous, format: "minutes", unit: "นาที" } };
      }
      return { kpi: { value: TODAY_APPOINTMENTS.length, previous: TODAY_APPOINTMENTS.length - 6, format: "number", unit: "นัด" } };

    case "appointments.trend":
      return { points: appointmentsTrend() };

    case "patients.active":
      if (options.groupBy === "diagnosis_group") {
        return { points: patientsByDiagnosisGroup() };
      }
      if (options.groupBy === "age_band") {
        return { points: patientsByAgeBand() };
      }
      return { kpi: { value: countActive(), previous: countActive() - 2, format: "number", unit: "คน" } };

    case "patients.list": {
      const t = patientList();
      return { columns: t.columns, rows: t.rows };
    }
    case "patients.insurance":
      return { points: patientsByInsurance() };
    case "patients.risk":
      return { points: riskDistribution() };
    case "patients.missed": {
      const t = missedFollowupList();
      return { columns: t.columns, rows: t.rows };
    }
    case "medications.top":
      return { points: topMedications() };
    case "labs.hba1c_trend":
      return { points: hba1cAvgByMonth() };
    case "labs.ldl_trend":
      return { points: ldlAvgByMonth() };
    case "labs.creatinine_trend":
      return { points: creatinineAvgByMonth() };
    case "vitals.systolic_trend":
      return { points: systolicAvgByMonth() };
    case "visits.volume_by_month":
      return { points: visitVolumeByMonth() };
    case "visits.top_complaints":
      return { points: topComplaints() };
    case "visits.by_clinic":
      return { points: visitsByClinic() };
    case "visits.wait_time_by_clinic":
      return { points: waitTimeByClinic() };

    case "lab_results.recent":
      if (options.groupBy === "test") return { points: recentAbnormalLabsByTest() };
      return {
        kpi: {
          value: recentAbnormalLabsByTest().reduce((s, r) => s + r.value, 0),
          previous: 8,
          format: "number",
          unit: "ผลผิดปกติ",
        },
      };

    case "no_show.list": {
      const rows = TODAY_APPOINTMENTS.filter((a) => a.status === "no_show").slice(0, 12).map((a) => ({
        name: a.patientName,
        clinic: a.clinic,
        time: a.time,
        doctor: a.doctor,
      }));
      return {
        columns: [
          { key: "name", label: "ผู้ป่วย" },
          { key: "clinic", label: "คลินิก" },
          { key: "time", label: "เวลานัด" },
          { key: "doctor", label: "หมอ" },
        ],
        rows,
      };
    }

    case "operational.queue": {
      const rows = liveQueueByClinic().map((r) => ({
        clinic: r.clinic,
        waiting: r.waiting,
        in_progress: r.inProgress,
        done: r.done,
        avg_wait_min: r.avgWaitMin,
      }));
      return {
        columns: [
          { key: "clinic", label: "คลินิก" },
          { key: "waiting", label: "รอ" },
          { key: "in_progress", label: "กำลังตรวจ" },
          { key: "done", label: "เสร็จ" },
          { key: "avg_wait_min", label: "รอเฉลี่ย (นาที)" },
        ],
        rows,
      };
    }
    case "operational.no_show_rate":
      return { points: noShowRateByClinic() };
    case "operational.no_show_trend":
      if (options.metric === "count" || !options.metric) {
        const t = todayNoShowKPI();
        if (options.groupBy === "day") return { points: noShowTrend() };
        return { kpi: { value: t.value, previous: t.previous, format: "number", unit: "ราย" } };
      }
      return { points: noShowTrend() };
    case "operational.slot_utilization":
      return { points: slotUtilization() };

    // ── Per-patient sources ────────────────────────────────────────────
    case "patient.profile": {
      const p = resolvePatient(options.filters);
      if (!p) return patientNotFound(options.filters);
      const rows = [
        { field: "ชื่อ", value: `${p.prefix}${p.firstName} ${p.lastName}` },
        { field: "HN", value: p.hn },
        { field: "เลขบัตร", value: p.citizenId },
        { field: "เพศ", value: p.gender === "M" ? "ชาย" : "หญิง" },
        { field: "อายุ", value: `${p.age} ปี` },
        { field: "วันเกิด", value: p.birthDate },
        { field: "กรุ๊ปเลือด", value: `${p.bloodType}${p.rh}` },
        { field: "สิทธิ", value: p.insurance },
        { field: "ที่อยู่", value: `${p.address.district} ${p.address.province}` },
        { field: "เบอร์โทร", value: p.phone },
        { field: "หมอประจำ", value: p.primaryDoctor },
        { field: "ตรวจครั้งล่าสุด", value: p.lastVisit },
      ];
      return {
        columns: [{ key: "field", label: "หัวข้อ" }, { key: "value", label: "ข้อมูล" }],
        rows,
      };
    }
    case "patient.diagnoses": {
      const p = resolvePatient(options.filters);
      if (!p) return patientNotFound(options.filters);
      return {
        columns: [
          { key: "code", label: "ICD-10" },
          { key: "name", label: "โรค" },
          { key: "severity", label: "ระดับ" },
          { key: "onsetDate", label: "เริ่ม" },
        ],
        rows: p.diagnoses.map((d) => ({ code: d.code, name: d.name, severity: d.severity, onsetDate: d.onsetDate })),
      };
    }
    case "patient.medications": {
      const p = resolvePatient(options.filters);
      if (!p) return patientNotFound(options.filters);
      return {
        columns: [
          { key: "drug", label: "ยา" },
          { key: "dose", label: "ขนาด" },
          { key: "frequency", label: "วิธีกิน" },
          { key: "startedAt", label: "เริ่มใช้" },
        ],
        rows: p.medications.map((m) => ({ drug: m.drug, dose: m.dose, frequency: m.frequency, startedAt: m.startedAt })),
      };
    }
    case "patient.visits": {
      const p = resolvePatient(options.filters);
      if (!p) return patientNotFound(options.filters);
      const visits = VISIT_HISTORY[p.id] ?? [];
      return {
        columns: [
          { key: "date", label: "วันที่" },
          { key: "clinic", label: "คลินิก" },
          { key: "cc", label: "อาการสำคัญ" },
          { key: "bp", label: "BP" },
          { key: "disposition", label: "ผล" },
        ],
        rows: visits.slice(-12).reverse().map((v) => ({
          date: v.date,
          clinic: v.clinic,
          cc: v.chiefComplaint,
          bp: `${v.vitals.systolic}/${v.vitals.diastolic}`,
          disposition: v.disposition,
        })),
      };
    }
    case "patient.vitals_trend": {
      const p = resolvePatient(options.filters);
      if (!p) return patientNotFound(options.filters);
      const metric = (options.metric ?? "systolic") as "systolic" | "diastolic" | "weight" | "bmi" | "heart_rate";
      const series = VITAL_HISTORY[p.id] ?? [];
      const points = series.map((v) => {
        const value =
          metric === "diastolic" ? v.diastolic :
          metric === "weight" ? v.weight :
          metric === "bmi" ? v.bmi :
          metric === "heart_rate" ? v.heartRate :
          v.systolic;
        const [, m] = v.date.split("-");
        return { label: `${parseInt(m, 10)}`, value, x: v.date };
      });
      return { points };
    }
    case "patient.labs_trend": {
      const p = resolvePatient(options.filters);
      if (!p) return patientNotFound(options.filters);
      const test = options.metric ?? "HbA1c";
      const series = (LAB_HISTORY[p.id] ?? []).filter((l) => l.test === test);
      const points = series.map((l) => {
        const [, m] = l.takenAt.split("-");
        return { label: `${parseInt(m, 10)}`, value: l.value, x: l.takenAt };
      });
      return { points };
    }
    case "patient.risk_kpi": {
      const p = resolvePatient(options.filters);
      if (!p) return patientNotFound(options.filters);
      return {
        kpi: {
          value: p.riskFlags.length,
          previous: p.riskFlags.length,
          format: "number",
          unit: "flag",
        },
      };
    }

    default:
      return {};
  }
}

function patientNotFound(filters: Record<string, unknown> | undefined): DataSourceResult {
  const hint = filters
    ? (filters.patient_name ?? filters.patient_hn ?? filters.patient_id ?? "ไม่ระบุ")
    : "ไม่ระบุ";
  return {
    columns: [{ key: "msg", label: "ข้อความ" }],
    rows: [{ msg: `ไม่พบผู้ป่วย (filter: ${String(hint)})` }],
  };
}
