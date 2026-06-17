import { useState } from "react";
import { IconCamera } from "@tabler/icons-react";
import {
  BODY_REGIONS,
  BODY_REGION_BY_ID,
  BODY_VIEWBOX,
  type BodyRegion,
  type BodyRegionId,
} from "../data/bodyRegions";
import { BODY_PATHS_SVG } from "../assets/figma/body/bodyPaths";

/**
 * Interactive clinical body map. Renders the front-body figure as a base image
 * and overlays selectable region hotspots (taxonomy in `data/bodyRegions.ts`).
 *
 * - `selected` / `onSelect` — click a region to pick it (e.g. set a pain site).
 * - `highlights` — region → intensity 0..1 for a severity heatmap (auto-fill
 *   when the LLM maps a symptom location). Highlighted regions stay tinted even
 *   when not hovered.
 *
 * The overlay <svg> shares the asset's viewBox so hotspots line up at any size.
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

export interface BodyMapProps {
  selected?: BodyRegionId | null;
  onSelect?: (id: BodyRegionId, region: BodyRegion) => void;
  /** region id → 0..1 severity; drives the heatmap fill opacity. */
  highlights?: Partial<Record<BodyRegionId, number>>;
  /** Regions that have a clinical photo — shown as a camera marker sticking
   *  out from the body, with a leader line back to the region. */
  photoRegions?: BodyRegionId[];
  onPhotoClick?: (id: BodyRegionId) => void;
  /** Show region labels on hover (default true). */
  showTooltip?: boolean;
  className?: string;
}

function ShapeEl({
  region,
  className,
  style,
  onClick,
  onEnter,
  onLeave,
}: {
  region: BodyRegion;
  className: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onEnter?: () => void;
  onLeave?: () => void;
}) {
  const s = region.shape;
  const common = {
    className,
    style,
    onClick,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
  };
  if (s.kind === "ellipse") {
    return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />;
  }
  return (
    <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 0} {...common} />
  );
}

export default function BodyMap({
  selected,
  onSelect,
  highlights,
  photoRegions,
  onPhotoClick,
  showTooltip = true,
  className,
}: BodyMapProps) {
  const [hovered, setHovered] = useState<BodyRegionId | null>(null);
  const interactive = !!onSelect;
  const hoveredRegion = hovered ? BODY_REGION_BY_ID[hovered] : null;

  return (
    <div
      className={`relative mx-auto select-none ${className ?? ""}`}
      style={{ aspectRatio: `${BODY_VIEWBOX.width} / ${BODY_VIEWBOX.height}` }}
    >
      {/* Single inline SVG: the body silhouette is BOTH the base figure and a
          clip-path, so region paint is clipped to the body outline (conforms
          to the silhouette) instead of floating over the edges. */}
      <svg
        viewBox={`0 0 ${BODY_VIEWBOX.width} ${BODY_VIEWBOX.height}`}
        className="absolute inset-0 h-full w-full"
        role={interactive ? "group" : "img"}
        aria-label="เลือกตำแหน่งบนร่างกาย"
      >
        <defs>
          {/* Clip every region paint to the actual body shape. */}
          <clipPath
            id="bm-body-clip"
            dangerouslySetInnerHTML={{ __html: BODY_PATHS_SVG }}
          />
          {/* Per-region heatmap — hue encodes intensity (green→red), soft
              core fading at the edges. One gradient per highlighted region. */}
          {BODY_REGIONS.map((region) => {
            const intensity = highlights?.[region.id] ?? 0;
            if (intensity <= 0) return null;
            const c = heatColor(intensity);
            return (
              <radialGradient
                key={region.id}
                id={`bm-heat-${region.id}`}
                cx="50%"
                cy="42%"
                r="62%"
              >
                <stop offset="0%" stopColor={c} stopOpacity="0.95" />
                <stop offset="60%" stopColor={c} stopOpacity="0.75" />
                <stop offset="100%" stopColor={c} stopOpacity="0.30" />
              </radialGradient>
            );
          })}
        </defs>

        {/* Base body silhouette */}
        <g
          fill="#E6E7EA"
          style={{ pointerEvents: "none" }}
          dangerouslySetInnerHTML={{ __html: BODY_PATHS_SVG }}
        />

        {/* Region paint — clipped to the body so red follows the contour. */}
        <g clipPath="url(#bm-body-clip)">
          {BODY_REGIONS.map((region) => {
            const intensity = highlights?.[region.id] ?? 0;
            const isHeat = intensity > 0;
            const isSelected = selected === region.id;
            const isHovered = hovered === region.id;
            const fill = isHeat ? `url(#bm-heat-${region.id})` : "var(--theme-primary)";
            const fillOpacity = isHeat
              ? 0.4 + Math.min(1, intensity) * 0.55
              : isSelected
                ? 0.4
                : isHovered
                  ? 0.24
                  : 0;
            return (
              <ShapeEl
                key={region.id}
                region={region}
                className={interactive ? "cursor-pointer" : ""}
                style={{
                  fill,
                  fillOpacity,
                  stroke:
                    !isHeat && isSelected ? "var(--theme-primary)" : "transparent",
                  strokeWidth: 1.2,
                  transition: "fill-opacity 250ms ease",
                }}
                onClick={interactive ? () => onSelect?.(region.id, region) : undefined}
                onEnter={interactive ? () => setHovered(region.id) : undefined}
                onLeave={interactive ? () => setHovered(null) : undefined}
              />
            );
          })}
        </g>

        {/* Photo markers — camera pin sticking out from the body, with a
            leader line back to the region the photo belongs to. */}
        {(photoRegions ?? []).map((id) => {
          const region = BODY_REGION_BY_ID[id];
          if (!region) return null;
          const c = regionCenter(region);
          const left = c.x < BODY_VIEWBOX.width / 2;
          const mx = left ? 11 : BODY_VIEWBOX.width - 11;
          const my = c.y;
          const color = "var(--theme-primary)";
          return (
            <g
              key={`photo-${id}`}
              className="cursor-pointer"
              onClick={() => onPhotoClick?.(id)}
            >
              {/* leader line + anchor dot */}
              <line x1={c.x} y1={c.y} x2={mx} y2={my} stroke={color} strokeWidth={0.8} strokeDasharray="2 2" />
              <circle cx={c.x} cy={c.y} r={2.2} fill={color} stroke="#fff" strokeWidth={0.8} />
              {/* camera marker bubble */}
              <foreignObject x={mx - 8} y={my - 8} width={16} height={16} style={{ overflow: "visible" }}>
                <div
                  // @ts-expect-error xmlns is valid on the foreignObject child
                  xmlns="http://www.w3.org/1999/xhtml"
                  className="flex h-full w-full items-center justify-center rounded-full bg-white"
                  style={{ border: `1px solid ${color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
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
