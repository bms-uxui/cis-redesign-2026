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

/** The full toolbox handed to `streamText`. */
export const chatTools = {
  searchPatients,
  getPatientDetail,
  listPatients,
  getVisitsForPatient,
  getLabHistory,
  getVitalHistory,
  getAppointmentsToday,
  getNoShowHistory,
} as const;
