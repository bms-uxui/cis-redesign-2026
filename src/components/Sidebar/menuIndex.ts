import { RAIL_LIST } from "./config";

/**
 * A single searchable menu entry — flattened from the nested rail → panel →
 * group → item → child tree so the command palette can fuzzy-match across
 * the whole sidebar without caring about structure.
 */
export interface MenuEntry {
  id: string;
  label: string;
  railKey: string;
  railLabel: string;
  groupLabel?: string;
  parentLabel?: string;
  childKey: string;
  /** Lowercase blob: label + rail + group + parent + aliases. */
  haystack: string;
  /** Extra terms (synonyms, EN) — used by fuzzy match without polluting label. */
  aliases: string[];
  breadcrumb: string;
  /** Route to navigate to when this entry has no nested panel. */
  navigateTo?: string;
}

let cached: MenuEntry[] | null = null;

export function getMenuEntries(): MenuEntry[] {
  if (cached) return cached;
  const out: MenuEntry[] = [];
  for (const rail of RAIL_LIST) {
    const railAliases = rail.aliases ?? [];
    out.push({
      id: `${rail.key}`,
      label: rail.label,
      railKey: rail.key,
      railLabel: rail.label,
      childKey: "",
      breadcrumb: "",
      aliases: railAliases,
      haystack: [rail.label, ...railAliases].join(" ").toLowerCase(),
      navigateTo: rail.navigateTo,
    });
    if (!rail.panel) continue;
    for (const group of rail.panel.groups) {
      for (const item of group.items) {
        const itemId = `${rail.key}:${item.key}`;
        const itemAliases = item.aliases ?? [];
        const parts = [rail.label, group.label, item.label, ...itemAliases].filter(
          Boolean,
        ) as string[];
        out.push({
          id: itemId,
          label: item.label,
          railKey: rail.key,
          railLabel: rail.label,
          groupLabel: group.label,
          childKey: item.key,
          breadcrumb: [rail.label, group.label, item.label]
            .filter(Boolean)
            .slice(0, -1)
            .join(" → "),
          aliases: itemAliases,
          haystack: parts.join(" ").toLowerCase(),
          navigateTo: item.navigateTo,
        });
        if (item.children) {
          for (const child of item.children) {
            const childId = `${rail.key}:${item.key}/${child.key}`;
            const childAliases = child.aliases ?? [];
            const cparts = [
              rail.label,
              group.label,
              item.label,
              child.label,
              ...childAliases,
            ].filter(Boolean) as string[];
            out.push({
              id: childId,
              label: child.label,
              railKey: rail.key,
              railLabel: rail.label,
              groupLabel: group.label,
              parentLabel: item.label,
              childKey: child.key,
              breadcrumb: [rail.label, group.label, item.label]
                .filter(Boolean)
                .join(" → "),
              aliases: childAliases,
              haystack: cparts.join(" ").toLowerCase(),
            });
          }
        }
      }
    }
  }
  cached = out;
  return out;
}

/** Damerau-style Levenshtein (cap at maxDist to bail out cheap). */
function editDistance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1).fill(0).map((_, i) => i);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export interface SearchResult {
  entries: MenuEntry[];
  /** True when there's at least one strong (substring) hit. */
  hadStrongMatch: boolean;
}

/**
 * Returns substring matches first, then fuzzy (edit-distance) matches if
 * nothing strong hit. `hadStrongMatch` lets the palette decide whether to
 * fire an LLM "did you mean" call.
 */
export function searchMenuEntries(query: string): SearchResult {
  const q = query.trim().toLowerCase();
  if (!q) return { entries: [], hadStrongMatch: false };
  const all = getMenuEntries();

  const strong: { e: MenuEntry; score: number }[] = [];
  for (const e of all) {
    const label = e.label.toLowerCase();
    let score = 0;
    if (label.startsWith(q)) score = 3;
    else if (label.includes(q)) score = 2;
    else if (e.haystack.includes(q)) score = 1;
    if (score > 0) strong.push({ e, score });
  }
  if (strong.length > 0) {
    strong.sort((a, b) => b.score - a.score);
    return { entries: strong.map((x) => x.e), hadStrongMatch: true };
  }

  // Fuzzy fallback — only if query is alphabetic-ish & short enough that
  // edit distance is meaningful. Skip for very short queries (too noisy).
  if (q.length < 3) return { entries: [], hadStrongMatch: false };
  const maxDist = q.length <= 5 ? 1 : 2;
  const fuzzy: { e: MenuEntry; d: number }[] = [];
  for (const e of all) {
    // Compare against label + each alias; take the min distance.
    const candidates = [e.label.toLowerCase(), ...e.aliases.map((a) => a.toLowerCase())];
    let best = Infinity;
    for (const c of candidates) {
      // Compare against each whitespace-separated token in the candidate too,
      // so "labratory" matches "Laboratory" within "Workbench / Laboratory".
      const tokens = c.split(/\s+/);
      for (const t of tokens) {
        const d = editDistance(q, t, maxDist);
        if (d < best) best = d;
        if (best === 0) break;
      }
    }
    if (best <= maxDist) fuzzy.push({ e, d: best });
  }
  fuzzy.sort((a, b) => a.d - b.d);
  return { entries: fuzzy.map((x) => x.e), hadStrongMatch: false };
}
