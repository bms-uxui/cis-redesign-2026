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
  },
  nurse: {
    role: "nurse",
    name: "พว. กัญญา ศรีสุข",
    title: "พยาบาลวิชาชีพ · Registered Nurse",
    username: "kanya.s",
    email: "kanya.s@ehp.co.th",
    initials: "KS",
  },
  pharmacist: {
    role: "pharmacist",
    name: "ภก. ธนวัฒน์ พงษ์ไพบูลย์",
    title: "เภสัชกร · Pharmacist",
    username: "thanawat.p",
    email: "thanawat.p@ehp.co.th",
    initials: "TP",
  },
  reception: {
    role: "reception",
    name: "พิมพ์ชนก ใจดี",
    title: "เจ้าหน้าที่เวชระเบียน · Reception",
    username: "pimchanok.j",
    email: "pimchanok.j@ehp.co.th",
    initials: "PJ",
  },
  admin: {
    role: "admin",
    name: "วรเดช อินทรกุล",
    title: "ผู้ดูแลระบบ · System Administrator",
    username: "woradej.i",
    email: "woradej.i@ehp.co.th",
    initials: "WI",
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
