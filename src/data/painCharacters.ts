/**
 * Pain-character taxonomy (ลักษณะความปวด) — drives the icon + colour of the
 * pain marker shown on the body model. `icon` is a logical key mapped to a
 * Tabler icon at the render site; `bg`/`fg` are the chip + marker colours.
 */

export interface PainCharacter {
  id: string;
  label: string;
  icon: string;
  bg: string;
  fg: string;
}

export const PAIN_CHARACTERS: PainCharacter[] = [
  { id: "dull",      label: "ตื้อ/หน่วง",   icon: "circle",    bg: "#F1F5F9", fg: "#475569" },
  { id: "cramping",  label: "บีบ/เกร็ง",    icon: "pinch",     bg: "#FAF0FF", fg: "#7E22CE" },
  { id: "colicky",   label: "บิด",          icon: "spiral",    bg: "#E6F7F4", fg: "#0F766E" },
  { id: "burning",   label: "แสบ/ร้อน",     icon: "flame",     bg: "#FFF1E8", fg: "#C2410C" },
  { id: "stabbing",  label: "แทง/เสียด",    icon: "pin",       bg: "#E8F0FE", fg: "#1D4ED8" },
  { id: "shooting",  label: "จี๊ด/ไฟช็อต",  icon: "bolt",      bg: "#EEF0FE", fg: "#4338CA" },
  { id: "throbbing", label: "ตุบๆ/เต้น",    icon: "heartbeat", bg: "#FCE9F1", fg: "#BE185D" },
];

export const PAIN_CHARACTER_BY_ID: Record<string, PainCharacter> =
  Object.fromEntries(PAIN_CHARACTERS.map((p) => [p.id, p]));

/** Keyword cues for detecting each pain character in free text. */
const PAIN_KEYWORDS: Record<string, RegExp> = {
  burning: /แสบ|ร้อน|burn/i,
  cramping: /บีบ|เกร็ง|cramp|tight/i,
  colicky: /บิด|colic/i,
  stabbing: /แทง|เสียด|stab|sharp/i,
  shooting: /จี๊ด|ช็อต|shoot|electr/i,
  throbbing: /ตุบ|เต้น|throb|pulsat/i,
  dull: /ตื้อ|หน่วง|dull|ache|ปวดเมื่อย/i,
};

/** All pain characters present in the text, in canonical order. */
export function painCharactersFromText(text: string): string[] {
  return PAIN_CHARACTERS.filter((p) => PAIN_KEYWORDS[p.id]?.test(text)).map((p) => p.id);
}

/** Best single guess (first match, or `dull` fallback). */
export function painCharacterFromText(text: string): string {
  return painCharactersFromText(text)[0] ?? "dull";
}

/** Pull an NRS pain score (0–10) out of free text so the body-model severity
 *  matches what the HPI narrative actually states. Returns null if none found. */
export function severityFromText(text: string): number | null {
  const clamp = (n: number) => Math.max(0, Math.min(10, n));
  let m = text.match(/(\d{1,2})\s*\/\s*10\b/); // "6/10"
  if (m) return clamp(parseInt(m[1], 10));
  m = text.match(/ระดับ(?:ความรุนแรง)?\s*(?:อยู่ที่\s*)?(\d{1,2})/); // "ระดับ 6"
  if (m) return clamp(parseInt(m[1], 10));
  m = text.match(/(\d{1,2})\s*คะแนน/); // "6 คะแนน"
  if (m) return clamp(parseInt(m[1], 10));
  return null;
}
