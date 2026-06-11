/**
 * Nurse → Doctor handoff queue. After the OPD nurse finishes registering a
 * patient (via the OCR / voice / manual flow), an entry lands here so the
 * assigned doctor's calendar / schedule can pick it up immediately.
 *
 * - In-memory store with a tiny pub/sub so React surfaces can subscribe
 *   via `useNurseHandoffs()`
 * - Persisted to `localStorage` so a hard reload doesn't drop the queue
 * - Each entry is shaped to slot directly into the doctor's appointment
 *   list (id, time, patientHN/Name, type, status, doctor, etc.)
 */
import { useEffect, useState } from "react";
import type { Appointment } from "./mock/operational";

const STORAGE_KEY = "ehp-nurse-handoff-queue";

export interface NurseHandoff {
  id: string;
  hn: string;
  patientName: string;
  /** Doctor the nurse is forwarding to. */
  doctor: string;
  /** Clinic the patient was registered into. */
  clinic: string;
  /** Reason for visit / chief complaint snippet (optional). */
  reason?: string;
  /** Vital snapshot the nurse captured at registration. */
  vitals?: {
    systolic?: string;
    diastolic?: string;
    pulse?: string;
    temperature?: string;
    respiratoryRate?: string;
    spo2?: string;
    weight?: string;
    height?: string;
  };
  /** ISO timestamp of the handoff. */
  forwardedAt: string;
}

let queue: NurseHandoff[] = loadInitial();
const listeners = new Set<() => void>();

function loadInitial(): NurseHandoff[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NurseHandoff[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore — storage full / disabled
  }
}

function emit() {
  for (const l of listeners) l();
}

export function getNurseHandoffs(): NurseHandoff[] {
  return queue;
}

export function pushNurseHandoff(entry: Omit<NurseHandoff, "id" | "forwardedAt">) {
  const handoff: NurseHandoff = {
    id: `hn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    forwardedAt: new Date().toISOString(),
    ...entry,
  };
  queue = [handoff, ...queue];
  persist();
  emit();
  return handoff;
}

export function removeNurseHandoff(id: string) {
  const before = queue.length;
  queue = queue.filter((h) => h.id !== id);
  if (queue.length !== before) {
    persist();
    emit();
  }
}

export function clearNurseHandoffs() {
  queue = [];
  persist();
  emit();
}

/** React hook: returns the live queue, re-rendering on changes. */
export function useNurseHandoffs(): NurseHandoff[] {
  const [snap, setSnap] = useState(queue);
  useEffect(() => {
    const onChange = () => setSnap(queue);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return snap;
}

/** Project a handoff into an `Appointment` row so doctor-side schedule
 *  views can render it next to the mock TODAY_APPOINTMENTS without
 *  branching on type. Time is the local HH:mm at registration. */
export function handoffToAppointment(h: NurseHandoff): Appointment {
  const t = new Date(h.forwardedAt);
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
    t.getDate(),
  ).padStart(2, "0")}`;
  return {
    id: h.id,
    date: today,
    time: `${hh}:${mm}`,
    clinic: h.clinic,
    doctor: h.doctor,
    patientHN: h.hn,
    patientName: h.patientName,
    type: "New",
    status: "checked_in",
    waitMinutes: 0,
    durationMinutes: 20,
  };
}
