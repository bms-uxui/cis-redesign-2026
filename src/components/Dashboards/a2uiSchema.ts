/**
 * Generative-dashboard schema layered on top of A2UI.
 *
 * The LLM emits an `A2UIDashboard`:
 *   • `bindings`  — a map of binding-key → DataQuery (which source/metric to fetch).
 *   • `components` — standard A2UI nodes; any string field may contain
 *     placeholders like `{{$activeCount}}` or `{{$topClinic.points[0].label}}`.
 *   • `rootId`    — entry component id.
 *
 * The renderer resolves all bindings in parallel via `resolveBindings`,
 * substitutes placeholders, transforms chart-shaped sources into the
 * exact bars/series A2UI charts expect, then hands the tree to
 * `A2UIRenderer` for paint.
 *
 * Why bindings instead of inline values?
 *   • LLM cannot fabricate numbers — it can only point at a source id.
 *   • Future API moves don't need LLM changes; we just swap the resolver.
 */
import type { A2UIResponse } from "../../services/a2ui/types";
import type { DataQuery } from "../../services/dashboardData";

export interface A2UIDashboard extends A2UIResponse {
  /** Map of binding-key → query spec. Keys are referenced from component
   *  string values as `{{$key}}` or `{{$key.path.into.result}}`. */
  bindings?: Record<string, DataQuery>;

  /** Dashboard-level metadata. */
  name?: string;
  description?: string;
  prompt?: string;
  generatedAt?: string;
  model?: string;
}

/** Placeholder regex: matches `{{$key}}` and `{{$key.nested.path}}`. */
export const BINDING_PATTERN = /\{\{\$([a-zA-Z0-9_]+)((?:\.[a-zA-Z0-9_[\]]+)*)\}\}/g;
