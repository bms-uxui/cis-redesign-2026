/**
 * A2UI Gallery — reusable UI blocks distilled from the current ehp-cis
 * design language. Each entry is:
 *   - a short description of when to use the block
 *   - a worked example A2UIResponse you can paste into the renderer
 *
 * Two audiences:
 *   1. **The LLM** — the catalog system prompt embeds the names + shapes of
 *      these blocks so the model can compose screens out of them.
 *   2. **Designers / engineers** — open this file when adding a new screen
 *      to see which patterns are already supported.
 *
 * The shape of every block is defined in `./types.ts` as part of the
 * `A2UINode` union; the renderer in `../../components/a2ui/A2UIRenderer.tsx`
 * implements them.
 */

import type { A2UIResponse } from "./types";

export interface GalleryEntry {
  /** Component type, matches A2UINode["type"]. */
  type: string;
  /** Short description of when to use this block. */
  description: string;
  /** Where the block is observed in the current design. */
  observedIn: string[];
  /** Self-contained example response (rootId points at the block under test). */
  example: A2UIResponse;
}

export const GALLERY: GalleryEntry[] = [
  {
    type: "image-tile",
    description:
      "Cinematic image-backed tile with bottom gradient and bold Thai/English label. Use for home menu cards, all-menu modal modules, and article cards.",
    observedIn: ["Home.tsx — MenuCard", "AllMenuModal.tsx — ModuleTile", "Home.tsx — ArticleCard"],
    example: {
      rootId: "root",
      components: [
        {
          id: "root",
          type: "image-tile",
          img: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=80",
          title: "ทะเบียนผู้ป่วยนอก",
          chip: "OPD",
          meta: "เปิดล่าสุดเมื่อ 5 นาทีที่แล้ว",
          action: "open_opd",
        },
      ],
    },
  },

  {
    type: "stat-card",
    description:
      "Hero metric card with large number, label, optional trend chip and tinted icon plate. Use for hero KPIs on dashboards / Home stat row.",
    observedIn: ["Home.tsx — patient count cards"],
    example: {
      rootId: "root",
      components: [
        {
          id: "root",
          type: "stat-card",
          value: "247",
          label: "ผู้ป่วยรอตรวจ",
          sublabel: "ห้องตรวจ 3 / 5 ห้องว่าง",
          iconHint: "patients",
          tone: "blue",
          trend: "up",
          trendLabel: "+12 จากเมื่อวาน",
        },
      ],
    },
  },

  {
    type: "action-card",
    description:
      "Solid-color CTA tile with icon plate + title + caption. Used for the smart-card / appointment shortcuts on the OPD page, and for any primary-action surface.",
    observedIn: ["PatientOPDCard.tsx — smartcard + appointment cards"],
    example: {
      rootId: "root",
      components: [
        {
          id: "root",
          type: "action-card",
          title: "อ่านสมาร์ทการ์ด",
          caption: "ดึงข้อมูลผู้ป่วยจากบัตรประชาชน",
          iconHint: "patient",
          tone: "violet",
          action: "scan_smartcard",
        },
      ],
    },
  },

  {
    type: "chip-group",
    description:
      "Horizontal row of pill chips. Use for allergy tags, ICD code chips, triage flags, problem lists.",
    observedIn: ["PatientOPDCard.tsx — allergy / chronic disease chips"],
    example: {
      rootId: "root",
      components: [
        {
          id: "root",
          type: "chip-group",
          chips: [
            { label: "Penicillin", tone: "rose" },
            { label: "Sulfa", tone: "rose" },
            { label: "Hypertension", tone: "amber" },
            { label: "DM Type 2", tone: "amber" },
          ],
        },
      ],
    },
  },

  {
    type: "info-row",
    description:
      "Label / value row with optional icon and tone. Stack several to render vital signs, lab panels, demographic strips.",
    observedIn: ["PatientOPDCard.tsx — vitals / right-rail summary"],
    example: {
      rootId: "stack",
      components: [
        { id: "stack", type: "stack", children: ["r1", "r2", "r3", "r4"] },
        { id: "r1", type: "info-row", label: "BP", value: "160/95 mmHg", tone: "danger", iconHint: "vitals" },
        { id: "r2", type: "info-row", label: "HR", value: "110 bpm", tone: "danger", iconHint: "vitals" },
        { id: "r3", type: "info-row", label: "RR", value: "22 /min", iconHint: "vitals" },
        { id: "r4", type: "info-row", label: "SpO₂", value: "96%", iconHint: "vitals" },
      ],
    },
  },

  {
    type: "metric-grid",
    description:
      "Compact 2-4 column grid of mini metric cards. Best for vital-signs blocks, lab summaries, scheduling rollups.",
    observedIn: ["Generated for Doctor Summary screen drafts"],
    example: {
      rootId: "root",
      components: [
        {
          id: "root",
          type: "metric-grid",
          columns: 4,
          items: [
            { label: "BP", value: "160/95", tone: "rose", iconHint: "vitals" },
            { label: "HR", value: "110", tone: "rose", iconHint: "vitals" },
            { label: "RR", value: "22", tone: "amber", iconHint: "vitals" },
            { label: "SpO₂", value: "96%", tone: "emerald", iconHint: "vitals" },
          ],
        },
      ],
    },
  },

  {
    type: "avatar",
    description:
      "Round tinted square with image / initials / icon + optional label. Use for profile chips, module avatars, speaker tags.",
    observedIn: ["GlobalHeader.tsx — profile pill"],
    example: {
      rootId: "root",
      components: [
        {
          id: "root",
          type: "avatar",
          label: "นพ. ชารีฟ ราอูล",
          initials: "ชร",
          tone: "blue",
          size: "md",
        },
      ],
    },
  },
];

/**
 * Compact summary suitable for embedding in an LLM system prompt — explains
 * each gallery block in one line. Keep this terse; the model already has
 * the catalog schema in its context.
 */
export const GALLERY_PROMPT_SUMMARY = GALLERY.map(
  (e) => `- ${e.type} — ${e.description}`,
).join("\n");
