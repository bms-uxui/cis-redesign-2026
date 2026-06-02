const env = import.meta.env as Record<string, string | undefined>;

export const AI_CONFIG = {
  ocrBase: env.VITE_AI_OCR_BASE ?? "https://pdf-ocr-mcp.bmscloud.in.th",
  asrBase: env.VITE_AI_ASR_BASE ?? "https://asr2.bmscloud.in.th",
  ttsBase: env.VITE_AI_TTS_BASE ?? "https://vox-cpm.bmscloud.in.th",
  llmBase: env.VITE_AI_LLM_BASE ?? "https://vllm-gemma.bmscloud.in.th",
  llmFastBase: env.VITE_AI_LLM_FAST_BASE ?? "https://vllm-qwen.bmscloud.in.th",
  kbBase: env.VITE_AI_KB_BASE ?? "https://knowledge.bmscloud.in.th",
  allowPHI: env.VITE_AI_ALLOW_PHI === "true",
};

export class AIError extends Error {
  service: string;
  status: number;
  constructor(service: string, status: number, message: string) {
    super(`[${service}] ${status} ${message}`);
    this.service = service;
    this.status = status;
  }
}

export async function aiFetch(service: string, url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AIError(service, res.status, body.slice(0, 200));
  }
  return res;
}
