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
  hba1cTrend,
  averageWaitTime,
} from "../../data/mock/patients";

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
    description: "ค่าเฉลี่ย HbA1c ของผู้ป่วยเบาหวานย้อนหลัง 6 เดือน",
    dimensions: ["month"],
    measures: ["avg"],
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
      if (options.groupBy === "clinic") {
        return {
          points: [
            { label: "OPD ทั่วไป", value: 18 },
            { label: "อายุรกรรม", value: 12 },
            { label: "เด็ก", value: 8 },
            { label: "สูตินรีเวช", value: 6 },
            { label: "ทันตกรรม", value: 5 },
          ],
        };
      }
      if (options.groupBy === "hour") {
        return {
          points: Array.from({ length: 10 }, (_, i) => ({
            label: `${8 + i}:00`,
            value: [4, 7, 9, 12, 10, 8, 6, 9, 11, 7][i],
            x: 8 + i,
          })),
        };
      }
      if (options.groupBy === "status") {
        return {
          points: [
            { label: "เช็คอินแล้ว", value: 12 },
            { label: "รอ", value: 18 },
            { label: "ตรวจเสร็จ", value: 8 },
            { label: "No-show", value: 4 },
          ],
        };
      }
      if (options.metric === "avg_wait_time_min") {
        const w = averageWaitTime();
        return { kpi: { value: w.value, previous: w.previous, format: "minutes", unit: "นาที" } };
      }
      // default: count of all appointments today
      return { kpi: { value: 42, previous: 38, format: "number", unit: "นัด" } };

    case "appointments.trend":
      return {
        points: Array.from({ length: 14 }, (_, i) => {
          const day = new Date();
          day.setDate(day.getDate() - (13 - i));
          const base = 28 + Math.sin(i / 2) * 8 + (i > 10 ? 5 : 0);
          return {
            label: `${day.getDate()}/${day.getMonth() + 1}`,
            value: Math.round(base),
            x: day.toISOString().slice(0, 10),
          };
        }),
      };

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
      return { points: hba1cTrend() };

    case "lab_results.recent":
      if (options.groupBy === "test") {
        return {
          points: [
            { label: "CBC", value: 184 },
            { label: "HbA1c", value: 92 },
            { label: "FBS", value: 76 },
            { label: "Lipid", value: 64 },
            { label: "Creatinine", value: 58 },
          ],
        };
      }
      return { kpi: { value: 12, previous: 8, format: "number", unit: "ผลผิดปกติ" } };

    case "no_show.list":
      return {
        columns: [
          { key: "name", label: "ผู้ป่วย" },
          { key: "clinic", label: "คลินิก" },
          { key: "time", label: "เวลานัด" },
          { key: "phone", label: "เบอร์ติดต่อ" },
        ],
        rows: [
          { name: "คุณสมหญิง ใจดี", clinic: "OPD ทั่วไป", time: "09:00", phone: "081-234-5678" },
          { name: "คุณวิชัย วัฒนสุข", clinic: "อายุรกรรม", time: "10:30", phone: "089-876-5432" },
          { name: "คุณปริชาติ พิทักษ์", clinic: "เด็ก", time: "11:00", phone: "082-111-2222" },
          { name: "คุณนพดล ศรีเมือง", clinic: "OPD ทั่วไป", time: "14:00", phone: "086-333-4444" },
        ],
      };

    default:
      return {};
  }
}
