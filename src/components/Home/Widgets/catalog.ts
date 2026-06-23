import { useSyncExternalStore } from "react";
import { listDashboards, getDashboard, subscribeDashboards } from "../../Dashboards/store";
import type { Dashboard } from "../../Dashboards/types";

/**
 * Home widgets are pinned views of saved generative dashboards. The
 * "catalog" the Add Widgets modal shows is therefore dynamic — it's just
 * the list of dashboards the user has saved via /dashboards.
 */

/** Read once. Components should call `useDashboards()` to stay in sync. */
export function getDashboardOptions(): Dashboard[] {
  return listDashboards();
}

export { getDashboard };

/**
 * Subscribe to the saved-dashboards list. The store notifies on every
 * save/delete (same tab) and on cross-tab `storage` events, so a freshly
 * generated dashboard appears in the pin picker immediately — no reload.
 */
export function useDashboards(): Dashboard[] {
  return useSyncExternalStore(subscribeDashboards, listDashboards, listDashboards);
}

/** Default pinned dashboards for a brand-new user: first one in the seed. */
export function defaultPinnedIds(): string[] {
  const seeded = listDashboards();
  return seeded.length > 0 ? [seeded[0].id] : [];
}
