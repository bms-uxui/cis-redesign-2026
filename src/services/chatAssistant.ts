/**
 * Mae — clinical chat assistant powered by the Vercel AI SDK.
 *
 * The previous two-step planner/synthesizer is gone. Instead we hand the
 * LLM a set of typed tools (see `chatTools.ts`) and let `generateText`
 * auto-route: the model decides which tools to call (often multiple in
 * one turn — e.g. searchPatients → getPatientDetail → answer), our
 * runtime executes each `execute()` body against the in-memory tables,
 * and the same LLM call composes the final Thai reply.
 *
 * Everything is browser-side: we point the OpenAI provider at our
 * existing vLLM endpoint (OpenAI-compatible).
 */
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { AI_CONFIG } from "./ai/config";
import { chatTools } from "./chatTools";
import { buildCisKnowledge } from "./cisKnowledge";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Tool name → Thai "what I'm doing now" line, surfaced to the chat UI so the
 *  doctor sees live progress instead of a silent spinner during multi-step
 *  tool calls (same idea as the Dr. Note generation status). */
const THINKING_LABELS: Record<string, string> = {
  searchPatients: "กำลังค้นหาผู้ป่วย…",
  searchPatientsByClinical: "กำลังค้นหาผู้ป่วยตามอาการ…",
  findRecurringComplaints: "กำลังวิเคราะห์อาการที่เป็นซ้ำหลายครั้ง…",
  findAbnormalLabs: "กำลังคัดกรองผลแล็บผิดปกติทั้งหมด…",
  getPatientDetail: "กำลังเปิดเวชระเบียน…",
  listPatients: "กำลังรวบรวมรายชื่อผู้ป่วย…",
  getVisitsForPatient: "กำลังดึงประวัติการมาตรวจ…",
  getLabHistory: "กำลังดูผลแล็บย้อนหลัง…",
  getVitalHistory: "กำลังดูสัญญาณชีพย้อนหลัง…",
  getAppointmentsToday: "กำลังตรวจคิวนัดวันนี้…",
  getNoShowHistory: "กำลังดูสถิติการขาดนัด…",
  _default: "กำลังประมวลผลข้อมูล…",
};

// vLLM exposes an OpenAI-compatible `/v1` API. The provider needs a
// baseURL + a stub apiKey (to satisfy its required-string check). We
// strip the `Authorization` header in a custom fetch because vLLM
// runs without auth and the extra header trips CORS preflight on the
// endpoint we use.
const provider = createOpenAI({
  baseURL: `${AI_CONFIG.llmBase}/v1`,
  apiKey: "vllm-no-auth",
  fetch: async (url, init) => {
    const headers = new Headers(init?.headers);
    headers.delete("Authorization");
    return fetch(url, { ...init, headers });
  },
});

// vLLM only implements the Chat Completions API (`/v1/chat/completions`).
// In @ai-sdk/openai v3, calling the provider directly defaults to the
// Responses API (`/v1/responses`) — which vLLM rejects with type errors
// like `input_text` / `EasyInputMessageParam`. Use `.chat()` to force the
// Chat Completions transport.
const MODEL = provider.chat("default");

const SYSTEM_PROMPT = `You are เมย์ (Mae), an AI clinical assistant for a Thai hospital CIS.
You talk to the doctor in concise Thai. You have two sources of knowledge:

1. The CIS application itself — every page, sidebar menu, and feature (see § APP KNOWLEDGE).
2. A live clinical database accessed through TOOLS (search/list patients, fetch detail, visits, labs, vitals, appointments, no-show history). Call tools whenever the answer depends on database content. Never invent numbers, names, or fields.

Workflow:
- For navigation / help / small talk: answer directly, no tool calls. Cite paths from § APP KNOWLEDGE as markdown links \`[ชื่อ](/path)\`.
- For a question about a specific patient: first call \`searchPatients\` with the name/HN fragment to find the right row, then call \`getPatientDetail\` (or one of the trend tools) on the matching id, then compose the answer.
- For cohort questions by SYMPTOM, body site, complaint, diagnosis, drug, or allergy ("คนไข้คนไหนมีอาการเจ็บท้อง", "ใครกินยา metformin", "ใครแพ้ยา"): call \`searchPatientsByClinical\`. ALWAYS expand the concept into many synonyms across Thai + English in \`keywords\` — e.g. abdominal pain → "ท้อง หน้าท้อง ปวดท้อง ลิ้นปี่ ชายโครง abdomen epigastr" — because the records are free-text. Don't rely on one word.
- For CHRONIC / RECURRING problems carried over from earlier visits ("ใครมีอาการเจ็บปวดเรื้อรังต่อเนื่องหลาย visit", "คนไข้ที่ไอเรื้อรัง"): call \`findRecurringComplaints\` with focused \`keywords\` (+ synonyms) and read the per-patient visit counts / date span. Recurring = same symptom on ≥2 distinct visit dates.
- For ABNORMAL LAB cohorts ("คนไข้ที่มีผลแล็บผิดปกติ", "ใคร Creatinine สูง") call \`findAbnormalLabs\` ONCE (optionally with \`test\`). NEVER loop \`getLabHistory\` over many patients — that is slow; \`getLabHistory\` is only for ONE patient's trend.
- For risk-flag cohorts (เบาหวานคุมไม่ได้, ความดันสูง ฯลฯ) use \`listPatients\` with \`riskFlag\`; for queue / no-show use \`getAppointmentsToday\` / \`getNoShowHistory\`.
- These examples are illustrative — pick tools by the SHAPE of the question, not by keyword matching the examples. Chain tools when needed (the runtime supports multi-step calls in one turn): e.g. \`searchPatientsByClinical\` to find the cohort, then \`getPatientDetail\` on one id for depth.
- Report only what the tools return; if a cohort is empty, say so plainly. Never invent patients, counts, or fields.

Reply style — concise Thai, clinical terms when appropriate. Markdown IS rendered (tables, blockquotes, lists, bold/italic, links). Follow these formatting rules:
1. ALWAYS use a Markdown table to present lab results, vital signs, or medication lists (columns like การตรวจ | ค่า | ช่วงอ้างอิง | วันที่). Don't list these as prose.
2. NEVER pack clinical data into long continuous paragraphs — chunk it, use bullet points and short lines.
3. Use **bold** strictly for critical values, drug names, alert levels, and section headers (not for ordinary text).
4. For drug interactions, severe allergies, or clinical warnings use a blockquote starting with \`> ⚠️\`.
5. Format every date/time as \`[DD/MM/YYYY - HH:MM]\` (or \`[DD/MM/YYYY]\` when there's no time). Convert ISO dates from the tools to this form.
6. Write destination pages as \`[ชื่อหน้า](/path)\` so they're clickable. Never output fenced code blocks, JSON, or raw tool results — translate them into prose/tables.

# § APP KNOWLEDGE (the CIS application)
${buildCisKnowledge()}`;

export async function answerChatPrompt(
  userPrompt: string,
  history: ChatMessage[] = [],
  /** Live progress callback — fired with a Thai status line as Mae works
   *  through tool calls, then a "เรียบเรียงคำตอบ" line before the reply. */
  onThinking?: (label: string) => void,
  /** Streaming callback — fired with the cumulative reply text as it's
   *  generated, so the UI shows the answer building instead of a long blank
   *  wait (cohort answers / tables can be long; streaming avoids timeouts). */
  onDelta?: (partialText: string) => void,
): Promise<string> {
  try {
    onThinking?.("กำลังทำความเข้าใจคำถาม…");
    const result = streamText({
      model: MODEL,
      system: SYSTEM_PROMPT,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userPrompt },
      ],
      tools: chatTools,
      // Allow up to 5 tool-call rounds before the model must answer in
      // text. Enough for "search → detail → reply" plus a cohort step.
      stopWhen: ({ steps }) => steps.length >= 5,
      temperature: 0.3,
      onStepFinish: ({ toolCalls }) => {
        if (!onThinking) return;
        const name = toolCalls?.[0]?.toolName;
        onThinking(
          name
            ? (THINKING_LABELS[name] ?? THINKING_LABELS._default)
            : "กำลังเรียบเรียงคำตอบ…",
        );
      },
    });

    let full = "";
    for await (const delta of result.textStream) {
      full += delta;
      onDelta?.(full);
    }

    const reply = full.trim();
    if (reply) return reply;
    return "ขออภัย ตอนนี้ยังตอบไม่ได้ ลองพิมพ์ใหม่อีกครั้ง";
  } catch (err) {
    console.warn("[chat-assistant] generation failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return `ขออภัย เกิดข้อผิดพลาด: ${msg}`;
  }
}
