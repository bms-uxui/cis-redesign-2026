/**
 * Finding-type taxonomy (ชนิดอาการ/อาการแสดง) — the kind of clinical finding
 * plotted at a body region, BEFORE its type-specific attributes.
 *
 * A finding on the body map is always `region + type (+ attributes)`. "Pain" is
 * just one type; a clinical map also needs swelling, rash, wound, etc. so it
 * works beyond pain-only cases (derm, surgery, neuro, ortho).
 *
 * Colours follow the same rule as `painCharacters.ts`: these are CATEGORICAL
 * (identity) colours rendered as soft chips + markers — deliberately kept away
 * from the alert red/green/yellow used for severity, so a marker never reads as
 * "danger" by colour alone. Always pair `icon` + label; colour is secondary
 * (colour-blind safety). `bg`/`fg` = chip background + text/marker colour.
 *
 * NOTE: when `type === "pain"`, the marker colour on the model comes from the
 * chosen PainCharacter (see `painCharacters.ts`), not from `fg` here — `fg` is
 * only the default/picker colour. Severity (NRS 0–10) is encoded by marker
 * INTENSITY, never by switching hue.
 */

export interface FindingType {
  id: string;
  labelTh: string;
  labelEn: string;
  /** Logical icon key, mapped to a Tabler icon at the render site. */
  icon: string;
  bg: string;
  fg: string;
  /** Source: patient-reported symptom vs examiner-observed sign (PE). */
  source: "symptom" | "sign" | "both";
}

export const FINDING_TYPES: FindingType[] = [
  { id: "pain",      labelTh: "ปวด",            labelEn: "Pain",       icon: "pain",      bg: "#FFE4E8", fg: "#E11D48", source: "symptom" },
  { id: "swelling",  labelTh: "บวม",            labelEn: "Swelling",   icon: "swelling",  bg: "#E0F5FA", fg: "#0891B2", source: "both" },
  { id: "rash",      labelTh: "ผื่น/รอยโรค",    labelEn: "Rash/Lesion", icon: "rash",     bg: "#FAE8FF", fg: "#C026D3", source: "both" },
  { id: "bruise",    labelTh: "ช้ำ/เขียวคล้ำ",  labelEn: "Bruise/Cyanosis", icon: "bruise", bg: "#F1E9FE", fg: "#7C3AED", source: "both" },
  { id: "wound",     labelTh: "แผล",            labelEn: "Wound/Ulcer", icon: "wound",    bg: "#FFF0E6", fg: "#EA580C", source: "both" },
  { id: "mass",      labelTh: "ก้อน",           labelEn: "Mass/Lump",  icon: "mass",      bg: "#FEF3E2", fg: "#B45309", source: "both" },
  { id: "numbness",  labelTh: "ชา",             labelEn: "Numbness",   icon: "numbness",  bg: "#EEF2F6", fg: "#64748B", source: "symptom" },
  { id: "weakness",  labelTh: "อ่อนแรง",        labelEn: "Weakness",   icon: "weakness",  bg: "#E8F0FE", fg: "#2563EB", source: "both" },
  { id: "deformity", labelTh: "ผิดรูป/ข้อติด",  labelEn: "Deformity/Limited ROM", icon: "deformity", bg: "#E6F7F4", fg: "#0D9488", source: "both" },
];

export const FINDING_TYPE_BY_ID: Record<string, FindingType> =
  Object.fromEntries(FINDING_TYPES.map((f) => [f.id, f]));

/** Keyword cues for detecting each finding type in free text. */
const FINDING_KEYWORDS: Record<string, RegExp> = {
  pain: /ปวด|เจ็บ|pain|ache/i,
  swelling: /บวม|โต|swell|edema|oedema/i,
  rash: /ผื่น|ผด|ตุ่ม|rash|lesion|จุดเลือดออก/i,
  bruise: /ช้ำ|เขียวคล้ำ|คล้ำ|ห้อเลือด|bruise|cyanosis|ecchymos/i,
  wound: /แผล|บาด|wound|ulcer|กดทับ|incision/i,
  mass: /ก้อน|ต่อม.*โต|mass|lump|nodule/i,
  numbness: /ชา|เหน็บ|numb|paresthesi/i,
  weakness: /อ่อนแรง|อัมพ|weak|paresis|paralys/i,
  deformity: /ผิดรูป|หัก|ข้อติด|เคล็ด|deformity|fracture|dislocat/i,
};

/** All finding types present in the text, in canonical order. */
export function findingTypesFromText(text: string): string[] {
  return FINDING_TYPES.filter((f) => FINDING_KEYWORDS[f.id]?.test(text)).map((f) => f.id);
}

/** Best single guess (first match, or `pain` fallback). */
export function findingTypeFromText(text: string): string {
  return findingTypesFromText(text)[0] ?? "pain";
}

/** Human-readable enum list for prompting an LLM to classify a finding type. */
export const FINDING_TYPE_ENUM = FINDING_TYPES.map(
  (f) => `${f.id} (${f.labelTh})`,
).join(", ");
