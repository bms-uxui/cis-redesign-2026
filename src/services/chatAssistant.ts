/**
 * Conversational clinical chat assistant — table-driven.
 *
 * Two-step tool-use loop:
 *   1. PLAN  — Ask the LLM to either reply directly or pick the RAW TABLES
 *              it needs to answer the user's question. The LLM is not
 *              limited to pre-baked aggregators; it computes from raw rows.
 *   2. ANSWER — Ship the chosen tables as JSON, plus the CIS app knowledge,
 *              and ask the model to produce a concise Thai reply that
 *              cites concrete values from the rows.
 *
 * Why tables instead of an aggregator catalog: any question the user can
 * imagine ("คนที่แพ้ยา", "คนน้ำหนักเกิน 90 + BMI > 30", "นัดเฉพาะคลินิกหัวใจ
 * สัปดาห์ที่แล้ว") can be answered without adding code — the LLM filters /
 * counts / groups directly from the rows.
 */
import { chat, chatJSON } from "./ai/llm";
import { buildTableSchemaDoc, fetchTable, tableNames } from "./dataTables";
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
  tables: string[];
  /** Why the assistant picked these tables — used in the answer step so the
   *  synthesis knows what to look for in the rows. */
  rationale?: string;
}
type Plan = PlanReply | PlanFetch;

export async function answerChatPrompt(
  userPrompt: string,
  history: ChatMessage[] = [],
): Promise<string> {
  const plan = await planStep(userPrompt, history);
  if (plan.kind === "reply") return plan.text.trim();

  const fetched: Record<string, unknown[]> = {};
  for (const name of plan.tables) {
    const rows = fetchTable(name);
    if (rows) fetched[name] = rows;
  }
  return answerStep(userPrompt, history, plan, fetched);
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
      maxTokens: 600,
      fast: true,
    });
    if (plan.kind === "fetch" && Array.isArray(plan.tables)) {
      // Drop any table name that doesn't exist in the registry — we refuse
      // to invent data; an LLM-typo'd table id is silently filtered.
      const valid = new Set(tableNames());
      const cleaned = plan.tables.filter((n) => typeof n === "string" && valid.has(n));
      return { kind: "fetch", tables: cleaned, rationale: plan.rationale };
    }
    if (plan.kind === "reply" && typeof plan.text === "string") return plan;
  } catch (err) {
    console.warn("[chat-assistant] plan step failed:", err);
  }
  return {
    kind: "reply",
    text: "ขออภัย ตอนนี้ระบบไม่สามารถประมวลผลคำถามนี้ได้ ลองพิมพ์ใหม่อีกครั้ง",
  };
}

function buildPlanPrompt(): string {
  const schema = buildTableSchemaDoc();
  const list = tableNames().join(", ");

  return `You are เมย์ (Mae), an AI clinical assistant for a Thai hospital CIS.
You talk to the doctor in concise Thai. You know two things deeply:
  (1) The CIS application itself — every page, sidebar menu, and feature (see § APP KNOWLEDGE).
  (2) The clinical database — raw tables you can fetch and analyze (see § TABLES).

For NAVIGATION/HELP questions ("จะเข้าหน้า X ยังไง", "shortcut", "ใช้ฟีเจอร์ Y ตรงไหน"): reply directly with a path/menu/shortcut from § APP KNOWLEDGE. NEVER invent a path.

For CLINICAL/DATA questions: pick the raw TABLES you need, then in the next step you'll receive the rows and produce the answer. You DO NOT need a pre-built aggregator — you can count / filter / group / summarize the rows yourself in step 2.

Output ONE JSON object in one of two shapes. NEVER both. NEVER prose.

# Shape A — Reply directly (small talk, navigation, follow-up that needs no data)
{
  "kind": "reply",
  "text": "<concise Thai message — markdown links [label](/path) for navigation>"
}

# Shape B — Fetch raw tables (use whenever the answer depends on database content)
{
  "kind": "fetch",
  "rationale": "<one sentence — why these tables>",
  "tables": ["<table1>", "<table2>", ...]
}

Allowed table names: ${list}

# § APP KNOWLEDGE (the CIS application)
${buildCisKnowledge()}

# § TABLES (the raw clinical database — you'll receive these rows in step 2)
${schema}

# Rules
- Only request tables that are likely to contain the answer. Don't request every table by default; pick the minimum set.
- For per-patient questions, "patients" usually suffices (it already includes their dx, allergies, meds, latest labs, vitals, risk flags).
- For trend questions across time, pair "patients" with "lab_history", "vital_history", "visits", or "no_show_history" as appropriate.
- In Shape A "text", suggest a page using markdown link [ชื่อ](/path) — only paths from § APP KNOWLEDGE.
- Output MUST be valid JSON. No markdown around the JSON envelope, no commentary.`;
}

// ── Step 2: answer ────────────────────────────────────────────────────────

async function answerStep(
  userPrompt: string,
  history: ChatMessage[],
  plan: PlanFetch,
  rows: Record<string, unknown[]>,
): Promise<string> {
  // Truncate row dumps if any single table exceeds a soft cap, to keep the
  // synthesis prompt under the token budget. The LLM is told about the cap
  // so it knows the data may be partial.
  const MAX_ROWS_PER_TABLE = 400;
  const trimmed: Record<string, { rows: unknown[]; total: number; truncated: boolean }> = {};
  for (const [name, all] of Object.entries(rows)) {
    trimmed[name] = {
      rows: all.slice(0, MAX_ROWS_PER_TABLE),
      total: all.length,
      truncated: all.length > MAX_ROWS_PER_TABLE,
    };
  }

  const system = `You are เมย์ (Mae), an AI clinical assistant. Answer the doctor in concise Thai based ONLY on the data below.

Plan rationale: ${plan.rationale ?? "(none)"}

Fetched tables (you must compute the answer yourself by reading these rows):
${Object.entries(trimmed)
  .map(
    ([name, t]) =>
      `## ${name} (${t.total} rows${t.truncated ? `, first ${t.rows.length} shown` : ""})\n\`\`\`json\n${JSON.stringify(t.rows, null, 1)}\n\`\`\``,
  )
  .join("\n\n")}

App knowledge (use ONLY paths that appear here):
${buildCisKnowledge()}

Rules:
- Use values from the rows above — never invent.
- Compute counts / filters / groupings yourself by reading the rows.
- If a table was truncated, mention it in your answer.
- If the answer requires data we don't have, say so honestly.
- When suggesting a page, write it as a markdown link [ชื่อ](/path).
- Reply in concise Thai (1-4 sentences unless the doctor asked for a list).
- Use bullet (• item) for lists, compact rows for tables.
- No JSON, no code blocks — plain conversational text + markdown links only.`;

  const messages = [
    { role: "system" as const, content: system },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: userPrompt },
  ];

  try {
    const { text } = await chat(messages, { temperature: 0.3, maxTokens: 900, fast: true });
    return text.trim() || "ไม่พบข้อมูลที่ตอบคำถามนี้";
  } catch (err) {
    console.warn("[chat-assistant] answer step failed:", err);
    return "พบข้อมูลแล้วแต่สรุปไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง";
  }
}
