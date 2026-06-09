import type { Dashboard } from "./types";
import { DATA_SOURCES, WIDGET_KINDS } from "./catalog";
import { chatJSON } from "../../services/ai/llm";

/**
 * NL → Dashboard generator. Calls the LLM with a system prompt that embeds
 * the data-source + widget catalogs; the model picks from them and emits
 * JSON matching the Dashboard schema. We validate; on any error we fall
 * back to the deterministic keyword generator so the demo always works
 * even without LLM access.
 */
export async function generateDashboard(prompt: string): Promise<Dashboard> {
  try {
    const result = await callLLM(prompt);
    const errors = validateDashboard(result);
    if (errors.length === 0) {
      return stampAudit(result, prompt, "vllm");
    }
    console.warn("[dashboards] LLM output failed validation:", errors);
    return stampAudit(
      await unavailableDashboard(prompt, `LLM output ไม่ผ่าน validation: ${errors.join("; ")}`),
      prompt,
      "llm-invalid",
    );
  } catch (err) {
    console.warn("[dashboards] LLM unreachable:", err);
    const reason = err instanceof Error ? err.message : String(err);
    return stampAudit(await unavailableDashboard(prompt, reason), prompt, "llm-unavailable");
  }
}

// ── Real LLM path ─────────────────────────────────────────────────────────

async function callLLM(prompt: string): Promise<Dashboard> {
  const system = buildSystemPrompt();
  const json = await chatJSON<{ dashboard?: Dashboard } | Dashboard>(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    {
      // JSON mode forces well-formed output; fast model is plenty for
      // schema-bound emission.
      responseFormat: "json_object",
      temperature: 0.2,
      maxTokens: 1200,
      fast: true,
    },
  );
  // Some models wrap the object in `{ dashboard: {...} }`; unwrap if needed.
  const candidate =
    typeof json === "object" && json !== null && "dashboard" in json
      ? (json as { dashboard: Dashboard }).dashboard
      : (json as Dashboard);
  return candidate;
}

function buildSystemPrompt(): string {
  const sources = DATA_SOURCES.map((s) => {
    const dims = s.dimensions.length ? ` · dimensions: [${s.dimensions.join(", ")}]` : "";
    const meas = s.measures.length ? ` · measures: [${s.measures.join(", ")}]` : "";
    return `  - "${s.id}" — ${s.description}${dims}${meas}`;
  }).join("\n");

  const widgets = WIDGET_KINDS.map((w) => `  - "${w.id}" — ${w.description}`).join("\n");

  return `You compose dashboard layouts for a Thai clinical information system (CIS).

The user writes a natural-language prompt (Thai or English). Emit a single JSON object matching the Dashboard schema below. Only reference widget kinds and data sources from the catalogs — anything else will be rejected.

# Dashboard schema
{
  "id": string,                  // generate a short id like "db-abcd1234"
  "name": string,                // short Thai title for the dashboard
  "description": string,         // 1 sentence
  "widgets": Widget[]
}

# Widget schema
{
  "id": string,                  // unique per dashboard (w1, w2, ...)
  "kind": "kpi" | "line-chart" | "bar-chart" | "table" | "info",
  "title": string,               // short Thai label shown at the top of the widget
  "source": string,              // must be one of the data source ids below (empty string only when kind="info")
  "groupBy"?: string,            // a dimension from that source (e.g. "clinic", "age_band")
  "metric"?: string,             // a measure from that source (only when needed, e.g. "avg_wait_time_min")
  "filters"?: { ... },           // string/number/boolean filter values (used by patient.* sources)
  "message"?: string,            // REQUIRED when kind="info" — markdown text to render
  "layout": { "col": 1|2|3|4, "row": number, "w": 1|2|3|4, "h": number }
}

# Layout rules
- The grid is 4 columns wide.
- KPI widgets are typically w:1 h:1 placed on row:1.
- Charts are typically w:2 h:2.
- Tables are typically w:4 h:2 or h:3.
- col + w must not exceed 5 (i.e. fit within columns 1-4).
- Rows start at 1 and increase. Widgets on the same row must not overlap.

# Widget kinds
${widgets}

# Data source catalog
Use only these IDs as widget.source:
${sources}

# Source → widget compatibility (MUST match)
KPI sources (single value): appointments.today, patients.active, lab_results.recent, operational.no_show_trend, patient.risk_kpi
Chart sources (categorical / time series): appointments.today, appointments.trend, patients.active, patients.insurance, patients.risk, lab_results.recent, medications.top, labs.hba1c_trend, labs.ldl_trend, labs.creatinine_trend, vitals.systolic_trend, visits.volume_by_month, visits.top_complaints, visits.by_clinic, visits.wait_time_by_clinic, operational.no_show_rate, operational.no_show_trend, operational.slot_utilization, patient.vitals_trend, patient.labs_trend
Table sources (record rows): no_show.list, patients.missed, patients.list, operational.queue, patient.profile, patient.diagnoses, patient.medications, patient.visits

Examples of WRONG combinations (DO NOT EMIT):
- kpi + patients.risk (no scalar — use bar-chart instead)
- kpi + medications.top (use bar-chart)
- table + patients.active (use kpi or bar-chart)
- bar-chart + patients.list (use table)

# Per-patient queries (IMPORTANT)
When the user asks about a SPECIFIC patient by name or HN (e.g. "สรุปข้อมูลผู้ป่วยสมชาย ใจดี", "ดูประวัติคุณสมหญิง", "HN 00012345"):
1. Use the patient.* sources, NOT the cohort sources (patients.active, etc).
2. Every patient.* widget MUST include a "filters" object with EITHER:
   - "patient_name": "สมชาย ใจดี"  (Thai name without prefix, the resolver will match)
   - "patient_hn": "00012345"
3. For patient.vitals_trend pass metric: "systolic" | "diastolic" | "weight" | "bmi" | "heart_rate"
4. For patient.labs_trend pass metric: "HbA1c" | "FBS" | "LDL" | "Creatinine" | "Hb"
5. A good per-patient dashboard combines: profile (table), diagnoses (table), medications (table), vitals trend (line), labs trend (line), visits (table).

# Output rules
- Output MUST be valid JSON. No prose, no markdown, no code fences.
- Names should be concise Thai.
- Pick widget kinds that fit the data shape (kpi=scalar, bar-chart=categorical, line-chart=time series, table=record list).
- Default to a useful but minimal dashboard (3–8 widgets). Do not pack everything in.

# CRITICAL — Never fabricate
- NEVER invent a source id. Only reference ids from the catalog below; any unknown id will be rejected.
- NEVER invent numeric values, names, or labels. The renderer fetches data from the source — your job is only to pick the right source + groupBy + metric + filters.
- If the prompt asks for data that NO source in the catalog can provide (e.g. "vaccine coverage", "OR utilization", "ค่าใช้จ่ายผ่าตัด"), DO NOT pick the closest unrelated source. Instead emit a SINGLE info widget that lists:
  • what the prompt asks for
  • which data sources we DO have that are closest
  • a suggestion for how to rephrase
- If the prompt is vague (e.g. "อะไรก็ได้", "show me something"), pick a reasonable OPD/clinical overview from existing cohort sources.

# Examples

Prompt: "ขอภาพรวม OPD วันนี้"
{
  "id": "db-opd123",
  "name": "ภาพรวม OPD วันนี้",
  "description": "สรุปคิวและเวลารอของวันนี้",
  "widgets": [
    { "id": "w1", "kind": "kpi", "title": "นัดวันนี้", "source": "appointments.today", "layout": { "col": 1, "row": 1, "w": 1, "h": 1 } },
    { "id": "w2", "kind": "kpi", "title": "เวลารอเฉลี่ย", "source": "appointments.today", "metric": "avg_wait_time_min", "layout": { "col": 2, "row": 1, "w": 1, "h": 1 } },
    { "id": "w3", "kind": "kpi", "title": "ผู้ป่วย active", "source": "patients.active", "layout": { "col": 3, "row": 1, "w": 1, "h": 1 } },
    { "id": "w4", "kind": "kpi", "title": "ผลแลปผิดปกติ", "source": "lab_results.recent", "layout": { "col": 4, "row": 1, "w": 1, "h": 1 } },
    { "id": "w5", "kind": "bar-chart", "title": "นัดต่อคลินิก", "source": "appointments.today", "groupBy": "clinic", "layout": { "col": 1, "row": 2, "w": 2, "h": 2 } },
    { "id": "w6", "kind": "line-chart", "title": "คิวต่อชั่วโมง", "source": "appointments.today", "groupBy": "hour", "layout": { "col": 3, "row": 2, "w": 2, "h": 2 } }
  ]
}

Prompt: "สรุปข้อมูลผู้ป่วยชื่อ สมชาย ใจดี"
{
  "id": "db-pat001",
  "name": "สรุปผู้ป่วย สมชาย ใจดี",
  "description": "ข้อมูลรายบุคคล: profile, dx, ยา, vitals, lab, visits",
  "widgets": [
    { "id": "w1", "kind": "table", "title": "ข้อมูลผู้ป่วย", "source": "patient.profile", "filters": { "patient_name": "สมชาย ใจดี" }, "layout": { "col": 1, "row": 1, "w": 2, "h": 3 } },
    { "id": "w2", "kind": "table", "title": "โรคประจำตัว", "source": "patient.diagnoses", "filters": { "patient_name": "สมชาย ใจดี" }, "layout": { "col": 3, "row": 1, "w": 2, "h": 2 } },
    { "id": "w3", "kind": "kpi", "title": "Risk Flags", "source": "patient.risk_kpi", "filters": { "patient_name": "สมชาย ใจดี" }, "layout": { "col": 3, "row": 3, "w": 1, "h": 1 } },
    { "id": "w4", "kind": "table", "title": "ยาที่ใช้อยู่", "source": "patient.medications", "filters": { "patient_name": "สมชาย ใจดี" }, "layout": { "col": 4, "row": 3, "w": 1, "h": 1 } },
    { "id": "w5", "kind": "line-chart", "title": "Systolic BP 12 เดือน", "source": "patient.vitals_trend", "metric": "systolic", "filters": { "patient_name": "สมชาย ใจดี" }, "layout": { "col": 1, "row": 4, "w": 2, "h": 2 } },
    { "id": "w6", "kind": "line-chart", "title": "HbA1c 12 เดือน", "source": "patient.labs_trend", "metric": "HbA1c", "filters": { "patient_name": "สมชาย ใจดี" }, "layout": { "col": 3, "row": 4, "w": 2, "h": 2 } },
    { "id": "w7", "kind": "table", "title": "ประวัติการตรวจ", "source": "patient.visits", "filters": { "patient_name": "สมชาย ใจดี" }, "layout": { "col": 1, "row": 6, "w": 4, "h": 3 } }
  ]
}

Prompt: "ดู vaccine coverage รายเขตสุขภาพ"
{
  "id": "db-novacc",
  "name": "ไม่มีข้อมูล vaccine coverage",
  "description": "Catalog ไม่มี data source สำหรับ vaccine coverage",
  "widgets": [
    {
      "id": "w1",
      "kind": "info",
      "title": "ไม่มีข้อมูลตามที่ขอ",
      "source": "",
      "message": "Prompt ขอ vaccine coverage รายเขตสุขภาพ\nแต่ catalog ปัจจุบันไม่มี data source ที่ครอบคลุมเรื่องนี้\n\nที่ใกล้เคียงพอใช้ได้: appointments.today (filter type=Vaccine) — แสดงนัดวัคซีนวันนี้\n\nลองถามใหม่: \"นัดวัคซีนวันนี้\" หรือ \"จำนวนนัดประเภท vaccine 14 วันล่าสุด\"",
      "layout": { "col": 1, "row": 1, "w": 4, "h": 3 }
    }
  ]
}

Prompt: "ผู้ป่วยเบาหวานที่ควบคุมไม่ได้ + แนวโน้ม HbA1c"
{
  "id": "db-dm456",
  "name": "ผู้ป่วยเบาหวานควบคุมไม่ได้",
  "description": "ติดตามกลุ่มผู้ป่วย DM ที่ HbA1c สูง",
  "widgets": [
    { "id": "w1", "kind": "kpi", "title": "ผู้ป่วย DM ทั้งหมด", "source": "patients.active", "layout": { "col": 1, "row": 1, "w": 1, "h": 1 } },
    { "id": "w2", "kind": "kpi", "title": "ผลแลปผิดปกติ", "source": "lab_results.recent", "layout": { "col": 2, "row": 1, "w": 1, "h": 1 } },
    { "id": "w3", "kind": "bar-chart", "title": "ผู้ป่วยกลุ่มเสี่ยง", "source": "patients.risk", "layout": { "col": 3, "row": 1, "w": 2, "h": 2 } },
    { "id": "w4", "kind": "line-chart", "title": "HbA1c เฉลี่ย 6 เดือน", "source": "labs.hba1c_trend", "layout": { "col": 1, "row": 3, "w": 4, "h": 2 } }
  ]
}
`;
}

// ── Audit stamping ────────────────────────────────────────────────────────

function stampAudit(d: Dashboard, prompt: string, model: string): Dashboard {
  const now = new Date().toISOString();
  // Ensure id exists (LLM might emit one, but we don't trust uniqueness).
  const id = d.id?.startsWith("db-") ? d.id : `db-${Math.random().toString(36).slice(2, 9)}`;
  return {
    ...d,
    id,
    prompt,
    generatedAt: now,
    model,
    createdAt: d.createdAt ?? now,
    updatedAt: now,
  };
}

// ── LLM-unavailable fallback ──────────────────────────────────────────────
// We do NOT keyword-match prompts to widgets here — that would violate the
// "LLM picks UI, never fabricate" contract. When vLLM is unreachable we just
// surface that fact through an info widget so the user knows why no
// dashboard was composed.

async function unavailableDashboard(prompt: string, reason: string): Promise<Dashboard> {
  const now = new Date().toISOString();
  return {
    id: `db-${Math.random().toString(36).slice(2, 9)}`,
    name: deriveName(prompt),
    description: prompt,
    prompt,
    generatedAt: now,
    widgets: [
      {
        id: "w1",
        kind: "info",
        title: "ระบบสร้าง Dashboard ไม่พร้อมใช้งาน",
        source: "",
        message: `ไม่สามารถติดต่อ LLM เพื่อสร้าง dashboard จาก prompt นี้ได้\n\nสาเหตุ: ${reason}\n\nกรุณาลองใหม่อีกครั้ง — ถ้ายังไม่ได้ ตรวจสอบ vLLM endpoint`,
        layout: { col: 1, row: 1, w: 4, h: 3 },
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function deriveName(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Dashboard ใหม่";
  if (trimmed.length <= 36) return trimmed;
  return trimmed.slice(0, 36) + "…";
}

// ── Validator ─────────────────────────────────────────────────────────────

// Which sources can produce which output shapes. KPI widgets need a single
// scalar (kpi shape); chart widgets need categorical points; tables need
// rows. The LLM occasionally picks the wrong combo — we coerce or reject
// here so the renderer never receives a guaranteed-empty widget.
const KPI_SOURCES = new Set([
  "appointments.today",
  "patients.active",
  "lab_results.recent",
  "operational.no_show_trend",
  "patient.risk_kpi",
]);
const POINTS_SOURCES = new Set([
  "appointments.today",
  "appointments.trend",
  "patients.active",
  "patients.insurance",
  "patients.risk",
  "lab_results.recent",
  "medications.top",
  "labs.hba1c_trend",
  "labs.ldl_trend",
  "labs.creatinine_trend",
  "vitals.systolic_trend",
  "visits.volume_by_month",
  "visits.top_complaints",
  "visits.by_clinic",
  "visits.wait_time_by_clinic",
  "operational.no_show_rate",
  "operational.no_show_trend",
  "operational.slot_utilization",
  "patient.vitals_trend",
  "patient.labs_trend",
]);
const ROWS_SOURCES = new Set([
  "no_show.list",
  "patients.missed",
  "patients.list",
  "operational.queue",
  "patient.profile",
  "patient.diagnoses",
  "patient.medications",
  "patient.visits",
]);

export function validateDashboard(d: unknown): string[] {
  const errors: string[] = [];
  if (typeof d !== "object" || d === null) return ["Dashboard must be an object"];
  const dash = d as Partial<Dashboard>;
  if (!dash.name || typeof dash.name !== "string") errors.push("name required");
  if (!Array.isArray(dash.widgets) || dash.widgets.length === 0)
    errors.push("widgets array required (non-empty)");
  else {
    const validSources = new Set(DATA_SOURCES.map((s) => s.id));
    const validKinds = new Set(["kpi", "line-chart", "bar-chart", "table", "info"]);
    dash.widgets.forEach((w, i) => {
      if (!w || typeof w !== "object") {
        errors.push(`widget[${i}] not an object`);
        return;
      }
      if (!w.kind || !validKinds.has(w.kind))
        errors.push(`widget[${i}].kind invalid: ${w.kind}`);
      // Info widgets don't query a data source — they just render their
      // own `message`. Skip source validation.
      if (w.kind === "info") {
        if (!w.message || typeof w.message !== "string")
          errors.push(`widget[${i}] info widget needs "message" string`);
      } else {
        if (!w.source || !validSources.has(w.source)) {
          errors.push(`widget[${i}].source unknown: ${w.source}`);
          return;
        }
        if (w.kind === "kpi" && !KPI_SOURCES.has(w.source))
          errors.push(`widget[${i}] kpi can't use source "${w.source}" (no scalar output)`);
        if ((w.kind === "line-chart" || w.kind === "bar-chart") && !POINTS_SOURCES.has(w.source))
          errors.push(`widget[${i}] chart can't use source "${w.source}" (no categorical output)`);
        if (w.kind === "table" && !ROWS_SOURCES.has(w.source))
          errors.push(`widget[${i}] table can't use source "${w.source}" (no row output)`);
      }

      if (!w.layout || typeof w.layout !== "object")
        errors.push(`widget[${i}].layout missing`);
      else {
        const { col, w: ww } = w.layout;
        if (typeof col !== "number" || col < 1 || col > 4)
          errors.push(`widget[${i}].layout.col out of range`);
        if (typeof ww !== "number" || ww < 1 || ww > 4)
          errors.push(`widget[${i}].layout.w out of range`);
        if (col + ww - 1 > 4)
          errors.push(`widget[${i}] overflows grid (col=${col}, w=${ww})`);
      }
    });
  }
  return errors;
}
