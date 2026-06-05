import type { IconHome } from "@tabler/icons-react";

// Tabler doesn't export a shared Icon type publicly; mirror what the rest of
// the codebase does and key off any concrete icon's type.
type TablerIcon = typeof IconHome;

export interface PanelChild {
  key: string;
  label: string;
  /** Extra search terms (synonyms, EN names, common misspellings). */
  aliases?: string[];
}

export interface PanelItem {
  key: string;
  label: string;
  Icon: TablerIcon;
  children?: PanelChild[];
  /** When set, clicking the item opens this route in a new/existing tab. */
  navigateTo?: string;
  /** Extra search terms (synonyms, EN names, common misspellings). */
  aliases?: string[];
}

/**
 * A group of menu items inside a panel. `label` renders as a quiet
 * uppercase section header above the items; omit it for ungrouped
 * panels (the items just render flush).
 */
export interface PanelGroup {
  label?: string;
  items: PanelItem[];
}

export interface PanelDef {
  title: string;
  groups: PanelGroup[];
}

export interface RailEntry {
  key: string;
  /**
   * Raw SVG markup (Figma-exported via Vite `?raw`). Inlined so its strokes
   * — which use `currentColor` — inherit the rail button's text color.
   * Provide one of `iconSrc` or `Icon`.
   */
  iconSrc?: string;
  /** Fallback when no Figma export exists (e.g. composite-vector icons). */
  Icon?: TablerIcon;
  label: string;
  /** When omitted the rail item is "rail-only" — clicking just highlights. */
  panel?: PanelDef;
  /** Set when the rail item navigates via react-router (e.g. Home). */
  navigateTo?: string;
  /** Extra search terms (synonyms, EN names, common misspellings). */
  aliases?: string[];
}

export interface RailGroup {
  items: RailEntry[];
}
