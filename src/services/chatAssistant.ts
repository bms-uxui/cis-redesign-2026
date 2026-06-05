/**
 * Conversational clinical chat assistant.
 *
 * Two-step tool-use loop:
 *   1. PLAN — Ask the LLM to either reply directly (small talk, follow-up
 *      that needs no data) OR emit a JSON plan of data-source queries to
 *      run against our catalog. LLM may NOT invent sources or values.
 *   2. SYNTHESIZE — If queries were planned, fetch them in parallel via
 *      the dashboard data API, hand the results back to the LLM, and ask
 *      for a concise Thai answer that uses the data.
 *
 * Output is plain text — the chat surface renders it as a normal message.
 * No UI generation. This keeps the chat conversational; A2UI dashboard
 * rendering stays available as a separate entry point for prompts that
 * explicitly want a visual report.
 */
import { chat, chatJSON } from "./ai/llm";
import { DATA_SOURCES } from "../components/Dashboards/catalog";
import { resolveBindings, type DataQuery } from "./dashboardData";
import { buildCisKnowledge } from "./cisKnowledge";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PlanReply {
  kind: "reply";
  text: string;
}
interface PlanFetch {
  kind: "fetch";
  queries: Record<string, DataQuery>;
  /** What the assistant intends to look up — used in the synthesis prompt
   *  so the model knows why it asked for each query. */
  rationale?: string;
}
type Plan = PlanReply | PlanFetch;

export async function answerChatPrompt(
  userPrompt: string,
  history: ChatMessage[] = [],
): Promise<string> {
  const plan = await planStep(userPrompt, history);
  if (plan.kind === "reply") return plan.text.trim();

  const data = await resolveBindings(plan.queries);
  return synthesizeStep(userPrompt, history, plan, data);
}

// ── Step 1: plan ──────────────────────────────────────────────────────────

async function planStep(userPrompt: string, history: ChatMessage[]): Promise<Plan> {
  const system = buildPlanPrompt();
  const messages = [
    { role: "system" as const, content: system },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: userPrompt },
  ];
  try {
    const plan = await chatJSON<Plan>(messages, {
      responseFormat: "json_object",
      temperature: 0.2,
      maxTokens: 800,
      fast: true,
    });
    if (plan.kind === "fetch" && plan.queries) {
      // Strip any query that references a source not in the catalog —
      // refuse to fetch fabricated ids.
      const valid = new Set(DATA_SOURCES.map((s) => s.id));
      const cleaned: Record<string, DataQuery> = {};
      for (const [k, q] of Object.entries(plan.queries)) {
        if (q && typeof q === "object" && valid.has(q.source)) cleaned[k] = q;
      }
      return { kind: "fetch", queries: cleaned, rationale: plan.rationale };
    }
    if (plan.kind === "reply" && typeof plan.text === "string") return plan;
  } catch (err) {
    console.warn("[chat-assistant] plan step failed:", err);
  }
  return { kind: "reply", text: "ขออภัย ตอนนี้ระบบไม่สามารถประมวลผลคำถามนี้ได้ ลองพิมพ์ใหม่อีกครั้ง" };
}

function buildPlanPrompt(): string {
  const sources = DATA_SOURCES.map((s) => {
    const dims = s.dimensions.length ? ` · dims: [${s.dimensions.join(", ")}]` : "";
    const meas = s.measures.length ? ` · measures: [${s.measures.join(", ")}]` : "";
    return `  - "${s.id}" — ${s.description}${dims}${meas}`;
  }).join("\n");

  const cisKnowledge = buildCisKnowledge();

  return `You are เมย์ (Mae), an AI clinical assistant for a Thai hospital CIS.
You talk to the doctor in concise Thai. You know two things deeply:
  (1) The CIS application itself — every page, sidebar menu, and feature (see § APP KNOWLEDGE below).
  (2) The clinical data sources catalog (see § DATA CATALOG below).

When the doctor asks about NAVIGATION/HELP ("จะเข้าหน้า X ยังไง", "ใช้ฟีเจอร์ Y ตรงไหน", "shortcut") — reply directly with the path/menu/shortcut from § APP KNOWLEDGE. NEVER invent a path that isn't in that list.

When the doctor asks about CLINICAL DATA (patient info, statistics, no-show, lab values) — you MUST look up real data from § DATA CATALOG first. NEVER invent numbers, names, or fields.

Output ONE JSON object in one of two shapes. NEVER both. NEVER prose.

# Shape A — Reply directly (use for navigation/help/small talk/follow-up that needs no fresh clinical data)
{
  "kind": "reply",
  "text": "<concise Thai message>"
}

# Shape B — Fetch data first (use when you need clinical data to answer)
{
  "kind": "fetch",
  "rationale": "<one sentence — why you are looking these up>",
  "queries": {
    "<short_key>": { "source": "<catalog id>", "groupBy"?: "...", "metric"?: "...", "filters"?: { ... } }
  }
}

# § APP KNOWLEDGE (the CIS application)
${cisKnowledge}

# § DATA CATALOG (ONLY these ids are allowed in Shape B queries)
${sources}

# Rules
- For a specific patient (by name or HN), use patient.* sources and include filters.patient_name or filters.patient_hn.
- Plan multiple queries when needed — they are fetched in parallel.
- If the catalog has no source for the question, return Shape A with a short Thai message saying so.
- Do NOT include data values in Shape B — only query specs.
- In Shape A "text", when suggesting a page write it as a clickable markdown link: \`[ชื่อหน้า](/path)\` — only paths that appear in § APP KNOWLEDGE.
- Output MUST be valid JSON. No markdown around the JSON envelope itself, no commentary outside JSON.`;
}

// ── Step 2: synthesize ────────────────────────────────────────────────────

async function synthesizeStep(
  userPrompt: string,
  history: ChatMessage[],
  plan: PlanFetch,
  data: Record<string, unknown>,
): Promise<string> {
  const system = `You are เมย์ (Mae), an AI clinical assistant. Answer the doctor in concise Thai based ONLY on the data below + the app knowledge.

Plan rationale: ${plan.rationale ?? "(none)"}

Fetched data (key → result):
${JSON.stringify(data, null, 2)}

App knowledge — paths/menus/features (use ONLY paths that appear here):
${buildCisKnowledge()}

Rules:
- Use the values from "Fetched data" — never invent or estimate.
- If a query returned empty/null, say so honestly.
- When you suggest a page, ALWAYS write it as a clickable markdown link: \`[ชื่อหน้า](/path)\` — the host renders these as real navigation links. Use only paths that appear in app knowledge.
  Examples:  [ลงทะเบียนผู้ป่วยใหม่](/patient/new)  ·  [OPD ของสมชาย](/opd/00012345)  ·  [แดชบอร์ดของฉัน](/dashboards)
- Keep the reply to 1-4 sentences unless the doctor asked for a list.
- Format lists with bullet points (• item). Format tables as compact rows.
- Speak in Thai. Use clinical terms when appropriate.
- No JSON, no code blocks — plain conversational text + markdown links only.`;

  const messages = [
    { role: "system" as const, content: system },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: userPrompt },
  ];

  try {
    const { text } = await chat(messages, { temperature: 0.3, maxTokens: 700, fast: true });
    return text.trim() || "ไม่พบข้อมูลที่ตอบคำถามนี้";
  } catch (err) {
    console.warn("[chat-assistant] synthesize failed:", err);
    return `พบข้อมูลแล้วแต่สรุปไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง`;
  }
}
