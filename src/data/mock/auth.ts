import type { UserRole } from "../../contexts/UserContext";

/**
 * Demo auth data for the login screen (Figma 1177:2133 + role-picker menu).
 * Each role maps to a representative demo account so "ทดลองตามบทบาท" can swap
 * the prefilled credentials. Nothing here is real auth — it just drives the UI.
 */

export interface RoleMeta {
  role: UserRole;
  /** Thai label shown on the role card. */
  label: string;
  /** Latin sub-label. */
  sub: string;
}

export interface DemoAccount {
  role: UserRole;
  name: string;
  title: string;
  username: string;
  email: string;
  /** 2-letter avatar fallback. */
  initials: string;
  /** Provider ID — professional license / system provider number. */
  providerId: string;
}

/** Order matches the picker grid in the design (Admin spans the last row). */
export const ROLES: RoleMeta[] = [
  { role: "doctor", label: "แพทย์", sub: "Doctor" },
  { role: "nurse", label: "พยาบาล", sub: "Nurse" },
  { role: "pharmacist", label: "เภสัชกร", sub: "Pharmacist" },
  { role: "reception", label: "เวชระเบียน", sub: "Reception" },
  { role: "admin", label: "ผู้ดูแลระบบ", sub: "Admin" },
];

export const DEMO_ACCOUNTS: Record<UserRole, DemoAccount> = {
  doctor: {
    role: "doctor",
    name: "พญ. ศิรินทร์ ภัทรกุล",
    title: "แพทย์เวชศาสตร์ครอบครัว · Family Physician",
    username: "sirin.p",
    email: "sirin.p@ehp.co.th",
    initials: "SP",
    providerId: "ว.32741",
  },
  nurse: {
    role: "nurse",
    name: "พว. กัญญา ศรีสุข",
    title: "พยาบาลวิชาชีพ · Registered Nurse",
    username: "kanya.s",
    email: "kanya.s@ehp.co.th",
    initials: "KS",
    providerId: "พย.45110238",
  },
  pharmacist: {
    role: "pharmacist",
    name: "ภก. ธนวัฒน์ พงษ์ไพบูลย์",
    title: "เภสัชกร · Pharmacist",
    username: "thanawat.p",
    email: "thanawat.p@ehp.co.th",
    initials: "TP",
    providerId: "ภ.21845",
  },
  reception: {
    role: "reception",
    name: "พิมพ์ชนก ใจดี",
    title: "เจ้าหน้าที่เวชระเบียน · Reception",
    username: "pimchanok.j",
    email: "pimchanok.j@ehp.co.th",
    initials: "PJ",
    providerId: "EHP-REG-1042",
  },
  admin: {
    role: "admin",
    name: "วรเดช อินทรกุล",
    title: "ผู้ดูแลระบบ · System Administrator",
    username: "woradej.i",
    email: "woradej.i@ehp.co.th",
    initials: "WI",
    providerId: "EHP-ADM-001",
  },
};

export interface Hospital {
  code: string;
  name: string;
  area: string;
}

/** Step 2 — "เลือกโรงพยาบาล". */
export const HOSPITALS: Hospital[] = [
  {
    code: "EHP-01",
    name: "โรงพยาบาลเอ็กเซลเลนท์ เฮลท์ (สำนักงานใหญ่)",
    area: "เขตห้วยขวาง · กรุงเทพมหานคร",
  },
  {
    code: "EHP-02",
    name: "โรงพยาบาลเอ็กเซลเลนท์ เฮลท์ สาขารัชดา",
    area: "เขตดินแดง · กรุงเทพมหานคร",
  },
  {
    code: "EHP-03",
    name: "คลินิกเวชกรรมเอ็กเซลเลนท์ ทองหล่อ",
    area: "เขตวัฒนา · กรุงเทพมหานคร",
  },
];

/** Alias — login step 2 reads สาขา from the same list. */
export const BRANCHES = HOSPITALS;

export interface Department {
  code: string;
  name: string;
}

/** หน่วยงาน — selectable work units. */
export const DEPARTMENTS: Department[] = [
  { code: "OPD", name: "แผนกผู้ป่วยนอก (OPD)" },
  { code: "IPD", name: "แผนกผู้ป่วยใน (IPD)" },
  { code: "ER", name: "แผนกฉุกเฉิน (ER)" },
  { code: "MED", name: "อายุรกรรม" },
  { code: "SURG", name: "ศัลยกรรม" },
  { code: "PHAR", name: "ห้องจ่ายยา" },
  { code: "REG", name: "งานเวชระเบียน" },
  { code: "ADMIN", name: "ฝ่ายบริหารระบบ" },
];

export interface Room {
  code: string;
  name: string;
}

/** ห้องทำงาน — keyed by department code, with a generic fallback. */
export const ROOMS_BY_DEPT: Record<string, Room[]> = {
  OPD: [
    { code: "OPD-1", name: "ห้องตรวจ 1" },
    { code: "OPD-2", name: "ห้องตรวจ 2" },
    { code: "OPD-3", name: "ห้องตรวจ 3" },
    { code: "OPD-S", name: "เคาน์เตอร์ซักประวัติ" },
  ],
  IPD: [
    { code: "WARD-A", name: "หอผู้ป่วยใน A" },
    { code: "WARD-B", name: "หอผู้ป่วยใน B" },
    { code: "NURSE", name: "เคาน์เตอร์พยาบาล" },
  ],
  ER: [
    { code: "ER-1", name: "ห้องฉุกเฉิน 1" },
    { code: "ER-OBS", name: "ห้องสังเกตอาการ" },
  ],
  MED: [
    { code: "MED-1", name: "ห้องตรวจอายุรกรรม 1" },
    { code: "MED-2", name: "ห้องตรวจอายุรกรรม 2" },
  ],
  SURG: [
    { code: "SUR-1", name: "ห้องตรวจศัลยกรรม 1" },
    { code: "OR-1", name: "ห้องผ่าตัด 1" },
  ],
  PHAR: [
    { code: "PH-1", name: "เคาน์เตอร์จ่ายยา 1" },
    { code: "PH-2", name: "เคาน์เตอร์จ่ายยา 2" },
    { code: "PH-IPD", name: "ห้องยาผู้ป่วยใน" },
  ],
  REG: [
    { code: "RG-1", name: "เคาน์เตอร์เวชระเบียน 1" },
    { code: "RG-2", name: "เคาน์เตอร์เวชระเบียน 2" },
  ],
  ADMIN: [
    { code: "ADM-1", name: "ห้องผู้ดูแลระบบ" },
    { code: "ADM-IT", name: "ฝ่าย IT" },
  ],
};

const FALLBACK_ROOMS: Room[] = [
  { code: "GEN-1", name: "ห้องทำงาน 1" },
  { code: "GEN-2", name: "ห้องทำงาน 2" },
];

export function roomsForDept(deptCode: string): Room[] {
  return ROOMS_BY_DEPT[deptCode] ?? FALLBACK_ROOMS;
}

/** Default หน่วยงาน per role — pre-selects the most likely unit. */
export const DEFAULT_DEPT: Record<UserRole, string> = {
  doctor: "OPD",
  nurse: "OPD",
  pharmacist: "PHAR",
  reception: "REG",
  admin: "ADMIN",
};
