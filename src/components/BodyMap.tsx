import { useState } from "react";
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

/** Heat-intensity → hue. Low = green, mid = amber, high = red (NRS-like). */
function heatColor(intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity));
  const hue = 140 - 140 * t; // 140° green → 0° red
  return `hsl(${hue}, 78%, 47%)`;
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
  className,
}: BodyMapProps) {
  const [hovered, setHovered] = useState<BodyRegionId | null>(null);
  const interactive = !!onSelect;
  const hoveredRegion = hovered ? BODY_REGION_BY_ID[hovered] : null;

  const vb = view === "back" ? BODY_VIEWBOX_BACK : BODY_VIEWBOX;
  const figure = view === "back" ? BACK_FIGURE : FRONT_FIGURE;
  const regions = BODY_REGIONS.filter((r) => r.view === view);

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
        viewBox={`0 0 ${vb.width} ${vb.height}`}
        className="absolute inset-0 h-full w-full"
        style={{ overflow: "visible" }}
        role={interactive ? "group" : "img"}
        aria-label="เลือกตำแหน่งบนร่างกาย"
      >
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
            const paths = (view === "back" ? BODY_BACK_REGION_PATHS : BODY_FRONT_REGION_PATHS)[region.id];
            if (!paths || paths.length === 0) return null;
            const intensity = highlights?.[region.id] ?? 0;
            const isHeat = intensity > 0;
            const isSelected = selected === region.id;
            const isHovered = hovered === region.id;
            // Abdomen (front) + back-trunk grid cells carry a base tonal tint
            // (checkerboard) so the grid shows as a mosaic, not drawn lines.
            const abTint = view === "back" ? BACK_TINT[region.id] : ABDOMEN_TINT[region.id];
            const fill = isHeat
              ? (highlightColor ?? heatColor(intensity))
              : !isSelected && !isHovered && abTint
                ? abTint
                : "var(--theme-primary)";
            const fillOpacity = isHeat
              ? 0.45 + Math.min(1, intensity) * 0.45
              : isSelected
                ? 0.34
                : isHovered
                  ? 0.2
                  : 0;
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
                style={{ mixBlendMode: isHeat ? "multiply" : "normal" }}
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

      </svg>

      {/* Hover tooltip */}
      {showTooltip && interactive && hoveredRegion && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-[var(--theme-neutral)] px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
          {hoveredRegion.labelTh}
        </div>
      )}
    </div>
  );
}
