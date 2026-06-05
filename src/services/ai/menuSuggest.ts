import { chatJSON } from "./llm";
import { getMenuEntries, type MenuEntry } from "../../components/Sidebar/menuIndex";

interface SuggestResponse {
  suggestions: { id: string; reason?: string }[];
}

export interface MenuSuggestion {
  entry: MenuEntry;
  reason?: string;
}

/**
 * Asks the LLM "did you mean ...?" when local fuzzy search misses. Returns
 * up to 5 ranked suggestions. Throws on any error — caller should swallow.
 */
export async function suggestMenuByLLM(
  query: string,
  signal?: AbortSignal,
): Promise<MenuSuggestion[]> {
  const all = getMenuEntries();
  // Keep the catalog compact so the prompt fits and stays fast.
  const catalog = all
    .filter((e) => e.label) // skip empties
    .map((e) => ({
      id: e.id,
      label: e.label,
      path: e.breadcrumb,
    }));

  const sys =
    "You match a Thai/English user query to menu items in a hospital information system. " +
    "Return up to 5 candidates ranked by semantic relevance — synonyms, abbreviations, common patient/staff phrasing, intent. " +
    "Only choose from the provided catalog. Respond with JSON: {\"suggestions\":[{\"id\":\"...\",\"reason\":\"<= 8 Thai words\"}]}. " +
    'If nothing is a reasonable match, return {"suggestions":[]}.';

  const user = JSON.stringify({ query, catalog });

  const json = await chatJSON<SuggestResponse>(
    [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    {
      temperature: 0.1,
      maxTokens: 400,
      signal,
      fast: true,
    },
  );

  const byId = new Map(all.map((e) => [e.id, e] as const));
  const out: MenuSuggestion[] = [];
  for (const s of json?.suggestions ?? []) {
    const entry = byId.get(s.id);
    if (entry) out.push({ entry, reason: s.reason });
    if (out.length >= 5) break;
  }
  return out;
}
