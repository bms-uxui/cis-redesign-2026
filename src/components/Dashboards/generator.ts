/**
 * NL → Dashboard generator.
 *
 * Transport: `chatJSON` (vLLM `/v1/chat/completions` with
 * `response_format: { type: "json_object" }`) — same path that already
 * works for menuSuggest / NewPatientByVoice. We tried Vercel AI SDK's
 * `generateObject` but vLLM 400s its payload, and error responses lack
 * CORS headers so the browser surfaces it as "Failed to fetch".
 *
 * Schema: zod, derived from the runtime catalog. Enums for `source` are
 * generated from `DATA_SOURCES.map(s => s.id)` so unknown ids are
 * impossible. Kind ↔ source compatibility derives from
 * `DataSourceDef.outputs` — single source of truth in catalog.ts.
 */
import { z } from "zod";
import { chatJSON } from "../../services/ai/llm";
import { DATA_SOURCES, WIDGET_KINDS } from "./catalog";
import type { Dashboard, WidgetKind, WidgetOutput } from "./types";

// ── Kind ↔ output mapping ────────────────────────────────────────────────
// The only hand-written rule in this file. Everything else (which source
// supports which kind, the compatibility text in the prompt, the validator
// sets) is derived from `DataSourceDef.outputs` in catalog.ts.

/** Widget kinds that are self-contained (own chrome, fetch a single patient by
 *  HN) — they take no data source, like "info". */
const PATIENT_KINDS: WidgetKind[] = ["patient-card", "patient-lab-trend"];

type DataKind = Exclude<WidgetKind, "info" | "patient-card" | "patient-lab-trend">;
const KIND_TO_OUTPUT: Record<DataKind, WidgetOutput> = {
  kpi: "kpi",
  "line-chart": "points",
  "bar-chart": "points",
  table: "rows",
};

function sourcesFor(output: WidgetOutput): string[] {
  return DATA_SOURCES.filter((s) => s.outputs.includes(output)).map((s) => s.id);
}

// ── Schema ────────────────────────────────────────────────────────────────

const sourceIds = DATA_SOURCES.map((s) => s.id) as [string, ...string[]];

const layoutSchema = z.object({
  col: z.number().int().min(1).max(4),
  row: z.number().int().min(1),
  w: z.number().int().min(1).max(4),
  h: z.number().int().min(1),
});

const widgetSchema = z.object({
  id: z.string(),
  kind: z.enum(["kpi", "line-chart", "bar-chart", "table", "info", "patient-card", "patient-lab-trend"]),
  title: z.string(),
  source: z.enum(["", ...sourceIds] as [string, ...string[]]),
  groupBy: z.string().optional(),
  metric: z.string().optional(),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  message: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  layout: layoutSchema,
});

const dashboardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  widgets: z.array(widgetSchema).min(1),
});

type GeneratedDashboard = z.infer<typeof dashboardSchema>;

// ── Public API ────────────────────────────────────────────────────────────

export async function generateDashboard(prompt: string): Promise<Dashboard> {
  try {
    // Attempt #1 — fresh call.
    let candidate = await callLLM(prompt);
    let errors = postValidate(candidate);
    if (errors.length === 0) return stampAudit(candidate as Dashboard, prompt, "vllm");

    // Attempt #2 — feed the validation errors back as an assistant turn +
    // a corrective user turn. The model usually fixes kind↔source mismatches
    // on the second try.
    console.warn("[dashboards] retrying after validation errors:", errors);
    candidate = await callLLM(prompt, {
      priorAttempt: candidate,
      priorErrors: errors,
    });
    errors = postValidate(candidate);
    if (errors.length === 0) return stampAudit(candidate as Dashboard, prompt, "vllm-retry");

    console.warn("[dashboards] retry still failed validation:", errors);
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

// ── LLM call ──────────────────────────────────────────────────────────────

interface CallLLMOptions {
  priorAttempt?: GeneratedDashboard;
  priorErrors?: string[];
}

async function callLLM(prompt: string, opts: CallLLMOptions = {}): Promise<GeneratedDashboard> {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: prompt },
  ];
  if (opts.priorAttempt && opts.priorErrors?.length) {
    messages.push(
      { role: "assistant", content: JSON.stringify(opts.priorAttempt) },
      {
        role: "user",
        content: `Your previous output failed validation:\n${opts.priorErrors.map((e) => `- ${e}`).join("\n")}\n\nFix the issues and emit a corrected Dashboard JSON. Pay attention to the kind↔source compatibility rules above.`,
      },
    );
  }
  const raw = await chatJSON<unknown>(messages, {
    temperature: 0.2,
    maxTokens: 1200,
    fast: true,
  });
  // Some models wrap the payload as `{ dashboard: {...} }`; unwrap.
  const candidate =
    typeof raw === "object" && raw !== null && "dashboard" in raw
      ? (raw as { dashboard: unknown }).dashboard
      : raw;
  const parsed = dashboardSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(`LLM output failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}

function buildSystemPrompt(): string {
  const sources = DATA_SOURCES.map((s) => {
    const dims = s.dimensions.length ? ` · dimensions: [${s.dimensions.join(", ")}]` : "";
    const meas = s.measures.length ? ` · measures: [${s.measures.join(", ")}]` : "";
    const outs = ` · outputs: [${s.outputs.join(", ")}]`;
    return `  - "${s.id}" — ${s.description}${dims}${meas}${outs}`;
  }).join("\n");

  const widgets = WIDGET_KINDS.map((w) => `  - "${w.id}" — ${w.description}`).join("\n");

  // Compatibility lines built from `DataSourceDef.outputs`. Single source of
  // truth — adding a source to catalog.ts updates the prompt automatically.
  const compatLines = (
    Object.entries(KIND_TO_OUTPUT) as [DataKind, WidgetOutput][]
  )
    .map(([kind, out]) => `- ${kind}: ${sourcesFor(out).join(", ")}`)
    .join("\n");

  return `You compose dashboard layouts for a Thai clinical information system (CIS).

The user writes a natural-language prompt (Thai or English). Your output is validated against a strict schema — only the widget kinds and data source ids listed below are accepted; anything else is rejected.

# Dashboard schema
{
  "id": string,                  // short id like "db-abcd1234"
  "name": string,                // short Thai title
  "description": string,         // 1 sentence
  "widgets": Widget[]
}

# Widget schema
{
  "id": string,                  // unique per dashboard (w1, w2, ...)
  "kind": "kpi" | "line-chart" | "bar-chart" | "table" | "info" | "patient-card" | "patient-lab-trend",
  "title": string,
  "source": string,              // data source id (empty string for kind="info"|"patient-card"|"patient-lab-trend")
  "groupBy"?: string,
  "metric"?: string,
  "filters"?: { ... },
  "message"?: string,            // REQUIRED when kind="info"
  "props"?: { "hn": string },    // REQUIRED for "patient-card"/"patient-lab-trend" — the patient's HN
  "layout": { "col": 1|2|3|4, "row": number, "w": 1|2|3|4, "h": number }
}

# Patient cards (generative UI)
- "patient-card" and "patient-lab-trend" focus on ONE specific patient. Set source="" and props.hn to that patient's HN (e.g. "00014077"). Use them when the prompt names/identifies a single patient (e.g. "แดชบอร์ดของคนไข้ HN 00014077", "สรุปผู้ป่วยรายนี้ + กราฟผลแลป"). For cohorts/aggregates use the data-source kinds instead.

# Widget kinds
${widgets}
  - "info" — markdown text widget (used when no data source can answer the prompt)

# Data source catalog
Use only these IDs as widget.source:
${sources}

# Source → widget compatibility (MUST match)
Each widget kind can only use sources that produce the matching output shape:
${compatLines}

The "outputs" tag on each source above tells you what shapes it can produce
(kpi = scalar, points = categorical/time series, rows = record list).
Picking an incompatible kind+source pair will be rejected.

# Layout rules
- The grid is 4 columns wide.
- KPI widgets are typically w:1 h:1 placed on row:1.
- Charts are typically w:2 h:2.
- Tables are typically w:4 h:2 or h:3.
- col + w - 1 must not exceed 4 (i.e. fit within columns 1-4).
- Rows start at 1 and increase. Widgets on the same row must not overlap.

# Info widgets
- Use kind="info" with source="" and a "message" string when NO data source can answer the prompt.
- The message is markdown.

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
- Output MUST be valid JSON matching the Dashboard schema. No prose, no markdown, no code fences.
- Names should be concise Thai.
- Pick widget kinds that fit the data shape (kpi=scalar, bar-chart=categorical, line-chart=time series, table=record list).
- Default to a useful but minimal dashboard (3–8 widgets). Do not pack everything in.
- Generate a short dashboard id like "db-abcd1234".

# CRITICAL — Never fabricate
- NEVER invent numeric values, names, or labels. The renderer fetches data from the source — your job is only to pick the right source + groupBy + metric + filters.
- If the prompt asks for data that NO source in the catalog can provide (e.g. "vaccine coverage", "OR utilization", "ค่าใช้จ่ายผ่าตัด"), DO NOT pick the closest unrelated source. Instead emit a SINGLE info widget that lists:
  • what the prompt asks for
  • which data sources we DO have that are closest
  • a suggestion for how to rephrase
- If the prompt is vague (e.g. "อะไรก็ได้", "show me something"), pick a reasonable OPD/clinical overview from existing cohort sources.

# Example — overview
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

# Example — per-patient
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

# Example — no matching data
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
      "message": "Prompt ขอ vaccine coverage รายเขตสุขภาพ\\nแต่ catalog ปัจจุบันไม่มี data source ที่ครอบคลุมเรื่องนี้\\n\\nที่ใกล้เคียงพอใช้ได้: appointments.today (filter type=Vaccine) — แสดงนัดวัคซีนวันนี้",
      "layout": { "col": 1, "row": 1, "w": 4, "h": 3 }
    }
  ]
}
`;
}

// ── Cross-field validation ────────────────────────────────────────────────
// zod handles shape + enums. Kind↔source compatibility derives from
// `DataSourceDef.outputs` — adding a source to catalog.ts auto-extends the
// rules here without touching this file.

const SOURCE_OUTPUTS: Map<string, Set<WidgetOutput>> = new Map(
  DATA_SOURCES.map((s) => [s.id, new Set(s.outputs)]),
);

function postValidate(d: GeneratedDashboard): string[] {
  const errors: string[] = [];
  d.widgets.forEach((w, i) => {
    if (w.kind === "info") {
      if (!w.message)
        errors.push(`widget[${i}] info widget needs "message" string`);
      return;
    }
    if (PATIENT_KINDS.includes(w.kind)) {
      if (!w.props?.hn || typeof w.props.hn !== "string")
        errors.push(`widget[${i}] kind="${w.kind}" needs props.hn (the patient's HN string)`);
      if (w.layout.col + w.layout.w - 1 > 4)
        errors.push(`widget[${i}] overflows grid (col=${w.layout.col}, w=${w.layout.w})`);
      return;
    }
    if (!w.source) {
      errors.push(`widget[${i}] missing source`);
      return;
    }
    const required = KIND_TO_OUTPUT[w.kind as DataKind];
    const available = SOURCE_OUTPUTS.get(w.source);
    if (!available?.has(required))
      errors.push(
        `widget[${i}] kind="${w.kind}" needs an "${required}" source, but "${w.source}" produces [${[...(available ?? [])].join(", ") || "nothing"}]`,
      );
    if (w.layout.col + w.layout.w - 1 > 4)
      errors.push(`widget[${i}] overflows grid (col=${w.layout.col}, w=${w.layout.w})`);
  });
  return errors;
}

// ── Audit stamping ────────────────────────────────────────────────────────

function stampAudit(d: Dashboard, prompt: string, model: string): Dashboard {
  const now = new Date().toISOString();
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
