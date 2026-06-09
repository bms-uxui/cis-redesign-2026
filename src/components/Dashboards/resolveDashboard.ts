/**
 * Resolver — passes a generator's A2UIDashboard through to the renderer.
 *
 * In the table-driven generator the LLM emits a complete A2UI tree with
 * inline values (no bindings to resolve), so this resolver is mostly a
 * pass-through. We still keep it as a single integration point so the host
 * stays unchanged if we add resolution work later (e.g. lazy chart data
 * fetch, server-side prefetch).
 *
 * Defensive: a final coercion pass converts list items to strings if the
 * LLM emits objects by mistake — that's the one render-crash class that
 * the A2UI renderer can't gracefully handle on its own.
 */
import type { A2UINode, A2UIResponse } from "../../services/a2ui/types";
import type { A2UIDashboard } from "./a2uiSchema";

export interface ResolvedDashboard extends A2UIResponse {
  name?: string;
  description?: string;
  prompt?: string;
}

export async function resolveDashboard(dash: A2UIDashboard): Promise<ResolvedDashboard> {
  const components = dash.components.map(coerceListItems);
  return {
    rootId: dash.rootId,
    components,
    data: dash.data,
    name: dash.name,
    description: dash.description,
    prompt: dash.prompt,
  };
}

function coerceListItems(node: A2UINode): A2UINode {
  if (node.type === "list" && Array.isArray(node.items)) {
    return {
      ...node,
      items: node.items.map((it) => (typeof it === "string" ? it : formatValue(it))),
    };
  }
  return node;
}

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
