/**
 * ICD-10-TM lookup via the BMS knowledge base (RAG) — knowledge.bmscloud.in.th.
 *
 * STATUS: adapter is wired but DISABLED by default. As of 2026-06-18 the KB host
 * answers 404 on every probed path (/, /openapi.json, /api/v1/retrieve, …) and
 * exposes no OpenAPI spec, so the real endpoint/request/response/auth are still
 * unknown. Until that spec lands this stays behind a flag and the app uses the
 * local catalog (`searchIcd10` in ../../data/icd10).
 *
 * TO GO LIVE:
 *  1) set VITE_AI_KB_ICD10=true (+ VITE_AI_KB_BASE / token if needed)
 *  2) fix REQUEST/RESPONSE below to match the real KB contract
 * Everything else (DxSection search, AI-suggest code resolution) already calls
 * through here and falls back to local on any error, so no UI change is needed.
 */
import { AI_CONFIG, aiFetch } from "./config";
import type { Icd10Entry } from "../../data/icd10";

const env = import.meta.env as Record<string, string | undefined>;

/** Master ICD source is live only when explicitly enabled (avoids 404 spam). */
export const ICD10_RAG_ENABLED = env.VITE_AI_KB_ICD10 === "true";

/** Collection/index name inside the KB that holds the ICD-10-TM master. */
const KB_COLLECTION = env.VITE_AI_KB_ICD10_COLLECTION ?? "icd10-tm";
const KB_TOKEN = env.VITE_AI_KB_TOKEN;

/** Tolerant mapper — accept whatever field names the KB returns. */
function toEntry(r: Record<string, unknown>): Icd10Entry | null {
  const code = (r.code ?? r.icd10 ?? r.icd ?? r.id) as string | undefined;
  const termTh = (r.termTh ?? r.term_th ?? r.name_th ?? r.nameTh ?? r.thai) as string | undefined;
  const termEn = (r.termEn ?? r.term_en ?? r.name_en ?? r.nameEn ?? r.english ?? "") as string;
  if (!code || !termTh) return null;
  const syn = r.synonyms ?? r.synonym ?? r.aliases;
  return {
    code: String(code).trim().toUpperCase(),
    termTh: String(termTh).trim(),
    termEn: String(termEn).trim(),
    synonyms: Array.isArray(syn) ? syn.map(String) : undefined,
  };
}

/**
 * Search the ICD-10-TM master in the KB. Throws on any failure (disabled,
 * network, !ok, bad shape) so callers can fall back to the local catalog.
 */
export async function ragSearchIcd10(query: string, limit = 8, signal?: AbortSignal): Promise<Icd10Entry[]> {
  if (!ICD10_RAG_ENABLED) throw new Error("ICD10 RAG disabled");
  const q = query.trim();
  if (!q) return [];
  // ⚠️ REQUEST shape is a best-guess — confirm against the real KB API spec.
  const res = await aiFetch("kb", `${AI_CONFIG.kbBase}/api/v1/retrieve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(KB_TOKEN ? { Authorization: `Bearer ${KB_TOKEN}` } : {}),
    },
    body: JSON.stringify({ query: q, top_k: limit, collection: KB_COLLECTION }),
    signal,
  });
  const data = await res.json();
  // ⚠️ RESPONSE shape best-guess — accept results[]/data[]/hits[].
  const rows: unknown[] = data?.results ?? data?.data ?? data?.hits ?? (Array.isArray(data) ? data : []);
  const out: Icd10Entry[] = [];
  for (const row of rows) {
    const e = row && typeof row === "object" ? toEntry(row as Record<string, unknown>) : null;
    if (e && !out.some((x) => x.code === e.code)) out.push(e);
  }
  return out.slice(0, limit);
}

/** Resolve a single ICD-10 code from a free-text disease name via the KB.
 *  Used to upgrade AI-suggested diagnoses beyond the local catalog. */
export async function ragResolveIcd10(name: string, signal?: AbortSignal): Promise<Icd10Entry | undefined> {
  const hits = await ragSearchIcd10(name, 1, signal).catch(() => []);
  return hits[0];
}

// ── NLM Clinical Tables (public ICD-10-CM) ──────────────────────────────────
/**
 * NLM Clinical Tables ICD-10-CM autocomplete — public, no auth, CORS-enabled.
 * https://clinicaltables.nlm.nih.gov/apidoc/icd10cm/v3/doc.html
 *
 * ⚠️ This is US ICD-10-**CM**, ENGLISH names only — NOT Thai ICD-10-TM. It's a
 * real, browser-reachable source used to extend the long tail beyond the local
 * Thai catalog. Common Thai OPD codes still come from the local catalog (Thai
 * names); NLM fills codes the local set lacks. Swap to the KB RAG (Thai TM) once
 * its API spec is known. Enabled by default since it works with no setup; turn
 * off with VITE_AI_ICD10_NLM=false.
 */
export const ICD10_NLM_ENABLED = env.VITE_AI_ICD10_NLM !== "false";

export async function nlmSearchIcd10(query: string, limit = 8, signal?: AbortSignal): Promise<Icd10Entry[]> {
  if (!ICD10_NLM_ENABLED) throw new Error("ICD10 NLM disabled");
  const q = query.trim();
  if (!q) return [];
  const url =
    `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(q)}&maxList=${limit}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`NLM ${res.status}`);
  // Response shape: [total, codes[], null, [[code, name], …]]
  const data = (await res.json()) as [number, string[], unknown, [string, string][]];
  const pairs = Array.isArray(data?.[3]) ? data[3] : [];
  const out: Icd10Entry[] = [];
  for (const [code, name] of pairs) {
    if (!code || !name) continue;
    const c = String(code).trim().toUpperCase();
    if (out.some((x) => x.code === c)) continue;
    // English name fills both slots (no Thai available from this source).
    out.push({ code: c, termTh: String(name).trim(), termEn: String(name).trim(), system: "ICD-10-CM" });
  }
  return out.slice(0, limit);
}

// ── WHO ICD-API (official ICD-11 MMS) ───────────────────────────────────────
/**
 * WHO ICD-11 search via the same-origin dev-server token broker (/who-icd/* in
 * vite.config.ts). The broker holds the OAuth secret server-side — the browser
 * never sees it. Enable with VITE_AI_ICD10_WHO=true (+ WHO_ICD_CLIENT_ID/SECRET
 * in .env). In PRODUCTION the /who-icd/search route must be served by a
 * serverless function running the same broker logic.
 *
 * ⚠️ The WHO API only supports full-text search on ICD-**11** (release/10 has no
 * search endpoint). Codes are ICD-11 (e.g. "5A11"), a DIFFERENT system from the
 * ICD-10-TM used for Thai claims — surface them as reference, not for billing.
 */
export const ICD10_WHO_ENABLED = env.VITE_AI_ICD10_WHO === "true";
const WHO_RELEASE = env.VITE_AI_ICD10_WHO_RELEASE ?? "2024-01";

/** Strip the <em class='found'> highlight tags WHO wraps matches in. */
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

export async function whoSearchIcd11(query: string, limit = 8, signal?: AbortSignal): Promise<Icd10Entry[]> {
  if (!ICD10_WHO_ENABLED) throw new Error("ICD WHO disabled");
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(`/who-icd/search?q=${encodeURIComponent(q)}&release=${WHO_RELEASE}&lang=en`, { signal });
  if (!res.ok) throw new Error(`WHO ${res.status}`);
  const data = (await res.json()) as { destinationEntities?: { theCode?: string; title?: string }[] };
  const out: Icd10Entry[] = [];
  for (const e of data?.destinationEntities ?? []) {
    const code = e?.theCode?.trim();
    const title = e?.title ? stripTags(e.title) : "";
    if (!code || !title) continue; // skip chapter/grouping rows without a code
    if (out.some((x) => x.code === code)) continue;
    out.push({ code, termTh: title, termEn: title, system: "ICD-11" });
  }
  return out.slice(0, limit);
}

/** True when ANY external master source is wired (RAG / WHO / NLM). */
export const ICD10_EXTERNAL_ENABLED = ICD10_RAG_ENABLED || ICD10_WHO_ENABLED || ICD10_NLM_ENABLED;

/** Unified external lookup, in precedence order: Thai KB (RAG, ICD-10-TM) →
 *  WHO (official ICD-11) → NLM (ICD-10-CM). Returns the first source that yields
 *  hits; [] on total failure so the caller keeps local catalog results. */
export async function externalSearchIcd10(query: string, limit = 8, signal?: AbortSignal): Promise<Icd10Entry[]> {
  if (ICD10_RAG_ENABLED) {
    const hits = await ragSearchIcd10(query, limit, signal).catch(() => [] as Icd10Entry[]);
    if (hits.length) return hits;
  }
  if (ICD10_WHO_ENABLED) {
    const hits = await whoSearchIcd11(query, limit, signal).catch(() => [] as Icd10Entry[]);
    if (hits.length) return hits;
  }
  if (ICD10_NLM_ENABLED) return nlmSearchIcd10(query, limit, signal).catch(() => [] as Icd10Entry[]);
  return [];
}
