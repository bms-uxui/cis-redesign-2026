/**
 * Body-region taxonomy. Abdomen = NINE regions, landmark lattice with smooth
 * bowed (barrel) verticals + downward-curved bottom row, matched to the model
 * 3/4 perspective. Clipped to abdomen vector in BodyMap.
 */

export type BodyRegionId =
  | "head"
  | "neck"
  | "chest"
  | "r-hypochondriac"
  | "epigastric"
  | "l-hypochondriac"
  | "r-lumbar"
  | "umbilical"
  | "l-lumbar"
  | "r-iliac"
  | "hypogastric"
  | "l-iliac"
  | "pelvis"
  | "r-shoulder"
  | "l-shoulder"
  | "r-arm"
  | "l-arm"
  | "r-forearm"
  | "l-forearm"
  | "r-hand"
  | "l-hand"
  | "r-hip"
  | "l-hip"
  | "r-thigh"
  | "l-thigh"
  | "r-knee"
  | "l-knee"
  | "r-leg"
  | "l-leg"
  | "r-ankle"
  | "l-ankle"
  | "r-foot"
  | "l-foot";

export type BodyRegionGroup = "head-neck" | "trunk" | "upper-limb" | "lower-limb";

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
  clipToShape?: boolean;
}

export const BODY_VIEWBOX = { width: 381, height: 961 } as const;
export const BODY_VIEWBOX_BACK = { width: 358, height: 948 } as const;

export const BODY_REGIONS: BodyRegion[] = [
  { id: "head", labelTh: "ศีรษะ", labelEn: "Head", group: "head-neck", view: "front",
    shape: { kind: "ellipse", cx: 241, cy: 66, rx: 18, ry: 18 } },
  { id: "neck", labelTh: "คอ", labelEn: "Neck", group: "head-neck", view: "front",
    shape: { kind: "ellipse", cx: 216, cy: 106, rx: 18, ry: 18 } },
  { id: "chest", labelTh: "ทรวงอก", labelEn: "Thorax", group: "trunk", view: "front",
    shape: { kind: "ellipse", cx: 202, cy: 214, rx: 18, ry: 18 } },
  { id: "r-hypochondriac", labelTh: "ใต้ชายโครงขวา", labelEn: "Right hypochondriac", group: "trunk", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 136, cy: 284, rx: 18, ry: 18 } },
  { id: "epigastric", labelTh: "ลิ้นปี่ (epigastric)", labelEn: "Epigastric", group: "trunk", view: "front",
    shape: { kind: "ellipse", cx: 176, cy: 286, rx: 18, ry: 18 } },
  { id: "l-hypochondriac", labelTh: "ใต้ชายโครงซ้าย", labelEn: "Left hypochondriac", group: "trunk", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 235, cy: 289, rx: 18, ry: 18 } },
  { id: "r-lumbar", labelTh: "บั้นเอวขวา (สีข้าง)", labelEn: "Right lumbar", group: "trunk", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 130, cy: 344, rx: 18, ry: 18 } },
  { id: "umbilical", labelTh: "รอบสะดือ", labelEn: "Umbilical", group: "trunk", view: "front",
    shape: { kind: "ellipse", cx: 174, cy: 345, rx: 18, ry: 18 } },
  { id: "l-lumbar", labelTh: "บั้นเอวซ้าย (สีข้าง)", labelEn: "Left lumbar", group: "trunk", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 237, cy: 348, rx: 18, ry: 18 } },
  { id: "r-iliac", labelTh: "ท้องน้อยขวา (iliac)", labelEn: "Right iliac", group: "trunk", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 138, cy: 394, rx: 18, ry: 18 } },
  { id: "hypogastric", labelTh: "เหนือหัวหน่าว (hypogastric)", labelEn: "Hypogastric", group: "trunk", view: "front",
    shape: { kind: "ellipse", cx: 174, cy: 398, rx: 18, ry: 18 } },
  { id: "l-iliac", labelTh: "ท้องน้อยซ้าย (iliac)", labelEn: "Left iliac", group: "trunk", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 227, cy: 394, rx: 18, ry: 18 } },
  { id: "pelvis", labelTh: "เชิงกราน / หัวหน่าว", labelEn: "Pelvis / Groin", group: "trunk", view: "front",
    shape: { kind: "ellipse", cx: 216, cy: 435, rx: 18, ry: 18 } },
  { id: "r-shoulder", labelTh: "ไหล่ขวา", labelEn: "Right shoulder", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 131, cy: 186, rx: 18, ry: 18 } },
  { id: "l-shoulder", labelTh: "ไหล่ซ้าย", labelEn: "Left shoulder", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 300, cy: 192, rx: 18, ry: 18 } },
  { id: "r-arm", labelTh: "ต้นแขนขวา", labelEn: "Right upper arm", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 116, cy: 273, rx: 18, ry: 18 } },
  { id: "l-arm", labelTh: "ต้นแขนซ้าย", labelEn: "Left upper arm", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 314, cy: 263, rx: 18, ry: 18 } },
  { id: "r-forearm", labelTh: "ปลายแขนขวา", labelEn: "Right forearm", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 94, cy: 376, rx: 18, ry: 18 } },
  { id: "l-forearm", labelTh: "ปลายแขนซ้าย", labelEn: "Left forearm", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 346, cy: 341, rx: 18, ry: 18 } },
  { id: "r-hand", labelTh: "มือขวา", labelEn: "Right hand", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 71, cy: 418, rx: 18, ry: 18 } },
  { id: "l-hand", labelTh: "มือซ้าย", labelEn: "Left hand", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 347, cy: 464, rx: 18, ry: 18 } },
  { id: "r-hip", labelTh: "สะโพกขวา", labelEn: "Right hip", group: "trunk", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 115, cy: 314, rx: 18, ry: 18 } },
  { id: "l-hip", labelTh: "สะโพกซ้าย", labelEn: "Left hip", group: "trunk", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 277, cy: 406, rx: 18, ry: 18 } },
  { id: "r-thigh", labelTh: "ต้นขาขวา", labelEn: "Right thigh", group: "lower-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 158, cy: 516, rx: 18, ry: 18 } },
  { id: "l-thigh", labelTh: "ต้นขาซ้าย", labelEn: "Left thigh", group: "lower-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 250, cy: 496, rx: 18, ry: 18 } },
  { id: "r-knee", labelTh: "เข่าขวา", labelEn: "Right knee", group: "lower-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 164, cy: 656, rx: 18, ry: 18 } },
  { id: "l-knee", labelTh: "เข่าซ้าย", labelEn: "Left knee", group: "lower-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 251, cy: 672, rx: 18, ry: 18 } },
  { id: "r-leg", labelTh: "หน้าแข้งขวา", labelEn: "Right leg", group: "lower-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 170, cy: 761, rx: 18, ry: 18 } },
  { id: "l-leg", labelTh: "หน้าแข้งซ้าย", labelEn: "Left leg", group: "lower-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 270, cy: 770, rx: 18, ry: 18 } },
  { id: "r-ankle", labelTh: "ข้อเท้าขวา", labelEn: "Right ankle", group: "lower-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 167, cy: 850, rx: 18, ry: 18 } },
  { id: "l-ankle", labelTh: "ข้อเท้าซ้าย", labelEn: "Left ankle", group: "lower-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 263, cy: 873, rx: 18, ry: 18 } },
  { id: "r-foot", labelTh: "เท้าขวา", labelEn: "Right foot", group: "lower-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 120, cy: 914, rx: 18, ry: 18 } },
  { id: "l-foot", labelTh: "เท้าซ้าย", labelEn: "Left foot", group: "lower-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 226, cy: 948, rx: 18, ry: 18 } },
];

export const BODY_REGION_BY_ID: Record<BodyRegionId, BodyRegion> =
  Object.fromEntries(BODY_REGIONS.map((r) => [r.id, r])) as Record<BodyRegionId, BodyRegion>;

export const BODY_REGION_ENUM = BODY_REGIONS.map((r) => `${r.id} (${r.labelTh})`).join(", ");
