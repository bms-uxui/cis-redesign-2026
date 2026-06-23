/**
 * Tools exposed to Mae (the clinical chat assistant) via the Vercel AI
 * SDK. Each tool wraps one of the in-memory tables in `dataTables.ts`,
 * lets the LLM filter / search / fetch on demand, and returns plain JSON
 * the model can reason over.
 *
 * Tools are deliberately granular instead of "dump the whole table":
 * the model picks the smallest tool that answers the question — e.g.
 * "เลือดกรุ๊ปสมชาย ใจดี" → `searchPatients` → one row, vs. dumping all
 * 25 patient records.
 */
import { tool } from "ai";
import { z } from "zod";
import { PATIENTS } from "../data/mock/patients";
import {
  LAB_HISTORY,
  VITAL_HISTORY,
  VISIT_HISTORY,
} from "../data/mock/clinical";
import {
  TODAY_APPOINTMENTS,
  NO_SHOW_HISTORY,
} from "../data/mock/operational";

// ── Helpers ───────────────────────────────────────────────────────────────

function normalizeThai(s: string): string {
  return s.trim().replace(/\s+/g, "").toLowerCase();
}

/** Split a free-text query into individual match terms (space/comma/Thai
 *  conjunction separated). The caller passes synonyms (e.g. "ท้อง หน้าท้อง
 *  ลิ้นปี่ abdomen") and we OR-match any of them — keeps the tools generic
 *  instead of hard-coding a symptom taxonomy. */
function splitTerms(q: string): string[] {
  return q
    .split(/[\s,/|]+|และ|หรือ/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 1);
}

/** Common Thai symptom roots — the default vocabulary scanned when a
 *  recurrence query doesn't name a specific symptom. NOT exhaustive; the
 *  model can always pass its own `keywords`. */
const SYMPTOM_ROOTS = [
  "ปวด", "เจ็บ", "แสบ", "ชา", "บวม", "ไอ", "เสมหะ", "ไข้", "เวียน",
  "เหนื่อย", "หอบ", "แน่น", "ใจสั่น", "คลื่นไส้", "อาเจียน", "ท้องเสีย",
  "ผื่น", "คัน", "อ่อนเพลีย", "นอนไม่หลับ", "มึน", "หน้ามืด",
];

/** Every searchable clinical text fragment for one patient, tagged with the
 *  field it came from + the visit date when applicable. Pulls from BOTH the
 *  patient's `recentVisits` (with OPQRST detail) and the longitudinal
 *  `VISIT_HISTORY`, so symptom/complaint search spans the whole timeline. */
function clinicalCorpus(p: (typeof PATIENTS)[number]) {
  const out: { field: string; text: string; date?: string; clinic?: string }[] = [];
  p.diagnoses.forEach((d) => out.push({ field: "diagnosis", text: d.name, date: d.onsetDate }));
  p.allergies.forEach((a) => out.push({ field: "allergy", text: `${a.substance} ${a.reaction}` }));
  p.medications.forEach((m) => out.push({ field: "medication", text: `${m.drug} ${m.dose}` }));
  (p.recentVisits ?? []).forEach((v) => {
    out.push({ field: "chiefComplaint", text: v.chiefComplaint, date: v.date, clinic: v.clinic });
    if (v.diagnosis) out.push({ field: "visitDiagnosis", text: v.diagnosis, date: v.date, clinic: v.clinic });
    const o = v.opqrst;
    if (o) {
      const sym = [o.region, o.quality, o.associated, o.provocation, o.timing, o.radiation]
        .filter(Boolean)
        .join(" · ");
      if (sym) out.push({ field: "symptom", text: sym, date: v.date, clinic: v.clinic });
    }
  });
  (VISIT_HISTORY[p.id] ?? []).forEach((v) => {
    out.push({ field: "visit", text: `${v.chiefComplaint} — ${v.notes}`, date: v.date, clinic: v.clinic });
    (v.diagnoses ?? []).forEach((d) => out.push({ field: "visitDiagnosis", text: d.name, date: v.date, clinic: v.clinic }));
  });
  return out;
}

/** Loose patient lookup by name or HN. Strips Thai prefixes + whitespace
 *  and matches firstName+lastName / lastName+firstName concatenations. */
function findPatients(query: string) {
  const q = normalizeThai(
    query.replace(/^(นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.|คุณ)/, ""),
  );
  if (!q) return [];
  return PATIENTS.filter((p) => {
    if (p.hn.includes(q)) return true;
    const full1 = normalizeThai(p.firstName + p.lastName);
    const full2 = normalizeThai(p.lastName + p.firstName);
    return full1.includes(q) || full2.includes(q) || q.includes(normalizeThai(p.firstName));
  });
}

// ── Tools ─────────────────────────────────────────────────────────────────

export const searchPatients = tool({
  description:
    "Search for patients by name (Thai or romanized) or HN. Returns a short summary per match — use `getPatientDetail` to fetch the full record once you've identified the right patient.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Thai name fragment (with or without prefix), or full HN like '00012345'"),
  }),
  execute: async ({ query }) => {
    const matches = findPatients(query).slice(0, 10);
    return {
      count: matches.length,
      patients: matches.map((p) => ({
        id: p.id,
        hn: p.hn,
        name: `${p.prefix}${p.firstName} ${p.lastName}`,
        age: p.age,
        gender: p.gender,
        bloodGroup: `${p.bloodType}${p.rh}`,
        primaryDiagnoses: p.diagnoses.slice(0, 3).map((d) => d.name),
      })),
    };
  },
});

export const getPatientDetail = tool({
  description:
    "Fetch the FULL clinical record for one patient (demographics + diagnoses + allergies + medications + latest labs + risk flags + next appointment). Accepts patient id (e.g. 'p001') or HN.",
  inputSchema: z.object({
    patientId: z.string().describe("Patient `id` (e.g. 'p001') or HN (e.g. '00012345')"),
  }),
  execute: async ({ patientId }) => {
    const p =
      PATIENTS.find((x) => x.id === patientId || x.hn === patientId) ??
      findPatients(patientId)[0];
    if (!p) return { found: false, patientId } as const;
    return { found: true, patient: p } as const;
  },
});

export const listPatients = tool({
  description:
    "List the active patient panel with key vitals + risk flags. Useful for cohort questions (e.g. 'who is hypertensive', 'show me the diabetic patients').",
  inputSchema: z.object({
    status: z
      .enum(["active", "discharged", "deceased", "all"])
      .optional()
      .describe("Filter by patient status (default: active)"),
    riskFlag: z
      .string()
      .optional()
      .describe(
        "Optional risk flag to filter on: 'dm-uncontrolled' | 'ht-uncontrolled' | 'ckd-stage3' | 'ckd-stage4' | 'fall-risk' | 'polypharmacy' | 'missed-followup' | 'smoker' | 'obesity'",
      ),
  }),
  execute: async ({ status = "active", riskFlag }) => {
    let rows = PATIENTS;
    if (status !== "all") rows = rows.filter((p) => p.status === status);
    if (riskFlag) rows = rows.filter((p) => p.riskFlags.includes(riskFlag as never));
    return {
      count: rows.length,
      patients: rows.map((p) => ({
        id: p.id,
        hn: p.hn,
        name: `${p.prefix}${p.firstName} ${p.lastName}`,
        age: p.age,
        gender: p.gender,
        diagnoses: p.diagnoses.map((d) => d.name),
        bp: `${p.vitals.systolic}/${p.vitals.diastolic}`,
        riskFlags: p.riskFlags,
      })),
    };
  },
});

export const getVisitsForPatient = tool({
  description:
    "Get the visit history for a specific patient (date, clinic, CC, vitals, dx, orders, disposition).",
  inputSchema: z.object({
    patientId: z.string().describe("Patient `id` (e.g. 'p001') or HN"),
    limit: z.number().int().min(1).max(30).optional().describe("Cap on rows (default 12, most recent first)"),
  }),
  execute: async ({ patientId, limit = 12 }) => {
    const p =
      PATIENTS.find((x) => x.id === patientId || x.hn === patientId) ??
      findPatients(patientId)[0];
    if (!p) return { found: false, patientId } as const;
    const visits = (VISIT_HISTORY[p.id] ?? []).slice(-limit).reverse();
    return { found: true, patientId: p.id, count: visits.length, visits } as const;
  },
});

export const getLabHistory = tool({
  description:
    "Get longitudinal lab values for one patient (12 monthly points per test). Optionally filter to a single test like 'HbA1c', 'LDL', 'Creatinine'.",
  inputSchema: z.object({
    patientId: z.string().describe("Patient `id` or HN"),
    test: z.string().optional().describe("Restrict to one test name (case-sensitive)"),
  }),
  execute: async ({ patientId, test }) => {
    const p =
      PATIENTS.find((x) => x.id === patientId || x.hn === patientId) ??
      findPatients(patientId)[0];
    if (!p) return { found: false, patientId } as const;
    let points = LAB_HISTORY[p.id] ?? [];
    if (test) points = points.filter((l) => l.test === test);
    return { found: true, patientId: p.id, count: points.length, labs: points } as const;
  },
});

export const getVitalHistory = tool({
  description:
    "Get 12-month vital signs trend for one patient (systolic, diastolic, weight, BMI, heart rate per month).",
  inputSchema: z.object({
    patientId: z.string().describe("Patient `id` or HN"),
  }),
  execute: async ({ patientId }) => {
    const p =
      PATIENTS.find((x) => x.id === patientId || x.hn === patientId) ??
      findPatients(patientId)[0];
    if (!p) return { found: false, patientId } as const;
    const points = VITAL_HISTORY[p.id] ?? [];
    return { found: true, patientId: p.id, count: points.length, vitals: points } as const;
  },
});

export const getAppointmentsToday = tool({
  description:
    "Today's appointment schedule across all clinics. Use this for queue / no-show / wait-time questions about the current day.",
  inputSchema: z.object({
    clinic: z.string().optional().describe("Filter by clinic name (Thai)"),
    status: z
      .enum(["scheduled", "checked_in", "in_progress", "done", "no_show", "cancelled"])
      .optional(),
  }),
  execute: async ({ clinic, status }) => {
    let rows = TODAY_APPOINTMENTS;
    if (clinic) rows = rows.filter((a) => a.clinic === clinic);
    if (status) rows = rows.filter((a) => a.status === status);
    return { count: rows.length, appointments: rows.slice(0, 200) };
  },
});

export const getNoShowHistory = tool({
  description:
    "30-day history of no-shows per clinic per day. Useful for trend questions like 'no-show rate by clinic' or 'how many no-shows last week'.",
  inputSchema: z.object({
    clinic: z.string().optional().describe("Filter by clinic name"),
  }),
  execute: async ({ clinic }) => {
    let rows = NO_SHOW_HISTORY;
    if (clinic) rows = rows.filter((r) => r.clinic === clinic);
    return { count: rows.length, records: rows };
  },
});

export const searchPatientsByClinical = tool({
  description:
    "Search ACROSS ALL patients by clinical content — symptoms, body site, chief complaints, diagnoses, medications, allergies. Use this for cohort questions like 'who has abdominal pain', 'which patients are on metformin', 'anyone allergic to penicillin'. Pass `keywords` as a space-separated list that INCLUDES synonyms / Thai+English variants for the concept (e.g. for abdominal pain: 'ท้อง หน้าท้อง ปวดท้อง ลิ้นปี่ abdomen epigastr'); any term matching counts. Returns each matching patient with the snippets + visit dates that matched.",
  inputSchema: z.object({
    keywords: z
      .string()
      .describe("Space-separated match terms incl. synonyms (Thai &/or English). OR-matched as substrings."),
    fields: z
      .array(z.enum(["symptom", "chiefComplaint", "diagnosis", "visitDiagnosis", "visit", "medication", "allergy"]))
      .optional()
      .describe("Optionally restrict which clinical fields to search (default: all)."),
    limit: z.number().int().min(1).max(25).optional().describe("Max patients to return (default 15)."),
  }),
  execute: async ({ keywords, fields, limit = 15 }) => {
    const terms = splitTerms(keywords);
    if (!terms.length) return { count: 0, patients: [] };
    const fieldSet = fields && fields.length ? new Set(fields) : null;
    const results = PATIENTS.map((p) => {
      const hits = clinicalCorpus(p).filter((e) => {
        if (fieldSet && !fieldSet.has(e.field as never)) return false;
        const t = e.text.toLowerCase();
        return terms.some((term) => t.includes(term));
      });
      return { p, hits };
    })
      .filter((r) => r.hits.length > 0)
      .slice(0, limit);
    return {
      count: results.length,
      patients: results.map(({ p, hits }) => ({
        id: p.id,
        hn: p.hn,
        name: `${p.prefix}${p.firstName} ${p.lastName}`,
        age: p.age,
        gender: p.gender,
        // dedupe + cap snippets so the model gets evidence without flooding
        matches: hits.slice(0, 6).map((h) => ({ field: h.field, text: h.text, date: h.date, clinic: h.clinic })),
        matchCount: hits.length,
      })),
    };
  },
});

export const findRecurringComplaints = tool({
  description:
    "Find patients whose SAME symptom/complaint recurs across multiple visits — i.e. chronic / persistent problems carried over from earlier visits. Optionally pass `keywords` (with synonyms) to focus on one symptom (e.g. 'ปวด เจ็บ' for chronic pain, 'ไอ เสมหะ' for chronic cough); omit to scan a default symptom vocabulary. A term counts as recurring only when it appears on `minVisits`+ DISTINCT visit dates. Returns each patient with the recurring term(s), how many visits, and the date span.",
  inputSchema: z.object({
    keywords: z
      .string()
      .optional()
      .describe("Space-separated symptom terms incl. synonyms to track. Omit to scan a default symptom set."),
    minVisits: z.number().int().min(2).max(10).optional().describe("Min distinct visits a term must appear on to count as recurring (default 2)."),
  }),
  execute: async ({ keywords, minVisits = 2 }) => {
    const vocab = keywords ? splitTerms(keywords) : SYMPTOM_ROOTS;
    const out: {
      id: string; hn: string; name: string;
      recurring: { term: string; visits: number; firstDate?: string; lastDate?: string; samples: string[] }[];
    }[] = [];
    for (const p of PATIENTS) {
      // Only symptom-bearing, dated entries (complaints/symptoms/visits).
      const entries = clinicalCorpus(p).filter(
        (e) => e.date && ["symptom", "chiefComplaint", "visit"].includes(e.field),
      );
      const recurring: { term: string; visits: number; firstDate?: string; lastDate?: string; samples: string[] }[] = [];
      for (const term of vocab) {
        const matched = entries.filter((e) => e.text.toLowerCase().includes(term));
        const dates = [...new Set(matched.map((e) => e.date!))].sort();
        if (dates.length >= minVisits) {
          recurring.push({
            term,
            visits: dates.length,
            firstDate: dates[0],
            lastDate: dates[dates.length - 1],
            samples: [...new Set(matched.map((e) => e.text))].slice(0, 3),
          });
        }
      }
      if (recurring.length) {
        recurring.sort((a, b) => b.visits - a.visits);
        out.push({ id: p.id, hn: p.hn, name: `${p.prefix}${p.firstName} ${p.lastName}`, recurring });
      }
    }
    return { count: out.length, patients: out };
  },
});

export const findAbnormalLabs = tool({
  description:
    "List ALL patients who have at least one ABNORMAL (out-of-reference-range) lab result, in ONE call. Use this for cohort questions like 'ใครมีผลแล็บผิดปกติบ้าง', 'who has abnormal kidney function'. Optionally pass `test` to focus on one panel (e.g. 'HbA1c', 'Creatinine', 'LDL', 'FBS'). Do NOT loop getLabHistory per patient — this scans everyone at once.",
  inputSchema: z.object({
    test: z.string().optional().describe("Restrict to one test name (substring, case-insensitive), e.g. 'Creatinine'."),
    limit: z.number().int().min(1).max(25).optional().describe("Max patients to return (default 25)."),
  }),
  execute: async ({ test, limit = 25 }) => {
    const t = test?.trim().toLowerCase();
    const results = PATIENTS.map((p) => {
      const abn = p.labs.filter(
        (l) => l.abnormal && (!t || l.test.toLowerCase().includes(t)),
      );
      return { p, abn };
    })
      .filter((r) => r.abn.length > 0)
      .slice(0, limit);
    return {
      count: results.length,
      patients: results.map(({ p, abn }) => ({
        id: p.id,
        hn: p.hn,
        name: `${p.prefix}${p.firstName} ${p.lastName}`,
        age: p.age,
        gender: p.gender,
        diagnoses: p.diagnoses.slice(0, 3).map((d) => d.name),
        abnormalLabs: abn.map((l) => ({
          test: l.test,
          value: l.value,
          unit: l.unit,
          referenceRange: l.referenceRange,
          takenAt: l.takenAt,
        })),
      })),
    };
  },
});

/** The full toolbox handed to `streamText`. */
export const chatTools = {
  searchPatients,
  getPatientDetail,
  listPatients,
  searchPatientsByClinical,
  findRecurringComplaints,
  findAbnormalLabs,
  getVisitsForPatient,
  getLabHistory,
  getVitalHistory,
  getAppointmentsToday,
  getNoShowHistory,
} as const;
