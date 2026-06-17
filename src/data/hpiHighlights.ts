/**
 * HPI highlighting — production model. Two ingest paths, one render contract.
 *
 *  1. PRIMARY · LLM annotations. When the model writes the HPI it also returns
 *     `{ quote, category, confidence }[]` (see `HPI_ANNOTATION_SCHEMA`). We do
 *     NOT trust character offsets from the LLM — we locate each `quote` in the
 *     text ourselves, so spans stay correct even if the model miscounts.
 *
 *  2. FALLBACK · lexicon scan. A clinician-editable term list (`HPI_LEXICON`)
 *     plus numeric patterns. Adding a term = data edit, not a code change.
 *
 * Categories live in an open registry (`HPI_CATEGORIES`) — add one without
 * touching the engine. Negation is handled by SCOPE (a cue colours the rest of
 * its clause as `negative`), so "ปฏิเสธอาการเหนื่อยหอบ" is a negative, not a
 * red-flag — no brittle per-phrase regex.
 *
 * A wrong category is worse than none (the doctor trusts the colour). Every
 * span carries `source` + `confidence`; surface low-confidence as faint and
 * always let the doctor re-tag. Render is the doctor's, never auto-committed.
 */

// ── Category registry (extensible) ─────────────────────────────────────────
export interface HpiCategoryDef {
  id: string;
  labelTh: string;
  bg: string;
  fg: string;
  /** Higher wins when spans overlap. */
  priority: number;
}

export const HPI_CATEGORIES: Record<string, HpiCategoryDef> = {
  negative:   { id: "negative",   labelTh: "ปฏิเสธ/ไม่มี",  bg: "#F1F5F9", fg: "#64748B", priority: 40 },
  "red-flag": { id: "red-flag",   labelTh: "สัญญาณอันตราย", bg: "#FFE4E8", fg: "#BE123C", priority: 30 },
  risk:       { id: "risk",       labelTh: "ปัจจัยเสี่ยง",   bg: "#FFF1E2", fg: "#C2410C", priority: 20 },
  anchor:     { id: "anchor",     labelTh: "ค่าจับตา/ยา",    bg: "#E8F0FE", fg: "#1D4ED8", priority: 10 },
};

export interface HpiSpan {
  text: string;
  start: number;
  end: number;
  category: string;
  source: "llm" | "lexicon" | "pattern";
  /** 0–1. LLM supplies its own; lexicon/pattern default below. */
  confidence: number;
}

// ── Lexicon (clinician-editable data, not code) ────────────────────────────
export interface HpiLexEntry {
  category: string;
  /** Surface forms incl. synonyms, TH + EN. Matched as substrings. */
  terms: string[];
}

export const HPI_LEXICON: HpiLexEntry[] = [
  { category: "red-flag", terms: ["ปวดร้าว", "ร้าวไป", "radiat", "แขนซ้าย", "กราม", "ขากรรไกร",
      "เหื่อแตก", "เหื่อท่วม", "เหื่อออกมาก", "diaphor", "จุกแน่น", "แน่นหน้าอก", "กดทับ",
      "หมดสติ", "เป็นลม", "วูบ", "syncope", "ถ่ายดำ", "อาเจียนเป็นเลือด", "ถ่ายเป็นเลือด",
      "melena", "hematemes", "ท้องแข็ง", "guarding", "rebound", "ไข้สูง", "หายใจไม่ออก"] },
  { category: "risk", terms: ["ความดันโลหิตสูง", "ความดันสูง", "hypertension", "ไขมันในเลือดสูง",
      "คอเลสเตอรอล", "dyslipid", "hyperlipid", "เบาหวาน", "diabet", "สูบบุหรี่", "smok",
      "ดื่มสุรา", "แอลกอฮอล์", "alcohol", "ประวัติครอบครัว", "family history",
      "บิดาเสียชีวิต", "โรคประจำตัว"] },
];

// ── Negation (scope-based) ─────────────────────────────────────────────────
const NEGATION_CUES = ["ปฏิเสธ", "ไม่มีอาการ", "ไม่มี", "ไม่ได้", "ไม่พบ", "ไม่"];
/** A negation cue colours from the cue up to the next clause break. */
const CLAUSE_BREAK = /[,.;\n]|\sและ|\sแต่|\sโดย|\sร่วมกับ|\sซึ่ง/;

// ── Numeric anchors (patterns genuinely need regex) ────────────────────────
const ANCHOR_PATTERNS: RegExp[] = [
  /\d+\s*(?:\/|เต็ม)\s*10/g, // pain score 7/10
  /\d+\s*(?:นาที|ชั่วโมง|ชม\.?|วัน|สัปดาห์|เดือน|ปี)/g, // duration
  /[A-Za-z][A-Za-z-]{2,}\s*\d+(?:\.\d+)?\s*(?:mg|มก\.?|มิลลิกรัม)/gi, // drug + dose
  /\d+(?:\.\d+)?\s*(?:mg|มก\.?|มิลลิกรัม|ml|มล\.?)/gi, // bare dose
];

const DEFAULT_CONFIDENCE: Record<string, number> = { llm: 0.9, lexicon: 0.7, pattern: 0.8 };

// ── Engine ─────────────────────────────────────────────────────────────────

/** LLM structured-output contract — wire to a StructuredOutput tool. */
export interface HpiAnnotation {
  quote: string; // verbatim substring of the HPI
  category: string;
  confidence?: number; // 0–1
}

export const HPI_ANNOTATION_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    required: ["quote", "category"],
    properties: {
      quote: { type: "string", description: "verbatim substring copied from the HPI" },
      category: { type: "string", enum: Object.keys(HPI_CATEGORIES) },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
  },
} as const;

function pushAll(text: string, re: RegExp, category: string, source: HpiSpan["source"], out: HpiSpan[]) {
  for (const m of text.matchAll(re)) {
    if (m.index == null || m[0].trim() === "") continue;
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length, category, source,
      confidence: DEFAULT_CONFIDENCE[source] });
  }
}

/** Locate every occurrence of `needle` in `text` (substring, overlap-free). */
function locate(text: string, needle: string): Array<[number, number]> {
  const hits: Array<[number, number]> = [];
  if (!needle) return hits;
  let i = text.indexOf(needle);
  while (i !== -1) {
    hits.push([i, i + needle.length]);
    i = text.indexOf(needle, i + needle.length);
  }
  return hits;
}

/** Spans of text that fall inside a negation scope. */
function negationScopes(text: string): Array<[number, number]> {
  const scopes: Array<[number, number]> = [];
  for (const cue of NEGATION_CUES) {
    for (const [s] of locate(text, cue)) {
      const rest = text.slice(s + cue.length);
      const brk = rest.search(CLAUSE_BREAK);
      scopes.push([s, s + cue.length + (brk === -1 ? rest.length : brk)]);
    }
  }
  return scopes;
}

/**
 * Build non-overlapping highlight spans.
 * @param text  the HPI string
 * @param annotations  optional LLM annotations (preferred source)
 */
export function buildHpiSpans(text: string, annotations?: HpiAnnotation[]): HpiSpan[] {
  const raw: HpiSpan[] = [];

  // 1. LLM annotations — resolve quotes to offsets we control.
  if (annotations?.length) {
    for (const a of annotations) {
      if (!HPI_CATEGORIES[a.category]) continue; // unknown category → drop
      for (const [start, end] of locate(text, a.quote)) {
        raw.push({ text: a.quote, start, end, category: a.category, source: "llm",
          confidence: a.confidence ?? DEFAULT_CONFIDENCE.llm });
      }
    }
  } else {
    // 2. Lexicon fallback.
    for (const entry of HPI_LEXICON) {
      for (const term of entry.terms) {
        for (const [start, end] of locate(text.toLowerCase(), term.toLowerCase())) {
          raw.push({ text: text.slice(start, end), start, end, category: entry.category,
            source: "lexicon", confidence: DEFAULT_CONFIDENCE.lexicon });
        }
      }
    }
    ANCHOR_PATTERNS.forEach((re) => pushAll(text, re, "anchor", "pattern", raw));
  }

  // 3. Apply negation scope — any span fully inside a negation becomes negative.
  const scopes = negationScopes(text);
  for (const span of raw) {
    if (span.category === "anchor") continue; // a dose inside "ปฏิเสธ" is rare; keep
    if (scopes.some(([s, e]) => span.start >= s && span.end <= e)) span.category = "negative";
  }

  // 4. Resolve overlaps: priority → longer → earlier.
  raw.sort(
    (a, b) =>
      (HPI_CATEGORIES[b.category]?.priority ?? 0) - (HPI_CATEGORIES[a.category]?.priority ?? 0) ||
      b.end - b.start - (a.end - a.start) ||
      a.start - b.start,
  );
  const kept: HpiSpan[] = [];
  for (const span of raw) {
    if (kept.some((k) => span.start < k.end && span.end > k.start)) continue;
    kept.push(span);
  }
  return kept.sort((a, b) => a.start - b.start);
}