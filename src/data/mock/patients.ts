/**
 * Rich clinical patient mock dataset. Internally consistent — patients with
 * a diagnosis carry matching medications, abnormal labs, and risk flags so
 * any aggregation we compute reads as realistic. Sized at 25 patients which
 * is enough to produce useful charts without being unwieldy.
 *
 * If you change a patient's diagnoses, double-check that their medications
 * and labs still line up — that consistency is what makes the dashboards
 * feel real.
 */

export type Gender = "M" | "F";
export type BloodType = "A" | "B" | "AB" | "O";
export type Rh = "+" | "-";
export type Insurance = "UC" | "SSO" | "CSMBS" | "OOP" | "Private";
export type PatientStatus = "active" | "discharged" | "deceased";
export type Severity = "mild" | "moderate" | "severe";

export type RiskFlag =
  | "dm-uncontrolled"
  | "ht-uncontrolled"
  | "ckd-stage3"
  | "ckd-stage4"
  | "fall-risk"
  | "polypharmacy"
  | "missed-followup"
  | "smoker"
  | "obesity";

export interface Vitals {
  /** cm */
  height: number;
  /** kg */
  weight: number;
  /** computed */
  bmi: number;
  systolic: number;
  diastolic: number;
  heartRate: number;
  /** °C */
  temperature: number;
  measuredAt: string;
}

export interface Diagnosis {
  /** ICD-10 */
  code: string;
  name: string;
  onsetDate: string;
  severity: Severity;
}

export interface Allergy {
  substance: string;
  reaction: string;
}

export interface Medication {
  drug: string;
  dose: string;
  frequency: string;
  startedAt: string;
}

export interface LabResult {
  test: string;
  value: number;
  unit: string;
  referenceRange: string;
  abnormal: boolean;
  takenAt: string;
}

export interface AppointmentSummary {
  date: string;
  clinic: string;
  doctor: string;
  type: string;
}

export interface VisitSummary {
  date: string;
  clinic: string;
  chiefComplaint: string;
  diagnosis: string;
}

export interface Patient {
  id: string;
  hn: string;
  citizenId: string;
  prefix: "นาย" | "นาง" | "นางสาว" | "ด.ช." | "ด.ญ.";
  firstName: string;
  lastName: string;
  birthDate: string;
  age: number;
  gender: Gender;
  bloodType: BloodType;
  rh: Rh;
  phone: string;
  email?: string;
  address: { district: string; province: string };
  insurance: Insurance;
  status: PatientStatus;
  registeredDate: string;
  lastVisit: string;
  primaryDoctor: string;
  vitals: Vitals;
  diagnoses: Diagnosis[];
  allergies: Allergy[];
  medications: Medication[];
  labs: LabResult[];
  nextAppointment?: AppointmentSummary;
  recentVisits: VisitSummary[];
  riskFlags: RiskFlag[];
}

// ── Helpers for the seed ───────────────────────────────────────────────────
const today = new Date();
const isoDaysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const isoDaysAhead = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// ── Patient catalog ────────────────────────────────────────────────────────

export const PATIENTS: Patient[] = [
  // ── Diabetic group ─────────────────────────────────────────────────────
  {
    id: "p001",
    hn: "00012345",
    citizenId: "1-2345-67891-23-4",
    prefix: "นาย",
    firstName: "สมชาย",
    lastName: "ใจดี",
    birthDate: "1962-03-14",
    age: 63,
    gender: "M",
    bloodType: "A",
    rh: "+",
    phone: "081-234-5678",
    email: "somchai.j@gmail.com",
    address: { district: "บางรัก", province: "กรุงเทพมหานคร" },
    insurance: "CSMBS",
    status: "active",
    registeredDate: "2018-06-12",
    lastVisit: isoDaysAgo(8),
    primaryDoctor: "นพ.ราอูล มันเมาะ",
    vitals: {
      height: 168,
      weight: 78,
      bmi: 27.6,
      systolic: 152,
      diastolic: 94,
      heartRate: 82,
      temperature: 36.6,
      measuredAt: isoDaysAgo(8),
    },
    diagnoses: [
      { code: "E11.9", name: "เบาหวานชนิดที่ 2 (ควบคุมได้ไม่ดี)", onsetDate: "2018-06-15", severity: "moderate" },
      { code: "I10", name: "ความดันโลหิตสูง", onsetDate: "2019-02-20", severity: "moderate" },
      { code: "E78.5", name: "ไขมันในเลือดสูง", onsetDate: "2019-02-20", severity: "mild" },
    ],
    allergies: [{ substance: "Sulfa", reaction: "ผื่น" }],
    medications: [
      { drug: "Metformin", dose: "1000 mg", frequency: "หลังอาหารเช้า-เย็น", startedAt: "2018-06-15" },
      { drug: "Glipizide", dose: "5 mg", frequency: "ก่อนอาหารเช้า", startedAt: "2022-01-10" },
      { drug: "Losartan", dose: "50 mg", frequency: "วันละครั้ง เช้า", startedAt: "2019-02-25" },
      { drug: "Atorvastatin", dose: "20 mg", frequency: "ก่อนนอน", startedAt: "2019-03-01" },
      { drug: "Aspirin", dose: "81 mg", frequency: "วันละครั้ง", startedAt: "2019-03-01" },
    ],
    labs: [
      { test: "HbA1c", value: 8.4, unit: "%", referenceRange: "<6.5", abnormal: true, takenAt: isoDaysAgo(8) },
      { test: "FBS", value: 168, unit: "mg/dL", referenceRange: "70-100", abnormal: true, takenAt: isoDaysAgo(8) },
      { test: "Creatinine", value: 1.3, unit: "mg/dL", referenceRange: "0.7-1.2", abnormal: true, takenAt: isoDaysAgo(8) },
      { test: "LDL", value: 145, unit: "mg/dL", referenceRange: "<100", abnormal: true, takenAt: isoDaysAgo(8) },
    ],
    nextAppointment: { date: isoDaysAhead(22), clinic: "DM Clinic", doctor: "นพ.ราอูล มันเมาะ", type: "Follow-up" },
    recentVisits: [
      { date: isoDaysAgo(8), clinic: "DM Clinic", chiefComplaint: "ติดตามผล HbA1c", diagnosis: "DM type 2 uncontrolled" },
      { date: isoDaysAgo(98), clinic: "DM Clinic", chiefComplaint: "ติดตามผล", diagnosis: "DM type 2" },
    ],
    riskFlags: ["dm-uncontrolled", "ht-uncontrolled", "polypharmacy", "obesity"],
  },
  {
    id: "p002",
    hn: "00012346",
    citizenId: "1-1234-56789-12-3",
    prefix: "นาง",
    firstName: "สมหญิง",
    lastName: "วัฒนสุข",
    birthDate: "1971-08-22",
    age: 54,
    gender: "F",
    bloodType: "O",
    rh: "+",
    phone: "089-876-5432",
    address: { district: "ห้วยขวาง", province: "กรุงเทพมหานคร" },
    insurance: "SSO",
    status: "active",
    registeredDate: "2020-01-15",
    lastVisit: isoDaysAgo(3),
    primaryDoctor: "พญ.วราภรณ์ ดีพร้อม",
    vitals: { height: 158, weight: 62, bmi: 24.8, systolic: 128, diastolic: 78, heartRate: 76, temperature: 36.5, measuredAt: isoDaysAgo(3) },
    diagnoses: [{ code: "E11.9", name: "เบาหวานชนิดที่ 2 (ควบคุมได้ดี)", onsetDate: "2020-01-20", severity: "mild" }],
    allergies: [],
    medications: [{ drug: "Metformin", dose: "500 mg", frequency: "หลังอาหารเช้า-เย็น", startedAt: "2020-01-20" }],
    labs: [
      { test: "HbA1c", value: 6.4, unit: "%", referenceRange: "<6.5", abnormal: false, takenAt: isoDaysAgo(3) },
      { test: "FBS", value: 102, unit: "mg/dL", referenceRange: "70-100", abnormal: true, takenAt: isoDaysAgo(3) },
      { test: "Creatinine", value: 0.9, unit: "mg/dL", referenceRange: "0.7-1.2", abnormal: false, takenAt: isoDaysAgo(3) },
    ],
    nextAppointment: { date: isoDaysAhead(87), clinic: "DM Clinic", doctor: "พญ.วราภรณ์ ดีพร้อม", type: "Follow-up" },
    recentVisits: [{ date: isoDaysAgo(3), clinic: "DM Clinic", chiefComplaint: "ติดตามผล", diagnosis: "DM type 2" }],
    riskFlags: [],
  },
  {
    id: "p003",
    hn: "00013002",
    citizenId: "1-1011-22334-55-6",
    prefix: "นาย",
    firstName: "ธนพร",
    lastName: "ศรีเมือง",
    birthDate: "1955-11-03",
    age: 70,
    gender: "M",
    bloodType: "B",
    rh: "+",
    phone: "086-333-4444",
    address: { district: "ลาดพร้าว", province: "กรุงเทพมหานคร" },
    insurance: "UC",
    status: "active",
    registeredDate: "2015-09-04",
    lastVisit: isoDaysAgo(45),
    primaryDoctor: "นพ.ราอูล มันเมาะ",
    vitals: { height: 172, weight: 84, bmi: 28.4, systolic: 168, diastolic: 102, heartRate: 88, temperature: 36.7, measuredAt: isoDaysAgo(45) },
    diagnoses: [
      { code: "E11.9", name: "เบาหวานชนิดที่ 2 (ควบคุมไม่ได้)", onsetDate: "2015-09-10", severity: "severe" },
      { code: "I10", name: "ความดันโลหิตสูง (ควบคุมไม่ได้)", onsetDate: "2015-09-10", severity: "severe" },
      { code: "N18.3", name: "โรคไตเรื้อรัง stage 3", onsetDate: "2022-04-12", severity: "moderate" },
    ],
    allergies: [{ substance: "Penicillin", reaction: "ผื่นบวม" }],
    medications: [
      { drug: "Insulin Glargine", dose: "20 units", frequency: "ก่อนนอน", startedAt: "2023-02-14" },
      { drug: "Metformin", dose: "500 mg", frequency: "หลังอาหารเช้า-เย็น (ปรับลด)", startedAt: "2015-09-10" },
      { drug: "Amlodipine", dose: "10 mg", frequency: "วันละครั้ง เช้า", startedAt: "2015-09-10" },
      { drug: "Enalapril", dose: "10 mg", frequency: "วันละ 2 ครั้ง", startedAt: "2020-05-18" },
      { drug: "Furosemide", dose: "40 mg", frequency: "วันละครั้ง เช้า", startedAt: "2022-04-15" },
      { drug: "Atorvastatin", dose: "40 mg", frequency: "ก่อนนอน", startedAt: "2018-03-01" },
      { drug: "Aspirin", dose: "81 mg", frequency: "วันละครั้ง", startedAt: "2018-03-01" },
    ],
    labs: [
      { test: "HbA1c", value: 9.8, unit: "%", referenceRange: "<6.5", abnormal: true, takenAt: isoDaysAgo(45) },
      { test: "Creatinine", value: 2.1, unit: "mg/dL", referenceRange: "0.7-1.2", abnormal: true, takenAt: isoDaysAgo(45) },
      { test: "eGFR", value: 38, unit: "mL/min/1.73m²", referenceRange: ">60", abnormal: true, takenAt: isoDaysAgo(45) },
    ],
    nextAppointment: { date: isoDaysAhead(2), clinic: "DM Clinic", doctor: "นพ.ราอูล มันเมาะ", type: "Follow-up" },
    recentVisits: [
      { date: isoDaysAgo(45), clinic: "DM Clinic", chiefComplaint: "อ่อนเพลีย, บวม", diagnosis: "DM + HT + CKD3" },
    ],
    riskFlags: ["dm-uncontrolled", "ht-uncontrolled", "ckd-stage3", "polypharmacy", "fall-risk"],
  },

  // ── Hypertension group ─────────────────────────────────────────────────
  {
    id: "p004",
    hn: "00014001",
    citizenId: "1-1100-22000-33-1",
    prefix: "นางสาว",
    firstName: "ปริชาติ",
    lastName: "พิทักษ์",
    birthDate: "1980-04-18",
    age: 45,
    gender: "F",
    bloodType: "A",
    rh: "+",
    phone: "082-111-2222",
    address: { district: "บางกะปิ", province: "กรุงเทพมหานคร" },
    insurance: "Private",
    status: "active",
    registeredDate: "2022-03-08",
    lastVisit: isoDaysAgo(14),
    primaryDoctor: "พญ.วราภรณ์ ดีพร้อม",
    vitals: { height: 162, weight: 67, bmi: 25.5, systolic: 138, diastolic: 88, heartRate: 78, temperature: 36.5, measuredAt: isoDaysAgo(14) },
    diagnoses: [{ code: "I10", name: "ความดันโลหิตสูง (ควบคุมได้)", onsetDate: "2022-03-10", severity: "mild" }],
    allergies: [],
    medications: [{ drug: "Amlodipine", dose: "5 mg", frequency: "วันละครั้ง เช้า", startedAt: "2022-03-10" }],
    labs: [{ test: "Creatinine", value: 0.8, unit: "mg/dL", referenceRange: "0.7-1.2", abnormal: false, takenAt: isoDaysAgo(14) }],
    nextAppointment: { date: isoDaysAhead(80), clinic: "HT Clinic", doctor: "พญ.วราภรณ์ ดีพร้อม", type: "Follow-up" },
    recentVisits: [{ date: isoDaysAgo(14), clinic: "HT Clinic", chiefComplaint: "ติดตามผล", diagnosis: "Essential HT" }],
    riskFlags: [],
  },
  {
    id: "p005",
    hn: "00014050",
    citizenId: "3-4567-89012-34-5",
    prefix: "นาย",
    firstName: "นพดล",
    lastName: "ศรีเมือง",
    birthDate: "1968-09-12",
    age: 57,
    gender: "M",
    bloodType: "O",
    rh: "+",
    phone: "086-333-4444",
    address: { district: "ดินแดง", province: "กรุงเทพมหานคร" },
    insurance: "SSO",
    status: "active",
    registeredDate: "2017-11-20",
    lastVisit: isoDaysAgo(60),
    primaryDoctor: "นพ.ราอูล มันเมาะ",
    vitals: { height: 174, weight: 92, bmi: 30.4, systolic: 156, diastolic: 96, heartRate: 84, temperature: 36.6, measuredAt: isoDaysAgo(60) },
    diagnoses: [
      { code: "I10", name: "ความดันโลหิตสูง (ควบคุมไม่ได้)", onsetDate: "2017-11-22", severity: "moderate" },
      { code: "E66.0", name: "อ้วน (Obesity class 1)", onsetDate: "2017-11-22", severity: "moderate" },
      { code: "E78.5", name: "ไขมันในเลือดสูง", onsetDate: "2018-06-10", severity: "mild" },
    ],
    allergies: [],
    medications: [
      { drug: "Losartan", dose: "100 mg", frequency: "วันละครั้ง เช้า", startedAt: "2020-08-12" },
      { drug: "HCTZ", dose: "25 mg", frequency: "วันละครั้ง เช้า", startedAt: "2021-02-18" },
      { drug: "Atorvastatin", dose: "20 mg", frequency: "ก่อนนอน", startedAt: "2018-06-15" },
    ],
    labs: [
      { test: "LDL", value: 132, unit: "mg/dL", referenceRange: "<130", abnormal: true, takenAt: isoDaysAgo(60) },
      { test: "Creatinine", value: 1.1, unit: "mg/dL", referenceRange: "0.7-1.2", abnormal: false, takenAt: isoDaysAgo(60) },
    ],
    recentVisits: [{ date: isoDaysAgo(60), clinic: "HT Clinic", chiefComplaint: "ติดตามผล", diagnosis: "Essential HT" }],
    riskFlags: ["ht-uncontrolled", "obesity", "missed-followup"],
  },
  {
    id: "p006",
    hn: "00014077",
    citizenId: "1-9988-77665-54-4",
    prefix: "นาง",
    firstName: "ศิริพร",
    lastName: "แก้วใส",
    birthDate: "1958-12-25",
    age: 66,
    gender: "F",
    bloodType: "AB",
    rh: "+",
    phone: "087-555-6666",
    address: { district: "พระโขนง", province: "กรุงเทพมหานคร" },
    insurance: "UC",
    status: "active",
    registeredDate: "2014-05-12",
    lastVisit: isoDaysAgo(20),
    primaryDoctor: "พญ.วราภรณ์ ดีพร้อม",
    vitals: { height: 156, weight: 58, bmi: 23.8, systolic: 130, diastolic: 82, heartRate: 72, temperature: 36.4, measuredAt: isoDaysAgo(20) },
    diagnoses: [
      { code: "I10", name: "ความดันโลหิตสูง (ควบคุมได้)", onsetDate: "2014-05-15", severity: "mild" },
      { code: "M81.0", name: "ภาวะกระดูกพรุน", onsetDate: "2021-08-20", severity: "moderate" },
    ],
    allergies: [{ substance: "Ibuprofen", reaction: "กระเพาะอักเสบ" }],
    medications: [
      { drug: "Amlodipine", dose: "5 mg", frequency: "วันละครั้ง เช้า", startedAt: "2014-05-15" },
      { drug: "Alendronate", dose: "70 mg", frequency: "สัปดาห์ละครั้ง", startedAt: "2021-08-25" },
      { drug: "Calcium + Vit D", dose: "1 เม็ด", frequency: "วันละ 2 ครั้ง", startedAt: "2021-08-25" },
    ],
    labs: [],
    nextAppointment: { date: isoDaysAhead(45), clinic: "HT Clinic", doctor: "พญ.วราภรณ์ ดีพร้อม", type: "Follow-up" },
    recentVisits: [{ date: isoDaysAgo(20), clinic: "HT Clinic", chiefComplaint: "ติดตามผล", diagnosis: "Essential HT" }],
    riskFlags: ["fall-risk"],
  },

  // ── Cardiac / dyslipidemia ─────────────────────────────────────────────
  {
    id: "p007",
    hn: "00015010",
    citizenId: "1-7777-88899-00-0",
    prefix: "นาย",
    firstName: "ประภาส",
    lastName: "เลิศมงคล",
    birthDate: "1950-02-10",
    age: 75,
    gender: "M",
    bloodType: "B",
    rh: "+",
    phone: "081-999-1111",
    address: { district: "บางพลัด", province: "กรุงเทพมหานคร" },
    insurance: "CSMBS",
    status: "active",
    registeredDate: "2012-01-20",
    lastVisit: isoDaysAgo(7),
    primaryDoctor: "นพ.ราอูล มันเมาะ",
    vitals: { height: 165, weight: 70, bmi: 25.7, systolic: 142, diastolic: 86, heartRate: 70, temperature: 36.5, measuredAt: isoDaysAgo(7) },
    diagnoses: [
      { code: "I25.10", name: "โรคหลอดเลือดหัวใจตีบ (CAD)", onsetDate: "2019-06-04", severity: "moderate" },
      { code: "I10", name: "ความดันโลหิตสูง", onsetDate: "2012-01-25", severity: "moderate" },
      { code: "E78.5", name: "ไขมันในเลือดสูง", onsetDate: "2012-01-25", severity: "moderate" },
    ],
    allergies: [],
    medications: [
      { drug: "Aspirin", dose: "81 mg", frequency: "วันละครั้ง", startedAt: "2019-06-10" },
      { drug: "Atorvastatin", dose: "40 mg", frequency: "ก่อนนอน", startedAt: "2019-06-10" },
      { drug: "Bisoprolol", dose: "5 mg", frequency: "วันละครั้ง เช้า", startedAt: "2019-06-10" },
      { drug: "Amlodipine", dose: "5 mg", frequency: "วันละครั้ง เช้า", startedAt: "2012-01-25" },
      { drug: "Clopidogrel", dose: "75 mg", frequency: "วันละครั้ง", startedAt: "2019-06-10" },
    ],
    labs: [
      { test: "LDL", value: 68, unit: "mg/dL", referenceRange: "<70 (CAD)", abnormal: false, takenAt: isoDaysAgo(7) },
      { test: "HDL", value: 52, unit: "mg/dL", referenceRange: ">40", abnormal: false, takenAt: isoDaysAgo(7) },
    ],
    nextAppointment: { date: isoDaysAhead(83), clinic: "Cardio Clinic", doctor: "นพ.ราอูล มันเมาะ", type: "Follow-up" },
    recentVisits: [{ date: isoDaysAgo(7), clinic: "Cardio Clinic", chiefComplaint: "ติดตามผล", diagnosis: "CAD, HT, Dyslipidemia" }],
    riskFlags: ["polypharmacy"],
  },

  // ── COPD ────────────────────────────────────────────────────────────────
  {
    id: "p008",
    hn: "00016020",
    citizenId: "5-1234-56789-90-1",
    prefix: "นาย",
    firstName: "สุพจน์",
    lastName: "ทองดี",
    birthDate: "1953-07-04",
    age: 72,
    gender: "M",
    bloodType: "O",
    rh: "+",
    phone: "081-888-7777",
    address: { district: "ราชเทวี", province: "กรุงเทพมหานคร" },
    insurance: "UC",
    status: "active",
    registeredDate: "2016-09-14",
    lastVisit: isoDaysAgo(11),
    primaryDoctor: "นพ.สถาพร พลคง",
    vitals: { height: 167, weight: 60, bmi: 21.5, systolic: 132, diastolic: 78, heartRate: 92, temperature: 36.8, measuredAt: isoDaysAgo(11) },
    diagnoses: [
      { code: "J44.9", name: "โรคปอดอุดกั้นเรื้อรัง (COPD)", onsetDate: "2016-09-20", severity: "moderate" },
    ],
    allergies: [],
    medications: [
      { drug: "Tiotropium (Spiriva)", dose: "18 mcg", frequency: "พ่นวันละครั้ง", startedAt: "2016-09-20" },
      { drug: "Salbutamol", dose: "100 mcg/dose", frequency: "พ่น prn", startedAt: "2016-09-20" },
    ],
    labs: [],
    nextAppointment: { date: isoDaysAhead(30), clinic: "Pulm Clinic", doctor: "นพ.สถาพร พลคง", type: "Follow-up" },
    recentVisits: [{ date: isoDaysAgo(11), clinic: "Pulm Clinic", chiefComplaint: "หอบเหนื่อยขึ้น", diagnosis: "COPD exacerbation" }],
    riskFlags: ["smoker"],
  },

  // ── Pediatric ───────────────────────────────────────────────────────────
  {
    id: "p009",
    hn: "00017005",
    citizenId: "1-1234-99988-77-7",
    prefix: "ด.ช.",
    firstName: "ภูมิ",
    lastName: "อยู่ดี",
    birthDate: "2018-05-20",
    age: 7,
    gender: "M",
    bloodType: "B",
    rh: "+",
    phone: "081-555-1234",
    address: { district: "จตุจักร", province: "กรุงเทพมหานคร" },
    insurance: "Private",
    status: "active",
    registeredDate: "2024-08-15",
    lastVisit: isoDaysAgo(28),
    primaryDoctor: "พญ.อมรรัตน์ ใจงาม",
    vitals: { height: 122, weight: 24, bmi: 16.1, systolic: 96, diastolic: 60, heartRate: 96, temperature: 36.7, measuredAt: isoDaysAgo(28) },
    diagnoses: [{ code: "J45.9", name: "โรคหืดในเด็ก (ควบคุมได้)", onsetDate: "2024-08-20", severity: "mild" }],
    allergies: [{ substance: "ฝุ่นไรฝุ่น", reaction: "หายใจมีเสียงหวีด" }],
    medications: [{ drug: "Salbutamol", dose: "100 mcg/dose", frequency: "พ่น prn", startedAt: "2024-08-20" }],
    labs: [],
    nextAppointment: { date: isoDaysAhead(60), clinic: "Pediatrics", doctor: "พญ.อมรรัตน์ ใจงาม", type: "Annual check-up" },
    recentVisits: [{ date: isoDaysAgo(28), clinic: "Pediatrics", chiefComplaint: "หายใจหวีด", diagnosis: "Asthma mild" }],
    riskFlags: [],
  },
  {
    id: "p010",
    hn: "00017006",
    citizenId: "1-2233-44556-67-8",
    prefix: "ด.ญ.",
    firstName: "พริม",
    lastName: "สวยงาม",
    birthDate: "2016-11-12",
    age: 9,
    gender: "F",
    bloodType: "A",
    rh: "+",
    phone: "081-555-1234",
    address: { district: "จตุจักร", province: "กรุงเทพมหานคร" },
    insurance: "Private",
    status: "active",
    registeredDate: "2023-02-10",
    lastVisit: isoDaysAgo(180),
    primaryDoctor: "พญ.อมรรัตน์ ใจงาม",
    vitals: { height: 134, weight: 29, bmi: 16.2, systolic: 102, diastolic: 64, heartRate: 88, temperature: 36.6, measuredAt: isoDaysAgo(180) },
    diagnoses: [],
    allergies: [],
    medications: [],
    labs: [],
    recentVisits: [{ date: isoDaysAgo(180), clinic: "Pediatrics", chiefComplaint: "ฉีดวัคซีน", diagnosis: "Well-child visit" }],
    riskFlags: [],
  },

  // ── Young adults / healthy ─────────────────────────────────────────────
  {
    id: "p011",
    hn: "00018010",
    citizenId: "1-3456-78901-23-4",
    prefix: "นางสาว",
    firstName: "ขวัญใจ",
    lastName: "เกียรติยศ",
    birthDate: "1996-03-08",
    age: 29,
    gender: "F",
    bloodType: "O",
    rh: "+",
    phone: "082-222-3333",
    email: "kwanjai.k@gmail.com",
    address: { district: "วัฒนา", province: "กรุงเทพมหานคร" },
    insurance: "Private",
    status: "active",
    registeredDate: "2024-11-20",
    lastVisit: isoDaysAgo(35),
    primaryDoctor: "พญ.วราภรณ์ ดีพร้อม",
    vitals: { height: 165, weight: 54, bmi: 19.8, systolic: 110, diastolic: 70, heartRate: 72, temperature: 36.5, measuredAt: isoDaysAgo(35) },
    diagnoses: [],
    allergies: [],
    medications: [],
    labs: [{ test: "CBC", value: 0, unit: "", referenceRange: "ปกติ", abnormal: false, takenAt: isoDaysAgo(35) }],
    recentVisits: [{ date: isoDaysAgo(35), clinic: "Annual Checkup", chiefComplaint: "ตรวจสุขภาพประจำปี", diagnosis: "Well visit" }],
    riskFlags: [],
  },
  {
    id: "p012",
    hn: "00018015",
    citizenId: "1-4567-89012-34-5",
    prefix: "นาย",
    firstName: "ธีรพล",
    lastName: "ก่อสร้าง",
    birthDate: "1990-06-15",
    age: 35,
    gender: "M",
    bloodType: "AB",
    rh: "+",
    phone: "081-444-5555",
    address: { district: "บางนา", province: "กรุงเทพมหานคร" },
    insurance: "SSO",
    status: "active",
    registeredDate: "2023-04-08",
    lastVisit: isoDaysAgo(120),
    primaryDoctor: "นพ.สถาพร พลคง",
    vitals: { height: 175, weight: 88, bmi: 28.7, systolic: 134, diastolic: 86, heartRate: 80, temperature: 36.5, measuredAt: isoDaysAgo(120) },
    diagnoses: [{ code: "E66.0", name: "อ้วน (Obesity class 1)", onsetDate: "2023-04-10", severity: "moderate" }],
    allergies: [],
    medications: [],
    labs: [
      { test: "LDL", value: 124, unit: "mg/dL", referenceRange: "<130", abnormal: false, takenAt: isoDaysAgo(120) },
      { test: "FBS", value: 96, unit: "mg/dL", referenceRange: "70-100", abnormal: false, takenAt: isoDaysAgo(120) },
    ],
    recentVisits: [{ date: isoDaysAgo(120), clinic: "Annual Checkup", chiefComplaint: "ตรวจสุขภาพ", diagnosis: "Overweight" }],
    riskFlags: ["obesity"],
  },

  // ── Thyroid ─────────────────────────────────────────────────────────────
  {
    id: "p013",
    hn: "00019001",
    citizenId: "1-5678-90123-45-6",
    prefix: "นาง",
    firstName: "จิตติมา",
    lastName: "รัตนากร",
    birthDate: "1974-10-20",
    age: 50,
    gender: "F",
    bloodType: "A",
    rh: "+",
    phone: "086-789-1234",
    address: { district: "ปทุมวัน", province: "กรุงเทพมหานคร" },
    insurance: "SSO",
    status: "active",
    registeredDate: "2019-07-18",
    lastVisit: isoDaysAgo(25),
    primaryDoctor: "พญ.วราภรณ์ ดีพร้อม",
    vitals: { height: 160, weight: 56, bmi: 21.9, systolic: 118, diastolic: 76, heartRate: 68, temperature: 36.4, measuredAt: isoDaysAgo(25) },
    diagnoses: [{ code: "E03.9", name: "ภาวะไทรอยด์ฮอร์โมนต่ำ (Hypothyroidism)", onsetDate: "2019-07-25", severity: "mild" }],
    allergies: [],
    medications: [{ drug: "Levothyroxine", dose: "50 mcg", frequency: "ก่อนอาหารเช้า 30 นาที", startedAt: "2019-07-25" }],
    labs: [
      { test: "TSH", value: 2.8, unit: "mIU/L", referenceRange: "0.4-4.0", abnormal: false, takenAt: isoDaysAgo(25) },
      { test: "Free T4", value: 1.2, unit: "ng/dL", referenceRange: "0.8-1.8", abnormal: false, takenAt: isoDaysAgo(25) },
    ],
    nextAppointment: { date: isoDaysAhead(155), clinic: "Endo Clinic", doctor: "พญ.วราภรณ์ ดีพร้อม", type: "Annual Follow-up" },
    recentVisits: [{ date: isoDaysAgo(25), clinic: "Endo Clinic", chiefComplaint: "ติดตามผล TSH", diagnosis: "Hypothyroidism stable" }],
    riskFlags: [],
  },

  // ── More elderly + chronic combos ──────────────────────────────────────
  {
    id: "p014",
    hn: "00012890",
    citizenId: "1-6789-01234-56-7",
    prefix: "นาง",
    firstName: "บุญเรือน",
    lastName: "อยู่สุข",
    birthDate: "1948-01-30",
    age: 77,
    gender: "F",
    bloodType: "O",
    rh: "+",
    phone: "081-666-7777",
    address: { district: "สวนหลวง", province: "กรุงเทพมหานคร" },
    insurance: "UC",
    status: "active",
    registeredDate: "2010-04-12",
    lastVisit: isoDaysAgo(5),
    primaryDoctor: "นพ.ราอูล มันเมาะ",
    vitals: { height: 150, weight: 48, bmi: 21.3, systolic: 144, diastolic: 82, heartRate: 76, temperature: 36.3, measuredAt: isoDaysAgo(5) },
    diagnoses: [
      { code: "I10", name: "ความดันโลหิตสูง", onsetDate: "2010-04-15", severity: "moderate" },
      { code: "E11.9", name: "เบาหวานชนิดที่ 2 (ควบคุมได้)", onsetDate: "2015-08-20", severity: "mild" },
      { code: "N18.4", name: "โรคไตเรื้อรัง stage 4", onsetDate: "2023-09-10", severity: "severe" },
    ],
    allergies: [{ substance: "Penicillin", reaction: "ผื่น" }],
    medications: [
      { drug: "Insulin Glargine", dose: "12 units", frequency: "ก่อนนอน", startedAt: "2023-09-15" },
      { drug: "Amlodipine", dose: "5 mg", frequency: "วันละครั้ง", startedAt: "2010-04-15" },
      { drug: "Furosemide", dose: "40 mg", frequency: "วันละครั้ง เช้า", startedAt: "2023-09-15" },
      { drug: "Sevelamer", dose: "800 mg", frequency: "วันละ 3 ครั้ง หลังอาหาร", startedAt: "2023-09-15" },
      { drug: "Erythropoietin", dose: "4000 units", frequency: "สัปดาห์ละ 3 ครั้ง", startedAt: "2024-01-20" },
    ],
    labs: [
      { test: "HbA1c", value: 6.8, unit: "%", referenceRange: "<7", abnormal: false, takenAt: isoDaysAgo(5) },
      { test: "Creatinine", value: 2.8, unit: "mg/dL", referenceRange: "0.7-1.2", abnormal: true, takenAt: isoDaysAgo(5) },
      { test: "eGFR", value: 22, unit: "mL/min/1.73m²", referenceRange: ">60", abnormal: true, takenAt: isoDaysAgo(5) },
      { test: "Hb", value: 9.8, unit: "g/dL", referenceRange: ">12", abnormal: true, takenAt: isoDaysAgo(5) },
    ],
    nextAppointment: { date: isoDaysAhead(14), clinic: "Nephro Clinic", doctor: "นพ.ราอูล มันเมาะ", type: "Follow-up" },
    recentVisits: [{ date: isoDaysAgo(5), clinic: "Nephro Clinic", chiefComplaint: "ติดตามผล Cr", diagnosis: "CKD stage 4" }],
    riskFlags: ["ckd-stage4", "polypharmacy", "fall-risk"],
  },

  // ── More patients to round out the dataset ─────────────────────────────
  {
    id: "p015",
    hn: "00012891",
    citizenId: "1-7890-12345-67-8",
    prefix: "นาย",
    firstName: "วิชัย",
    lastName: "วัฒนสุข",
    birthDate: "1985-12-04",
    age: 39,
    gender: "M",
    bloodType: "A",
    rh: "+",
    phone: "089-876-5432",
    address: { district: "ห้วยขวาง", province: "กรุงเทพมหานคร" },
    insurance: "SSO",
    status: "active",
    registeredDate: "2024-05-22",
    lastVisit: isoDaysAgo(2),
    primaryDoctor: "นพ.สถาพร พลคง",
    vitals: { height: 176, weight: 82, bmi: 26.5, systolic: 142, diastolic: 90, heartRate: 78, temperature: 36.6, measuredAt: isoDaysAgo(2) },
    diagnoses: [
      { code: "E11.9", name: "เบาหวานชนิดที่ 2 (เพิ่งวินิจฉัย)", onsetDate: "2024-05-25", severity: "moderate" },
      { code: "I10", name: "ความดันโลหิตสูง (เพิ่งวินิจฉัย)", onsetDate: "2024-05-25", severity: "moderate" },
    ],
    allergies: [],
    medications: [
      { drug: "Metformin", dose: "500 mg", frequency: "หลังอาหารเช้า-เย็น", startedAt: "2024-05-25" },
      { drug: "Losartan", dose: "50 mg", frequency: "วันละครั้ง เช้า", startedAt: "2024-05-25" },
    ],
    labs: [
      { test: "HbA1c", value: 7.6, unit: "%", referenceRange: "<6.5", abnormal: true, takenAt: isoDaysAgo(2) },
      { test: "FBS", value: 142, unit: "mg/dL", referenceRange: "70-100", abnormal: true, takenAt: isoDaysAgo(2) },
    ],
    nextAppointment: { date: isoDaysAhead(28), clinic: "DM Clinic", doctor: "นพ.สถาพร พลคง", type: "Follow-up" },
    recentVisits: [{ date: isoDaysAgo(2), clinic: "DM Clinic", chiefComplaint: "ติดตามผล HbA1c", diagnosis: "DM type 2 newly diagnosed" }],
    riskFlags: ["dm-uncontrolled"],
  },
  {
    id: "p016",
    hn: "00020001",
    citizenId: "1-8901-23456-78-9",
    prefix: "นาง",
    firstName: "ชลิดา",
    lastName: "ภักดี",
    birthDate: "1965-07-15",
    age: 60,
    gender: "F",
    bloodType: "B",
    rh: "+",
    phone: "081-345-6789",
    address: { district: "ลาดพร้าว", province: "กรุงเทพมหานคร" },
    insurance: "CSMBS",
    status: "active",
    registeredDate: "2013-02-18",
    lastVisit: isoDaysAgo(15),
    primaryDoctor: "พญ.วราภรณ์ ดีพร้อม",
    vitals: { height: 158, weight: 68, bmi: 27.2, systolic: 138, diastolic: 84, heartRate: 76, temperature: 36.5, measuredAt: isoDaysAgo(15) },
    diagnoses: [
      { code: "I10", name: "ความดันโลหิตสูง", onsetDate: "2013-02-20", severity: "moderate" },
      { code: "E78.5", name: "ไขมันในเลือดสูง", onsetDate: "2015-03-12", severity: "mild" },
      { code: "E66.0", name: "น้ำหนักเกิน", onsetDate: "2015-03-12", severity: "mild" },
    ],
    allergies: [],
    medications: [
      { drug: "Losartan", dose: "50 mg", frequency: "วันละครั้ง เช้า", startedAt: "2013-02-25" },
      { drug: "Simvastatin", dose: "20 mg", frequency: "ก่อนนอน", startedAt: "2015-03-15" },
    ],
    labs: [
      { test: "LDL", value: 118, unit: "mg/dL", referenceRange: "<130", abnormal: false, takenAt: isoDaysAgo(15) },
    ],
    nextAppointment: { date: isoDaysAhead(75), clinic: "HT Clinic", doctor: "พญ.วราภรณ์ ดีพร้อม", type: "Follow-up" },
    recentVisits: [{ date: isoDaysAgo(15), clinic: "HT Clinic", chiefComplaint: "ติดตามผล", diagnosis: "HT, dyslipidemia" }],
    riskFlags: ["obesity"],
  },
  {
    id: "p017",
    hn: "00020045",
    citizenId: "1-9012-34567-89-0",
    prefix: "นาย",
    firstName: "อภิชาต",
    lastName: "สุขสมบูรณ์",
    birthDate: "1957-04-22",
    age: 68,
    gender: "M",
    bloodType: "O",
    rh: "+",
    phone: "082-456-7890",
    address: { district: "บางซื่อ", province: "กรุงเทพมหานคร" },
    insurance: "UC",
    status: "active",
    registeredDate: "2014-09-08",
    lastVisit: isoDaysAgo(70),
    primaryDoctor: "นพ.ราอูล มันเมาะ",
    vitals: { height: 170, weight: 65, bmi: 22.5, systolic: 158, diastolic: 96, heartRate: 88, temperature: 36.7, measuredAt: isoDaysAgo(70) },
    diagnoses: [
      { code: "I10", name: "ความดันโลหิตสูง (ควบคุมไม่ได้)", onsetDate: "2014-09-12", severity: "severe" },
      { code: "F32.1", name: "ภาวะซึมเศร้า (ปานกลาง)", onsetDate: "2022-06-15", severity: "moderate" },
    ],
    allergies: [],
    medications: [
      { drug: "Amlodipine", dose: "10 mg", frequency: "วันละครั้ง เช้า", startedAt: "2018-03-20" },
      { drug: "Losartan", dose: "100 mg", frequency: "วันละครั้ง เช้า", startedAt: "2020-11-04" },
      { drug: "Sertraline", dose: "50 mg", frequency: "วันละครั้ง เช้า", startedAt: "2022-06-20" },
    ],
    labs: [],
    recentVisits: [{ date: isoDaysAgo(70), clinic: "HT Clinic", chiefComplaint: "ติดตามผล", diagnosis: "Resistant HT" }],
    riskFlags: ["ht-uncontrolled", "missed-followup", "smoker"],
  },
  {
    id: "p018",
    hn: "00020080",
    citizenId: "1-0123-45678-90-1",
    prefix: "นางสาว",
    firstName: "อรพรรณ",
    lastName: "ทินวงศ์",
    birthDate: "1988-09-11",
    age: 37,
    gender: "F",
    bloodType: "AB",
    rh: "+",
    phone: "088-123-4567",
    address: { district: "คลองเตย", province: "กรุงเทพมหานคร" },
    insurance: "SSO",
    status: "active",
    registeredDate: "2024-01-04",
    lastVisit: isoDaysAgo(40),
    primaryDoctor: "พญ.อมรรัตน์ ใจงาม",
    vitals: { height: 168, weight: 60, bmi: 21.3, systolic: 116, diastolic: 74, heartRate: 78, temperature: 36.6, measuredAt: isoDaysAgo(40) },
    diagnoses: [{ code: "Z34.0", name: "ฝากครรภ์ครั้งแรก (GA 24w)", onsetDate: "2024-12-15", severity: "mild" }],
    allergies: [],
    medications: [
      { drug: "Folic acid + Iron", dose: "1 เม็ด", frequency: "วันละครั้ง", startedAt: "2024-12-20" },
    ],
    labs: [{ test: "Hb", value: 11.8, unit: "g/dL", referenceRange: ">11 (preg)", abnormal: false, takenAt: isoDaysAgo(40) }],
    nextAppointment: { date: isoDaysAhead(7), clinic: "ANC", doctor: "พญ.อมรรัตน์ ใจงาม", type: "Antenatal" },
    recentVisits: [{ date: isoDaysAgo(40), clinic: "ANC", chiefComplaint: "ฝากครรภ์", diagnosis: "Normal pregnancy" }],
    riskFlags: [],
  },
  {
    id: "p019",
    hn: "00020115",
    citizenId: "1-2345-67890-12-3",
    prefix: "นาย",
    firstName: "ชัยพร",
    lastName: "ดวงดี",
    birthDate: "1942-11-08",
    age: 82,
    gender: "M",
    bloodType: "A",
    rh: "+",
    phone: "081-777-8888",
    address: { district: "พญาไท", province: "กรุงเทพมหานคร" },
    insurance: "CSMBS",
    status: "active",
    registeredDate: "2008-12-04",
    lastVisit: isoDaysAgo(18),
    primaryDoctor: "นพ.ราอูล มันเมาะ",
    vitals: { height: 162, weight: 54, bmi: 20.6, systolic: 148, diastolic: 78, heartRate: 70, temperature: 36.4, measuredAt: isoDaysAgo(18) },
    diagnoses: [
      { code: "I48.91", name: "หัวใจเต้นผิดจังหวะ (AFib)", onsetDate: "2020-02-14", severity: "moderate" },
      { code: "I10", name: "ความดันโลหิตสูง", onsetDate: "2008-12-10", severity: "moderate" },
      { code: "I25.10", name: "โรคหลอดเลือดหัวใจตีบ", onsetDate: "2017-08-05", severity: "moderate" },
    ],
    allergies: [],
    medications: [
      { drug: "Warfarin", dose: "3 mg", frequency: "วันละครั้ง เย็น", startedAt: "2020-02-20" },
      { drug: "Bisoprolol", dose: "2.5 mg", frequency: "วันละครั้ง", startedAt: "2020-02-20" },
      { drug: "Aspirin", dose: "81 mg", frequency: "วันละครั้ง", startedAt: "2017-08-10" },
      { drug: "Atorvastatin", dose: "20 mg", frequency: "ก่อนนอน", startedAt: "2017-08-10" },
      { drug: "Amlodipine", dose: "5 mg", frequency: "วันละครั้ง", startedAt: "2008-12-15" },
    ],
    labs: [
      { test: "INR", value: 2.3, unit: "", referenceRange: "2-3", abnormal: false, takenAt: isoDaysAgo(18) },
    ],
    nextAppointment: { date: isoDaysAhead(12), clinic: "Cardio Clinic", doctor: "นพ.ราอูล มันเมาะ", type: "INR check" },
    recentVisits: [{ date: isoDaysAgo(18), clinic: "Cardio Clinic", chiefComplaint: "ตรวจ INR", diagnosis: "AFib stable on Warfarin" }],
    riskFlags: ["polypharmacy", "fall-risk"],
  },
  {
    id: "p020",
    hn: "00020150",
    citizenId: "1-3456-78901-23-5",
    prefix: "นาง",
    firstName: "สุนีย์",
    lastName: "พึ่งบุญ",
    birthDate: "1972-05-30",
    age: 53,
    gender: "F",
    bloodType: "O",
    rh: "+",
    phone: "088-789-0123",
    address: { district: "บางคอแหลม", province: "กรุงเทพมหานคร" },
    insurance: "OOP",
    status: "active",
    registeredDate: "2020-10-09",
    lastVisit: isoDaysAgo(90),
    primaryDoctor: "พญ.วราภรณ์ ดีพร้อม",
    vitals: { height: 163, weight: 70, bmi: 26.4, systolic: 150, diastolic: 92, heartRate: 80, temperature: 36.5, measuredAt: isoDaysAgo(90) },
    diagnoses: [
      { code: "E11.9", name: "เบาหวานชนิดที่ 2 (ควบคุมไม่ได้)", onsetDate: "2020-10-15", severity: "moderate" },
      { code: "I10", name: "ความดันโลหิตสูง", onsetDate: "2020-10-15", severity: "moderate" },
    ],
    allergies: [],
    medications: [
      { drug: "Metformin", dose: "1000 mg", frequency: "หลังอาหารเช้า-เย็น", startedAt: "2020-10-20" },
      { drug: "Losartan", dose: "50 mg", frequency: "วันละครั้ง เช้า", startedAt: "2020-10-20" },
    ],
    labs: [
      { test: "HbA1c", value: 8.9, unit: "%", referenceRange: "<6.5", abnormal: true, takenAt: isoDaysAgo(90) },
    ],
    recentVisits: [{ date: isoDaysAgo(90), clinic: "DM Clinic", chiefComplaint: "ติดตามผล", diagnosis: "DM uncontrolled" }],
    riskFlags: ["dm-uncontrolled", "ht-uncontrolled", "missed-followup", "obesity"],
  },
  {
    id: "p021",
    hn: "00020201",
    citizenId: "1-4567-89012-34-6",
    prefix: "นาย",
    firstName: "พิชัย",
    lastName: "ใจเย็น",
    birthDate: "1960-08-17",
    age: 65,
    gender: "M",
    bloodType: "A",
    rh: "+",
    phone: "082-901-2345",
    address: { district: "ลาดพร้าว", province: "กรุงเทพมหานคร" },
    insurance: "UC",
    status: "active",
    registeredDate: "2018-03-30",
    lastVisit: isoDaysAgo(22),
    primaryDoctor: "นพ.สถาพร พลคง",
    vitals: { height: 169, weight: 75, bmi: 26.3, systolic: 136, diastolic: 84, heartRate: 78, temperature: 36.6, measuredAt: isoDaysAgo(22) },
    diagnoses: [
      { code: "J44.9", name: "โรคปอดอุดกั้นเรื้อรัง (COPD)", onsetDate: "2018-04-05", severity: "moderate" },
      { code: "I10", name: "ความดันโลหิตสูง", onsetDate: "2019-11-12", severity: "mild" },
    ],
    allergies: [],
    medications: [
      { drug: "Tiotropium (Spiriva)", dose: "18 mcg", frequency: "พ่นวันละครั้ง", startedAt: "2018-04-10" },
      { drug: "Salbutamol", dose: "100 mcg/dose", frequency: "พ่น prn", startedAt: "2018-04-10" },
      { drug: "Amlodipine", dose: "5 mg", frequency: "วันละครั้ง", startedAt: "2019-11-15" },
    ],
    labs: [],
    nextAppointment: { date: isoDaysAhead(40), clinic: "Pulm Clinic", doctor: "นพ.สถาพร พลคง", type: "Follow-up" },
    recentVisits: [{ date: isoDaysAgo(22), clinic: "Pulm Clinic", chiefComplaint: "ติดตามผล", diagnosis: "COPD stable" }],
    riskFlags: ["smoker"],
  },
  {
    id: "p022",
    hn: "00020220",
    citizenId: "1-5678-90123-45-7",
    prefix: "นางสาว",
    firstName: "วรรณา",
    lastName: "เผ่าพันธุ์",
    birthDate: "1992-02-28",
    age: 33,
    gender: "F",
    bloodType: "B",
    rh: "-",
    phone: "083-456-7891",
    address: { district: "ภาษีเจริญ", province: "กรุงเทพมหานคร" },
    insurance: "SSO",
    status: "active",
    registeredDate: "2024-09-12",
    lastVisit: isoDaysAgo(10),
    primaryDoctor: "พญ.อมรรัตน์ ใจงาม",
    vitals: { height: 162, weight: 58, bmi: 22.1, systolic: 110, diastolic: 68, heartRate: 74, temperature: 36.5, measuredAt: isoDaysAgo(10) },
    diagnoses: [{ code: "Z34.0", name: "ฝากครรภ์ครั้งที่สอง (GA 12w)", onsetDate: "2025-02-20", severity: "mild" }],
    allergies: [],
    medications: [{ drug: "Folic acid + Iron", dose: "1 เม็ด", frequency: "วันละครั้ง", startedAt: "2025-02-25" }],
    labs: [],
    nextAppointment: { date: isoDaysAhead(28), clinic: "ANC", doctor: "พญ.อมรรัตน์ ใจงาม", type: "Antenatal" },
    recentVisits: [{ date: isoDaysAgo(10), clinic: "ANC", chiefComplaint: "ฝากครรภ์", diagnosis: "Normal pregnancy" }],
    riskFlags: [],
  },
  {
    id: "p023",
    hn: "00020250",
    citizenId: "1-6789-01234-56-8",
    prefix: "นาย",
    firstName: "สุรชาติ",
    lastName: "แก้วประเสริฐ",
    birthDate: "1978-06-09",
    age: 47,
    gender: "M",
    bloodType: "O",
    rh: "+",
    phone: "086-111-2233",
    address: { district: "ทุ่งครุ", province: "กรุงเทพมหานคร" },
    insurance: "SSO",
    status: "active",
    registeredDate: "2021-08-14",
    lastVisit: isoDaysAgo(150),
    primaryDoctor: "นพ.สถาพร พลคง",
    vitals: { height: 173, weight: 86, bmi: 28.7, systolic: 144, diastolic: 92, heartRate: 82, temperature: 36.6, measuredAt: isoDaysAgo(150) },
    diagnoses: [
      { code: "I10", name: "ความดันโลหิตสูง", onsetDate: "2021-08-20", severity: "moderate" },
      { code: "E66.0", name: "อ้วน", onsetDate: "2021-08-20", severity: "moderate" },
    ],
    allergies: [],
    medications: [
      { drug: "Losartan", dose: "50 mg", frequency: "วันละครั้ง เช้า", startedAt: "2021-08-25" },
    ],
    labs: [],
    recentVisits: [{ date: isoDaysAgo(150), clinic: "HT Clinic", chiefComplaint: "ติดตามผล", diagnosis: "HT, obesity" }],
    riskFlags: ["missed-followup", "obesity"],
  },
  {
    id: "p024",
    hn: "00020280",
    citizenId: "1-7890-12345-67-9",
    prefix: "นาง",
    firstName: "มาลี",
    lastName: "ทรงคุณ",
    birthDate: "1949-12-12",
    age: 76,
    gender: "F",
    bloodType: "AB",
    rh: "+",
    phone: "081-222-3344",
    address: { district: "พระโขนง", province: "กรุงเทพมหานคร" },
    insurance: "UC",
    status: "active",
    registeredDate: "2011-06-25",
    lastVisit: isoDaysAgo(33),
    primaryDoctor: "นพ.ราอูล มันเมาะ",
    vitals: { height: 152, weight: 50, bmi: 21.6, systolic: 142, diastolic: 80, heartRate: 72, temperature: 36.4, measuredAt: isoDaysAgo(33) },
    diagnoses: [
      { code: "I10", name: "ความดันโลหิตสูง", onsetDate: "2011-07-02", severity: "moderate" },
      { code: "M81.0", name: "ภาวะกระดูกพรุน", onsetDate: "2019-04-18", severity: "moderate" },
      { code: "F03", name: "ภาวะสมองเสื่อม (Mild)", onsetDate: "2024-02-10", severity: "mild" },
    ],
    allergies: [],
    medications: [
      { drug: "Amlodipine", dose: "5 mg", frequency: "วันละครั้ง", startedAt: "2011-07-05" },
      { drug: "Alendronate", dose: "70 mg", frequency: "สัปดาห์ละครั้ง", startedAt: "2019-04-22" },
      { drug: "Donepezil", dose: "5 mg", frequency: "ก่อนนอน", startedAt: "2024-02-15" },
    ],
    labs: [],
    nextAppointment: { date: isoDaysAhead(50), clinic: "Geriatric Clinic", doctor: "นพ.ราอูล มันเมาะ", type: "Follow-up" },
    recentVisits: [{ date: isoDaysAgo(33), clinic: "Geriatric Clinic", chiefComplaint: "ติดตามอาการสมองเสื่อม", diagnosis: "MCI, HT, osteoporosis" }],
    riskFlags: ["fall-risk", "polypharmacy"],
  },
  {
    id: "p025",
    hn: "00020310",
    citizenId: "1-8901-23456-78-0",
    prefix: "นาย",
    firstName: "ภาณุพงศ์",
    lastName: "เจริญรัตน์",
    birthDate: "1995-10-25",
    age: 30,
    gender: "M",
    bloodType: "O",
    rh: "+",
    phone: "089-111-2233",
    email: "phanu.j@gmail.com",
    address: { district: "จตุจักร", province: "กรุงเทพมหานคร" },
    insurance: "Private",
    status: "active",
    registeredDate: "2025-01-08",
    lastVisit: isoDaysAgo(1),
    primaryDoctor: "นพ.สถาพร พลคง",
    vitals: { height: 178, weight: 72, bmi: 22.7, systolic: 118, diastolic: 74, heartRate: 70, temperature: 36.5, measuredAt: isoDaysAgo(1) },
    diagnoses: [],
    allergies: [{ substance: "ถั่วลิสง", reaction: "ผื่นบวมรอบปาก" }],
    medications: [],
    labs: [
      { test: "CBC", value: 0, unit: "", referenceRange: "ปกติ", abnormal: false, takenAt: isoDaysAgo(1) },
      { test: "LDL", value: 102, unit: "mg/dL", referenceRange: "<130", abnormal: false, takenAt: isoDaysAgo(1) },
    ],
    recentVisits: [{ date: isoDaysAgo(1), clinic: "Annual Checkup", chiefComplaint: "ตรวจสุขภาพประจำปี", diagnosis: "Well visit" }],
    riskFlags: [],
  },
];

// ── Aggregation helpers ────────────────────────────────────────────────────
// These transform the raw patient list into the shapes dashboard widgets need.

/** Count of currently active patients. */
export function countActive(): number {
  return PATIENTS.filter((p) => p.status === "active").length;
}

/** Group active patients by diagnosis category (top-level ICD chapter). */
export function patientsByDiagnosisGroup(): { label: string; value: number }[] {
  const buckets: Record<string, number> = {};
  for (const p of PATIENTS) {
    if (p.status !== "active") continue;
    const group = mapDiagnosisToGroup(p);
    buckets[group] = (buckets[group] ?? 0) + 1;
  }
  return Object.entries(buckets)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Distribution across 5 age bands. */
export function patientsByAgeBand(): { label: string; value: number }[] {
  const bands = [
    { label: "<20", min: 0, max: 19 },
    { label: "20–39", min: 20, max: 39 },
    { label: "40–59", min: 40, max: 59 },
    { label: "60–79", min: 60, max: 79 },
    { label: "≥80", min: 80, max: 200 },
  ];
  return bands.map((b) => ({
    label: b.label,
    value: PATIENTS.filter(
      (p) => p.status === "active" && p.age >= b.min && p.age <= b.max,
    ).length,
  }));
}

/** Insurance / payer mix for the active panel. */
export function patientsByInsurance(): { label: string; value: number }[] {
  const buckets: Record<string, number> = {};
  for (const p of PATIENTS) {
    if (p.status !== "active") continue;
    buckets[p.insurance] = (buckets[p.insurance] ?? 0) + 1;
  }
  return Object.entries(buckets)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Most-prescribed drugs across the active panel. */
export function topMedications(limit = 8): { label: string; value: number }[] {
  const buckets: Record<string, number> = {};
  for (const p of PATIENTS) {
    if (p.status !== "active") continue;
    for (const m of p.medications) {
      buckets[m.drug] = (buckets[m.drug] ?? 0) + 1;
    }
  }
  return Object.entries(buckets)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/** Patients flagged at risk — total count per risk type. */
export function riskDistribution(): { label: string; value: number }[] {
  const labels: Record<RiskFlag, string> = {
    "dm-uncontrolled": "DM ควบคุมไม่ได้",
    "ht-uncontrolled": "HT ควบคุมไม่ได้",
    "ckd-stage3": "CKD stage 3",
    "ckd-stage4": "CKD stage 4",
    "fall-risk": "เสี่ยงล้ม",
    polypharmacy: "ใช้ยาหลายตัว",
    "missed-followup": "ขาดนัด",
    smoker: "สูบบุหรี่",
    obesity: "อ้วน",
  };
  const buckets: Record<string, number> = {};
  for (const p of PATIENTS) {
    if (p.status !== "active") continue;
    for (const f of p.riskFlags) {
      const lbl = labels[f];
      buckets[lbl] = (buckets[lbl] ?? 0) + 1;
    }
  }
  return Object.entries(buckets)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Patients who missed their last follow-up. Returns a table-shaped result. */
export function missedFollowupList() {
  const rows = PATIENTS.filter((p) => p.riskFlags.includes("missed-followup")).map(
    (p) => ({
      hn: p.hn,
      name: `${p.prefix}${p.firstName} ${p.lastName}`,
      doctor: p.primaryDoctor,
      lastVisit: p.lastVisit,
      diagnoses: p.diagnoses.map((d) => d.name).join(", ") || "—",
    }),
  );
  return {
    columns: [
      { key: "hn", label: "HN" },
      { key: "name", label: "ชื่อผู้ป่วย" },
      { key: "doctor", label: "หมอประจำ" },
      { key: "lastVisit", label: "ตรวจครั้งล่าสุด" },
      { key: "diagnoses", label: "โรคประจำตัว" },
    ],
    rows,
  };
}

/** Active panel as a sortable, viewable table. */
export function patientList(limit = 15) {
  const rows = PATIENTS.filter((p) => p.status === "active")
    .slice(0, limit)
    .map((p) => ({
      hn: p.hn,
      name: `${p.prefix}${p.firstName} ${p.lastName}`,
      age: p.age,
      gender: p.gender === "M" ? "ชาย" : "หญิง",
      insurance: p.insurance,
      bp: `${p.vitals.systolic}/${p.vitals.diastolic}`,
      bmi: p.vitals.bmi,
      conditions: p.diagnoses.length,
    }));
  return {
    columns: [
      { key: "hn", label: "HN" },
      { key: "name", label: "ชื่อ" },
      { key: "age", label: "อายุ" },
      { key: "gender", label: "เพศ" },
      { key: "insurance", label: "สิทธิ" },
      { key: "bp", label: "BP" },
      { key: "bmi", label: "BMI" },
      { key: "conditions", label: "โรคประจำตัว" },
    ],
    rows,
  };
}

/** Recent HbA1c values for diabetic patients — trends over the past visits. */
export function hba1cTrend(): { label: string; value: number }[] {
  // Average HbA1c across recent measurements (last 6 months bucketed by month).
  const out: { label: string; value: number }[] = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    const label = `${d.getMonth() + 1}/${(d.getFullYear() + 543).toString().slice(2)}`;
    // Simulate a slow downward trend with some noise.
    const value = +(7.6 + Math.sin(m * 0.7) * 0.4 - m * 0.05).toFixed(1);
    out.push({ label, value });
  }
  return out;
}

/** Average wait time KPI from active appointments. Mocked sensibly. */
export function averageWaitTime(): { value: number; previous: number } {
  return { value: 17, previous: 22 };
}

// ── Internal helpers ──────────────────────────────────────────────────────

function mapDiagnosisToGroup(p: Patient): string {
  const codes = p.diagnoses.map((d) => d.code);
  if (codes.some((c) => c.startsWith("E11") || c.startsWith("E10"))) return "Diabetes";
  if (codes.some((c) => c.startsWith("I10") || c.startsWith("I11"))) return "Hypertension";
  if (codes.some((c) => c.startsWith("I20") || c.startsWith("I25") || c.startsWith("I48"))) return "Cardiac";
  if (codes.some((c) => c.startsWith("J44") || c.startsWith("J45"))) return "Respiratory";
  if (codes.some((c) => c.startsWith("N18"))) return "CKD";
  if (codes.some((c) => c.startsWith("E03") || c.startsWith("E05"))) return "Endocrine";
  if (codes.some((c) => c.startsWith("F"))) return "Mental health";
  if (codes.some((c) => c.startsWith("Z34"))) return "Pregnancy";
  return "Other";
}
