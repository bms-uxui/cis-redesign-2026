import { AI_CONFIG, aiFetch } from "./config";

export type Role = "system" | "user" | "assistant" | "tool";
export interface ChatMessage {
  role: Role;
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
  signal?: AbortSignal;
  fast?: boolean;
}

export interface ChatResult {
  text: string;
  raw: unknown;
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
  const base = opts.fast ? AI_CONFIG.llmFastBase : AI_CONFIG.llmBase;
  const res = await aiFetch("llm", `${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model ?? "default",
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 1024,
      ...(opts.responseFormat ? { response_format: { type: opts.responseFormat } } : {}),
    }),
    signal: opts.signal,
  });
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return { text, raw: data };
}

export async function chatJSON<T = unknown>(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<T> {
  const { text } = await chat(messages, { ...opts, responseFormat: "json_object" });
  return JSON.parse(text) as T;
}
