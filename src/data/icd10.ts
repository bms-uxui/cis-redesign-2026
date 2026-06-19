/**
 * ICD-10-TM (Thai Modification) mini-catalog for the OPD diagnosis picker.
 *
 * NOT the full master set — a curated slice covering common Thai OPD diagnoses
 * plus every problem-list code used in `mock/patients.ts`, enough to demo
 * "พิมพ์ชื่อโรค → ได้รหัส". Confirm the real master data with the รพ. coding
 * team before relying on these codes for claims (see icd10-requirement.md §6).
 */
export interface Icd10Entry {
  code: string;
  termTh: string;
  termEn: string;
  /** extra search terms — abbreviations, synonyms, lay words */
  synonyms?: string[];
  /** coding system this entry belongs to. Local catalog = ICD-10-TM (the Thai
   *  billing standard). External sources tag themselves so the picker can mark
   *  non-Thai codes as reference-only. Absent = ICD-10-TM. */
  system?: "ICD-10-TM" | "ICD-10-CM" | "ICD-11";
}

export const ICD10_CATALOG: Icd10Entry[] = [
  // ── Digestive ──────────────────────────────────────────────────────────
  { code: "K52.9", termTh: "ลำไส้อักเสบและกระเพาะอาหารอักเสบเฉียบพลัน", termEn: "Acute gastroenteritis", synonyms: ["ท้องเสีย", "อุจจาระร่วง", "GE", "ลำไส้อักเสบ"] },
  { code: "K29.7", termTh: "กระเพาะอาหารอักเสบ", termEn: "Gastritis", synonyms: ["โรคกระเพาะ", "ปวดท้อง", "จุกเสียด"] },
  { code: "K21.9", termTh: "โรคกรดไหลย้อน", termEn: "Gastro-esophageal reflux disease", synonyms: ["GERD", "แสบยอดอก", "กรดไหลย้อน"] },
  { code: "K30", termTh: "อาหารไม่ย่อย", termEn: "Functional dyspepsia", synonyms: ["ท้องอืด", "ดิสเปปเซีย"] },
  { code: "K59.0", termTh: "ท้องผูก", termEn: "Constipation", synonyms: ["ถ่ายไม่ออก"] },
  { code: "A09", termTh: "ติดเชื้อในทางเดินอาหาร", termEn: "Infectious gastroenteritis", synonyms: ["ท้องเสียติดเชื้อ"] },

  // ── Endocrine / metabolic ──────────────────────────────────────────────
  { code: "E11.9", termTh: "เบาหวานชนิดที่ 2", termEn: "Type 2 diabetes mellitus", synonyms: ["DM", "เบาหวาน", "T2DM", "diabetes"] },
  { code: "E10.9", termTh: "เบาหวานชนิดที่ 1", termEn: "Type 1 diabetes mellitus", synonyms: ["T1DM"] },
  { code: "E78.5", termTh: "ไขมันในเลือดสูง", termEn: "Hyperlipidemia", synonyms: ["dyslipidemia", "ไขมันสูง", "คอเลสเตอรอลสูง"] },
  { code: "E66.0", termTh: "โรคอ้วน", termEn: "Obesity", synonyms: ["อ้วน", "น้ำหนักเกิน"] },
  { code: "E03.9", termTh: "ภาวะไทรอยด์ฮอร์โมนต่ำ", termEn: "Hypothyroidism", synonyms: ["ไทรอยด์ต่ำ", "hypothyroid"] },
  { code: "E05.9", termTh: "ภาวะไทรอยด์เป็นพิษ", termEn: "Thyrotoxicosis / Hyperthyroidism", synonyms: ["ไทรอยด์เป็นพิษ", "hyperthyroid"] },
  { code: "E86", termTh: "ภาวะขาดน้ำ", termEn: "Volume depletion / Dehydration", synonyms: ["ขาดน้ำ"] },

  // ── Circulatory ────────────────────────────────────────────────────────
  { code: "I10", termTh: "ความดันโลหิตสูง", termEn: "Essential hypertension", synonyms: ["HT", "ความดันสูง", "hypertension"] },
  { code: "I25.10", termTh: "โรคหลอดเลือดหัวใจตีบ", termEn: "Coronary artery disease", synonyms: ["CAD", "หัวใจขาดเลือด", "IHD"] },
  { code: "I50.9", termTh: "ภาวะหัวใจล้มเหลว", termEn: "Heart failure", synonyms: ["CHF", "หัวใจวาย"] },
  { code: "I48.91", termTh: "หัวใจเต้นผิดจังหวะชนิด AF", termEn: "Atrial fibrillation", synonyms: ["AF", "หัวใจเต้นผิดจังหวะ"] },

  // ── Respiratory ────────────────────────────────────────────────────────
  { code: "J00", termTh: "หวัด / โพรงจมูกอักเสบเฉียบพลัน", termEn: "Acute nasopharyngitis (common cold)", synonyms: ["หวัด", "เป็นหวัด", "URI", "ไข้หวัด"] },
  { code: "J06.9", termTh: "ติดเชื้อทางเดินหายใจส่วนบนเฉียบพลัน", termEn: "Acute upper respiratory infection", synonyms: ["URI", "เจ็บคอ", "ทางเดินหายใจอักเสบ"] },
  { code: "J20.9", termTh: "หลอดลมอักเสบเฉียบพลัน", termEn: "Acute bronchitis", synonyms: ["หลอดลมอักเสบ", "ไอ"] },
  { code: "J45.9", termTh: "โรคหืด", termEn: "Asthma", synonyms: ["หอบหืด", "asthma", "หืด"] },
  { code: "J44.9", termTh: "โรคปอดอุดกั้นเรื้อรัง", termEn: "COPD", synonyms: ["ถุงลมโป่งพอง", "copd"] },
  { code: "J02.9", termTh: "คออักเสบเฉียบพลัน", termEn: "Acute pharyngitis", synonyms: ["เจ็บคอ", "คออักเสบ"] },
  { code: "J18.9", termTh: "ปอดอักเสบ / ปอดบวม", termEn: "Pneumonia", synonyms: ["ปอดบวม", "pneumonia"] },

  // ── Genitourinary / renal ──────────────────────────────────────────────
  { code: "N18.4", termTh: "โรคไตเรื้อรัง ระยะ 4", termEn: "Chronic kidney disease, stage 4", synonyms: ["CKD", "ไตเรื้อรัง", "ไตวาย"] },
  { code: "N18.3", termTh: "โรคไตเรื้อรัง ระยะ 3", termEn: "Chronic kidney disease, stage 3", synonyms: ["CKD"] },
  { code: "N39.0", termTh: "ติดเชื้อทางเดินปัสสาวะ", termEn: "Urinary tract infection", synonyms: ["UTI", "กระเพาะปัสสาวะอักเสบ", "ปัสสาวะแสบขัด"] },

  // ── Musculoskeletal ────────────────────────────────────────────────────
  { code: "M54.5", termTh: "ปวดหลังส่วนล่าง", termEn: "Low back pain", synonyms: ["ปวดหลัง", "low back pain"] },
  { code: "M54.2", termTh: "ปวดคอ", termEn: "Cervicalgia / Neck pain", synonyms: ["ปวดคอ", "ปวดต้นคอ"] },
  { code: "M25.5", termTh: "ปวดข้อ", termEn: "Joint pain (arthralgia)", synonyms: ["ปวดข้อ", "ข้ออักเสบ"] },
  { code: "M79.1", termTh: "ปวดกล้ามเนื้อ", termEn: "Myalgia", synonyms: ["ปวดกล้ามเนื้อ", "ปวดเมื่อย"] },
  { code: "M10.9", termTh: "โรคเกาต์", termEn: "Gout", synonyms: ["เกาต์", "gout", "กรดยูริก"] },

  // ── Neuro / general symptoms ───────────────────────────────────────────
  { code: "G43.9", termTh: "ไมเกรน", termEn: "Migraine", synonyms: ["ปวดหัวไมเกรน", "migraine"] },
  { code: "R51", termTh: "ปวดศีรษะ", termEn: "Headache", synonyms: ["ปวดหัว", "headache"] },
  { code: "R42", termTh: "เวียนศีรษะ / มึนงง", termEn: "Dizziness and giddiness", synonyms: ["เวียนหัว", "บ้านหมุน", "vertigo"] },
  { code: "R50.9", termTh: "ไข้ไม่ทราบสาเหตุ", termEn: "Fever, unspecified", synonyms: ["ไข้", "ตัวร้อน", "fever"] },

  // ── Skin / allergy ─────────────────────────────────────────────────────
  { code: "L23.9", termTh: "ผื่นแพ้สัมผัส", termEn: "Allergic contact dermatitis", synonyms: ["ผื่นแพ้", "ผื่นคัน"] },
  { code: "L50.9", termTh: "ลมพิษ", termEn: "Urticaria", synonyms: ["ลมพิษ", "ผื่นลมพิษ"] },
  { code: "J30.4", termTh: "เยื่อบุจมูกอักเสบจากภูมิแพ้", termEn: "Allergic rhinitis", synonyms: ["ภูมิแพ้", "แพ้อากาศ", "คัดจมูก"] },

  // ── Pregnancy / wellness ───────────────────────────────────────────────
  { code: "Z34.0", termTh: "ฝากครรภ์ครรภ์แรก (ปกติ)", termEn: "Supervision of normal first pregnancy", synonyms: ["ฝากครรภ์", "ANC", "ตั้งครรภ์"] },
  { code: "Z00.0", termTh: "ตรวจสุขภาพทั่วไป", termEn: "General medical examination", synonyms: ["ตรวจสุขภาพ", "checkup", "well visit"] },
];

/** Normalize for loose matching — lowercase, strip spaces/dots/hyphens. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[\s.\-/]/g, "");
}

/**
 * Search the catalog by Thai/English name, code, or synonym. Partial match,
 * ranked: exact code > code prefix > name/synonym contains. Returns up to
 * `limit` entries; empty query → [].
 */
export function searchIcd10(query: string, limit = 8): Icd10Entry[] {
  const q = norm(query.trim());
  if (!q) return [];
  const scored: { e: Icd10Entry; score: number }[] = [];
  for (const e of ICD10_CATALOG) {
    const code = norm(e.code);
    const hay = [e.termTh, e.termEn, ...(e.synonyms ?? [])].map(norm);
    let score = 0;
    if (code === q) score = 100;
    else if (code.startsWith(q)) score = 80;
    else if (hay.some((h) => h === q)) score = 70;
    else if (hay.some((h) => h.startsWith(q))) score = 55;
    else if (hay.some((h) => h.includes(q))) score = 40;
    else if (code.includes(q)) score = 30;
    if (score > 0) scored.push({ e, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.e);
}

/** Look up one entry by exact code (case/format-insensitive). */
export function findIcd10(code: string): Icd10Entry | undefined {
  const c = norm(code);
  return ICD10_CATALOG.find((e) => norm(e.code) === c);
}
