import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { IconCamera } from "@tabler/icons-react";
import {
  BODY_REGIONS,
  BODY_REGION_BY_ID,
  BODY_VIEWBOX,
  BODY_VIEWBOX_BACK,
  type BodyRegion,
  type BodyRegionId,
} from "../data/bodyRegions";
import FRONT_FIGURE from "../assets/figma/body/adult-man-front.svg";
import BACK_FIGURE from "../assets/figma/body/adult-man-back.svg";
import FEMALE_HAIR_FRONT from "../assets/figma/body/female-head-front.svg";
import FEMALE_PONYTAIL_BACK from "../assets/figma/body/female-ponytail-back.svg";
import {
  BODY_FRONT_REGION_PATHS,
  BODY_FRONT_ABDOMEN_CLIP,
  BODY_FRONT_OCCLUDERS,
} from "../assets/figma/body/frontParts";
import { BODY_BACK_REGION_PATHS, BODY_BACK_OCCLUDERS } from "../assets/figma/body/backParts";

/** The nine abdomen regions. */
const ABDOMEN_IDS = new Set<BodyRegionId>([
  "r-hypochondriac", "epigastric", "l-hypochondriac",
  "r-lumbar", "umbilical", "l-lumbar",
  "r-iliac", "hypogastric", "l-iliac",
]);

/** Checkerboard tint per abdomen cell — two tones near the abdomen's own
 *  lavender (#CFC1D9) so the 9-region grid reads as a tonal mosaic instead of
 *  drawn outlines. Adjacent cells alternate light/dark. */
const ABDOMEN_TINT: Partial<Record<BodyRegionId, string>> = {
  // neutral grey checkerboard so the 9-region grid stays visible but blends
  // into the grey model when the abdomen is NOT the symptom site.
  "r-hypochondriac": "#CFCFD4", "epigastric": "#BCBCC3", "l-hypochondriac": "#CFCFD4",
  "r-lumbar":        "#BCBCC3", "umbilical":  "#CFCFD4", "l-lumbar":        "#BCBCC3",
  "r-iliac":         "#CFCFD4", "hypogastric": "#BCBCC3", "l-iliac":        "#CFCFD4",
};

/** Back-trunk panels (Figma division). DEBUG: outlined so positioning can be
 *  inspected; set to false to go back to the line-free tonal mosaic. */
const BACK_PANEL_IDS = new Set<BodyRegionId>(["bul", "bur", "bll", "blc", "blr"]);
const BACK_PANEL_DEBUG_OUTLINE = false;

/** Shown as a tonal mosaic — green uppers, lavender lowers. */
const BACK_TINT: Partial<Record<BodyRegionId, string>> = {
  "bul": "#C4D2B2", "bur": "#B8C8A4",
  "bll": "#D4BFD6", "blc": "#C8B2CB", "blr": "#D4BFD6",
};

/** Female breasts (split, baked into figure coords) — viewer-left lobe is the
 *  patient RIGHT breast (r-chest); viewer-right lobe is the LEFT (l-chest). */
const FEMALE_CHEST_R_PATH =
  "M172.16 148.42 L173.51 152.94 C174.88 157.56 177.31 161.68 180.55 164.91 L181.05 165.4 C183.23 167.57 185.02 170.19 186.32 173.12 L187.95 176.77 C188.38 177.76 188.62 178.84 188.65 179.94 C190.11 188.83 188.79 198.02 184.91 205.94 L180.51 214.91 C176.97 222.13 174.85 230.13 174.29 238.35 L174.09 241.28 C173.21 254.14 176.75 266.88 183.97 276.89 L185.12 278.07 L184.96 278.26 L185.02 278.34 L184.9 278.34 L184.62 278.68 L184.12 279.29 L183.14 278.29 C180.32 278.2 173.41 277.74 169.36 277.2 C169.26 277.19 169.17 277.18 169.08 277.17 C168.9 277.16 168.72 277.15 168.54 277.15 C167.74 277.15 166.94 277.33 166.24 277.68 C166.03 277.78 165.83 277.9 165.64 278.03 C165.54 278.1 165.44 278.18 165.35 278.25 C165.19 278.38 165.03 278.5 164.86 278.62 C164.75 278.69 164.64 278.77 164.53 278.83 C164.43 278.89 164.33 278.95 164.23 279 C159.22 281.59 155.26 282.82 151.11 283.08 C146.98 283.33 142.7 282.63 137.07 281.44 L137.06 281.43 L137.04 281.43 C117.9 276.39 107.23 256.9 110.24 235.6 C112.7 218.24 119.57 203.34 129.08 190.75 C132.47 186.26 135.43 181.4 137.33 175.98 C142.6 161.04 154.6 150.45 168.75 148.26 L171.36 147.86 L171.97 147.77 L172.16 148.42 ZZ";
const FEMALE_CHEST_L_PATH =
  "M263.33 150.74 V150.74 L255.14 155.57 C253.48 156.54 251.8 157.46 250.1 158.33 C246.65 160.08 243.12 161.61 239.52 162.9 C236.56 163.96 233.55 164.87 230.51 165.61 C230.5 165.61 230.5 165.62 230.49 165.62 L225.34 166.87 L216.37 168.31 C213.13 168.83 209.99 169.94 207.06 171.59 C201.41 174.77 196.78 179.84 193.81 186.12 L190.42 193.25 L187.02 198.18 L187.51 198.6 L179.52 213.24 C175.31 220.97 172.79 229.71 172.17 238.75 L171.81 244 C171.04 255.24 174.14 266.38 180.47 275.12 L181.27 276.22 C181.96 277.18 182.71 278.08 183.52 278.9 C194.39 291.65 212.4 298.12 227.83 295.1 L227.87 295.1 L227.91 295.08 C229.38 294.6 230.91 294.16 232.45 293.72 C232.55 293.69 232.66 293.66 232.76 293.63 C233.99 293.46 235.54 293.39 236.89 292.77 L241.62 290.6 L242.71 290.1 C245.31 288.91 247.72 287.25 249.85 285.19 L252.16 282.96 C255.81 279.44 258.93 275.27 261.41 270.63 L263.94 265.89 L263.3 265.46 L263.94 265.89 L263.94 265.88 C266.38 261.17 268.03 256 268.81 250.63 L269.64 244.86 C271.03 235.3 270.78 225.54 268.92 216.1 L268.73 215.19 L267.65 210.01 L266.94 202.06 C266.94 202.05 266.94 202.04 266.94 202.03 V202.03 C266.91 201.65 266.88 201.26 266.85 200.88 C266.44 195.1 266.77 189.28 267.83 183.6 C267.83 183.59 267.83 183.58 267.83 183.58 L268.76 178.62 C268.76 178.61 268.76 178.6 268.76 178.6 C269.71 173.53 271.6 168.75 274.3 164.57 C274.3 164.56 274.3 164.56 274.31 164.55 L275.94 162.02 C276.18 161.65 276.43 161.3 276.68 160.95 C276.85 160.73 277.01 160.51 277.18 160.3 C277.72 159.61 278.31 158.97 278.92 158.37 C279.01 158.28 279.1 158.2 279.19 158.12 C279.55 157.78 279.92 157.46 280.3 157.15 C280.64 156.88 280.99 156.61 281.35 156.36 C281.47 156.28 281.59 156.19 281.71 156.11 V156.11 C281.71 156.11 281.71 156.11 281.71 156.11 L286.21 153.11 H286.21 C286.24 153.1 286.27 153.09 286.3 153.09 H286.49 C288.1 153.09 288.68 150.74 287.39 149.78 L287.25 149.69 L287.22 149.67 L287.19 149.65 L285.6 148.88 C282.04 147.11 279.53 145.6 275.77 143.25 L275.76 143.24 L275.74 143.23 L275.52 143.12 C274.39 142.6 273.11 142.79 272.13 143.61 L265.47 149.23 L265.46 149.23 C265.13 149.51 264.78 149.78 264.43 150.03 C264.08 150.28 263.72 150.51 263.35 150.73 L263.33 150.74 ZZ M263.33 150.74 L263.33 150.74 L263.35 150.74 C263.34 150.74 263.34 150.74 263.33 150.74 ZZ";

/**
 * Interactive clinical body map. Renders the adult-man figure illustration as
 * the base image and overlays selectable region hotspots + a symptom heatmap
 * (taxonomy in `data/bodyRegions.ts`).
 *
 * - `selected` / `onSelect` — click a region to pick it (e.g. set a pain site).
 * - `highlights` — region → intensity 0..1 for a severity heatmap (auto-fill
 *   when the LLM maps a symptom location). The heat blends over the figure
 *   (multiply) so it tints the body part without hiding the artwork.
 * - `view` — front or back figure. Region hotspots only exist for the front.
 *
 * The overlay <svg> shares the figure's viewBox so hotspots line up at any size.
 */

/** Off-screen 2D context for point-in-path hit-testing of region vectors. */
let _hitCtx: CanvasRenderingContext2D | null | undefined;
function hitCtx(): CanvasRenderingContext2D | null {
  if (_hitCtx === undefined) _hitCtx = document.createElement("canvas").getContext("2d");
  return _hitCtx ?? null;
}

/** Heat-intensity → hue. Low = green, mid = amber, high = red (NRS-like). */
/** Warm heatmap colour ramp: red-hot core → orange → amber as a blob feathers
 *  out (density 1→0). Hue stays in the red/orange band so a hotspot reads red. */
function heatColor(intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity));
  const hue = 45 - 45 * t; // 45° amber → 0° red
  return `hsl(${hue}, 92%, ${56 - 8 * t}%)`;
}

/** Radial density blob: red-hot core feathering through orange to a
 *  transparent amber edge — overlapping blobs blend into a continuous field. */
function buildHeatStops(
  intensity: number,
  fixed?: string,
): { offset: string; color: string; opacity: number }[] {
  // push the core toward pure red so even a mid-severity spot reads hot.
  const t = Math.min(1, Math.max(0, intensity) * 1.3);
  return [
    { offset: "0%", color: fixed ?? heatColor(t), opacity: 0.92 },
    { offset: "38%", color: fixed ?? heatColor(t * 0.7), opacity: 0.7 },
    { offset: "70%", color: fixed ?? heatColor(t * 0.4), opacity: 0.38 },
    { offset: "100%", color: fixed ?? heatColor(t * 0.4), opacity: 0 },
  ];
}

/** Centre point of a region in viewBox coords (for pinning photo markers). */
function regionCenter(r: BodyRegion): { x: number; y: number } {
  const s = r.shape;
  return s.kind === "ellipse"
    ? { x: s.cx, y: s.cy }
    : { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

export interface BodyAnnotation {
  id: BodyRegionId;
  /** main label, e.g. the region name */
  label: string;
  /** secondary line, e.g. "ปวดแสบ · 6/10" */
  sub?: string;
  /** accent colour (pain-character fg) */
  color?: string;
}

export interface BodyMapProps {
  selected?: BodyRegionId | null;
  onSelect?: (id: BodyRegionId, region: BodyRegion) => void;
  /** region id → 0..1 severity; drives the highlight fill opacity. */
  highlights?: Partial<Record<BodyRegionId, number>>;
  /** Colour for highlighted regions — set from the pain character (its `fg`).
   *  Falls back to the severity heatmap (green→red) when not provided. */
  highlightColor?: string;
  /** Regions that have a clinical photo — shown as a camera marker sticking
   *  out from the body, with a leader line back to the region. */
  photoRegions?: BodyRegionId[];
  onPhotoClick?: (id: BodyRegionId) => void;
  /** Show region labels on hover (default true). */
  showTooltip?: boolean;
  /** Which figure to show. Hotspots are defined for the front only. */
  view?: "front" | "back";
  /** Patient gender — a female patient swaps in a female head over the
   *  (male) base figure on the front view. */
  gender?: "M" | "F";
  /** Pin mode — the doctor taps a spot to add a pain marker (then fills a form). */
  drawMode?: boolean;
  /** Saved pain markers (viewBox coords) per view — dot + label on the body. */
  markers?: { id: string; view: "front" | "back"; x: number; y: number; label: string; color?: string }[];
  /** Called when the doctor taps in pin mode — point in viewBox coords plus
   *  the body region the tap landed in (if any). */
  onAddPoint?: (x: number, y: number, regionId?: BodyRegionId) => void;
  /** Tap an existing marker (e.g. to edit / remove it). */
  onMarkerClick?: (id: string) => void;
  className?: string;
}

export default function BodyMap({
  selected,
  onSelect,
  highlights,
  highlightColor,
  photoRegions,
  onPhotoClick,
  showTooltip = true,
  view = "front",
  gender,
  drawMode = false,
  markers,
  onAddPoint,
  onMarkerClick,
  className,
}: BodyMapProps) {
  const [hovered, setHovered] = useState<BodyRegionId | null>(null);
  const interactive = !!onSelect && !drawMode;
  const svgRef = useRef<SVGSVGElement | null>(null);

  const vb = view === "back" ? BODY_VIEWBOX_BACK : BODY_VIEWBOX;
  const figure = view === "back" ? BACK_FIGURE : FRONT_FIGURE;
  const regions = BODY_REGIONS.filter((r) => r.view === view);

  // Pointer → viewBox coords (the overlay svg maps 1:1 to the viewBox, and its
  // on-screen rect already reflects any zoom/pan transform above it).
  const toVb = (e: ReactPointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * vb.width,
      y: ((e.clientY - rect.top) / rect.height) * vb.height,
    };
  };
  // Which region's vector does the tapped point fall inside?
  const regionAt = (x: number, y: number): BodyRegionId | undefined => {
    const ctx = hitCtx();
    if (!ctx) return undefined;
    const table = view === "back" ? BODY_BACK_REGION_PATHS : BODY_FRONT_REGION_PATHS;
    for (const r of regions) {
      for (const d of table[r.id] ?? []) {
        if (ctx.isPointInPath(new Path2D(d), x, y)) return r.id;
      }
    }
    return undefined;
  };
  const dropPoint = (e: ReactPointerEvent) => {
    if (!drawMode) return;
    e.stopPropagation();
    const p = toVb(e);
    onAddPoint?.(p.x, p.y, regionAt(p.x, p.y));
  };
  const pins = (markers ?? []).filter((m) => m.view === view);

  return (
    <div
      className={`relative mx-auto select-none ${className ?? ""}`}
      style={{ aspectRatio: `${vb.width} / ${vb.height}` }}
    >
      {/* Base figure illustration — the segmented part colours are kept but
          faded (desaturated + low opacity) so the highlighted symptom region
          (painted over the top) stands out. */}
      <img
        src={figure}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        style={{ filter: "grayscale(1) opacity(0.4)" }}
      />

      {/* Overlay: heat + interactive hotspots, sharing the figure's viewBox.
          overflow:visible lets the symptom-annotation labels sit in the margin
          outside the body. */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vb.width} ${vb.height}`}
        className="absolute inset-0 h-full w-full"
        style={{ overflow: "visible" }}
        role={interactive ? "group" : "img"}
        aria-label="เลือกตำแหน่งบนร่างกาย"
      >
        {/* Female patient → overlay female cues (hair + bust on front, ponytail
            on back) over the male base figure, in the same faded-grayscale
            style so they blend. Non-interactive. */}
        {gender === "F" && view === "front" && (
          <>
            {/* Female → erase the male pecs entirely: paint the whole chest
                region flat skin-grey so every sternum/pec line vanishes; only
                the bust (drawn below) shows. */}
            {(BODY_FRONT_REGION_PATHS["chest"] ?? []).map((d, i) => (
              <path key={`chest-cover-${i}`} d={d} fill="#e8e8e8" style={{ pointerEvents: "none" }} />
            ))}
            {/* The bust itself (visual + interactive highlight) is drawn AFTER
                the region layer (below) so it sits above the abdomen grid; the
                hair too, so the scalp stays under it. */}
          </>
        )}
        {gender === "F" && view === "back" && (
          <image
            href={FEMALE_PONYTAIL_BACK}
            x={98}
            y={64}
            width={51}
            height={136}
            style={{ filter: "grayscale(1)", pointerEvents: "none" }}
          />
        )}
        {/* Clip the 9 abdomen-grid cells to the abdomen vector so they stay
            inside the belly (no overflow onto the arms / outside the model). */}
        <defs>
          {view === "front" && (
            <clipPath id="bm-abdomen-clip">
              <path d={BODY_FRONT_ABDOMEN_CLIP} />
            </clipPath>
          )}
          {/* Some patches overlap a neighbour (e.g. the upper-arm patch dips
              over the elbow patch; the thigh patch covers the groin/hip).
              Subtract the neighbour's paths from this region with a clipPath
              — full-canvas rect + the occluder subpaths under one even-odd
              path, so the overlap is cut out of BOTH the fill AND the
              pointer-hit area (a <mask> only hides the fill, leaving the
              region still grabbing the hover). Both views. */}
          {Object.entries(view === "back" ? BODY_BACK_OCCLUDERS : BODY_FRONT_OCCLUDERS).map(
            ([id, occluders]) => {
              const regionPaths = view === "back" ? BODY_BACK_REGION_PATHS : BODY_FRONT_REGION_PATHS;
              const holes = occluders.flatMap((occId) => regionPaths[occId] ?? []).join(" ");
              return (
                <clipPath key={id} id={`bm-clip-${id}`} clipPathUnits="userSpaceOnUse">
                  <path clipRule="evenodd" d={`M0 0H${vb.width}V${vb.height}H0Z ${holes}`} />
                </clipPath>
              );
            },
          )}
        </defs>
        {/* Per-region fill of the ACTUAL figure vectors. A symptom highlight
            paints the real body-part path(s) (multiply blend tints the part);
            hover / select paint a theme-primary wash. Both figures are
            segmented per part (front + back colour patches). */}
        {regions.map((region) => {
            // The chest (whole + L/R) is drawn separately AFTER this layer so it
            // sits above the abdomen grid — skip the chest regions here (both
            // genders): female → breast vectors, male → L/R pec halves.
            if (
              view === "front" &&
              (region.id === "chest" || region.id === "r-chest" || region.id === "l-chest")
            )
              return null;
            const paths = (view === "back" ? BODY_BACK_REGION_PATHS : BODY_FRONT_REGION_PATHS)[region.id];
            if (!paths || paths.length === 0) return null;
            const isSelected = selected === region.id;
            // Abdomen (front) + back-trunk grid cells carry a base tonal tint
            // (checkerboard) so the grid shows as a mosaic, not drawn lines.
            const abTint = view === "back" ? BACK_TINT[region.id] : ABDOMEN_TINT[region.id];
            // Symptom severity is painted by the blurred heat layer below; this
            // interactive group only carries hit-test + the click-select wash.
            const fill = !isSelected && abTint ? abTint : "var(--theme-primary)";
            const fillOpacity = isSelected ? 0.34 : 0;
            // Abdomen cells get a faint outline; back panels are line-free
            // unless the debug flag is on (to inspect positioning).
            const backDebug = BACK_PANEL_DEBUG_OUTLINE && BACK_PANEL_IDS.has(region.id);
            const abOutline = ABDOMEN_IDS.has(region.id) || backDebug;
            return (
              <g
                key={region.id}
                className={interactive ? "cursor-pointer" : ""}
                clipPath={
                  ABDOMEN_IDS.has(region.id)
                    ? "url(#bm-abdomen-clip)"
                    : (view === "back" ? BODY_BACK_OCCLUDERS : BODY_FRONT_OCCLUDERS)[region.id]
                      ? `url(#bm-clip-${region.id})`
                      : undefined
                }
                onClick={interactive ? () => onSelect?.(region.id, region) : undefined}
                onMouseEnter={interactive ? () => setHovered(region.id) : undefined}
                onMouseLeave={interactive ? () => setHovered(null) : undefined}
              >
                {paths.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    strokeLinejoin={abOutline ? "round" : undefined}
                    strokeLinecap={abOutline ? "round" : undefined}
                    style={{
                      fill,
                      fillOpacity,
                      // back-panel debug = bright red; abdomen = faint grey
                      stroke: backDebug ? "#e11d48" : abOutline ? "#C4C4C9" : undefined,
                      strokeWidth: backDebug ? 1.4 : abOutline ? 0.4 : undefined,
                      strokeOpacity: backDebug ? 0.95 : abOutline ? 0.5 : undefined,
                      vectorEffect: abOutline ? "non-scaling-stroke" : undefined,
                      pointerEvents: "all",
                      transition: "fill-opacity 250ms ease, fill 250ms ease",
                    }}
                  />
                ))}
              </g>
            );
          })}

        {/* Chest, drawn after the regions so it sits ABOVE the abdomen grid and
            split L/R. Female → own breast vectors (cleavage built in). Male →
            the real pec paths, clipped left/right at the sternum (no extra
            visual — the base figure already shows the pecs). */}
        {view === "front" && (() => {
          const isFemale = gender === "F";
          const chestUnion = BODY_FRONT_REGION_PATHS["chest"] ?? [];
          // Three vertical bands over the chest: right pectoral | central
          // sternal strip | left pectoral. Each band clips the chest area so the
          // hit-test + heat slice cleanly (male midline ~182, female cleavage
          // ~189 → centre band ~188).
          const BANDS: Record<"r-chest" | "chest" | "l-chest", [number, number]> = {
            "r-chest": [0, 179],
            chest: [179, 197],
            "l-chest": [197, vb.width],
          };
          return (
            <>
              {/* chest outline shape — used to clip the hover figure cut-out. */}
              <defs>
                <clipPath id="bm-chest-union">
                  {chestUnion.map((d, i) => (
                    <path key={i} d={d} />
                  ))}
                </clipPath>
              </defs>
              {/* Female bust outline (visual only) — drawn under the heat bands. */}
              {isFemale &&
                [FEMALE_CHEST_R_PATH, FEMALE_CHEST_L_PATH].map((d, i) => (
                  <path
                    key={`bust-${i}`}
                    d={d}
                    fill="#e8e8e8"
                    stroke="#C4C4C9"
                    strokeWidth={0.7}
                    strokeOpacity={0.7}
                    style={{ vectorEffect: "non-scaling-stroke", pointerEvents: "none" }}
                  />
                ))}
              {(["r-chest", "chest", "l-chest"] as const).map((id) => {
                // heat is painted by the blurred layer below; here only the
                // click-select wash.
                const opacity = selected === id ? 0.34 : 0;
                const [x0, x1] = BANDS[id];
                const clipId = `bm-chest-band-${id}`;
                return (
                  <g
                    key={id}
                    className={interactive ? "cursor-pointer" : ""}
                    onClick={interactive ? () => onSelect?.(id, BODY_REGION_BY_ID[id]) : undefined}
                  >
                    <defs>
                      <clipPath id={clipId}>
                        <rect x={x0} y={130} width={x1 - x0} height={185} />
                      </clipPath>
                    </defs>
                    <g clipPath={`url(#${clipId})`}>
                      {chestUnion.map((d, i) => (
                        <path
                          key={i}
                          d={d}
                          style={{
                            fill: "var(--theme-primary)",
                            fillOpacity: opacity,
                            pointerEvents: "all",
                            transition: "fill-opacity 250ms ease, fill 250ms ease",
                          }}
                        />
                      ))}
                    </g>
                  </g>
                );
              })}
            </>
          );
        })()}

        {/* Symptom heatmap — kernel-density style. Each affected region is a
            soft radial blob at its centre; the whole layer is Gaussian-blurred
            so blobs feather past edges and overlapping ones build up density
            (OrRd colormap, multiply blend). Decoupled from the part vectors, so
            it looks identical regardless of gender / which figure is shown. */}
        {(() => {
          const hot = regions.filter((r) => (highlights?.[r.id] ?? 0) > 0);
          if (hot.length === 0) return null;
          return (
            <>
              <defs>
                {/* Gooey/metaball filter: blur fattens each blob, then the
                    alpha colour-matrix re-sharpens it — overlapping blobs fuse
                    with a smooth liquid bridge so nearby pain points morph into
                    one connected shape, while distant ones stay separate. */}
                <filter id="bm-heat-goo" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -5"
                    result="goo"
                  />
                  {/* re-blur the fused shape for a soft heatmap falloff */}
                  <feGaussianBlur in="goo" stdDeviation="3" />
                </filter>
                {hot.map((r) => {
                  // density ramp drives the colour (MapTiler-style), not the
                  // pain-character tint.
                  const stops = buildHeatStops(highlights?.[r.id] ?? 0);
                  return (
                    <radialGradient key={r.id} id={`bm-heat-${r.id}`} cx="50%" cy="50%" r="50%">
                      {stops.map((s, i) => (
                        <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
                      ))}
                    </radialGradient>
                  );
                })}
              </defs>
              {(() => {
                const pts = hot.map((r) => ({
                  id: r.id,
                  c: regionCenter(r),
                  it: highlights?.[r.id] ?? 0,
                  base: r.shape.kind === "ellipse" ? r.shape.rx : r.shape.w / 2,
                }));
                // Bridge nearby hot points so the field reads as one connected
                // organic mass (the goo filter fuses bar + blobs into a tube).
                const CONNECT_MAX = 200;
                // Symptoms reveal ONE AT A TIME (as if mapped during history) —
                // each blob pops in on its own beat; a connector waits until its
                // later endpoint has appeared, then grows A→B.
                const STAGGER = 0.55;
                const links: {
                  key: string;
                  x1: number;
                  y1: number;
                  x2: number;
                  y2: number;
                  w: number;
                  it: number;
                  begin: string;
                }[] = [];
                for (let i = 0; i < pts.length; i++) {
                  for (let j = i + 1; j < pts.length; j++) {
                    const dx = pts[i].c.x - pts[j].c.x;
                    const dy = pts[i].c.y - pts[j].c.y;
                    const d = Math.hypot(dx, dy);
                    if (d > CONNECT_MAX) continue;
                    // thinner than the blobs so the bridge necks in
                    links.push({
                      key: `${pts[i].id}|${pts[j].id}`,
                      x1: pts[i].c.x,
                      y1: pts[i].c.y,
                      x2: pts[j].c.x,
                      y2: pts[j].c.y,
                      w: Math.min(pts[i].base, pts[j].base) * 1.1,
                      it: Math.min(pts[i].it, pts[j].it),
                      begin: `${(j * STAGGER + 0.3).toFixed(2)}s`,
                    });
                  }
                }
                return (
                  <>
                    <g filter="url(#bm-heat-goo)" style={{ mixBlendMode: "normal", pointerEvents: "none" }}>
                      {links.map((l) => (
                        // draws A→B once its endpoint has popped (CSS dash-draw,
                        // fires on mount → works live during Dr Note mapping).
                        <line
                          key={`lnk-${l.key}`}
                          x1={l.x1}
                          y1={l.y1}
                          x2={l.x2}
                          y2={l.y2}
                          stroke={heatColor(Math.min(1, l.it * 1.3) * 0.7)}
                          strokeWidth={l.w}
                          strokeLinecap="round"
                          strokeOpacity={0.7}
                          pathLength={1}
                          strokeDasharray={1}
                          style={{
                            animation: `bm-link-draw 0.6s cubic-bezier(0.16,1,0.3,1) ${l.begin} both`,
                          }}
                        />
                      ))}
                      {hot.map((r, i) => {
                        const c = regionCenter(r);
                        const rx = (r.shape.kind === "ellipse" ? r.shape.rx : r.shape.w / 2) * 1.7;
                        const ry = (r.shape.kind === "ellipse" ? r.shape.ry : r.shape.h / 2) * 1.7;
                        return (
                          <ellipse
                            key={r.id}
                            cx={c.x}
                            cy={c.y}
                            rx={rx}
                            ry={ry}
                            fill={`url(#bm-heat-${r.id})`}
                            style={{
                              transformBox: "fill-box",
                              transformOrigin: "center",
                              animation: `bm-blob-pop 0.5s cubic-bezier(0.16,1,0.3,1) ${(i * STAGGER).toFixed(2)}s both`,
                            }}
                          />
                        );
                      })}
                    </g>
                  </>
                );
              })()}
            </>
          );
        })()}

        {/* Female hair — ON TOP of the region layer so the head's highlight is
            masked to the face (scalp stays under the hair). */}
        {gender === "F" && view === "front" && (
          <image
            href={FEMALE_HAIR_FRONT}
            x={170}
            y={-6}
            width={126}
            height={153}
            style={{ filter: "grayscale(1)", pointerEvents: "none" }}
          />
        )}

        {/* Photo markers — camera pin sticking out from the body, with a
            leader line back to the region the photo belongs to. */}
        {(photoRegions ?? []).map((id) => {
          const region = BODY_REGION_BY_ID[id];
          if (!region || region.view !== view) return null;
          const c = regionCenter(region);
          const left = c.x < vb.width / 2;
          const mx = left ? 22 : vb.width - 22;
          const my = c.y;
          const color = "var(--theme-primary)";
          return (
            <g key={`photo-${id}`} className="cursor-pointer" onClick={() => onPhotoClick?.(id)}>
              {/* leader line + anchor dot */}
              <line x1={c.x} y1={c.y} x2={mx} y2={my} stroke={color} strokeWidth={1.6} strokeDasharray="4 4" />
              <circle cx={c.x} cy={c.y} r={5} fill={color} stroke="#fff" strokeWidth={1.6} />
              {/* camera marker bubble */}
              <foreignObject x={mx - 16} y={my - 16} width={32} height={32} style={{ overflow: "visible" }}>
                <div
                  // @ts-expect-error xmlns is valid on the foreignObject child
                  xmlns="http://www.w3.org/1999/xhtml"
                  className="flex h-full w-full items-center justify-center rounded-full bg-white"
                  style={{ border: `2px solid ${color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                >
                  <IconCamera style={{ width: "70%", height: "70%", color }} stroke={2.2} />
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Pin-mode capture surface — grabs taps on empty space so the doctor
            adds a marker instead of hovering/selecting regions or panning.
            Drawn BEFORE the markers so an existing marker stays clickable. */}
        {drawMode && (
          <rect
            x={0}
            y={0}
            width={vb.width}
            height={vb.height}
            fill="transparent"
            style={{ cursor: "crosshair", touchAction: "none", pointerEvents: "all" }}
            onPointerDown={dropPoint}
          />
        )}

        {/* Pain markers — a dot + a small label pill. The pill sits toward the
            body centre (so right-side points don't push it off the edge). */}
        {pins.map((m) => {
          const color = m.color ?? "#e23d2e";
          const onLeft = m.x > vb.width * 0.55; // point on the right → pill left
          const W = 150;
          return (
            <g
              key={m.id}
              className={onMarkerClick ? "cursor-pointer" : ""}
              style={{ pointerEvents: onMarkerClick ? "all" : "none" }}
              onClick={onMarkerClick ? () => onMarkerClick(m.id) : undefined}
            >
              <circle cx={m.x} cy={m.y} r={6.5} fill={color} stroke="#fff" strokeWidth={2} />
              <foreignObject
                x={onLeft ? m.x - 8 - W : m.x + 8}
                y={m.y - 13}
                width={W}
                height={26}
                style={{ overflow: "visible" }}
              >
                <div
                  // @ts-expect-error xmlns is valid on the foreignObject child
                  xmlns="http://www.w3.org/1999/xhtml"
                  className={`flex w-full items-center ${onLeft ? "justify-end" : "justify-start"}`}
                >
                  <span
                    className="inline-flex max-w-[150px] items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium leading-tight shadow-sm"
                    style={{ border: `1.5px solid ${color}`, color: "#22202a" }}
                  >
                    {m.label}
                  </span>
                </div>
              </foreignObject>
            </g>
          );
        })}

      </svg>
    </div>
  );
}
