/** App-wide font-family setting. The chosen font's CSS stack is written to the
 *  `--app-font` custom property on <html>; index.css references that var (with
 *  the Sukhumvit stack as the built-in fallback) so every element follows it.
 *  Persisted inside the same Settings prefs blob as the other preferences. */

import { PREFS_KEY } from "./ttsPrefs";

export interface FontOption {
  id: string;
  label: string;
  /** full CSS font-family stack — always ends with Thai + generic fallbacks */
  stack: string;
}

const THAI_FALLBACK = `"Sukhumvit Set", "Noto Sans Thai Looped", sans-serif`;

export const FONT_OPTIONS: FontOption[] = [
  { id: "sukhumvit", label: "Sukhumvit", stack: `"Sukhumvit Set", "Google Sans", "Roboto", "Noto Sans Thai Looped", "Helvetica Neue", Arial, sans-serif` },
  { id: "ibm-plex-looped", label: "IBM Plex Sans Thai Looped", stack: `"IBM Plex Sans Thai Looped", ${THAI_FALLBACK}` },
  { id: "ibm-plex", label: "IBM Plex Sans Thai", stack: `"IBM Plex Sans Thai", ${THAI_FALLBACK}` },
  { id: "google-sans", label: "Google Sans", stack: `"Google Sans", "Noto Sans Thai Looped", ${THAI_FALLBACK}` },
  { id: "tahoma", label: "Tahoma", stack: `Tahoma, "Noto Sans Thai", ${THAI_FALLBACK}` },
  { id: "sarabun", label: "Sarabun", stack: `"Sarabun", ${THAI_FALLBACK}` },
  { id: "noto-thai", label: "Noto Sans Thai", stack: `"Noto Sans Thai", ${THAI_FALLBACK}` },
  { id: "noto-thai-looped", label: "Noto Sans Thai Looped", stack: `"Noto Sans Thai Looped", ${THAI_FALLBACK}` },
];

export const DEFAULT_FONT_ID = "sukhumvit";

export function fontStack(id: string): string {
  return (FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0]).stack;
}

/** Read the saved font id from the shared prefs blob. */
export function loadFontId(): string {
  if (typeof window === "undefined") return DEFAULT_FONT_ID;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_FONT_ID;
    const p = JSON.parse(raw) as Record<string, unknown>;
    return typeof p.fontFamily === "string" && FONT_OPTIONS.some((f) => f.id === p.fontFamily)
      ? (p.fontFamily as string)
      : DEFAULT_FONT_ID;
  } catch {
    return DEFAULT_FONT_ID;
  }
}

/** Apply a font id to the document immediately (live preview + boot). */
export function applyFont(id: string) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--app-font", fontStack(id));
}
