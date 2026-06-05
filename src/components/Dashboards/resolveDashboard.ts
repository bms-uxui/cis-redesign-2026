/**
 * Resolver — turns an A2UI dashboard with bindings into a fully populated
 * A2UIResponse ready for the renderer.
 *
 * 1. Parallel-fetch every binding via the dashboard data API.
 * 2. Walk the component tree; for every string field that contains
 *    `{{$key.path}}` placeholders, substitute the resolved value.
 * 3. Transform chart components: when bars/series are empty and a binding
 *    is named via `{{$key}}` placeholder pattern in title hint or special
 *    fields, fill them from the source's `points` array.
 *
 * The renderer never fabricates — every chart point, every stat-card value
 * traces back to a DATA_SOURCES query.
 */
import type { A2UINode, A2UIResponse, A2UIPaletteTone } from "../../services/a2ui/types";
import type { DataSourceResult } from "./types";
import { resolveBindings as fetchAll } from "../../services/dashboardData";
import { BINDING_PATTERN, type A2UIDashboard } from "./a2uiSchema";

const PALETTE_CYCLE: A2UIPaletteTone[] = ["blue", "violet", "emerald", "amber", "rose", "indigo", "teal"];

export interface ResolvedDashboard extends A2UIResponse {
  /** Names + audit pass-through so the host UI can show them. */
  name?: string;
  description?: string;
  prompt?: string;
}

export async function resolveDashboard(dash: A2UIDashboard): Promise<ResolvedDashboard> {
  const bindingResults = dash.bindings ? await fetchAll(dash.bindings) : {};
  const resolved = dash.components.map((node) => substituteNode(node, bindingResults));
  return {
    rootId: dash.rootId,
    components: resolved,
    data: dash.data,
    name: dash.name,
    description: dash.description,
    prompt: dash.prompt,
  };
}

// ── String + array substitution ───────────────────────────────────────────

function substituteNode(node: A2UINode, results: Record<string, DataSourceResult>): A2UINode {
  // Chart nodes have arrays that need shape transformation, not just string
  // substitution — handle those explicitly first.
  if (node.type === "bar-chart" && node.bars.length === 0) {
    return inflateBarChart(node, results);
  }
  if (node.type === "line-chart" && node.series.length === 0) {
    return inflateLineChart(node, results);
  }
  // Generic deep substitution for every string field.
  const replaced = deepReplace(node, results) as A2UINode;
  // Defensive coercion: list items MUST be strings (A2UI schema), but the
  // LLM sometimes emits objects. Format them so the renderer doesn't crash.
  if (replaced.type === "list" && Array.isArray(replaced.items)) {
    return { ...replaced, items: replaced.items.map((it) => (typeof it === "string" ? it : formatValue(it))) };
  }
  return replaced;
}

function deepReplace(value: unknown, results: Record<string, DataSourceResult>): unknown {
  if (typeof value === "string") return substituteString(value, results);
  if (Array.isArray(value)) return value.map((v) => deepReplace(v, results));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepReplace(v, results);
    return out;
  }
  return value;
}

function substituteString(s: string, results: Record<string, DataSourceResult>): string {
  return s.replace(BINDING_PATTERN, (_, key: string, pathStr: string) => {
    const source = results[key];
    if (!source) return `?${key}`;
    const path = pathStr ? pathStr.slice(1).split(".") : [];
    const resolved = path.length ? walk(source as unknown, path) : pickPrimary(source);
    return formatValue(resolved);
  });
}

/** Stringify any resolved value safely — never return `[object Object]`
 *  back to the renderer. Objects become "key: val · key: val" so callers
 *  always get a printable string. */
function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(formatValue).join(", ");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${formatValue(val)}`)
      .join(" · ");
  }
  return String(v);
}

function walk(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const seg of path) {
    if (cur == null) return null;
    // Allow indexed access: points[0]
    const arrMatch = seg.match(/^([a-zA-Z0-9_]+)\[(\d+)\]$/);
    if (arrMatch) {
      const [, key, idx] = arrMatch;
      cur = (cur as Record<string, unknown>)[key];
      if (Array.isArray(cur)) cur = cur[Number(idx)];
      else return null;
    } else if (/^\d+$/.test(seg) && Array.isArray(cur)) {
      cur = cur[Number(seg)];
    } else {
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  return cur;
}

/** Default field to surface when a binding is referenced without a path —
 *  prefer KPI value, fall back to first table cell, else point label. */
function pickPrimary(source: DataSourceResult): string | number | null {
  if (source.kpi) return source.kpi.value;
  if (source.points && source.points.length) return source.points[0].value;
  if (source.rows && source.rows.length) return Object.values(source.rows[0])[0];
  return null;
}

// ── Chart inflation ───────────────────────────────────────────────────────
// LLM signals "fill these bars/series from binding $key" by leaving the
// arrays empty AND embedding the binding ref in the chart title, e.g.
//   { type: "bar-chart", title: "นัดต่อคลินิก {{$apptByClinic}}", bars: [] }
// We extract that ref, build the bars/series from the source's points, then
// strip the ref out of the title.

const TITLE_BINDING = /\{\{\$([a-zA-Z0-9_]+)\}\}/;

function inflateBarChart(
  node: Extract<A2UINode, { type: "bar-chart" }>,
  results: Record<string, DataSourceResult>,
): A2UINode {
  const match = node.title?.match(TITLE_BINDING);
  if (!match) return node;
  const key = match[1];
  const points = results[key]?.points ?? [];
  return {
    ...node,
    title: (node.title ?? "").replace(TITLE_BINDING, "").trim(),
    bars: points.map((p, i) => ({
      label: p.label,
      value: p.value,
      tone: PALETTE_CYCLE[i % PALETTE_CYCLE.length],
    })),
  };
}

function inflateLineChart(
  node: Extract<A2UINode, { type: "line-chart" }>,
  results: Record<string, DataSourceResult>,
): A2UINode {
  const match = node.title?.match(TITLE_BINDING);
  if (!match) return node;
  const key = match[1];
  const points = results[key]?.points ?? [];
  return {
    ...node,
    title: (node.title ?? "").replace(TITLE_BINDING, "").trim(),
    xLabels: points.map((p) => p.label),
    series: [
      {
        name: node.unit ?? "value",
        tone: "blue",
        values: points.map((p) => p.value),
      },
    ],
  };
}
