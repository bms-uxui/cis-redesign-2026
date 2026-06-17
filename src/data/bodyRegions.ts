/**
 * Body-region taxonomy — single source of truth for the clinical body map.
 *
 * Each region maps to an interactive hotspot drawn over the front-body figure
 * (`src/assets/figma/body/front-region-of-body.svg`, viewBox `0 0 157 422`).
 * The `shape` coordinates live in that same viewBox space so the overlay lines
 * up with the artwork at any rendered size.
 *
 * `id` is the stable key used everywhere (overlay, highlights, and the enum the
 * LLM picks from when mapping a symptom location). `side` marks laterality from
 * the PATIENT's perspective (R = patient's right, which appears on the viewer's
 * left). Coordinates were calibrated against the asset and can be fine-tuned.
 */

export type BodyRegionId =
  | "head"
  | "neck"
  | "chest"
  | "epigastric"
  | "umbilical"
  | "hypogastric"
  | "r-flank"
  | "l-flank"
  | "r-shoulder"
  | "l-shoulder"
  | "r-arm"
  | "l-arm"
  | "r-hand"
  | "l-hand"
  | "r-thigh"
  | "l-thigh";

export type BodyRegionGroup =
  | "head-neck"
  | "thorax"
  | "abdomen"
  | "upper-limb"
  | "lower-limb";

export type RegionShape =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number };

export interface BodyRegion {
  id: BodyRegionId;
  labelTh: string;
  labelEn: string;
  group: BodyRegionGroup;
  side?: "L" | "R";
  view: "front" | "back";
  shape: RegionShape;
}

export const BODY_VIEWBOX = { width: 157, height: 422 } as const;

export const BODY_REGIONS: BodyRegion[] = [
  { id: "head", labelTh: "ศีรษะ", labelEn: "Head", group: "head-neck", view: "front",
    shape: { kind: "ellipse", cx: 95, cy: 32, rx: 24, ry: 32 } },
  { id: "neck", labelTh: "คอ", labelEn: "Neck", group: "head-neck", view: "front",
    shape: { kind: "rect", x: 84, y: 60, w: 22, h: 18, r: 6 } },
  { id: "chest", labelTh: "หน้าอก", labelEn: "Chest", group: "thorax", view: "front",
    shape: { kind: "ellipse", cx: 88, cy: 116, rx: 34, ry: 32 } },
  { id: "epigastric", labelTh: "ลิ้นปี่ (epigastric)", labelEn: "Epigastric", group: "abdomen", view: "front",
    shape: { kind: "ellipse", cx: 84, cy: 165, rx: 24, ry: 16 } },
  { id: "umbilical", labelTh: "รอบสะดือ", labelEn: "Umbilical", group: "abdomen", view: "front",
    shape: { kind: "ellipse", cx: 82, cy: 198, rx: 24, ry: 16 } },
  { id: "hypogastric", labelTh: "ท้องน้อย (hypogastric)", labelEn: "Hypogastric", group: "abdomen", view: "front",
    shape: { kind: "ellipse", cx: 82, cy: 232, rx: 26, ry: 20 } },
  { id: "r-flank", labelTh: "สีข้างขวา", labelEn: "Right flank", group: "abdomen", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 58, cy: 190, rx: 11, ry: 26 } },
  { id: "l-flank", labelTh: "สีข้างซ้าย", labelEn: "Left flank", group: "abdomen", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 110, cy: 195, rx: 11, ry: 26 } },
  { id: "r-shoulder", labelTh: "ไหล่ขวา", labelEn: "Right shoulder", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 56, cy: 96, rx: 16, ry: 15 } },
  { id: "l-shoulder", labelTh: "ไหล่ซ้าย", labelEn: "Left shoulder", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 122, cy: 102, rx: 16, ry: 15 } },
  { id: "r-arm", labelTh: "แขนขวา", labelEn: "Right arm", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 32, cy: 212, rx: 18, ry: 58 } },
  { id: "l-arm", labelTh: "แขนซ้าย", labelEn: "Left arm", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 138, cy: 195, rx: 12, ry: 48 } },
  { id: "r-hand", labelTh: "มือขวา", labelEn: "Right hand", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 15, cy: 288, rx: 14, ry: 18 } },
  { id: "l-hand", labelTh: "มือซ้าย", labelEn: "Left hand", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 148, cy: 250, rx: 10, ry: 16 } },
  { id: "r-thigh", labelTh: "ต้นขาขวา", labelEn: "Right thigh", group: "lower-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 82, cy: 360, rx: 20, ry: 56 } },
  { id: "l-thigh", labelTh: "ต้นขาซ้าย", labelEn: "Left thigh", group: "lower-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 110, cy: 365, rx: 18, ry: 54 } },
];

export const BODY_REGION_BY_ID: Record<BodyRegionId, BodyRegion> =
  Object.fromEntries(BODY_REGIONS.map((r) => [r.id, r])) as Record<
    BodyRegionId,
    BodyRegion
  >;

/** Human-readable enum list for prompting an LLM to map a location → region id. */
export const BODY_REGION_ENUM = BODY_REGIONS.map(
  (r) => `${r.id} (${r.labelTh})`,
).join(", ");
