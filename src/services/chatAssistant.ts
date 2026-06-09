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
import { generateText } from "ai";
import { AI_CONFIG } from "./ai/config";
import { chatTools } from "./chatTools";
import { buildCisKnowledge } from "./cisKnowledge";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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
- For cohort/queue questions: call the matching list/history tool (\`listPatients\`, \`getAppointmentsToday\`, \`getNoShowHistory\`).
- Chain tools when needed — the runtime supports multi-step calls in a single turn.

Reply style:
- Concise Thai (1-4 sentences usually). Bullets for lists.
- Use clinical terms when appropriate.
- When you mention a destination page, write \`[ชื่อหน้า](/path)\` so the chat surface can make it clickable.
- Never output JSON, code blocks, or raw tool results — translate them into prose.

# § APP KNOWLEDGE (the CIS application)
${buildCisKnowledge()}`;

export async function answerChatPrompt(
  userPrompt: string,
  history: ChatMessage[] = [],
): Promise<string> {
  try {
    const result = await generateText({
      model: MODEL,
      system: SYSTEM_PROMPT,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userPrompt },
      ],
      tools: chatTools,
      // Allow up to 4 tool-call rounds before the model must answer in
      // text. Enough for the common pattern "search → detail → reply".
      stopWhen: ({ steps }) => steps.length >= 4,
      temperature: 0.3,
    });

    const reply = result.text.trim();
    if (reply) return reply;
    return "ขออภัย ตอนนี้ยังตอบไม่ได้ ลองพิมพ์ใหม่อีกครั้ง";
  } catch (err) {
    console.warn("[chat-assistant] generation failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return `ขออภัย เกิดข้อผิดพลาด: ${msg}`;
  }
}
