import { supabase } from "../../utils/supabase";
import type { Patient } from "../../types";

// Row stored in the public.patients table. Mirrors the Patient interface
// but uses snake_case and a JSONB column for the extended profile (which
// would otherwise need a second table).
export interface PatientRow {
  hn: string;
  cid: string | null;
  prefix: string | null;
  first_name: string;
  last_name: string;
  gender: Patient["gender"];
  birthdate: string | null;
  blood_group: Patient["bloodGroup"] | null;
  rh: Patient["rh"] | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  religion: string | null;
  occupation: string | null;
  nationality: string | null;
  marital: string | null;
  status: Patient["status"];
  profile: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export function toRow(
  p: Patient,
  profile?: Record<string, unknown>,
): PatientRow {
  return {
    hn: p.hn,
    cid: p.cid || null,
    prefix: p.prefix || null,
    first_name: p.firstName,
    last_name: p.lastName,
    gender: p.gender,
    birthdate: p.birthdate || null,
    blood_group: p.bloodGroup ?? null,
    rh: p.rh ?? null,
    phone: p.phone || null,
    email: p.email || null,
    address: p.address || null,
    religion: p.religion || null,
    occupation: p.occupation || null,
    nationality: p.nationality || null,
    marital: p.marital || null,
    status: p.status ?? "active",
    profile: profile && Object.keys(profile).length > 0 ? profile : null,
  };
}

export async function upsertPatient(
  patient: Patient,
  profile?: Record<string, unknown>,
) {
  const row = toRow(patient, profile);
  const { data, error } = await supabase
    .from("patients")
    .upsert(row, { onConflict: "hn" })
    .select()
    .single();
  if (error) throw error;
  return data as PatientRow;
}

export async function fetchPatient(hn: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("hn", hn)
    .single();
  if (error) throw error;
  return data as PatientRow;
}
