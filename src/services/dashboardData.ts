/**
 * Data API for generative dashboards. Currently in-process — wraps the
 * local `queryDataSource` aggregator — but the signature is async + cache-
 * keyed so we can swap to a real HTTP endpoint later without touching the
 * Dashboard renderer.
 *
 * Future migration:
 *   1. Replace the body of `fetchDataSource` with a `fetch('/api/dashboard/data?...')`
 *   2. Move queryDataSource() to a Supabase Edge Function or backend service
 *   3. Keep the cache layer here for client-side memoization
 *
 * Contract: API responses match `DataSourceResult` from Dashboards/types.ts.
 * The LLM is told the same shape via the catalog, so the renderer always
 * receives well-known structures.
 */
import { queryDataSource } from "../components/Dashboards/catalog";
import type { DataSourceResult } from "../components/Dashboards/types";

export interface DataQuery {
  source: string;
  groupBy?: string;
  metric?: string;
  filters?: Record<string, string | number | boolean>;
}

const cache = new Map<string, Promise<DataSourceResult>>();

/** Single source fetch. Async signature so callers don't change when the
 *  underlying implementation moves to HTTP. Cached per query JSON. */
export async function fetchDataSource(q: DataQuery): Promise<DataSourceResult> {
  const key = JSON.stringify(q);
  let inflight = cache.get(key);
  if (!inflight) {
    inflight = doFetch(q);
    cache.set(key, inflight);
  }
  return inflight;
}

async function doFetch(q: DataQuery): Promise<DataSourceResult> {
  // In-process today. The 0-delay microtask keeps the contract honestly
  // async so dev/prod behave identically when this becomes a real fetch.
  await Promise.resolve();
  return queryDataSource(q.source, {
    groupBy: q.groupBy,
    metric: q.metric,
    filters: q.filters,
  });
}

/** Parallel-fetch every binding in a map. Used by the dashboard resolver
 *  to populate the LLM's tree in a single round-trip. */
export async function resolveBindings(
  bindings: Record<string, DataQuery>,
): Promise<Record<string, DataSourceResult>> {
  const keys = Object.keys(bindings);
  const results = await Promise.all(keys.map((k) => fetchDataSource(bindings[k])));
  const out: Record<string, DataSourceResult> = {};
  keys.forEach((k, i) => (out[k] = results[i]));
  return out;
}

/** Drop everything in the cache — call on signed-out user, env change, etc. */
export function clearDashboardDataCache(): void {
  cache.clear();
}
