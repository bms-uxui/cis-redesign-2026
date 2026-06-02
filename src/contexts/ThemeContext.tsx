import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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

export interface ThemeConfig {
  /** id of the active preset (when the user hasn't customised away from one). */
  presetId: string;
  colors: ThemeColors;
  radius: ThemeRadius;
}

export interface ThemePreset {
  id: string;
  name: string;
  colors: ThemeColors;
  radius: ThemeRadius;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "bms",
    name: "BMS Default",
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
  },
];

const DEFAULT_PRESET = THEME_PRESETS[0];

const DEFAULT_CONFIG: ThemeConfig = {
  presetId: DEFAULT_PRESET.id,
  colors: { ...DEFAULT_PRESET.colors },
  radius: { ...DEFAULT_PRESET.radius },
};

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
  applyPreset: (presetId: string) => void;
  resetToDefault: () => void;
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
    return {
      presetId: parsed.presetId ?? DEFAULT_CONFIG.presetId,
      colors: { ...DEFAULT_CONFIG.colors, ...(parsed.colors ?? {}) },
      radius: { ...DEFAULT_CONFIG.radius, ...(parsed.radius ?? {}) },
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
  return (
    a.radius.box === b.radius.box &&
    a.radius.field === b.radius.field &&
    a.radius.selector === b.radius.selector
  );
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

  const applyPreset = useCallback<ThemeContextValue["applyPreset"]>((id) => {
    const preset = THEME_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setDraft({
      presetId: preset.id,
      colors: { ...preset.colors },
      radius: { ...preset.radius },
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setDraft({
      presetId: DEFAULT_PRESET.id,
      colors: { ...DEFAULT_PRESET.colors },
      radius: { ...DEFAULT_PRESET.radius },
    });
  }, []);

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
