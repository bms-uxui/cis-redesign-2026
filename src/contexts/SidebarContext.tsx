import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

interface SidebarContextValue {
  /** Whether the wide panel is collapsed — rail-only when true. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
  /**
   * Whether the entire sidebar (rail + panel) is hidden. Persisted so the
   * user's choice survives reloads. Distinct from `collapsed` which only
   * hides the wide panel.
   */
  railHidden: boolean;
  toggleRailHiddenSidebar: () => void;
  /** Computed width (px) of the visible sidebar including the 16px gutter,
      so content can offset itself with `marginLeft: width + 16`. */
  width: number;

  /** Currently pinned rail panel ("" = none, sidebar collapsed). */
  pinnedRail: string;
  setPinnedRail: (key: string) => void;

  /** Currently selected child within the visible panel ("" = none). */
  activeChild: string;
  setActiveChild: (key: string) => void;

  /**
   * Programmatically open a panel and optionally select a child — used by
   * the command palette to teleport the user to a specific menu item.
   */
  openMenu: (railKey: string, childKey?: string) => void;

  /** Whether the global menu palette modal is open. */
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;

  /** Stack of recently-selected menu entries (id), most recent first. */
  recentMenus: string[];
  pushRecent: (id: string) => void;

  /** User-customized order of rail keys (full list including hidden). */
  railOrder: string[];
  /** Set of rail keys the user has hidden from the rail. */
  hiddenRails: Set<string>;
  setRailOrder: (order: string[]) => void;
  toggleRailHidden: (key: string) => void;
  resetRailCustomization: () => void;

  /**
   * Per-panel item customization. Key is the rail key; value holds the
   * user's preferred order of item keys (full list) and the set of items
   * they've hidden from that panel.
   */
  panelOrders: Record<string, string[]>;
  hiddenPanelItems: Record<string, Set<string>>;
  setPanelOrder: (railKey: string, order: string[]) => void;
  togglePanelItemHidden: (railKey: string, itemKey: string) => void;

  /** Whether the customize-sidebar modal is open. */
  customizeOpen: boolean;
  openCustomize: () => void;
  closeCustomize: () => void;
}

const RAIL_WIDTH = 74;
const PANEL_WIDTH = 264;
const SIDE_GUTTER = 16;

const RECENT_KEY = "ehp-cis.recent-menus.v1";
const RECENT_MAX = 8;
const CUSTOMIZE_KEY = "ehp-cis.sidebar-customize.v1";
const HIDDEN_KEY = "ehp-cis.sidebar-hidden.v1";

/**
 * Rails hidden from the sidebar on a fresh install. Users can still toggle
 * them back on via "จัดการเมนู" / customize modal. Only applied when there
 * is no saved customization yet — existing users keep their preferences.
 */
const DEFAULT_HIDDEN_RAILS = ["automation", "schedule"];

interface PersistedCustomize {
  order: string[];
  hidden: string[];
  panelOrders?: Record<string, string[]>;
  hiddenPanelItems?: Record<string, string[]>;
}

const SidebarCtx = createContext<SidebarContextValue | null>(null);

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function loadCustomize(): PersistedCustomize | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOMIZE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedCustomize>;
    return {
      order: Array.isArray(parsed.order) ? parsed.order : [],
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      panelOrders:
        parsed.panelOrders && typeof parsed.panelOrders === "object"
          ? parsed.panelOrders
          : {},
      hiddenPanelItems:
        parsed.hiddenPanelItems && typeof parsed.hiddenPanelItems === "object"
          ? parsed.hiddenPanelItems
          : {},
    };
  } catch {
    return null;
  }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Default to collapsed — app opens on Home (rail-only section). User
  // explicitly clicks a rail icon to expand a panel.
  const [collapsed, setCollapsed] = useState(true);
  const [railHidden, setRailHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [pinnedRail, setPinnedRailState] = useState("");
  const [activeChild, setActiveChildState] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [recentMenus, setRecentMenus] = useState<string[]>(() => loadRecent());
  const [railOrder, setRailOrderState] = useState<string[]>(
    () => loadCustomize()?.order ?? [],
  );
  const [hiddenRails, setHiddenRailsState] = useState<Set<string>>(() => {
    const saved = loadCustomize();
    // No saved customize blob yet → apply factory defaults so the rail
    // ships clean. Once the user touches customize and we persist, this
    // branch never runs again.
    if (!saved) return new Set(DEFAULT_HIDDEN_RAILS);
    return new Set(saved.hidden);
  });
  const [panelOrders, setPanelOrdersState] = useState<Record<string, string[]>>(
    () => loadCustomize()?.panelOrders ?? {},
  );
  const [hiddenPanelItems, setHiddenPanelItemsState] = useState<
    Record<string, Set<string>>
  >(() => {
    const raw = loadCustomize()?.hiddenPanelItems ?? {};
    const out: Record<string, Set<string>> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = new Set(v);
    return out;
  });

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  const toggleRailHiddenSidebar = useCallback(() => {
    setRailHidden((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(HIDDEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const setPinnedRail = useCallback((key: string) => {
    setPinnedRailState(key);
  }, []);

  const setActiveChild = useCallback((key: string) => {
    setActiveChildState(key);
  }, []);

  const openMenu = useCallback((railKey: string, childKey?: string) => {
    setPinnedRailState(railKey);
    if (childKey !== undefined) setActiveChildState(childKey);
    setCollapsed(false);
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Persist recent menus — write whenever the list changes. Use a ref to
  // avoid the initial save (we just loaded them).
  const firstWrite = useRef(true);
  useEffect(() => {
    if (firstWrite.current) {
      firstWrite.current = false;
      return;
    }
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(recentMenus));
    } catch {
      /* ignore */
    }
  }, [recentMenus]);

  const pushRecent = useCallback((id: string) => {
    setRecentMenus((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)];
      return next.slice(0, RECENT_MAX);
    });
  }, []);

  // Persist customization. Rail order/hidden + per-panel order/hidden are
  // written together as one blob so reads are atomic.
  const firstCustomizeWrite = useRef(true);
  useEffect(() => {
    if (firstCustomizeWrite.current) {
      firstCustomizeWrite.current = false;
      return;
    }
    try {
      const hiddenPanelSerialized: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(hiddenPanelItems)) {
        hiddenPanelSerialized[k] = Array.from(v);
      }
      const payload: PersistedCustomize = {
        order: railOrder,
        hidden: Array.from(hiddenRails),
        panelOrders,
        hiddenPanelItems: hiddenPanelSerialized,
      };
      window.localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [railOrder, hiddenRails, panelOrders, hiddenPanelItems]);

  const setRailOrder = useCallback((order: string[]) => {
    setRailOrderState(order);
  }, []);

  const toggleRailHidden = useCallback((key: string) => {
    setHiddenRailsState((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const resetRailCustomization = useCallback(() => {
    setRailOrderState([]);
    setHiddenRailsState(new Set());
    setPanelOrdersState({});
    setHiddenPanelItemsState({});
  }, []);

  const setPanelOrder = useCallback((railKey: string, order: string[]) => {
    setPanelOrdersState((prev) => ({ ...prev, [railKey]: order }));
  }, []);

  const togglePanelItemHidden = useCallback(
    (railKey: string, itemKey: string) => {
      setHiddenPanelItemsState((prev) => {
        const next = { ...prev };
        const current = new Set(next[railKey] ?? []);
        if (current.has(itemKey)) current.delete(itemKey);
        else current.add(itemKey);
        next[railKey] = current;
        return next;
      });
    },
    [],
  );

  const openCustomize = useCallback(() => setCustomizeOpen(true), []);
  const closeCustomize = useCallback(() => setCustomizeOpen(false), []);

  const value = useMemo<SidebarContextValue>(() => {
    const width = railHidden
      ? 0
      : SIDE_GUTTER + RAIL_WIDTH + (collapsed ? 0 : PANEL_WIDTH);
    return {
      collapsed,
      toggleCollapsed,
      setCollapsed,
      railHidden,
      toggleRailHiddenSidebar,
      width,
      pinnedRail,
      setPinnedRail,
      activeChild,
      setActiveChild,
      openMenu,
      paletteOpen,
      openPalette,
      closePalette,
      recentMenus,
      pushRecent,
      railOrder,
      hiddenRails,
      setRailOrder,
      toggleRailHidden,
      resetRailCustomization,
      panelOrders,
      hiddenPanelItems,
      setPanelOrder,
      togglePanelItemHidden,
      customizeOpen,
      openCustomize,
      closeCustomize,
    };
  }, [
    collapsed,
    toggleCollapsed,
    railHidden,
    toggleRailHiddenSidebar,
    pinnedRail,
    setPinnedRail,
    activeChild,
    setActiveChild,
    openMenu,
    paletteOpen,
    openPalette,
    closePalette,
    recentMenus,
    pushRecent,
    railOrder,
    hiddenRails,
    setRailOrder,
    toggleRailHidden,
    resetRailCustomization,
    panelOrders,
    hiddenPanelItems,
    setPanelOrder,
    togglePanelItemHidden,
    customizeOpen,
    openCustomize,
    closeCustomize,
  ]);

  return <SidebarCtx.Provider value={value}>{children}</SidebarCtx.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarCtx);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return ctx;
}

export const SIDEBAR_RAIL_WIDTH = RAIL_WIDTH;
export const SIDEBAR_PANEL_WIDTH = PANEL_WIDTH;
export const SIDEBAR_GUTTER = SIDE_GUTTER;
