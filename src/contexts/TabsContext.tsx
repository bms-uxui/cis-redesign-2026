import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router";

/**
 * Each tab owns a URL path. The active tab's path is mirrored to the browser
 * URL; inactive tabs keep their last path so their mounted component tree
 * (and any state inside it) survives a tab switch — that's the multi-tasking
 * guarantee.
 */
export interface Tab {
  id: string;
  title: string;
  path: string;
  /** false for the pinned Home tab — it can't be closed. */
  closable: boolean;
  /** Optional icon hint for the tab strip; "home" gets a special render. */
  iconKind?: "home" | "schedule";
}

interface TabsContextValue {
  tabs: Tab[];
  activeId: string;
  /** Open a path in a new tab and activate it. Returns the new tab id. */
  openTab: (
    path: string,
    opts?: { title?: string; activate?: boolean; forceNew?: boolean },
  ) => string;
  closeTab: (id: string) => void;
  activateTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const HOME_TAB_ID = "home";
const SCHEDULE_TAB_ID = "schedule";

const HOME_TAB: Tab = {
  id: HOME_TAB_ID,
  title: "หน้าหลัก",
  path: "/",
  closable: false,
  iconKind: "home",
};

// Doctor schedule is pinned alongside Home — always one click away.
const SCHEDULE_TAB: Tab = {
  id: SCHEDULE_TAB_ID,
  title: "ตารางเวร",
  path: "/schedule",
  closable: false,
  iconKind: "schedule",
};

/** Maps a path to a default tab title. Components can override via openTab. */
function titleForPath(path: string): string {
  const p = path.split("?")[0];
  if (p === "/") return "หน้าหลัก";
  if (p === "/schedule") return "ตารางเวร";
  if (p === "/soap") return "บันทึก SOAP";
  if (p === "/menus") return "เมนูทั้งหมด";
  if (p === "/settings") return "การตั้งค่า";
  if (p === "/opd/register") return "ทะเบียนผู้ป่วย";
  if (p === "/patient/new" || p === "/patient/new/manual") return "ลงทะเบียนผู้ป่วยใหม่";
  if (p.startsWith("/patient")) return "บันทึกประวัติ";
  return "หน้าใหม่";
}

let tabSeq = 0;
const newTabId = () => `t${Date.now().toString(36)}${(tabSeq++).toString(36)}`;

export function TabsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();

  const [tabs, setTabs] = useState<Tab[]>([HOME_TAB, SCHEDULE_TAB]);
  const [activeId, setActiveId] = useState<string>(HOME_TAB_ID);

  // Track the active tab in a ref so the URL-sync effect always sees the
  // latest value, even on the same tick we flip it. Without this, opening a
  // new tab can race: activeId updates before location does, and the effect
  // overwrites the new tab's freshly-set title with the *old* URL's title.
  const activeIdRef = useRef<string>(HOME_TAB_ID);
  const setActive = useCallback((id: string) => {
    activeIdRef.current = id;
    setActiveId(id);
  }, []);

  // Mirror of `tabs` state — used by callbacks that need the latest list
  // without re-creating themselves whenever the array changes (e.g.
  // openTab's dedup check).
  const tabsRef = useRef<Tab[]>(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  // Mirror URL → active tab. Only listens for *user* navigations within a
  // tab (link clicks, back/forward). Our own openTab/activateTab/closeTab
  // bump lastSyncedPath before calling navigate() so this effect no-ops.
  const lastSyncedPath = useRef<string>("/");
  // URLs that belonged to a tab that's been closed. If the browser back/
  // forward lands on one of these, treat the entry as dead and redirect to
  // the active tab so the user doesn't see a ghost of the closed tab.
  const orphanPaths = useRef<Set<string>>(new Set());
  useEffect(() => {
    const fullPath = location.pathname + location.search;
    if (fullPath === lastSyncedPath.current) return;

    // Browser back/forward landed on a URL whose tab was closed → bounce
    // back to the active tab's stored path, overwriting the dead entry.
    if (navType === "POP" && orphanPaths.current.has(fullPath)) {
      const home = HOME_TAB.path;
      // Walk up to the currently-active tab's path. Replace so the dead
      // entry is gone from history.
      lastSyncedPath.current = home;
      navigate(home, { replace: true });
      return;
    }

    lastSyncedPath.current = fullPath;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeIdRef.current
          ? { ...t, path: fullPath, title: t.iconKind === "home" ? t.title : titleForPath(fullPath) }
          : t,
      ),
    );
  }, [location.pathname, location.search, navType, navigate]);

  const openTab = useCallback<TabsContextValue["openTab"]>(
    (path, opts) => {
      // Dedup: if a tab with this exact path is already open, activate it
      // rather than creating a second instance. Keeps the strip tidy and
      // avoids splitting per-tab state across duplicate mounts. `forceNew`
      // opts out — always spawns a fresh tab (e.g. "ลงทะเบียนทั่วไป" should
      // open its own header even if an OPD tab is already open).
      const existing = opts?.forceNew
        ? undefined
        : tabsRef.current.find((t) => t.path === path);
      if (existing) {
        if (opts?.activate !== false && existing.id !== activeIdRef.current) {
          setActive(existing.id);
          lastSyncedPath.current = existing.path;
          navigate(existing.path);
        }
        return existing.id;
      }

      const id = newTabId();
      const tab: Tab = {
        id,
        title: opts?.title ?? titleForPath(path),
        path,
        closable: true,
      };
      // Re-opening a previously-closed path means it's no longer an orphan.
      orphanPaths.current.delete(path);
      setTabs((prev) => [...prev, tab]);
      if (opts?.activate !== false) {
        setActive(id);
        lastSyncedPath.current = path;
        navigate(path);
      }
      return id;
    },
    [navigate, setActive],
  );

  const activateTab = useCallback<TabsContextValue["activateTab"]>(
    (id) => {
      setTabs((prev) => {
        const target = prev.find((t) => t.id === id);
        if (!target) return prev;
        if (id !== activeIdRef.current) {
          setActive(id);
          if (target.path !== location.pathname + location.search) {
            lastSyncedPath.current = target.path;
            navigate(target.path);
          }
        }
        return prev;
      });
    },
    [location.pathname, location.search, navigate, setActive],
  );

  const closeTab = useCallback<TabsContextValue["closeTab"]>(
    (id) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        if (idx === -1) return prev;
        const closing = prev[idx];
        if (!closing.closable) return prev;
        // Remember the closing tab's path as an orphan so back/forward
        // navigations that land on it can be skipped instead of resurrecting
        // a tab that no longer exists.
        orphanPaths.current.add(closing.path);

        const next = prev.filter((t) => t.id !== id);
        if (id === activeIdRef.current) {
          // Activate the neighbour (prefer the one to the left).
          const fallback = next[idx - 1] ?? next[idx] ?? next[0];
          if (fallback) {
            setActive(fallback.id);
            lastSyncedPath.current = fallback.path;
            // Replace, not push, so the closed tab's URL is overwritten in
            // the browser history — pressing back won't bring it back.
            navigate(fallback.path, { replace: true });
          }
        }
        return next;
      });
    },
    [navigate, setActive],
  );

  const value = useMemo<TabsContextValue>(
    () => ({ tabs, activeId, openTab, closeTab, activateTab }),
    [tabs, activeId, openTab, closeTab, activateTab],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("useTabs must be used inside <TabsProvider>");
  return ctx;
}
