import type { IconHome } from "@tabler/icons-react";

// Tabler doesn't export a shared Icon type publicly; mirror what the rest of
// the codebase does and key off any concrete icon's type.
type TablerIcon = typeof IconHome;

export interface PanelChild {
  key: string;
  label: string;
}

export interface PanelItem {
  key: string;
  label: string;
  Icon: TablerIcon;
  children?: PanelChild[];
}

export interface PanelDef {
  title: string;
  items: PanelItem[];
}

export interface RailEntry {
  key: string;
  Icon: TablerIcon;
  label: string;
  /** When omitted the rail item is "rail-only" — clicking just highlights. */
  panel?: PanelDef;
  /** Set when the rail item navigates via react-router (e.g. Home). */
  navigateTo?: string;
}

export interface RailGroup {
  items: RailEntry[];
}
