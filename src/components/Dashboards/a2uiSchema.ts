/**
 * Generative-dashboard schema — a thin extension of A2UIResponse.
 *
 * The LLM (in `a2uiGenerator.ts`) emits this tree fully populated with
 * literal values; there is no binding/placeholder system anymore. The
 * `bindings` field is retained as `unknown` purely so older payloads
 * don't break import — it's not read by the renderer.
 */
import type { A2UIResponse } from "../../services/a2ui/types";

export interface A2UIDashboard extends A2UIResponse {
  /** Deprecated — kept for backward-compat in stored dashboards. The
   *  table-driven generator emits inline values and leaves this empty. */
  bindings?: unknown;

  /** Dashboard-level metadata. */
  name?: string;
  description?: string;
  prompt?: string;
  generatedAt?: string;
  model?: string;
}
