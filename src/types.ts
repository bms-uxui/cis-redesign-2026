export type Gender = "male" | "female" | "other";
export type BloodGroup = "A" | "B" | "AB" | "O";
export type Rh = "+" | "-";

export interface Patient {
  hn: string;
  cid: string;
  prefix: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthdate: string;
  bloodGroup?: BloodGroup;
  rh?: Rh;
  phone?: string;
  address?: string;
  email?: string;
  religion?: string;
  occupation?: string;
  nationality?: string;
  marital?: string;
  insurance?: string;
  photo?: string;
  lastVisit?: string;
  totalVisits?: number;
  status?: "active" | "inactive" | "deceased";
  tags?: string[];
}

export type VisitType = "walk-in" | "appointment" | "emergency" | "follow-up";
export type VisitStatus = "waiting" | "in-progress" | "completed" | "cancelled";

export interface Visit {
  id: string;
  hn: string;
  patientName: string;
  photo?: string;
  visitDate: string;
  type: VisitType;
  status: VisitStatus;
  department: string;
  doctor: string;
  queueNo: string;
  reason: string;
  insurance?: string;
  vitals?: {
    bp?: string;
    hr?: number;
    rr?: number;
    temp?: number;
    spo2?: number;
    weight?: number;
    height?: number;
  };
  diagnosis?: string;
}

export interface OPDRight {
  id: string;
  code: string;
  name: string;
  no: string;
  begin: string;
  expire: string;
}

export interface OPDListRow {
  id: string;
  data: Record<string, string>;
}

export interface OPDAllergy {
  id: string;
  data: Record<string, string>;
  flags: Record<string, boolean>;
}

export type OPDListKey =
  | "chronic"
  | "special"
  | "appointment"
  | "note"
  | "caregiver"
  | "food-allergy"
  | "confidential";

export interface StoredProfile {
  form: Record<string, string>;
  flags: Record<string, boolean>;
  rights?: OPDRight[];
  drugAllergies?: OPDAllergy[];
  lists?: Partial<Record<OPDListKey, OPDListRow[]>>;
}
