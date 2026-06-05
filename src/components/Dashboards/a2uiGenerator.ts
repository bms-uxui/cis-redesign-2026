/**
 * A2UI-style dashboard generator.
 *
 * Asks the LLM to compose an A2UI tree (rich UI vocabulary — stat-card,
 * metric-grid, line-chart, bar-chart, timeline, info-row, chip-group) where
 * values are NEVER inline. The LLM declares a `bindings` map keyed by short
 * names, each pointing to a DATA_SOURCES query; component text values use
 * `{{$key}}` / `{{$key.path}}` placeholders that the resolver fills in.
 *
 * Two-layer guarantee against fabrication:
 *   1. System prompt embeds the catalog and forbids any source id outside it.
 *   2. The renderer only substitutes from values that came back from a
 *      catalog source. If the LLM references a binding it didn't declare,
 *      the placeholder stays visible as "?key" — easy to spot in QA.
 */
import { chatJSON } from "../../services/ai/llm";
import { DATA_SOURCES } from "./catalog";
import type { A2UIDashboard } from "./a2uiSchema";
import type { A2UINode } from "../../services/a2ui/types";
import { validateA2UIResponse } from "../../services/a2ui/types";

export async function generateA2UIDashboard(prompt: string): Promise<A2UIDashboard> {
  try {
    const result = await callLLM(prompt);
    const errors = validate(result);
    if (errors.length === 0) {
      return stamp(result, prompt, "vllm");
    }
    console.warn("[a2ui-dashboards] LLM output failed validation:", errors);
    return unavailable(prompt, `LLM output ไม่ผ่าน validation: ${errors.join("; ")}`, "llm-invalid");
  } catch (err) {
    console.warn("[a2ui-dashboards] LLM unreachable:", err);
    const reason = err instanceof Error ? err.message : String(err);
    return unavailable(prompt, reason, "llm-unavailable");
  }
}

async function callLLM(prompt: string): Promise<A2UIDashboard> {
  const system = buildSystemPrompt();
  const json = await chatJSON<A2UIDashboard>(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { responseFormat: "json_object", temperature: 0.2, maxTokens: 1800, fast: true },
  );
  return json;
}

function buildSystemPrompt(): string {
  const sources = DATA_SOURCES.map((s) => {
    const dims = s.dimensions.length ? ` · dims: [${s.dimensions.join(", ")}]` : "";
    const meas = s.measures.length ? ` · measures: [${s.measures.join(", ")}]` : "";
    return `  - "${s.id}" — ${s.description}${dims}${meas}`;
  }).join("\n");

  return `You compose generative-UI dashboards for a Thai clinical information system (CIS).

Emit a single JSON object matching the A2UIDashboard schema. The user writes a Thai or English prompt; you pick from the A2UI component vocabulary and the data-source catalog. Values are NEVER inline — they are binding placeholders the renderer resolves from real catalog queries.

# A2UIDashboard schema
{
  "name": string,                        // short Thai title
  "description": string,                 // one sentence
  "rootId": A2UINodeId,                  // id of the top-level node (usually "root")
  "components": A2UINode[],              // flat list, parent → child refs by id
  "bindings": { [key]: DataQuery }       // ALL data values used in components come from here
}

A binding key is a short camelCase name you invent ("activeCount", "topClinics", "bpTrend"). Each maps to:
{
  "source": string,                       // must be one of the catalog ids below
  "groupBy"?: string,                     // a dimension id from that source
  "metric"?: string,                      // a measure id from that source
  "filters"?: { [k]: string | number }    // e.g. { "patient_name": "สมชาย ใจดี" }
}

# Placeholder syntax inside component string fields
- "{{$activeCount}}"            → primary value of binding (kpi.value, or points[0].value)
- "{{$activeCount.value}}"      → explicit kpi field
- "{{$topClinics.points[0].label}}"   → indexed array access into points/rows
- Strings can mix text + placeholders: "ผู้ป่วย active: {{$activeCount}} คน"

# Chart inflation (IMPORTANT)
For "bar-chart" and "line-chart" components, leave \`bars: []\` / \`series: []\` and put the binding ref INSIDE the title: \`"title": "นัดต่อคลินิก {{$apptByClinic}}"\`. The resolver pulls the binding's \`points\` and fills bars/series automatically. The ref will be stripped from the title at render time.

# A2UI component types you may use
section, row, stack, heading, text, badge, list, info-row, chip-group, metric-grid, stat-card, action-card, image-tile, avatar, line-chart, bar-chart, timeline, citation

For dashboards, prefer: stat-card (KPI), metric-grid (2-4 small KPIs), line-chart (time series), bar-chart (categorical), info-row (label/value), chip-group (tags), timeline (event log).

# Component shape contracts (strict — schema-violating output is rejected)
- "list" items MUST be plain strings, e.g. ["รายการ 1", "รายการ 2"]. NEVER objects.
- "info-row" is the right pick for a SINGLE label/value (e.g. "กรุ๊ปเลือด: A+"). Stack many info-rows for a label/value table.
- "metric-grid" items[] are {label, value, tone?, iconHint?} — value must be a STRING (use a placeholder to fill it).
- "bar-chart" bars[] and "line-chart" series[] should be EMPTY arrays; binding ref in title inflates them.

# Single-fact prompts
When the user asks about ONE field of one patient (e.g. "เลือดกรุ๊ปของสมชาย", "อายุของคนนี้"), respond with ONE stat-card or ONE info-row — not a full dashboard. Still wire the value through a binding placeholder pointing at the right source.

# Layout
- Top-level component should be a "section" or "stack" with rootId="root"
- Inside, use "row" for side-by-side metric-grids/charts, "stack" for vertical groups
- A typical dashboard: 1 section → metric-grid (KPIs) + row(bar-chart + line-chart) + section(detailed table-like info-row stacks)

# Data source catalog (the ONLY ids you may reference in bindings)
${sources}

# CRITICAL — Never fabricate
- NEVER invent a source id. Anything not in the catalog above will be rejected.
- NEVER put a literal number or label inside component string fields. Use a binding + placeholder.
- If no source in the catalog can answer the prompt, emit a single A2UI "text" component explaining what's missing + suggest sources that exist.
- Per-patient prompts (with a patient name or HN) MUST use patient.* sources AND include filters.patient_name or filters.patient_hn in the binding.

# Output rules
- Output MUST be valid JSON. No prose, no markdown, no code fences.
- name + description in concise Thai.

# Example: "ภาพรวม OPD วันนี้"
{
  "name": "ภาพรวม OPD วันนี้",
  "description": "นัด คิว และเวลารอของวันนี้",
  "rootId": "root",
  "bindings": {
    "todayCount": { "source": "appointments.today" },
    "todayWait": { "source": "appointments.today", "metric": "avg_wait_time_min" },
    "abnLabs": { "source": "lab_results.recent" },
    "activeCount": { "source": "patients.active" },
    "apptByClinic": { "source": "appointments.today", "groupBy": "clinic" },
    "apptByHour": { "source": "appointments.today", "groupBy": "hour" }
  },
  "components": [
    { "id": "root", "type": "section", "title": "ภาพรวม OPD", "children": ["kpis", "row1"] },
    { "id": "kpis", "type": "metric-grid", "columns": 4, "items": [
      { "label": "นัดวันนี้", "value": "{{$todayCount}} นัด", "tone": "blue", "iconHint": "calendar" },
      { "label": "รอเฉลี่ย", "value": "{{$todayWait}} นาที", "tone": "amber", "iconHint": "clock" },
      { "label": "ผลแลปผิดปกติ", "value": "{{$abnLabs}}", "tone": "rose", "iconHint": "test" },
      { "label": "Active", "value": "{{$activeCount}} คน", "tone": "emerald", "iconHint": "users" }
    ]},
    { "id": "row1", "type": "row", "children": ["clinicBar", "hourLine"] },
    { "id": "clinicBar", "type": "bar-chart", "title": "นัดต่อคลินิก {{$apptByClinic}}", "bars": [], "height": 220 },
    { "id": "hourLine", "type": "line-chart", "title": "คิวต่อชั่วโมง {{$apptByHour}}", "xLabels": [], "series": [], "height": 220 }
  ]
}

# Example: "สรุปผู้ป่วยสมชาย ใจดี"
{
  "name": "สรุปผู้ป่วย สมชาย ใจดี",
  "description": "ข้อมูลรายบุคคล",
  "rootId": "root",
  "bindings": {
    "profile": { "source": "patient.profile", "filters": { "patient_name": "สมชาย ใจดี" } },
    "risk":    { "source": "patient.risk_kpi", "filters": { "patient_name": "สมชาย ใจดี" } },
    "bpTrend": { "source": "patient.vitals_trend", "metric": "systolic", "filters": { "patient_name": "สมชาย ใจดี" } },
    "a1c":     { "source": "patient.labs_trend", "metric": "HbA1c", "filters": { "patient_name": "สมชาย ใจดี" } }
  },
  "components": [
    { "id": "root", "type": "section", "title": "ผู้ป่วยรายบุคคล", "children": ["info", "row1"] },
    { "id": "info", "type": "stack", "children": ["nameRow", "hnRow", "ageRow", "riskRow"] },
    { "id": "nameRow", "type": "info-row", "label": "ชื่อ", "value": "{{$profile.rows[0].value}}" },
    { "id": "hnRow",   "type": "info-row", "label": "HN",   "value": "{{$profile.rows[1].value}}" },
    { "id": "ageRow",  "type": "info-row", "label": "อายุ", "value": "{{$profile.rows[4].value}}" },
    { "id": "riskRow", "type": "info-row", "label": "Risk", "value": "{{$risk}} flags", "tone": "danger" },
    { "id": "row1", "type": "row", "children": ["bp", "lab"] },
    { "id": "bp",  "type": "line-chart", "title": "Systolic 12 เดือน {{$bpTrend}}", "unit": "mmHg", "xLabels": [], "series": [], "height": 200 },
    { "id": "lab", "type": "line-chart", "title": "HbA1c 12 เดือน {{$a1c}}", "unit": "%", "xLabels": [], "series": [], "height": 200 }
  ]
}
`;
}

// ── Validation ─────────────────────────────────────────────────────────────

function validate(dash: unknown): string[] {
  const errs: string[] = [];
  if (!dash || typeof dash !== "object") return ["dashboard must be an object"];
  const d = dash as Partial<A2UIDashboard>;

  // Reuse A2UI's structural validator first.
  if (!validateA2UIResponse({ rootId: d.rootId, components: d.components, data: d.data })) {
    errs.push("invalid A2UI structure");
    return errs;
  }

  // Verify every binding source exists in the catalog.
  const validSources = new Set(DATA_SOURCES.map((s) => s.id));
  if (d.bindings) {
    for (const [key, q] of Object.entries(d.bindings)) {
      if (!q.source || typeof q.source !== "string") {
        errs.push(`binding "${key}" missing source`);
        continue;
      }
      if (!validSources.has(q.source)) {
        errs.push(`binding "${key}" references unknown source "${q.source}"`);
      }
    }
  }

  // Verify every placeholder in components references a declared binding.
  const declared = new Set(Object.keys(d.bindings ?? {}));
  const placeholderRe = /\{\{\$([a-zA-Z0-9_]+)/g;
  const seen = new Set<string>();
  walkStrings(d.components as A2UINode[], (s) => {
    let m;
    while ((m = placeholderRe.exec(s))) seen.add(m[1]);
  });
  for (const key of seen) {
    if (!declared.has(key)) errs.push(`placeholder {{$${key}}} has no matching binding`);
  }

  return errs;
}

function walkStrings(nodes: A2UINode[], visit: (s: string) => void): void {
  const walk = (v: unknown) => {
    if (typeof v === "string") visit(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
  };
  nodes.forEach(walk);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function stamp(d: A2UIDashboard, prompt: string, model: string): A2UIDashboard {
  return { ...d, prompt, model, generatedAt: new Date().toISOString() };
}

function unavailable(prompt: string, reason: string, model: string): A2UIDashboard {
  return {
    rootId: "root",
    components: [
      {
        id: "root",
        type: "section",
        title: "ระบบสร้าง Dashboard ไม่พร้อมใช้งาน",
        children: ["msg"],
      },
      {
        id: "msg",
        type: "text",
        value: `ไม่สามารถติดต่อ LLM เพื่อสร้าง dashboard จาก prompt นี้ได้\n\nสาเหตุ: ${reason}`,
        tone: "danger",
      },
    ],
    bindings: {},
    name: "ไม่พร้อมใช้งาน",
    description: prompt,
    prompt,
    model,
    generatedAt: new Date().toISOString(),
  };
}
