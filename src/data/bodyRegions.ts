/**
 * Body-region taxonomy. Abdomen = NINE regions, landmark lattice with smooth
 * bowed (barrel) verticals + downward-curved bottom row, matched to the model
 * 3/4 perspective. Clipped to abdomen vector in BodyMap.
 */

export type BodyRegionId =
  | "head"
  | "neck"
  | "chest"
  | "r-chest"
  | "l-chest"
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
  | "groin"
  | "r-shoulder"
  | "l-shoulder"
  | "r-arm"
  | "l-arm"
  | "r-elbow"
  | "l-elbow"
  | "r-forearm"
  | "l-forearm"
  | "r-wrist"
  | "l-wrist"
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
  | "l-foot"
  // ── back view ──
  | "b-head"
  | "b-nape"
  | "bul"
  | "bur"
  | "bll"
  | "blc"
  | "blr"
  | "br-shoulder"
  | "bl-shoulder"
  | "br-arm"
  | "bl-arm"
  | "br-elbow"
  | "bl-elbow"
  | "br-forearm"
  | "bl-forearm"
  | "br-wrist"
  | "bl-wrist"
  | "br-hand"
  | "bl-hand"
  | "br-buttock"
  | "bl-buttock"
  | "br-thigh"
  | "bl-thigh"
  | "br-knee"
  | "bl-knee"
  | "br-leg"
  | "bl-leg"
  | "br-ankle"
  | "bl-ankle"
  | "br-heel"
  | "bl-heel"
  | "br-midfoot"
  | "bl-midfoot"
  | "br-foot"
  | "bl-foot";

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
  // Central chest (sternal/mediastinal strip). Flanked by the two pectoral/
  // breast regions below.
  { id: "chest", labelTh: "กลางอก (sternum)", labelEn: "Sternal region", group: "trunk", view: "front",
    shape: { kind: "ellipse", cx: 190, cy: 214, rx: 12, ry: 22 } },
  // Pectoral / breast, one each side. Patient's right = viewer's left = low x.
  { id: "r-chest", labelTh: "เต้านม/อกขวา", labelEn: "Right breast", group: "trunk", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 165, cy: 232, rx: 18, ry: 18 } },
  { id: "l-chest", labelTh: "เต้านม/อกซ้าย", labelEn: "Left breast", group: "trunk", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 232, cy: 232, rx: 18, ry: 18 } },
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
  { id: "pelvis", labelTh: "เชิงกราน / หัวหน่าว", labelEn: "Pelvis / Pubic", group: "trunk", view: "front",
    shape: { kind: "ellipse", cx: 210, cy: 430, rx: 18, ry: 18 } },
  { id: "groin", labelTh: "ขาหนีบ", labelEn: "Groin / Inguinal", group: "trunk", view: "front",
    shape: { kind: "ellipse", cx: 238, cy: 452, rx: 14, ry: 16 } },
  { id: "r-shoulder", labelTh: "ไหล่ขวา", labelEn: "Right shoulder", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 131, cy: 186, rx: 18, ry: 18 } },
  { id: "l-shoulder", labelTh: "ไหล่ซ้าย", labelEn: "Left shoulder", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 300, cy: 192, rx: 18, ry: 18 } },
  { id: "r-arm", labelTh: "ต้นแขนขวา", labelEn: "Right upper arm", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 116, cy: 273, rx: 18, ry: 18 } },
  { id: "l-arm", labelTh: "ต้นแขนซ้าย", labelEn: "Left upper arm", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 314, cy: 263, rx: 18, ry: 18 } },
  { id: "r-elbow", labelTh: "ข้อศอกขวา", labelEn: "Right elbow", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 113, cy: 320, rx: 14, ry: 14 } },
  { id: "l-elbow", labelTh: "ข้อศอกซ้าย", labelEn: "Left elbow", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 325, cy: 318, rx: 14, ry: 14 } },
  { id: "r-forearm", labelTh: "ปลายแขนขวา", labelEn: "Right forearm", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 94, cy: 376, rx: 18, ry: 18 } },
  { id: "l-forearm", labelTh: "ปลายแขนซ้าย", labelEn: "Left forearm", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 366, cy: 365, rx: 18, ry: 18 } },
  { id: "r-wrist", labelTh: "ข้อมือขวา", labelEn: "Right wrist", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 76, cy: 409, rx: 13, ry: 13 } },
  { id: "l-wrist", labelTh: "ข้อมือซ้าย", labelEn: "Left wrist", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 343, cy: 438, rx: 13, ry: 13 } },
  { id: "r-hand", labelTh: "มือขวา", labelEn: "Right hand", group: "upper-limb", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 68, cy: 423, rx: 16, ry: 16 } },
  { id: "l-hand", labelTh: "มือซ้าย", labelEn: "Left hand", group: "upper-limb", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 352, cy: 488, rx: 16, ry: 16 } },
  { id: "r-hip", labelTh: "สะโพกขวา", labelEn: "Right hip", group: "trunk", side: "R", view: "front",
    shape: { kind: "ellipse", cx: 115, cy: 314, rx: 18, ry: 18 } },
  { id: "l-hip", labelTh: "สะโพกซ้าย", labelEn: "Left hip", group: "trunk", side: "L", view: "front",
    shape: { kind: "ellipse", cx: 258, cy: 466, rx: 18, ry: 18 } },
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

  // ── back view ── (viewer's right = patient's right = high x)
  { id: "b-head", labelTh: "ท้ายทอย", labelEn: "Occiput", group: "head-neck", view: "back",
    shape: { kind: "ellipse", cx: 165, cy: 73, rx: 18, ry: 18 } },
  { id: "b-nape", labelTh: "ต้นคอด้านหลัง", labelEn: "Nape", group: "head-neck", view: "back",
    shape: { kind: "ellipse", cx: 150, cy: 134, rx: 16, ry: 16 } },
  // Back trunk (Figma division). Upper = 2 panels (L/R), lower = L / spine / R.
  // Low x = patient's LEFT in back view.
  { id: "bul", labelTh: "หลังส่วนบนซ้าย / สะบักซ้าย", labelEn: "Upper back, left", group: "trunk", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 102, cy: 213, rx: 20, ry: 20 } },
  { id: "bur", labelTh: "หลังส่วนบนขวา / สะบักขวา", labelEn: "Upper back, right", group: "trunk", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 179, cy: 213, rx: 20, ry: 20 } },
  { id: "bll", labelTh: "บั้นเอวซ้าย", labelEn: "Lower back, left", group: "trunk", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 111, cy: 331, rx: 16, ry: 18 } },
  { id: "blc", labelTh: "กลางหลังล่าง (สันหลัง/กระเบนเหน็บ)", labelEn: "Lower back, central", group: "trunk", view: "back",
    shape: { kind: "ellipse", cx: 137, cy: 353, rx: 13, ry: 20 } },
  { id: "blr", labelTh: "บั้นเอวขวา", labelEn: "Lower back, right", group: "trunk", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 195, cy: 332, rx: 16, ry: 18 } },
  { id: "br-shoulder", labelTh: "ไหล่ขวา (หลัง)", labelEn: "Right shoulder", group: "upper-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 241, cy: 189, rx: 18, ry: 18 } },
  { id: "bl-shoulder", labelTh: "ไหล่ซ้าย (หลัง)", labelEn: "Left shoulder", group: "upper-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 60, cy: 195, rx: 18, ry: 18 } },
  { id: "br-arm", labelTh: "ต้นแขนขวา (หลัง)", labelEn: "Right upper arm", group: "upper-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 253, cy: 270, rx: 18, ry: 18 } },
  { id: "bl-arm", labelTh: "ต้นแขนซ้าย (หลัง)", labelEn: "Left upper arm", group: "upper-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 52, cy: 268, rx: 18, ry: 18 } },
  { id: "br-elbow", labelTh: "ข้อศอกขวา (หลัง)", labelEn: "Right elbow", group: "upper-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 262, cy: 320, rx: 14, ry: 14 } },
  { id: "bl-elbow", labelTh: "ข้อศอกซ้าย (หลัง)", labelEn: "Left elbow", group: "upper-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 46, cy: 320, rx: 14, ry: 14 } },
  { id: "br-forearm", labelTh: "ปลายแขนขวา (หลัง)", labelEn: "Right forearm", group: "upper-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 285, cy: 385, rx: 18, ry: 18 } },
  { id: "bl-forearm", labelTh: "ปลายแขนซ้าย (หลัง)", labelEn: "Left forearm", group: "upper-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 40, cy: 384, rx: 18, ry: 18 } },
  { id: "br-wrist", labelTh: "ข้อมือขวา (หลัง)", labelEn: "Right wrist", group: "upper-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 299, cy: 428, rx: 12, ry: 12 } },
  { id: "bl-wrist", labelTh: "ข้อมือซ้าย (หลัง)", labelEn: "Left wrist", group: "upper-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 30, cy: 424, rx: 12, ry: 12 } },
  { id: "br-hand", labelTh: "มือขวา (หลัง)", labelEn: "Right hand", group: "upper-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 323, cy: 488, rx: 16, ry: 16 } },
  { id: "bl-hand", labelTh: "มือซ้าย (หลัง)", labelEn: "Left hand", group: "upper-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 28, cy: 470, rx: 16, ry: 16 } },
  { id: "br-buttock", labelTh: "ก้น/สะโพกขวา", labelEn: "Right buttock", group: "trunk", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 185, cy: 433, rx: 20, ry: 18 } },
  { id: "bl-buttock", labelTh: "ก้น/สะโพกซ้าย", labelEn: "Left buttock", group: "trunk", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 109, cy: 431, rx: 20, ry: 18 } },
  { id: "br-thigh", labelTh: "ต้นขาขวา (หลัง)", labelEn: "Right thigh", group: "lower-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 196, cy: 520, rx: 18, ry: 20 } },
  { id: "bl-thigh", labelTh: "ต้นขาซ้าย (หลัง)", labelEn: "Left thigh", group: "lower-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 110, cy: 540, rx: 18, ry: 20 } },
  { id: "br-knee", labelTh: "ข้อพับเข่าขวา", labelEn: "Right popliteal", group: "lower-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 198, cy: 663, rx: 16, ry: 16 } },
  { id: "bl-knee", labelTh: "ข้อพับเข่าซ้าย", labelEn: "Left popliteal", group: "lower-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 102, cy: 659, rx: 16, ry: 16 } },
  { id: "br-leg", labelTh: "น่องขวา", labelEn: "Right calf", group: "lower-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 192, cy: 781, rx: 18, ry: 20 } },
  { id: "bl-leg", labelTh: "น่องซ้าย", labelEn: "Left calf", group: "lower-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 87, cy: 771, rx: 18, ry: 20 } },
  { id: "br-ankle", labelTh: "ข้อเท้าขวา (หลัง)", labelEn: "Right ankle", group: "lower-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 191, cy: 875, rx: 14, ry: 14 } },
  { id: "bl-ankle", labelTh: "ข้อเท้าซ้าย (หลัง)", labelEn: "Left ankle", group: "lower-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 85, cy: 868, rx: 14, ry: 14 } },
  { id: "br-heel", labelTh: "ส้นเท้าขวา (หลัง)", labelEn: "Right heel", group: "lower-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 178, cy: 934, rx: 12, ry: 12 } },
  { id: "bl-heel", labelTh: "ส้นเท้าซ้าย (หลัง)", labelEn: "Left heel", group: "lower-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 73, cy: 923, rx: 12, ry: 12 } },
  { id: "br-midfoot", labelTh: "ฝ่าเท้า/อุ้งเท้าขวา", labelEn: "Right midfoot/sole", group: "lower-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 223, cy: 934, rx: 16, ry: 10 } },
  { id: "bl-midfoot", labelTh: "ฝ่าเท้า/อุ้งเท้าซ้าย", labelEn: "Left midfoot/sole", group: "lower-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 110, cy: 915, rx: 14, ry: 10 } },
  { id: "br-foot", labelTh: "หลังเท้าขวา", labelEn: "Right foot (dorsum)", group: "lower-limb", side: "R", view: "back",
    shape: { kind: "ellipse", cx: 221, cy: 905, rx: 16, ry: 16 } },
  { id: "bl-foot", labelTh: "หลังเท้าซ้าย", labelEn: "Left foot (dorsum)", group: "lower-limb", side: "L", view: "back",
    shape: { kind: "ellipse", cx: 102, cy: 894, rx: 16, ry: 16 } },
];

export const BODY_REGION_BY_ID: Record<BodyRegionId, BodyRegion> =
  Object.fromEntries(BODY_REGIONS.map((r) => [r.id, r])) as Record<BodyRegionId, BodyRegion>;

export const BODY_REGION_ENUM = BODY_REGIONS.map((r) => `${r.id} (${r.labelTh})`).join(", ");
