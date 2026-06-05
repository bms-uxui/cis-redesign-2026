import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { flushSync } from "react-dom";
import type { ReactNode } from "react";

/**
 * daisyUI-style theme system — every theme is a complete, self-contained
 * color set. There's no separate "mode" toggle: picking the "Dark" preset
 * IS dark mode. The provider writes every token to `:root` as a CSS
 * variable so any rule can pick it up with `var(--theme-primary)` etc.
 */

const STORAGE_KEY = "ehp-cis.theme.v4";

export type ColorToken =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "base"
  | "surface"
  | "info"
  | "success"
  | "warning"
  | "error";

export const COLOR_TOKENS: ColorToken[] = [
  "primary",
  "secondary",
  "accent",
  "neutral",
  "base",
  "surface",
  "info",
  "success",
  "warning",
  "error",
];

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  base: string;
  surface: string;
  info: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeRadius {
  box: number;
  field: number;
  selector: number;
}

/**
 * Spacing scale (px). Named by size, not role — `sm` is small spacing
 * regardless of where it's used. Components compose: `var(--theme-space-md)`
 * for card padding, `var(--theme-space-lg)` for section gap, etc.
 */
export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export const SPACING_KEYS: (keyof ThemeSpacing)[] = ["xs", "sm", "md", "lg", "xl"];

/** Type scale (px). `md` is body copy; the rest fan out around it. */
export interface ThemeText {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  "2xl": number;
}

export const TEXT_KEYS: (keyof ThemeText)[] = ["xs", "sm", "md", "lg", "xl", "2xl"];

/**
 * Shadow scale — three elevation levels. Each level is described by blur
 * and opacity; the y-offset is derived (half the blur) so a single slider
 * pair gives a believable elevation without a CSS string editor.
 */
export interface ThemeShadowLevel {
  blur: number;
  opacity: number;
}

export interface ThemeShadow {
  /** Resting cards / panels. */
  sm: ThemeShadowLevel;
  /** Popovers, dropdowns. */
  md: ThemeShadowLevel;
  /** Modals, full overlays. */
  lg: ThemeShadowLevel;
}

export const SHADOW_KEYS: (keyof ThemeShadow)[] = ["sm", "md", "lg"];

export interface ThemeConfig {
  /** id of the active preset (when the user hasn't customised away from one). */
  presetId: string;
  colors: ThemeColors;
  radius: ThemeRadius;
  spacing: ThemeSpacing;
  text: ThemeText;
  shadow: ThemeShadow;
}

export interface ThemePreset {
  id: string;
  name: string;
  colors: ThemeColors;
  radius: ThemeRadius;
  spacing: ThemeSpacing;
  text: ThemeText;
  shadow: ThemeShadow;
}

const DEFAULT_TEXT: ThemeText = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, "2xl": 28 };
const DEFAULT_SHADOW: ThemeShadow = {
  sm: { blur: 4, opacity: 0.06 },
  md: { blur: 16, opacity: 0.12 },
  lg: { blur: 40, opacity: 0.18 },
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "bms",
    name: "Default",
    colors: {
      primary: "#3485ff",
      secondary: "#8b5cf6",
      accent: "#f97316",
      neutral: "#1f1f1f",
      base: "#f4f4f4",
      surface: "#ffffff",
      info: "#0ea5e9",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
    },
    radius: { box: 16, field: 12, selector: 8 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    text: { ...DEFAULT_TEXT },
    shadow: { sm: { ...DEFAULT_SHADOW.sm }, md: { ...DEFAULT_SHADOW.md }, lg: { ...DEFAULT_SHADOW.lg } },
  },
  {
    id: "dark",
    name: "Dark",
    // daisyUI's default dark vocabulary — vivid indigo on slate.
    colors: {
      primary: "#605dff",
      secondary: "#ff52a2",
      accent: "#00cdb5",
      neutral: "#e5e7eb",
      base: "#181b21",
      surface: "#1d232a",
      info: "#00b5ff",
      success: "#00cc8c",
      warning: "#ffbf00",
      error: "#ff6467",
    },
    radius: { box: 16, field: 12, selector: 8 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    text: { ...DEFAULT_TEXT },
    shadow: { sm: { ...DEFAULT_SHADOW.sm }, md: { ...DEFAULT_SHADOW.md }, lg: { ...DEFAULT_SHADOW.lg } },
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: {
      primary: "#f97316",
      secondary: "#ec4899",
      accent: "#facc15",
      neutral: "#3f3f46",
      base: "#fff7ed",
      surface: "#ffffff",
      info: "#7c3aed",
      success: "#65a30d",
      warning: "#f59e0b",
      error: "#dc2626",
    },
    radius: { box: 24, field: 16, selector: 8 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    text: { ...DEFAULT_TEXT },
    shadow: { sm: { ...DEFAULT_SHADOW.sm }, md: { ...DEFAULT_SHADOW.md }, lg: { ...DEFAULT_SHADOW.lg } },
  },
  {
    id: "forest",
    name: "Forest",
    colors: {
      primary: "#16a34a",
      secondary: "#0d9488",
      accent: "#eab308",
      neutral: "#1f2937",
      base: "#f7faf6",
      surface: "#ffffff",
      info: "#0284c7",
      success: "#10b981",
      warning: "#d97706",
      error: "#dc2626",
    },
    radius: { box: 12, field: 10, selector: 6 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    text: { ...DEFAULT_TEXT },
    shadow: { sm: { ...DEFAULT_SHADOW.sm }, md: { ...DEFAULT_SHADOW.md }, lg: { ...DEFAULT_SHADOW.lg } },
  },
  {
    id: "lavender",
    name: "Lavender",
    colors: {
      primary: "#8b5cf6",
      secondary: "#ec4899",
      accent: "#06b6d4",
      neutral: "#27272a",
      base: "#faf5ff",
      surface: "#ffffff",
      info: "#3b82f6",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
    },
    radius: { box: 20, field: 14, selector: 10 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    text: { ...DEFAULT_TEXT },
    shadow: { sm: { ...DEFAULT_SHADOW.sm }, md: { ...DEFAULT_SHADOW.md }, lg: { ...DEFAULT_SHADOW.lg } },
  },
  {
    id: "mono",
    name: "Mono",
    colors: {
      primary: "#1f1f1f",
      secondary: "#525252",
      accent: "#737373",
      neutral: "#262626",
      base: "#fafafa",
      surface: "#ffffff",
      info: "#404040",
      success: "#2c2c2c",
      warning: "#525252",
      error: "#171717",
    },
    radius: { box: 4, field: 4, selector: 4 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    text: { ...DEFAULT_TEXT },
    shadow: { sm: { ...DEFAULT_SHADOW.sm }, md: { ...DEFAULT_SHADOW.md }, lg: { ...DEFAULT_SHADOW.lg } },
  },
];

const DEFAULT_PRESET = THEME_PRESETS[0];

function clonePreset(p: ThemePreset): ThemeConfig {
  return {
    presetId: p.id,
    colors: { ...p.colors },
    radius: { ...p.radius },
    spacing: { ...p.spacing },
    text: { ...p.text },
    shadow: {
      sm: { ...p.shadow.sm },
      md: { ...p.shadow.md },
      lg: { ...p.shadow.lg },
    },
  };
}

const DEFAULT_CONFIG: ThemeConfig = clonePreset(DEFAULT_PRESET);

interface ThemeContextValue {
  /** Live draft — every edit goes here, CSS variables follow this. */
  config: ThemeConfig;
  /** Last-committed (persisted) config. */
  appliedConfig: ThemeConfig;
  /** Convenience — active colors from the draft. */
  colors: ThemeColors;
  /** Primary hex shortcut (from the draft). */
  primary: string;
  /** True when draft differs from applied. */
  isDirty: boolean;
  setPrimary: (hex: string) => void;
  setColor: (token: ColorToken, hex: string) => void;
  setRadius: (key: keyof ThemeRadius, value: number) => void;
  setSpacing: (key: keyof ThemeSpacing, value: number) => void;
  setText: (key: keyof ThemeText, value: number) => void;
  setShadow: (
    key: keyof ThemeShadow,
    field: keyof ThemeShadowLevel,
    value: number,
  ) => void;
  /** `origin` is the {x,y} screen coordinate the reveal animation expands from. */
  applyPreset: (presetId: string, origin?: { x: number; y: number }) => void;
  resetToDefault: (origin?: { x: number; y: number }) => void;
  /** Persist the draft — call from the page save bar. */
  commit: () => void;
  /** Discard the draft, revert preview to applied. */
  discard: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isValidHex(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}

function expandHex(hex: string): string {
  const h = hex.trim();
  if (h.length === 4) return "#" + [h[1], h[2], h[3]].map((c) => c + c).join("");
  return h;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const full = expandHex(hex).replace("#", "");
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function contentColorFor(hex: string): string {
  return luminance(hex) > 0.6 ? "#1f1f1f" : "#ffffff";
}

/** A theme is "dark" when its base canvas is darker than 50% luminance. */
function isDarkConfig(colors: ThemeColors): boolean {
  return luminance(colors.base) < 0.5;
}

function applyConfigToDocument(config: ThemeConfig) {
  const root = document.documentElement;
  const { colors } = config;

  (Object.keys(colors) as ColorToken[]).forEach((token) => {
    const hex = colors[token];
    const { r, g, b } = hexToRgb(hex);
    root.style.setProperty(`--theme-${token}`, hex);
    root.style.setProperty(`--theme-${token}-rgb`, `${r}, ${g}, ${b}`);
    root.style.setProperty(
      `--theme-${token}-soft`,
      `rgba(${r}, ${g}, ${b}, 0.12)`,
    );
    root.style.setProperty(
      `--theme-${token}-glow`,
      `rgba(${r}, ${g}, ${b}, 0.4)`,
    );
    root.style.setProperty(`--theme-${token}-content`, contentColorFor(hex));
  });

  root.style.setProperty("--theme-radius-box", `${config.radius.box}px`);
  root.style.setProperty("--theme-radius-field", `${config.radius.field}px`);
  root.style.setProperty(
    "--theme-radius-selector",
    `${config.radius.selector}px`,
  );

  SPACING_KEYS.forEach((key) => {
    root.style.setProperty(`--theme-space-${key}`, `${config.spacing[key]}px`);
  });

  TEXT_KEYS.forEach((key) => {
    root.style.setProperty(`--theme-text-${key}`, `${config.text[key]}px`);
  });

  SHADOW_KEYS.forEach((key) => {
    const { blur, opacity } = config.shadow[key];
    const offset = Math.max(1, Math.round(blur / 2));
    root.style.setProperty(
      `--theme-shadow-${key}`,
      `0 ${offset}px ${blur}px rgba(0, 0, 0, ${opacity})`,
    );
  });

  // Let native widgets (scrollbars, form controls) follow the canvas brightness.
  const isDark = isDarkConfig(colors);
  root.style.colorScheme = isDark ? "dark" : "light";
  root.dataset.theme = config.presetId;
  root.dataset.mode = isDark ? "dark" : "light";
}

function loadConfig(): ThemeConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
    const parsedShadow = parsed.shadow ?? ({} as Partial<ThemeShadow>);
    return {
      presetId: parsed.presetId ?? DEFAULT_CONFIG.presetId,
      colors: { ...DEFAULT_CONFIG.colors, ...(parsed.colors ?? {}) },
      radius: { ...DEFAULT_CONFIG.radius, ...(parsed.radius ?? {}) },
      spacing: { ...DEFAULT_CONFIG.spacing, ...(parsed.spacing ?? {}) },
      text: { ...DEFAULT_CONFIG.text, ...(parsed.text ?? {}) },
      shadow: {
        sm: { ...DEFAULT_CONFIG.shadow.sm, ...(parsedShadow.sm ?? {}) },
        md: { ...DEFAULT_CONFIG.shadow.md, ...(parsedShadow.md ?? {}) },
        lg: { ...DEFAULT_CONFIG.shadow.lg, ...(parsedShadow.lg ?? {}) },
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(c: ThemeConfig) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

function configsEqual(a: ThemeConfig, b: ThemeConfig): boolean {
  if (a.presetId !== b.presetId) return false;
  for (const k of COLOR_TOKENS) {
    if (a.colors[k] !== b.colors[k]) return false;
  }
  if (
    a.radius.box !== b.radius.box ||
    a.radius.field !== b.radius.field ||
    a.radius.selector !== b.radius.selector
  ) {
    return false;
  }
  for (const k of SPACING_KEYS) {
    if (a.spacing[k] !== b.spacing[k]) return false;
  }
  for (const k of TEXT_KEYS) {
    if (a.text[k] !== b.text[k]) return false;
  }
  for (const k of SHADOW_KEYS) {
    if (a.shadow[k].blur !== b.shadow[k].blur) return false;
    if (a.shadow[k].opacity !== b.shadow[k].opacity) return false;
  }
  return true;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // `applied` is the persisted theme; `draft` is the user's in-progress edits.
  // Document CSS variables follow `draft` so changes are previewed live, but
  // localStorage only persists `applied` (committed via `commit()`).
  const [applied, setApplied] = useState<ThemeConfig>(() => loadConfig());
  const [draft, setDraft] = useState<ThemeConfig>(applied);

  useEffect(() => {
    applyConfigToDocument(draft);
  }, [draft]);

  useEffect(() => {
    saveConfig(applied);
  }, [applied]);

  const setColor = useCallback<ThemeContextValue["setColor"]>((token, hex) => {
    if (!isValidHex(hex)) return;
    const normalized = expandHex(hex).toLowerCase();
    setDraft((c) => ({
      ...c,
      presetId: "custom",
      colors: { ...c.colors, [token]: normalized },
    }));
  }, []);

  const setPrimary = useCallback<ThemeContextValue["setPrimary"]>(
    (hex) => setColor("primary", hex),
    [setColor],
  );

  const setRadius = useCallback<ThemeContextValue["setRadius"]>(
    (key, value) => {
      const clamped = Math.max(0, Math.min(48, Math.round(value)));
      setDraft((c) => ({
        ...c,
        presetId: "custom",
        radius: { ...c.radius, [key]: clamped },
      }));
    },
    [],
  );

  const setSpacing = useCallback<ThemeContextValue["setSpacing"]>(
    (key, value) => {
      const clamped = Math.max(0, Math.min(64, Math.round(value)));
      setDraft((c) => ({
        ...c,
        presetId: "custom",
        spacing: { ...c.spacing, [key]: clamped },
      }));
    },
    [],
  );

  const setText = useCallback<ThemeContextValue["setText"]>((key, value) => {
    const clamped = Math.max(8, Math.min(48, Math.round(value)));
    setDraft((c) => ({
      ...c,
      presetId: "custom",
      text: { ...c.text, [key]: clamped },
    }));
  }, []);

  const setShadow = useCallback<ThemeContextValue["setShadow"]>(
    (key, field, value) => {
      const clamped =
        field === "opacity"
          ? Math.max(0, Math.min(1, Number(value.toFixed(2))))
          : Math.max(0, Math.min(80, Math.round(value)));
      setDraft((c) => ({
        ...c,
        presetId: "custom",
        shadow: {
          ...c.shadow,
          [key]: { ...c.shadow[key], [field]: clamped },
        },
      }));
    },
    [],
  );

  // Whole-page transitions for preset swaps use the View Transitions API:
  // the browser snapshots the page, applies the new theme synchronously,
  // then a CSS clip-path reveal expands a circle out from the click point
  // (see index.css). Falls back to a plain setState when the API or
  // motion-prefs say no.
  const transitionSetDraft = useCallback(
    (next: ThemeConfig, origin?: { x: number; y: number }) => {
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => unknown;
      };
      if (reduce || typeof doc.startViewTransition !== "function") {
        setDraft(next);
        return;
      }
      const root = document.documentElement;
      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? window.innerHeight / 2;
      // The reveal radius needs to cover the farthest corner from the
      // origin or the circle finishes before the edge does.
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );
      root.style.setProperty("--theme-reveal-x", `${x}px`);
      root.style.setProperty("--theme-reveal-y", `${y}px`);
      root.style.setProperty("--theme-reveal-r", `${maxRadius}px`);
      doc.startViewTransition(() => {
        flushSync(() => setDraft(next));
      });
    },
    [],
  );

  const applyPreset = useCallback<ThemeContextValue["applyPreset"]>(
    (id, origin) => {
      const preset = THEME_PRESETS.find((p) => p.id === id);
      if (!preset) return;
      transitionSetDraft(clonePreset(preset), origin);
    },
    [transitionSetDraft],
  );

  const resetToDefault = useCallback<ThemeContextValue["resetToDefault"]>(
    (origin) => {
      transitionSetDraft(clonePreset(DEFAULT_PRESET), origin);
    },
    [transitionSetDraft],
  );

  const commit = useCallback(() => {
    setApplied(draft);
  }, [draft]);

  const discard = useCallback(() => {
    setDraft(applied);
  }, [applied]);

  const isDirty = !configsEqual(applied, draft);

  const value = useMemo<ThemeContextValue>(
    () => ({
      config: draft,
      appliedConfig: applied,
      colors: draft.colors,
      primary: draft.colors.primary,
      isDirty,
      setPrimary,
      setColor,
      setRadius,
      setSpacing,
      setText,
      setShadow,
      applyPreset,
      resetToDefault,
      commit,
      discard,
    }),
    [
      draft,
      applied,
      isDirty,
      setPrimary,
      setColor,
      setRadius,
      setSpacing,
      setText,
      setShadow,
      applyPreset,
      resetToDefault,
      commit,
      discard,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
