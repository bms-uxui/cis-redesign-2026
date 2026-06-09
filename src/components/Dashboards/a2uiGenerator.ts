/**
 * A2UI dashboard generator — table-driven.
 *
 * Mirrors the chat assistant's architecture:
 *   1. PLAN — LLM picks the raw tables it needs for the user's prompt.
 *   2. COMPOSE — LLM receives the rows and emits a complete A2UI tree with
 *      values already inlined (no binding placeholders). The LLM does the
 *      counting / filtering / grouping itself.
 *
 * Why this design: any analytical question becomes answerable without
 * hand-coding a new aggregator. Adding a new chart type or summary requires
 * zero code change — the LLM picks the A2UI components and fills in the
 * numbers from the rows it received.
 */
import { chatJSON } from "../../services/ai/llm";
import { buildTableSchemaDoc, fetchTable, tableNames } from "../../services/dataTables";
import type { A2UIDashboard } from "./a2uiSchema";
import type { A2UINode } from "../../services/a2ui/types";
import { validateA2UIResponse } from "../../services/a2ui/types";

export async function generateA2UIDashboard(prompt: string): Promise<A2UIDashboard> {
  try {
    const plan = await planStep(prompt);
    if (plan.kind === "reply") {
      return wrapReply(prompt, plan.text, "vllm-reply");
    }
    const rows: Record<string, unknown[]> = {};
    for (const name of plan.tables) {
      const r = fetchTable(name);
      if (r) rows[name] = r;
    }
    const tree = await composeStep(prompt, plan, rows);
    const errors = validateTree(tree);
    if (errors.length === 0) {
      return stamp(tree, prompt, "vllm");
    }
    console.warn("[a2ui-dashboards] compose output failed validation:", errors);
    return unavailable(
      prompt,
      `LLM output ไม่ผ่าน validation: ${errors.join("; ")}`,
      "llm-invalid",
    );
  } catch (err) {
    console.warn("[a2ui-dashboards] LLM unreachable:", err);
    const reason = err instanceof Error ? err.message : String(err);
    return unavailable(prompt, reason, "llm-unavailable");
  }
}

// ── Step 1: plan tables ───────────────────────────────────────────────────

interface PlanReply {
  kind: "reply";
  text: string;
}
interface PlanFetch {
  kind: "fetch";
  tables: string[];
  rationale?: string;
}
type Plan = PlanReply | PlanFetch;

async function planStep(prompt: string): Promise<Plan> {
  const system = `You are planning the data fetch for a dashboard generator on a Thai clinical CIS.

The user types a natural-language prompt (Thai or English). Your job: pick the raw TABLES that contain the data needed to build the dashboard. The next step will receive the rows and produce the UI.

Output ONE JSON object in exactly ONE of these shapes. NEVER both. NEVER prose.

# Shape A — Refuse / explain (use ONLY when no table can answer)
{ "kind": "reply", "text": "<short Thai explanation + suggested rephrasing>" }

# Shape B — Fetch tables (use whenever a chart/KPI/table can be built from rows)
{
  "kind": "fetch",
  "rationale": "<one sentence>",
  "tables": ["<table1>", "<table2>", ...]
}

Allowed table names: ${tableNames().join(", ")}

# Tables (schema + sample row)
${buildTableSchemaDoc()}

# Rules
- Pick the MINIMUM set of tables needed — don't fetch every table by default.
- Per-patient prompts: "patients" alone usually has dx, allergies, meds, latest labs, vitals, risk flags.
- Trend / time-series prompts: pair "patients" with "lab_history" / "vital_history" / "visits" / "no_show_history".
- Output MUST be valid JSON. No markdown, no commentary outside JSON.`;

  const plan = await chatJSON<Plan>(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { responseFormat: "json_object", temperature: 0.2, maxTokens: 500, fast: true },
  );

  if (plan.kind === "fetch" && Array.isArray(plan.tables)) {
    const valid = new Set(tableNames());
    const cleaned = plan.tables.filter((n): n is string => typeof n === "string" && valid.has(n));
    return { kind: "fetch", tables: cleaned, rationale: plan.rationale };
  }
  if (plan.kind === "reply" && typeof plan.text === "string") return plan;
  return { kind: "reply", text: "ขออภัย ไม่สามารถวางแผนการดึงข้อมูลสำหรับ prompt นี้ได้" };
}

// ── Step 2: compose A2UI tree from rows ───────────────────────────────────

async function composeStep(
  prompt: string,
  plan: PlanFetch,
  rows: Record<string, unknown[]>,
): Promise<A2UIDashboard> {
  // Cap each table at MAX_ROWS so the synthesis prompt stays under the
  // token budget. The LLM is told about the cap.
  const MAX_ROWS = 400;
  const trimmed: Record<string, { rows: unknown[]; total: number; truncated: boolean }> = {};
  for (const [name, all] of Object.entries(rows)) {
    trimmed[name] = {
      rows: all.slice(0, MAX_ROWS),
      total: all.length,
      truncated: all.length > MAX_ROWS,
    };
  }

  const system = `You are composing a generative-UI dashboard for a Thai clinical CIS.

You receive the user's prompt plus the raw TABLE ROWS the planner fetched. Build an A2UI tree that answers the prompt. You MUST compute counts / filters / groupings yourself from the rows — never invent values that aren't in the data.

Plan rationale: ${plan.rationale ?? "(none)"}

Fetched tables:
${Object.entries(trimmed)
  .map(
    ([name, t]) =>
      `## table: ${name} (${t.total} rows${t.truncated ? `, first ${t.rows.length} shown` : ""})\n\`\`\`json\n${JSON.stringify(t.rows, null, 1)}\n\`\`\``,
  )
  .join("\n\n")}

# Output schema (A2UIDashboard)
{
  "name": string,                            // short Thai title
  "description": string,                     // one sentence
  "rootId": "root",
  "components": A2UINode[]                   // flat list with id refs
}

Top-level node should be { id: "root", type: "section", title, children: [...] }.

# A2UI component vocabulary (pick whichever fits the answer)
- "section" { id, type, title?, children: id[] }
- "stack"   { id, type, children: id[] }                   // vertical
- "row"     { id, type, children: id[] }                   // horizontal
- "heading" { id, type, text, level? }
- "text"    { id, type, value, tone? }
- "info-row"{ id, type, label, value, tone? }              // label/value pair
- "badge"   { id, type, label, color? }
- "list"    { id, type, items: string[], ordered? }        // items MUST be strings
- "stat-card" { id, type, value, label, sublabel?, iconHint?, tone?, trend?, trendLabel? }
- "metric-grid" { id, type, columns?: 2|3|4, items: { label, value, tone?, iconHint? }[] }   // value must be STRING
- "chip-group"  { id, type, chips: { label, tone? }[] }
- "bar-chart"   { id, type, title?, unit?, bars: { label, value, tone? }[], height? }
- "line-chart"  { id, type, title?, unit?, xLabels: string[], series: { name, tone?, values: number[] }[], refBands?, height? }
- "timeline"    { id, type, title?, events: { date, title, body?, tone?, iconHint? }[] }

# Rules — CRITICAL
- Compute ALL values from the rows above. Never fabricate.
- All values rendered to the user must be literal numbers / strings — NO placeholders, NO bindings.
- For "metric-grid" items[].value must be a STRING (e.g. "6 คน", "84%"). Append units in the string.
- For "list" items[] must be plain strings.
- Pick 3-8 components total. A useful dashboard usually mixes a KPI grid + 1-2 charts + an optional table-like stack.
- Top-level title in Thai. Concise.
- If a table was truncated, mention it inside a "text" component near the bottom.

Output MUST be a single JSON object matching the schema. No markdown, no commentary.`;

  const tree = await chatJSON<A2UIDashboard>(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { responseFormat: "json_object", temperature: 0.25, maxTokens: 2200, fast: true },
  );
  return tree;
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateTree(dash: A2UIDashboard | null | undefined): string[] {
  const errs: string[] = [];
  if (!dash || typeof dash !== "object") return ["dashboard must be an object"];
  if (!validateA2UIResponse({ rootId: dash.rootId, components: dash.components, data: dash.data })) {
    errs.push("invalid A2UI structure");
    return errs;
  }
  // Spot-check a known LLM mistake: list items that aren't strings.
  for (const node of (dash.components as A2UINode[]) ?? []) {
    if (node?.type === "list" && Array.isArray(node.items)) {
      const bad = node.items.findIndex((it) => typeof it !== "string");
      if (bad >= 0) errs.push(`list node "${node.id}" items[${bad}] must be a string`);
    }
  }
  return errs;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function stamp(d: A2UIDashboard, prompt: string, model: string): A2UIDashboard {
  return {
    ...d,
    bindings: undefined,
    prompt,
    model,
    generatedAt: new Date().toISOString(),
  };
}

function wrapReply(prompt: string, text: string, model: string): A2UIDashboard {
  return {
    rootId: "root",
    components: [
      { id: "root", type: "section", title: "เมย์ตอบ", children: ["msg"] },
      { id: "msg", type: "text", value: text, tone: "default" },
    ],
    name: "เมย์ตอบ",
    description: prompt,
    prompt,
    model,
    generatedAt: new Date().toISOString(),
  };
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
    name: "ไม่พร้อมใช้งาน",
    description: prompt,
    prompt,
    model,
    generatedAt: new Date().toISOString(),
  };
}
