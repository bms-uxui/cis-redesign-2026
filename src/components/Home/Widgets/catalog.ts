import { useEffect, useState } from "react";
import { listDashboards, getDashboard } from "../../Dashboards/store";
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
 * Subscribe to the saved-dashboards list. Refreshes on mount, on window
 * focus, and on cross-tab `storage` events so freshly created dashboards
 * appear without a full reload. No store-event bus exists yet, so this
 * is the cheapest correct hook we can build.
 */
export function useDashboards(): Dashboard[] {
  const [items, setItems] = useState<Dashboard[]>(() => listDashboards());

  useEffect(() => {
    const refresh = () => setItems(listDashboards());
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return items;
}

/** Default pinned dashboards for a brand-new user: first one in the seed. */
export function defaultPinnedIds(): string[] {
  const seeded = listDashboards();
  return seeded.length > 0 ? [seeded[0].id] : [];
}
