import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface SidebarContextValue {
  /** Whether the wide panel is collapsed — rail-only when true. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
  /** Computed width (px) of the visible sidebar including the 16px gutter,
      so content can offset itself with `marginLeft: width + 16`. */
  width: number;
}

const RAIL_WIDTH = 74;
const PANEL_WIDTH = 309;
const SIDE_GUTTER = 16;

const SidebarCtx = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Default to collapsed — the app opens on the Home page, which is a
  // rail-only section. The user explicitly clicks Workbench / OPD / etc. to
  // expand the panel.
  const [collapsed, setCollapsed] = useState(true);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  const value = useMemo<SidebarContextValue>(() => {
    const width = SIDE_GUTTER + RAIL_WIDTH + (collapsed ? 0 : PANEL_WIDTH);
    return { collapsed, toggleCollapsed, setCollapsed, width };
  }, [collapsed, toggleCollapsed]);

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
