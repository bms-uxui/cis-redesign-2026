import {
  IconLayoutDashboard,
  IconStethoscope,
  IconUserPlus,
  IconHeartbeat,
  IconReportMedical,
  IconPill,
  IconCalendarEvent,
  IconReceipt2,
  IconChartBar,
  IconSettings,
  IconUser,
  IconBuildingHospital,
  IconClipboardHeart,
  IconClipboardText,
  IconBed,
  IconActivity,
} from "@tabler/icons-react";
import type { RailGroup, RailEntry } from "./types";

/**
 * Sidebar rail layout — three groups separated by visual gaps.
 *
 * Conventions:
 *   • The first item is always Home (navigates to "/", no panel).
 *   • Rail entries with a `panel` open the wide section when clicked.
 *   • Rail entries without a panel are quick-switches that only highlight.
 */
export const RAIL_GROUPS: RailGroup[] = [
  {
    items: [
      {
        key: "workbench",
        Icon: IconHeartbeat,
        label: "Workbench",
        panel: {
          title: "Workbench",
          items: [
            { key: "nurse", label: "Nurse", Icon: IconClipboardHeart },
            { key: "onestop", label: "One Stop Service", Icon: IconBuildingHospital },
            {
              key: "checkup",
              label: "Checkup",
              Icon: IconUser,
              children: [
                { key: "register", label: "ทะเบียนตรวจสุขภาพ" },
                { key: "certificate", label: "ใบรับรองผลตรวจสุขภาพ" },
                { key: "package", label: "Package ตรวจสุขภาพ" },
                { key: "prepare", label: "เตรียมตรวจสุขภาพ" },
              ],
            },
          ],
        },
      },
      {
        key: "opd",
        Icon: IconStethoscope,
        label: "ระเบียนผู้ป่วยนอก",
        panel: {
          title: "ระเบียนผู้ป่วยนอก",
          items: [
            { key: "register", label: "ลงทะเบียน", Icon: IconClipboardText },
            { key: "send", label: "ส่งตรวจ", Icon: IconStethoscope },
            { key: "appointment", label: "การนัดหมาย", Icon: IconCalendarEvent },
            { key: "treatment", label: "การรักษา", Icon: IconActivity },
            { key: "followup", label: "ติดตามผล", Icon: IconReportMedical },
          ],
        },
      },
      {
        key: "ipd",
        Icon: IconBed,
        label: "ระเบียนผู้ป่วยใน",
        panel: {
          title: "ระเบียนผู้ป่วยใน",
          items: [
            { key: "admit", label: "การเข้ารับบริการ", Icon: IconBed },
            { key: "treat", label: "การรักษา", Icon: IconActivity },
            { key: "discharge", label: "ติดตามผล", Icon: IconReportMedical },
          ],
        },
      },
    ],
  },
  {
    items: [
      { key: "dashboard", Icon: IconLayoutDashboard, label: "แดชบอร์ด" },
      { key: "register-quick", Icon: IconUserPlus, label: "ลงทะเบียน" },
      {
        key: "pharmacy",
        Icon: IconPill,
        label: "ห้องยา",
        panel: {
          title: "การจัดการยา",
          items: [
            { key: "order", label: "สั่งจ่ายยา", Icon: IconPill },
            { key: "usage", label: "การใช้ยา", Icon: IconActivity },
            { key: "history", label: "การบันทึกประวัติยา", Icon: IconReportMedical },
          ],
        },
      },
    ],
  },
  {
    items: [
      { key: "claims", Icon: IconReceipt2, label: "เคลม" },
      { key: "analytics", Icon: IconChartBar, label: "วิเคราะห์" },
      { key: "settings", Icon: IconSettings, label: "ตั้งค่า" },
    ],
  },
];

/** Flat list of every rail entry, in render order. */
export const RAIL_LIST: RailEntry[] = RAIL_GROUPS.flatMap((g) => g.items);
