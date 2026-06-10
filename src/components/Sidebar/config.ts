import {
  IconStethoscope,
  IconReportMedical,
  IconCalendarEvent,
  IconActivity,
  IconUser,
  IconBuildingHospital,
  IconClipboardHeart,
  IconClipboardText,
  IconClipboardList,
  IconBed,
  IconPill,
  IconAmbulance,
  IconTruck,
  IconCertificate,
  IconDental,
  IconCash,
  IconCreditCard,
  IconFlask,
  IconScan,
  IconSparkles,
  IconHome,
  IconCalendarTime,
  IconBolt,
} from "@tabler/icons-react";
import type { RailGroup, RailEntry, PanelDef } from "./types";

// Rail icons — Untitled UI glyphs exported from Figma, inlined via Vite
// `?raw` so their `currentColor` strokes inherit the rail's text color.
import iconFileHeart from "../../assets/figma/sidebar-icons/file-heart-02.svg?raw";
import iconFolderCode from "../../assets/figma/sidebar-icons/folder-code.svg?raw";
import iconDatabase from "../../assets/figma/sidebar-icons/database-01.svg?raw";
import iconMedicalCircle from "../../assets/figma/sidebar-icons/medical-circle.svg?raw";
import iconHeartHand from "../../assets/figma/sidebar-icons/heart-hand.svg?raw";
import iconCpuChip from "../../assets/figma/sidebar-icons/cpu-chip-01.svg?raw";
import iconFilePlus from "../../assets/figma/sidebar-icons/file-plus-03.svg?raw";
import iconFileShield from "../../assets/figma/sidebar-icons/file-shield-02.svg?raw";
import iconHealthcareCall from "../../assets/figma/sidebar-icons/healthcare-call.svg?raw";
import iconSettings from "../../assets/figma/sidebar-icons/settings-01.svg?raw";

// Panel definitions extracted so the rail-entry list below stays readable
// and easy to reorder.

const WORKBENCH_PANEL: PanelDef = {
  title: "Workbench",
  groups: [
    {
      label: "คลินิก",
      items: [
        { key: "nurse", label: "Nurse", Icon: IconClipboardHeart },
        { key: "onestop", label: "One Stop Service", Icon: IconBuildingHospital },
        { key: "rehab", label: "ทะเบียนเวชศาสตร์ฟื้นฟู", Icon: IconActivity },
        { key: "beauty-clinic", label: "Beauty Clinic", Icon: IconSparkles },
        { key: "nurse-home-visit", label: "Nurse Home Visit", Icon: IconHome },
      ],
    },
    {
      label: "การตรวจวินิจฉัย",
      items: [
        {
          key: "laboratory",
          label: "Laboratory",
          Icon: IconFlask,
          aliases: ["แล็บ", "lab", "ตรวจเลือด", "เจาะเลือด"],
        },
        {
          key: "radiology",
          label: "Radiology",
          Icon: IconScan,
          aliases: ["เอกซเรย์", "x-ray", "xray", "เอ็กซเรย์", "ct", "mri"],
        },
      ],
    },
    {
      label: "ยาและเอกสาร",
      items: [
        { key: "eprescription", label: "ePrescription", Icon: IconClipboardList },
        { key: "dispensary", label: "Dispensary", Icon: IconPill },
        { key: "home-delivery", label: "ทะเบียนจัดส่งยาที่บ้าน", Icon: IconTruck },
        {
          key: "medical-cert",
          label: "Medical Certificate",
          Icon: IconCertificate,
          aliases: ["ใบรับรองแพทย์", "ใบรับรอง", "medcert", "cert", "ลาป่วย"],
        },
      ],
    },
    {
      label: "แผนกเฉพาะทาง",
      items: [
        { key: "dental-workbench", label: "Dental Workbench", Icon: IconDental },
        {
          key: "checkup",
          label: "Checkup",
          Icon: IconUser,
          children: [
            { key: "register", label: "ทะเบียนตรวจสุขภาพ" },
            { key: "certificate", label: "ทะเบียนการออกใบรับรองผล" },
            { key: "package", label: "เลือก Package ตรวจสุขภาพ" },
            { key: "prepare", label: "เตรียมตรวจรายองค์กร" },
          ],
        },
      ],
    },
    {
      label: "การเงิน",
      items: [
        { key: "finance", label: "Finance", Icon: IconCash },
        { key: "finance-merchant", label: "Finance Merchant Payment", Icon: IconCreditCard },
      ],
    },
  ],
};

const OPD_PANEL: PanelDef = {
  title: "ระเบียนผู้ป่วยนอก",
  groups: [
    {
      items: [
        { key: "register", label: "ทะเบียนผู้ป่วย", Icon: IconClipboardText, navigateTo: "/opd/register" },
        { key: "send", label: "ส่งตรวจ", Icon: IconStethoscope },
        { key: "appointment", label: "การนัดหมาย", Icon: IconCalendarEvent },
        { key: "treatment", label: "การรักษา", Icon: IconActivity },
        { key: "followup", label: "ติดตามผล", Icon: IconReportMedical },
      ],
    },
  ],
};

const IPD_PANEL: PanelDef = {
  title: "ระเบียนผู้ป่วยใน",
  groups: [
    {
      items: [
        { key: "admit", label: "การเข้ารับบริการ", Icon: IconBed },
        { key: "treat", label: "การรักษา", Icon: IconActivity },
        { key: "discharge", label: "ติดตามผล", Icon: IconReportMedical },
      ],
    },
  ],
};

const PHARMACY_PANEL: PanelDef = {
  title: "การจัดการยา",
  groups: [
    {
      items: [
        { key: "order", label: "สั่งจ่ายยา", Icon: IconPill },
        { key: "usage", label: "การใช้ยา", Icon: IconActivity },
        { key: "history", label: "การบันทึกประวัติยา", Icon: IconReportMedical },
      ],
    },
  ],
};

/**
 * Sidebar rail layout — flat order matches the legacy HOSxP top-level menu
 * sequence as closely as our concepts allow:
 *   OPD → IPD → Workbench → Data Export → EPIDEM → Pharmacy → Claims →
 *   PCU → Referral → Analytics → Telehealth → System.
 *
 * RAIL_GROUPS is kept as a single-group array now that the user can reorder
 * freely via the customize modal; the visual gaps between groups are gone.
 */
export const RAIL_GROUPS: RailGroup[] = [
  {
    items: [
      { key: "schedule", Icon: IconCalendarTime, label: "ตารางออกตรวจ", navigateTo: "/schedule" },
      { key: "automation", Icon: IconBolt, label: "Automation", navigateTo: "/automation" },
      { key: "opd", iconSrc: iconFileHeart, label: "ระเบียนผู้ป่วยนอก", panel: OPD_PANEL },
      { key: "ipd", Icon: IconBed, label: "ระเบียนผู้ป่วยใน", panel: IPD_PANEL },
      { key: "workbench", iconSrc: iconFolderCode, label: "Workbench", panel: WORKBENCH_PANEL },
      { key: "dashboard", iconSrc: iconDatabase, label: "แดชบอร์ดของฉัน", navigateTo: "/dashboards" },
      { key: "epidem", iconSrc: iconMedicalCircle, label: "EPIDEM" },
      {
        key: "pharmacy",
        iconSrc: iconHeartHand,
        label: "ห้องยา",
        panel: PHARMACY_PANEL,
        aliases: ["เภสัช", "pharmacy", "จ่ายยา", "ยา"],
      },
      { key: "claims", iconSrc: iconFileShield, label: "เคลม", aliases: ["claim", "เบิก", "ประกัน", "สิทธิ"] },
      { key: "pcu", Icon: IconAmbulance, label: "PCU" },
      { key: "referral", iconSrc: iconFilePlus, label: "ส่งต่อ" },
      { key: "analytics", iconSrc: iconCpuChip, label: "วิเคราะห์" },
      { key: "telehealth", iconSrc: iconHealthcareCall, label: "Telehealth" },
      { key: "settings", iconSrc: iconSettings, label: "ตั้งค่า" },
    ],
  },
];

/** Flat list of every rail entry, in render order. */
export const RAIL_LIST: RailEntry[] = RAIL_GROUPS.flatMap((g) => g.items);
