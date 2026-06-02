import { useSyncExternalStore } from "react";
import type { Patient, StoredProfile } from "../types";
import { seedPatients } from "./mockData";

const PATIENTS_KEY = "opd.patients.v1";
const PROFILES_KEY = "opd.profiles.v1";

let patientsCache: Patient[] = hydratePatients();
let profilesCache: Record<string, StoredProfile> = hydrateProfiles();

const listeners = new Set<() => void>();

function hydratePatients(): Patient[] {
  if (typeof window === "undefined") return seedPatients;
  try {
    const raw = window.localStorage.getItem(PATIENTS_KEY);
    if (raw) return JSON.parse(raw) as Patient[];
  } catch {
    /* fall through */
  }
  return seedPatients;
}

function hydrateProfiles(): Record<string, StoredProfile> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    if (raw) return JSON.parse(raw) as Record<string, StoredProfile>;
  } catch {
    /* fall through */
  }
  return {};
}

function persistPatients() {
  try {
    window.localStorage.setItem(PATIENTS_KEY, JSON.stringify(patientsCache));
  } catch {
    /* ignore */
  }
}
function persistProfiles() {
  try {
    window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profilesCache));
  } catch {
    /* ignore */
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePatients(): Patient[] {
  return useSyncExternalStore(
    subscribe,
    () => patientsCache,
    () => patientsCache,
  );
}

export function getAllPatients(): Patient[] {
  return patientsCache;
}

export function getPatient(hn: string): Patient | undefined {
  return patientsCache.find((p) => p.hn === hn);
}

export function nextHN(): string {
  const max = patientsCache.reduce((acc, p) => {
    const n = Number(p.hn);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 680000);
  return String(max + 1);
}

export function addPatient(p: Patient) {
  patientsCache = [p, ...patientsCache];
  persistPatients();
  emit();
}

export function updatePatient(hn: string, patch: Partial<Patient>) {
  let changed = false;
  patientsCache = patientsCache.map((p) => {
    if (p.hn !== hn) return p;
    changed = true;
    return { ...p, ...patch };
  });
  if (changed) {
    persistPatients();
    emit();
  }
}

export function removePatient(hn: string) {
  patientsCache = patientsCache.filter((p) => p.hn !== hn);
  if (profilesCache[hn]) {
    const next = { ...profilesCache };
    delete next[hn];
    profilesCache = next;
    persistProfiles();
  }
  persistPatients();
  emit();
}

export function getStoredProfile(hn: string): StoredProfile | undefined {
  return profilesCache[hn];
}

export function saveProfile(
  hn: string,
  form: Record<string, string>,
  flags: Record<string, boolean>,
  extras?: Partial<StoredProfile>,
) {
  profilesCache = {
    ...profilesCache,
    [hn]: {
      ...profilesCache[hn],
      ...extras,
      form,
      flags,
    },
  };
  persistProfiles();
  emit();
}

export function useStoredProfile(hn: string | undefined): StoredProfile | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (hn ? profilesCache[hn] : undefined),
    () => (hn ? profilesCache[hn] : undefined),
  );
}
