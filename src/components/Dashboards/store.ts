import type { Dashboard } from "./types";

const KEY = "ehp-cis.dashboards.v1";

const SEED: Dashboard[] = [
  {
    id: "seed-opd-today",
    name: "ภาพรวม OPD วันนี้",
    description: "สรุปคิว, เวลารอ, no-show, และโรคที่พบบ่อย",
    prompt: "อยากดูสรุป OPD วันนี้ — จำนวนคิว, เวลารอเฉลี่ย, และ no-show พร้อมแยกตามคลินิก",
    generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    model: "mock-generator",
    widgets: [
      {
        id: "w1",
        kind: "kpi",
        title: "นัดวันนี้",
        source: "appointments.today",
        layout: { col: 1, row: 1, w: 1, h: 1 },
      },
      {
        id: "w2",
        kind: "kpi",
        title: "เวลารอเฉลี่ย",
        source: "appointments.today",
        metric: "avg_wait_time_min",
        layout: { col: 2, row: 1, w: 1, h: 1 },
      },
      {
        id: "w3",
        kind: "kpi",
        title: "ผลแลปผิดปกติ",
        source: "lab_results.recent",
        layout: { col: 3, row: 1, w: 1, h: 1 },
      },
      {
        id: "w4",
        kind: "kpi",
        title: "ผู้ป่วย active",
        source: "patients.active",
        layout: { col: 4, row: 1, w: 1, h: 1 },
      },
      {
        id: "w5",
        kind: "bar-chart",
        title: "นัดต่อคลินิก",
        source: "appointments.today",
        groupBy: "clinic",
        layout: { col: 1, row: 2, w: 2, h: 2 },
      },
      {
        id: "w6",
        kind: "line-chart",
        title: "คิวต่อชั่วโมง",
        source: "appointments.today",
        groupBy: "hour",
        layout: { col: 3, row: 2, w: 2, h: 2 },
      },
      {
        id: "w7",
        kind: "table",
        title: "ผู้ป่วย no-show",
        source: "no_show.list",
        layout: { col: 1, row: 4, w: 4, h: 2 },
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "seed-chronic",
    name: "ผู้ป่วยโรคเรื้อรัง",
    description: "สรุปกลุ่มโรคเรื้อรังและแนวโน้ม",
    prompt: "ขอภาพรวมผู้ป่วยโรคเรื้อรัง — แยกตามกลุ่มโรค และดูแนวโน้มย้อนหลัง 2 สัปดาห์",
    generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    model: "mock-generator",
    widgets: [
      {
        id: "w1",
        kind: "bar-chart",
        title: "ผู้ป่วยแยกตามกลุ่มโรค",
        source: "patients.active",
        groupBy: "diagnosis_group",
        layout: { col: 1, row: 1, w: 2, h: 2 },
      },
      {
        id: "w2",
        kind: "bar-chart",
        title: "ช่วงอายุ",
        source: "patients.active",
        groupBy: "age_band",
        layout: { col: 3, row: 1, w: 2, h: 2 },
      },
      {
        id: "w3",
        kind: "line-chart",
        title: "ปริมาณนัด 14 วัน",
        source: "appointments.trend",
        layout: { col: 1, row: 3, w: 4, h: 2 },
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];

// Cached snapshot + listeners so hooks re-render the instant a dashboard is
// saved/deleted in the SAME tab (localStorage's `storage` event only fires in
// OTHER tabs). `useSyncExternalStore` also needs a STABLE reference between
// renders, which the cache provides.
let cache: Dashboard[] | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): Dashboard[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      window.localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED;
  } catch {
    return SEED;
  }
}

function write(items: Dashboard[]) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

// Cross-tab edits → refresh the cache and notify local subscribers too.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key && e.key !== KEY) return;
    cache = readFromStorage();
    listeners.forEach((l) => l());
  });
}

export function subscribeDashboards(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listDashboards(): Dashboard[] {
  if (cache === null) cache = readFromStorage();
  return cache;
}
export function getDashboard(id: string): Dashboard | undefined {
  return listDashboards().find((d) => d.id === id);
}
export function saveDashboard(d: Dashboard) {
  const all = [...listDashboards()];
  const idx = all.findIndex((x) => x.id === d.id);
  const now = new Date().toISOString();
  const next = { ...d, updatedAt: now };
  if (idx >= 0) all[idx] = next;
  else all.unshift({ ...next, createdAt: now });
  write(all);
}
export function deleteDashboard(id: string) {
  write(listDashboards().filter((d) => d.id !== id));
}
