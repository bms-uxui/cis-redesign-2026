/**
 * Lab master / compendium (mock). Stands in for a self-hosted lab catalogue
 * keyed by LOINC + TMLT (Thai Medical Laboratory Terminology) until a backend
 * is available.
 *
 * Everything goes through `searchLabs(q)` — swap its body for a real call
 * (`fetch('/labs?q='+q)`) when the internal API is ready; the UI never changes.
 *
 * Production note: there is NO public live lab API. The plan is to import the
 * official LOINC + TMLT release files, self-host them with the local compendium
 * (specimen / fasting / panel / refRange / turnaround / price / reimbursable /
 * sendOut), and expose `GET /labs?q=…`. Lab names MUST be picked from this
 * master, never free-typed (a typo breaks result matching + billing).
 */
export interface LabMaster {
  loinc: string;        // LOINC code (key)
  tmlt?: string;        // Thai Medical Laboratory Terminology code
  name: string;         // display name
  panel?: string;       // grouping (CBC, LFT, Lipid, …)
  specimen: string;     // ชนิดสิ่งส่งตรวจ
  fasting: boolean;     // ต้องงดอาหารก่อนตรวจ
  refRange?: string;    // ค่าอ้างอิง
  turnaroundHrs: number; // เวลารอผล (ชม.)
  price: number;        // ราคา (บาท)
  reimbursable: boolean; // เบิกได้
  sendOut: boolean;     // ส่งตรวจแล็บภายนอก
}

const LAB_MASTER: LabMaster[] = [
  { loinc: "58410-2", tmlt: "L0001", name: "CBC (ความสมบูรณ์เม็ดเลือด)", panel: "CBC", specimen: "EDTA blood", fasting: false, refRange: "ตามรายการย่อย", turnaroundHrs: 2, price: 90, reimbursable: true, sendOut: false },
  { loinc: "1558-6", tmlt: "L0010", name: "FBS (น้ำตาลในเลือดหลังอดอาหาร)", panel: "เบาหวาน", specimen: "Fluoride plasma", fasting: true, refRange: "70–99 mg/dL", turnaroundHrs: 1, price: 40, reimbursable: true, sendOut: false },
  { loinc: "4548-4", tmlt: "L0011", name: "HbA1c (น้ำตาลสะสม)", panel: "เบาหวาน", specimen: "EDTA blood", fasting: false, refRange: "< 5.7 %", turnaroundHrs: 4, price: 200, reimbursable: true, sendOut: false },
  { loinc: "2160-0", tmlt: "L0020", name: "Creatinine", panel: "ไต", specimen: "Serum", fasting: false, refRange: "0.7–1.2 mg/dL", turnaroundHrs: 2, price: 50, reimbursable: true, sendOut: false },
  { loinc: "33914-3", tmlt: "L0021", name: "eGFR", panel: "ไต", specimen: "Serum", fasting: false, refRange: "≥ 90 mL/min/1.73m²", turnaroundHrs: 2, price: 0, reimbursable: true, sendOut: false },
  { loinc: "2093-3", tmlt: "L0030", name: "Cholesterol (รวม)", panel: "Lipid", specimen: "Serum", fasting: true, refRange: "< 200 mg/dL", turnaroundHrs: 2, price: 60, reimbursable: true, sendOut: false },
  { loinc: "2571-8", tmlt: "L0031", name: "Triglyceride", panel: "Lipid", specimen: "Serum", fasting: true, refRange: "< 150 mg/dL", turnaroundHrs: 2, price: 60, reimbursable: true, sendOut: false },
  { loinc: "2085-9", tmlt: "L0032", name: "HDL-Cholesterol", panel: "Lipid", specimen: "Serum", fasting: true, refRange: "> 40 mg/dL", turnaroundHrs: 2, price: 70, reimbursable: true, sendOut: false },
  { loinc: "13457-7", tmlt: "L0033", name: "LDL-Cholesterol", panel: "Lipid", specimen: "Serum", fasting: true, refRange: "< 130 mg/dL", turnaroundHrs: 2, price: 70, reimbursable: true, sendOut: false },
  { loinc: "1920-8", tmlt: "L0040", name: "AST (SGOT)", panel: "LFT", specimen: "Serum", fasting: false, refRange: "< 40 U/L", turnaroundHrs: 2, price: 50, reimbursable: true, sendOut: false },
  { loinc: "1742-6", tmlt: "L0041", name: "ALT (SGPT)", panel: "LFT", specimen: "Serum", fasting: false, refRange: "< 41 U/L", turnaroundHrs: 2, price: 50, reimbursable: true, sendOut: false },
  { loinc: "6768-6", tmlt: "L0042", name: "Alkaline Phosphatase (ALP)", panel: "LFT", specimen: "Serum", fasting: false, refRange: "40–129 U/L", turnaroundHrs: 2, price: 60, reimbursable: true, sendOut: false },
  { loinc: "1975-2", tmlt: "L0043", name: "Total Bilirubin", panel: "LFT", specimen: "Serum", fasting: false, refRange: "< 1.2 mg/dL", turnaroundHrs: 2, price: 50, reimbursable: true, sendOut: false },
  { loinc: "2951-2", tmlt: "L0050", name: "Sodium (Na)", panel: "Electrolytes", specimen: "Serum", fasting: false, refRange: "135–145 mmol/L", turnaroundHrs: 1, price: 40, reimbursable: true, sendOut: false },
  { loinc: "2823-3", tmlt: "L0051", name: "Potassium (K)", panel: "Electrolytes", specimen: "Serum", fasting: false, refRange: "3.5–5.1 mmol/L", turnaroundHrs: 1, price: 40, reimbursable: true, sendOut: false },
  { loinc: "2075-0", tmlt: "L0052", name: "Chloride (Cl)", panel: "Electrolytes", specimen: "Serum", fasting: false, refRange: "98–107 mmol/L", turnaroundHrs: 1, price: 40, reimbursable: true, sendOut: false },
  { loinc: "3016-3", tmlt: "L0060", name: "TSH", panel: "ไทรอยด์", specimen: "Serum", fasting: false, refRange: "0.4–4.0 mIU/L", turnaroundHrs: 6, price: 180, reimbursable: true, sendOut: false },
  { loinc: "3024-7", tmlt: "L0061", name: "Free T4", panel: "ไทรอยด์", specimen: "Serum", fasting: false, refRange: "0.9–1.7 ng/dL", turnaroundHrs: 6, price: 200, reimbursable: true, sendOut: false },
  { loinc: "24356-8", tmlt: "L0070", name: "Urinalysis (UA)", panel: "ปัสสาวะ", specimen: "Urine", fasting: false, refRange: "ตามรายการย่อย", turnaroundHrs: 1, price: 50, reimbursable: true, sendOut: false },
  { loinc: "9318-7", tmlt: "L0071", name: "Urine Albumin/Creatinine (UACR)", panel: "ไต", specimen: "Urine (spot)", fasting: false, refRange: "< 30 mg/g", turnaroundHrs: 4, price: 150, reimbursable: true, sendOut: false },
  { loinc: "2532-0", tmlt: "L0080", name: "LDH", panel: "เคมีเลือด", specimen: "Serum", fasting: false, refRange: "140–280 U/L", turnaroundHrs: 3, price: 90, reimbursable: false, sendOut: false },
  { loinc: "1988-5", tmlt: "L0081", name: "CRP", panel: "อักเสบ", specimen: "Serum", fasting: false, refRange: "< 5 mg/L", turnaroundHrs: 3, price: 150, reimbursable: true, sendOut: false },
  { loinc: "2857-1", tmlt: "L0090", name: "PSA", panel: "มะเร็ง", specimen: "Serum", fasting: false, refRange: "< 4 ng/mL", turnaroundHrs: 24, price: 350, reimbursable: false, sendOut: true },
  { loinc: "14979-9", tmlt: "L0100", name: "PT/INR", panel: "การแข็งตัวเลือด", specimen: "Citrate plasma", fasting: false, refRange: "INR 0.8–1.2", turnaroundHrs: 2, price: 120, reimbursable: true, sendOut: false },
  { loinc: "5902-2", tmlt: "L0101", name: "aPTT", panel: "การแข็งตัวเลือด", specimen: "Citrate plasma", fasting: false, refRange: "25–35 วินาที", turnaroundHrs: 2, price: 120, reimbursable: true, sendOut: false },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");

function scoreLab(l: LabMaster, q: string): number {
  const name = norm(l.name);
  const panel = norm(l.panel ?? "");
  const code = norm(`${l.loinc}${l.tmlt ?? ""}`);
  if (name === q || code === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (panel.includes(q)) return 40;
  if (code.includes(q)) return 30;
  return 0;
}

/** Search the lab compendium. Swap the body for `fetch('/labs?q='+q)` later. */
export async function searchLabs(q: string, limit = 8): Promise<LabMaster[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  await new Promise((r) => setTimeout(r, 50)); // simulate network latency
  const nq = norm(trimmed);
  if (!nq) return [];
  const scored: { l: LabMaster; score: number }[] = [];
  for (const l of LAB_MASTER) {
    const score = scoreLab(l, nq);
    if (score > 0) scored.push({ l, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.l);
}

/** Default prep string from the compendium (fasting / specimen). */
export function labPrep(l: LabMaster): string {
  return l.fasting ? "งดอาหาร 8–12 ชม." : "-";
}
