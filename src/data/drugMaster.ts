/**
 * Drug master (mock). Stands in for the Thai TMT (Thai Medicines Terminology)
 * master until a backend is available.
 *
 * Everything goes through `searchDrugs(q)` — swap its body for a real call
 * (`fetch('/drugs?q='+q)`) when the internal API is ready; the UI never changes.
 *
 * Production note: there is NO public live TMT API. The plan is to import the
 * official TMT release file, self-host it, and expose an internal endpoint
 * `GET /drugs?q=…`. Drug names MUST be picked from this master, never free-typed
 * (a typo breaks allergy / interaction checking and is unsafe).
 */
export interface DrugMaster {
  tmtCode: string;       // Thai standard code (key)
  generic: string;       // Metformin
  tradeNames: string[];  // [Glucophage]
  strength: string;      // 500 mg
  form: string;          // เม็ด
  atc?: string;
  inFormulary: boolean;
  nlem?: boolean;        // National List of Essential Medicines
}

const DRUG_MASTER: DrugMaster[] = [
  { tmtCode: "100001", generic: "Metformin", tradeNames: ["Glucophage", "Glufor"], strength: "500 mg", form: "เม็ด", atc: "A10BA02", inFormulary: true, nlem: true },
  { tmtCode: "100002", generic: "Metformin", tradeNames: ["Glucophage XR"], strength: "850 mg", form: "เม็ด", atc: "A10BA02", inFormulary: true, nlem: true },
  { tmtCode: "100010", generic: "Glipizide", tradeNames: ["Minidiab"], strength: "5 mg", form: "เม็ด", atc: "A10BB07", inFormulary: true, nlem: true },
  { tmtCode: "100011", generic: "Gliclazide", tradeNames: ["Diamicron"], strength: "30 mg", form: "เม็ด", atc: "A10BB09", inFormulary: true, nlem: true },
  { tmtCode: "100020", generic: "Insulin glargine", tradeNames: ["Lantus"], strength: "100 IU/mL", form: "ยาฉีด", atc: "A10AE04", inFormulary: true },
  { tmtCode: "200001", generic: "Losartan", tradeNames: ["Cozaar"], strength: "50 mg", form: "เม็ด", atc: "C09CA01", inFormulary: true, nlem: true },
  { tmtCode: "200002", generic: "Enalapril", tradeNames: ["Renitec", "Enam"], strength: "5 mg", form: "เม็ด", atc: "C09AA02", inFormulary: true, nlem: true },
  { tmtCode: "200010", generic: "Amlodipine", tradeNames: ["Norvasc", "Amvasc"], strength: "5 mg", form: "เม็ด", atc: "C08CA01", inFormulary: true, nlem: true },
  { tmtCode: "200011", generic: "Amlodipine", tradeNames: ["Norvasc"], strength: "10 mg", form: "เม็ด", atc: "C08CA01", inFormulary: true, nlem: true },
  { tmtCode: "200020", generic: "Hydrochlorothiazide", tradeNames: ["Dichlotride"], strength: "25 mg", form: "เม็ด", atc: "C03AA03", inFormulary: true, nlem: true },
  { tmtCode: "200021", generic: "Furosemide", tradeNames: ["Lasix"], strength: "40 mg", form: "เม็ด", atc: "C03CA01", inFormulary: true, nlem: true },
  { tmtCode: "200030", generic: "Atenolol", tradeNames: ["Tenormin"], strength: "50 mg", form: "เม็ด", atc: "C07AB03", inFormulary: true, nlem: true },
  { tmtCode: "300001", generic: "Atorvastatin", tradeNames: ["Lipitor", "Storvas"], strength: "20 mg", form: "เม็ด", atc: "C10AA05", inFormulary: true, nlem: true },
  { tmtCode: "300002", generic: "Atorvastatin", tradeNames: ["Lipitor"], strength: "40 mg", form: "เม็ด", atc: "C10AA05", inFormulary: true },
  { tmtCode: "300003", generic: "Simvastatin", tradeNames: ["Zocor", "Bestatin"], strength: "20 mg", form: "เม็ด", atc: "C10AA01", inFormulary: true, nlem: true },
  { tmtCode: "300010", generic: "Aspirin", tradeNames: ["Aspent", "Cardiprin"], strength: "81 mg", form: "เม็ด", atc: "B01AC06", inFormulary: true, nlem: true },
  { tmtCode: "300011", generic: "Clopidogrel", tradeNames: ["Plavix"], strength: "75 mg", form: "เม็ด", atc: "B01AC04", inFormulary: true },
  { tmtCode: "400001", generic: "Omeprazole", tradeNames: ["Losec", "Miracid"], strength: "20 mg", form: "แคปซูล", atc: "A02BC01", inFormulary: true, nlem: true },
  { tmtCode: "400002", generic: "Pantoprazole", tradeNames: ["Controloc"], strength: "40 mg", form: "เม็ด", atc: "A02BC02", inFormulary: true },
  { tmtCode: "400010", generic: "Domperidone", tradeNames: ["Motilium"], strength: "10 mg", form: "เม็ด", atc: "A03FA03", inFormulary: true },
  { tmtCode: "400020", generic: "Ondansetron", tradeNames: ["Zofran"], strength: "8 mg", form: "เม็ด", atc: "A04AA01", inFormulary: true, nlem: true },
  { tmtCode: "400030", generic: "Hyoscine butylbromide", tradeNames: ["Buscopan"], strength: "10 mg", form: "เม็ด", atc: "A03BB01", inFormulary: true, nlem: true },
  { tmtCode: "500001", generic: "Paracetamol", tradeNames: ["Tylenol", "Sara"], strength: "500 mg", form: "เม็ด", atc: "N02BE01", inFormulary: true, nlem: true },
  { tmtCode: "500002", generic: "Ibuprofen", tradeNames: ["Brufen", "Nurofen"], strength: "400 mg", form: "เม็ด", atc: "M01AE01", inFormulary: true, nlem: true },
  { tmtCode: "500003", generic: "Naproxen", tradeNames: ["Naprosyn"], strength: "250 mg", form: "เม็ด", atc: "M01AE02", inFormulary: true },
  { tmtCode: "500010", generic: "Tramadol", tradeNames: ["Tramal"], strength: "50 mg", form: "แคปซูล", atc: "N02AX02", inFormulary: true },
  { tmtCode: "600001", generic: "Amoxicillin", tradeNames: ["Amoxil"], strength: "500 mg", form: "แคปซูล", atc: "J01CA04", inFormulary: true, nlem: true },
  { tmtCode: "600002", generic: "Amoxicillin/Clavulanate", tradeNames: ["Augmentin"], strength: "625 mg", form: "เม็ด", atc: "J01CR02", inFormulary: true, nlem: true },
  { tmtCode: "600010", generic: "Azithromycin", tradeNames: ["Zithromax"], strength: "250 mg", form: "เม็ด", atc: "J01FA10", inFormulary: true, nlem: true },
  { tmtCode: "600020", generic: "Ciprofloxacin", tradeNames: ["Cipro"], strength: "500 mg", form: "เม็ด", atc: "J01MA02", inFormulary: true, nlem: true },
  { tmtCode: "600030", generic: "Metronidazole", tradeNames: ["Flagyl"], strength: "400 mg", form: "เม็ด", atc: "J01XD01", inFormulary: true, nlem: true },
  { tmtCode: "700001", generic: "Salbutamol", tradeNames: ["Ventolin"], strength: "100 mcg/dose", form: "ยาสูดพ่น", atc: "R03AC02", inFormulary: true, nlem: true },
  { tmtCode: "700010", generic: "Budesonide/Formoterol", tradeNames: ["Symbicort"], strength: "160/4.5 mcg", form: "ยาสูดพ่น", atc: "R03AK07", inFormulary: true },
  { tmtCode: "700020", generic: "Cetirizine", tradeNames: ["Zyrtec"], strength: "10 mg", form: "เม็ด", atc: "R06AE07", inFormulary: true, nlem: true },
  { tmtCode: "700021", generic: "Loratadine", tradeNames: ["Clarityne"], strength: "10 mg", form: "เม็ด", atc: "R06AX13", inFormulary: true, nlem: true },
  { tmtCode: "800001", generic: "Allopurinol", tradeNames: ["Zyloric"], strength: "100 mg", form: "เม็ด", atc: "M04AA01", inFormulary: true, nlem: true },
  { tmtCode: "800010", generic: "Levothyroxine", tradeNames: ["Eltroxin"], strength: "50 mcg", form: "เม็ด", atc: "H03AA01", inFormulary: true, nlem: true },
  { tmtCode: "800020", generic: "Prednisolone", tradeNames: ["Prednisil"], strength: "5 mg", form: "เม็ด", atc: "H02AB06", inFormulary: true, nlem: true },
];

/** Keep only [a-z0-9] for loose Latin matching (drops spaces, punctuation, and
 *  Thai characters). */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// ── Thai → Latin romanizer (general, data-light) ────────────────────────────
// Maps each Thai letter to a rough Latin sound so a Thai-typed query can match
// the English generic/trade names — e.g. "พารา" → "para" → Paracetamol.
// Aspirated consonants are folded to their plain form (พ→p, ท→t, ค→k) because
// people type "para", not "phara". It's a fuzzy approximation, NOT per-drug
// tuning, so it generalises to any drug without overfitting.
const TH_CONS: Record<string, string> = {
  ก: "k", ข: "k", ฃ: "k", ค: "k", ฅ: "k", ฆ: "k", ง: "ng", จ: "j", ฉ: "ch", ช: "ch",
  ซ: "s", ฌ: "ch", ญ: "y", ฎ: "d", ฏ: "t", ฐ: "t", ฑ: "t", ฒ: "t", ณ: "n", ด: "d",
  ต: "t", ถ: "t", ท: "t", ธ: "t", น: "n", บ: "b", ป: "p", ผ: "p", ฝ: "f", พ: "p",
  ฟ: "f", ภ: "p", ม: "m", ย: "y", ร: "r", ล: "l", ฦ: "l", ว: "w", ศ: "s", ษ: "s",
  ส: "s", ห: "h", ฬ: "l", อ: "", ฮ: "h", // อ = silent vowel-carrier
};
const TH_LEAD_VOWEL: Record<string, string> = { เ: "e", แ: "ae", โ: "o", ใ: "ai", ไ: "ai" };
const TH_FOLLOW_VOWEL: Record<string, string> = {
  "ะ": "a", "ั": "a", "า": "a", "ๅ": "a", "ิ": "i", "ี": "i", "ึ": "ue", "ื": "ue",
  "ุ": "u", "ู": "u", "ำ": "am", "ฤ": "ri", "ฯ": "",
};
const TH_IGNORE = new Set(["่", "้", "๊", "๋", "็", "์", "ํ", "ฺ", "ๆ"]); // tones, silencers, marks

function thaiToLatin(input: string): string {
  const ch = [...input];
  let out = "";
  let lead = "";
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (TH_IGNORE.has(c)) continue;
    if (TH_LEAD_VOWEL[c] !== undefined) {
      lead = TH_LEAD_VOWEL[c];
      continue;
    }
    // อ is dual-role: silent vowel-carrier (after a lead vowel, or before a
    // follow vowel like อะ) vs. the vowel "o" between consonants (มอก = mok).
    if (c === "อ") {
      if (lead) {
        out += lead;
        lead = "";
        continue;
      }
      let j = i + 1;
      while (j < ch.length && TH_IGNORE.has(ch[j])) j++;
      if (ch[j] !== undefined && TH_FOLLOW_VOWEL[ch[j]] !== undefined) continue; // carrier → silent
      out += "o";
      continue;
    }
    if (TH_CONS[c] !== undefined) {
      out += TH_CONS[c] + lead; // pronounce the held leading vowel after the consonant
      lead = "";
      continue;
    }
    if (TH_FOLLOW_VOWEL[c] !== undefined) {
      out += TH_FOLLOW_VOWEL[c];
      continue;
    }
    out += c; // Latin / digits pass through
  }
  return out + lead;
}

/** Fold spelling variance so the fuzzy romanization matches English drug names
 *  more forgivingly: aspiration (ph/th/kh→p/t/k), x→ks, and collapse repeats. */
const fold = (s: string) => s.replace(/([ptk])h/g, "$1").replace(/x/g, "ks").replace(/(.)\1+/g, "$1");

function scoreDrug(d: DrugMaster, s: string): number {
  const hay = [norm(d.generic), ...d.tradeNames.map(norm)].map(fold);
  const q = fold(s);
  let best = 0;
  for (const h of hay) {
    if (h === q) best = Math.max(best, 100);
    else if (h.startsWith(q)) best = Math.max(best, 80);
    else if (h.includes(q)) best = Math.max(best, 55);
  }
  if (best === 0 && norm(d.tmtCode).includes(s)) best = 30;
  return best;
}

/**
 * Search the drug master by generic / trade / TMT code, with Thai smart-suggest
 * (Thai input is romanized so "พารา" finds Paracetamol). Returns a Promise
 * (async mock today, a real `fetch` tomorrow — same signature, UI untouched).
 */
export async function searchDrugs(q: string, limit = 8): Promise<DrugMaster[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  // simulate network latency so the UI is built for async from day one
  await new Promise((r) => setTimeout(r, 60));
  const hasThai = /[฀-๿]/.test(trimmed);
  // try the raw (Latin) query AND a romanized form of any Thai
  const candidates = Array.from(new Set([norm(trimmed), hasThai ? norm(thaiToLatin(trimmed)) : ""].filter(Boolean)));
  if (!candidates.length) return [];
  const scored: { d: DrugMaster; score: number }[] = [];
  for (const d of DRUG_MASTER) {
    let score = 0;
    for (const c of candidates) score = Math.max(score, scoreDrug(d, c));
    if (score > 0) scored.push({ d, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.d);
}
