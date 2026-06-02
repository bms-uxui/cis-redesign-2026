import { AI_CONFIG, aiFetch } from "./config";

export interface KbHit {
  id: string;
  title: string;
  snippet: string;
  url?: string;
  score?: number;
}

export async function searchKb(query: string, topK = 5, signal?: AbortSignal): Promise<KbHit[]> {
  const res = await aiFetch("kb", `${AI_CONFIG.kbBase}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK }),
    signal,
  });
  const data = await res.json();
  return data?.hits ?? data?.results ?? [];
}
