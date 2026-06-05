import type { Dashboard, Widget } from "./types";
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
  } catch (err) {
    console.warn("[dashboards] LLM unavailable, falling back to mock:", err);
  }
  // Fallback path — guaranteed to work without network / API keys.
  const mock = await mockGenerate(prompt);
  return stampAudit(mock, prompt, "mock-generator");
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
  "kind": "kpi" | "line-chart" | "bar-chart" | "table",
  "title": string,               // short Thai label shown at the top of the widget
  "source": string,              // must be one of the data source ids below
  "groupBy"?: string,            // a dimension from that source (e.g. "clinic", "age_band")
  "metric"?: string,             // a measure from that source (only when needed, e.g. "avg_wait_time_min")
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
KPI sources (single value): appointments.today, patients.active, lab_results.recent
Chart sources (categorical / time series): appointments.today, appointments.trend, patients.active, patients.insurance, patients.risk, lab_results.recent, medications.top, labs.hba1c_trend
Table sources (record rows): no_show.list, patients.missed, patients.list

Examples of WRONG combinations (DO NOT EMIT):
- kpi + patients.risk (no scalar — use bar-chart instead)
- kpi + medications.top (use bar-chart)
- table + patients.active (use kpi or bar-chart)
- bar-chart + patients.list (use table)

# Output rules
- Output MUST be valid JSON. No prose, no markdown, no code fences.
- Names should be concise Thai.
- Pick widget kinds that fit the data shape (e.g. kpi for single values, bar-chart for categorical, line-chart for time, table for record lists).
- Default to a useful but minimal dashboard (3–8 widgets). Do not pack everything in.
- If the prompt is vague, return a sensible OPD overview.

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

// ── Mock keyword generator (fallback) ─────────────────────────────────────

async function mockGenerate(prompt: string): Promise<Dashboard> {
  await new Promise((r) => setTimeout(r, 600));

  const p = prompt.toLowerCase();
  const has = (...kws: string[]) => kws.some((k) => p.includes(k.toLowerCase()));

  const widgets: Widget[] = [];
  const nextId = (() => {
    let n = 0;
    return () => `w${++n}`;
  })();

  const wantsOPD = has("opd", "นัด", "คิว", "ผู้ป่วยนอก", "outpatient");
  const wantsLab = has("lab", "แลป", "ห้องแลป");
  const wantsNoShow = has("no-show", "no show", "ไม่มา", "ขาดนัด");
  const wantsChronic = has("เรื้อรัง", "chronic", "เบาหวาน", "ความดัน", "diabetes", "hypertension");
  const wantsWait = has("รอ", "wait");
  const wantsTrend = has("ย้อนหลัง", "trend", "แนวโน้ม", "สัปดาห์", "เดือน", "week");
  const wantsActive = has("active", "ทั้งหมด", "ปัจจุบัน");
  const wantsInsurance = has("สิทธิ", "ประกัน", "insurance", "uc", "sso");
  const wantsRisk = has("เสี่ยง", "risk", "ฉุกเฉิน", "high risk");
  const wantsMedications = has("ยา", "medication", "drug", "สั่งจ่าย");
  const wantsList = has("รายชื่อ", "list", "ตาราง");

  let col = 1;
  const placeKpi = (title: string, source: string, metric?: string) => {
    if (col > 4) return;
    widgets.push({
      id: nextId(),
      kind: "kpi",
      title,
      source,
      metric,
      layout: { col, row: 1, w: 1, h: 1 },
    });
    col++;
  };

  if (wantsOPD) placeKpi("นัดวันนี้", "appointments.today");
  if (wantsWait) placeKpi("เวลารอเฉลี่ย", "appointments.today", "avg_wait_time_min");
  if (wantsLab) placeKpi("ผลแลปผิดปกติ", "lab_results.recent");
  if (wantsActive || wantsChronic) placeKpi("ผู้ป่วย active", "patients.active");

  if (widgets.length === 0) placeKpi("นัดวันนี้", "appointments.today");
  while (col <= 4 && widgets.length < 4) {
    if (col === 2) placeKpi("เวลารอเฉลี่ย", "appointments.today", "avg_wait_time_min");
    else if (col === 3) placeKpi("ผลแลปผิดปกติ", "lab_results.recent");
    else placeKpi("ผู้ป่วย active", "patients.active");
  }

  let row = 2;

  if (wantsOPD) {
    widgets.push({ id: nextId(), kind: "bar-chart", title: "นัดต่อคลินิก", source: "appointments.today", groupBy: "clinic", layout: { col: 1, row, w: 2, h: 2 } });
    widgets.push({ id: nextId(), kind: "line-chart", title: "คิวต่อชั่วโมง", source: "appointments.today", groupBy: "hour", layout: { col: 3, row, w: 2, h: 2 } });
    row += 2;
  }
  if (wantsChronic) {
    widgets.push({ id: nextId(), kind: "bar-chart", title: "ผู้ป่วยแยกตามกลุ่มโรค", source: "patients.active", groupBy: "diagnosis_group", layout: { col: 1, row, w: 2, h: 2 } });
    widgets.push({ id: nextId(), kind: "bar-chart", title: "ช่วงอายุ", source: "patients.active", groupBy: "age_band", layout: { col: 3, row, w: 2, h: 2 } });
    row += 2;
  }
  if (wantsLab && !wantsOPD) {
    widgets.push({ id: nextId(), kind: "bar-chart", title: "การส่งตรวจแลป", source: "lab_results.recent", groupBy: "test", layout: { col: 1, row, w: 4, h: 2 } });
    row += 2;
  }
  if (wantsTrend) {
    widgets.push({ id: nextId(), kind: "line-chart", title: "แนวโน้มนัด 14 วัน", source: "appointments.trend", layout: { col: 1, row, w: 4, h: 2 } });
    row += 2;
  }
  if (wantsNoShow) {
    widgets.push({ id: nextId(), kind: "table", title: "ผู้ป่วย no-show / ขาดนัด", source: "patients.missed", layout: { col: 1, row, w: 4, h: 2 } });
    row += 2;
  }
  if (wantsInsurance) {
    widgets.push({ id: nextId(), kind: "bar-chart", title: "สัดส่วนสิทธิ", source: "patients.insurance", layout: { col: 1, row, w: 2, h: 2 } });
    row += 2;
  }
  if (wantsRisk) {
    widgets.push({ id: nextId(), kind: "bar-chart", title: "ผู้ป่วยกลุ่มเสี่ยง", source: "patients.risk", layout: { col: 1, row, w: 4, h: 2 } });
    row += 2;
  }
  if (wantsMedications) {
    widgets.push({ id: nextId(), kind: "bar-chart", title: "ยาที่สั่งจ่ายบ่อย", source: "medications.top", layout: { col: 1, row, w: 4, h: 2 } });
    row += 2;
  }
  if (wantsList || (wantsActive && widgets.length < 4)) {
    widgets.push({ id: nextId(), kind: "table", title: "รายชื่อผู้ป่วย active", source: "patients.list", layout: { col: 1, row, w: 4, h: 3 } });
    row += 3;
  }
  if (wantsChronic && has("hba1c", "เบาหวาน")) {
    widgets.push({ id: nextId(), kind: "line-chart", title: "HbA1c เฉลี่ย 6 เดือน", source: "labs.hba1c_trend", layout: { col: 1, row, w: 4, h: 2 } });
    row += 2;
  }
  if (!widgets.some((w) => w.kind === "line-chart") && wantsOPD) {
    widgets.push({ id: nextId(), kind: "line-chart", title: "แนวโน้มนัด 14 วัน", source: "appointments.trend", layout: { col: 1, row, w: 4, h: 2 } });
  }

  const id = `db-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  return {
    id,
    name: deriveName(prompt),
    description: prompt,
    prompt,
    generatedAt: now,
    widgets,
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
]);
const ROWS_SOURCES = new Set([
  "no_show.list",
  "patients.missed",
  "patients.list",
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
    const validKinds = new Set(["kpi", "line-chart", "bar-chart", "table"]);
    dash.widgets.forEach((w, i) => {
      if (!w || typeof w !== "object") {
        errors.push(`widget[${i}] not an object`);
        return;
      }
      if (!w.kind || !validKinds.has(w.kind))
        errors.push(`widget[${i}].kind invalid: ${w.kind}`);
      if (!w.source || !validSources.has(w.source)) {
        errors.push(`widget[${i}].source unknown: ${w.source}`);
        return;
      }
      // Shape compatibility — the most common LLM mistake.
      if (w.kind === "kpi" && !KPI_SOURCES.has(w.source))
        errors.push(`widget[${i}] kpi can't use source "${w.source}" (no scalar output)`);
      if ((w.kind === "line-chart" || w.kind === "bar-chart") && !POINTS_SOURCES.has(w.source))
        errors.push(`widget[${i}] chart can't use source "${w.source}" (no categorical output)`);
      if (w.kind === "table" && !ROWS_SOURCES.has(w.source))
        errors.push(`widget[${i}] table can't use source "${w.source}" (no row output)`);

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
