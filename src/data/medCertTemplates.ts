/**
 * ใบรับรองแพทย์ — โครงสร้าง template + ประโยคความเห็นสำเร็จรูป ตามแนวมาตรฐาน
 * แพทยสภา (Thai Medical Council). หลักการ:
 *  - แพทย์ "เลือก template" ตามชนิด → ระบบ auto-fill ช่อง structured
 *  - จำนวนวันพักที่ AI เสนอเป็น "ค่าประมาณ" — แพทย์ต้องยืนยัน/แก้เสมอ
 *  - ห้าม auto-ออกใบ: ต้องมีการลงนามจริง (signed) ก่อนพิมพ์/ส่ง
 *  - เก็บ log การออกใบทุกครั้ง (ใคร/เมื่อไหร่/ผู้ป่วย) ตามข้อกำหนดทางกฎหมาย
 *
 * องค์ประกอบบังคับของใบ (แพทยสภา): เลขที่ใบประกอบวิชาชีพเวชกรรม, วันที่ออกใบ,
 * และลายมือชื่อแพทย์ผู้ตรวจ. UI บังคับให้ทั้งสามมีค่าก่อน "ลงนาม".
 */

export type CertTemplateId = "none" | "sick-leave" | "fit-to-work" | "general" | "checkup" | "driving";

export interface CertTemplate {
  id: CertTemplateId;
  label: string;
  /** ใช้ช่อง "วันพัก" (restFrom/restTo/restDays) หรือไม่ */
  usesRest: boolean;
  /** จำนวนวันพักที่เป็นค่าเริ่มต้นแบบ AI เสนอ (แพทย์ยืนยัน/แก้) */
  defaultRestDays: number;
  /** ประโยคความเห็นสำเร็จรูป (dropdown) — แพทย์เลือกแล้วแก้ต่อได้ */
  opinions: string[];
}

export const CERT_TEMPLATES: CertTemplate[] = [
  {
    id: "none",
    label: "ไม่ออกใบรับรองแพทย์",
    usesRest: false,
    defaultRestDays: 0,
    opinions: [],
  },
  {
    id: "sick-leave",
    label: "ใบรับรองการลาป่วย",
    usesRest: true,
    defaultRestDays: 2,
    opinions: [
      "เห็นควรให้หยุดพักรักษาตัวตามระยะเวลาข้างต้น",
      "เห็นควรให้หยุดพักและงดออกกำลังหรือยกของหนัก",
      "อาการอยู่ในระยะที่ควรพักฟื้น เห็นควรให้หยุดงานตามกำหนด",
    ],
  },
  {
    id: "fit-to-work",
    label: "ใบรับรองความพร้อมกลับเข้าทำงาน",
    usesRest: false,
    defaultRestDays: 0,
    opinions: [
      "ตรวจร่างกายแล้ว มีสุขภาพแข็งแรง พร้อมกลับเข้าปฏิบัติงานได้ตามปกติ",
      "พร้อมกลับเข้าทำงาน โดยควรหลีกเลี่ยงงานหนักในช่วง 1 สัปดาห์แรก",
    ],
  },
  {
    id: "general",
    label: "ใบรับรองแพทย์ทั่วไป",
    usesRest: false,
    defaultRestDays: 0,
    opinions: [
      "ได้ทำการตรวจร่างกายผู้ป่วยตามรายละเอียดข้างต้นแล้ว",
      "ออกใบรับรองนี้เพื่อใช้เป็นหลักฐานตามที่ผู้ป่วยร้องขอ",
    ],
  },
  {
    id: "checkup",
    label: "ใบรับรองตรวจสุขภาพ",
    usesRest: false,
    defaultRestDays: 0,
    opinions: [
      "ผลการตรวจสุขภาพโดยรวมอยู่ในเกณฑ์ปกติ",
      "ผลการตรวจสุขภาพปกติ ไม่พบโรคที่เป็นอุปสรรคต่อการทำงาน/ศึกษา",
    ],
  },
  {
    id: "driving",
    label: "ใบรับรองเพื่อขอ/ต่อใบขับขี่",
    usesRest: false,
    defaultRestDays: 0,
    opinions: [
      "ไม่พบโรคประจำตัวหรือสภาวะที่เป็นอุปสรรคต่อการขับขี่ยานพาหนะ",
    ],
  },
];

export const CERT_TEMPLATE_BY_ID: Record<CertTemplateId, CertTemplate> =
  Object.fromEntries(CERT_TEMPLATES.map((t) => [t.id, t])) as Record<CertTemplateId, CertTemplate>;

/** Structured medical-certificate state stored on the treatment plan. */
export interface MedicalCert {
  template: CertTemplateId;
  /** การวินิจฉัย (auto จาก ICD-10 Dx) */
  diagnosis: string;
  /** จำนวนวันพัก — AI เสนอ, แพทย์ยืนยัน (เฉพาะ template ที่ usesRest) */
  restDays: number;
  restFrom: string; // YYYY-MM-DD
  restTo: string;   // YYYY-MM-DD
  /** ประโยคความเห็นแพทย์ (เลือกจาก dropdown แล้วแก้ได้) */
  opinion: string;
  /** ลงนามแล้วหรือยัง — ต้อง true ก่อนพิมพ์/ส่ง */
  signed: boolean;
  signedBy?: string;   // ชื่อแพทย์
  licenseNo?: string;  // เลขใบประกอบวิชาชีพเวชกรรม (ว.)
  signedAt?: string;   // ISO timestamp (หลักฐานการออกใบ)
}

export function emptyCert(template: CertTemplateId = "sick-leave"): MedicalCert {
  return {
    template,
    diagnosis: "",
    restDays: CERT_TEMPLATE_BY_ID[template].defaultRestDays,
    restFrom: "",
    restTo: "",
    opinion: "",
    signed: false,
  };
}

/** บันทึก log การออกใบรับรอง (ตามข้อกำหนดทางกฎหมาย). ในระบบจริงต้องส่งขึ้น
 *  backend/audit-trail; ที่นี่เก็บใน memory + console สำหรับ prototype. */
export interface CertIssueLog {
  hn: string;
  patientName: string;
  template: CertTemplateId;
  diagnosis: string;
  signedBy: string;
  licenseNo: string;
  signedAt: string;
}

const ISSUE_LOG: CertIssueLog[] = [];

export function logCertIssuance(entry: CertIssueLog): void {
  ISSUE_LOG.push(entry);
  // prototype audit trail — real impl persists to server.
  console.info("[cert-issue]", entry);
}

export function getCertIssueLog(): readonly CertIssueLog[] {
  return ISSUE_LOG;
}
