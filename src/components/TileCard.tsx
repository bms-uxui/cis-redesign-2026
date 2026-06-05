import { IconArrowRight } from "@tabler/icons-react";
import type { ComponentType, MouseEventHandler } from "react";

interface TileCardProps {
  title: string;
  /** Tabler-style icon component. Provide this or `iconSrc`. */
  Icon?: ComponentType<{ className?: string; stroke?: number }>;
  /** Raw SVG markup (e.g. `?raw` import) — strokes inherit currentColor. */
  iconSrc?: string;
  variant?: "filled" | "dashed";
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

/**
 * Shared home-page tile: title on top, icon + fly-through arrow on the bottom
 * row. Hover fills the card with the primary color; the arrow chip slides one
 * arrow out while sliding the next one in. Used by both the frequent menu
 * row and the news row.
 */
export default function TileCard({
  title,
  Icon,
  iconSrc,
  variant = "filled",
  onClick,
}: TileCardProps) {
  const isDashed = variant === "dashed";
  const iconColorClass = isDashed
    ? "text-[var(--theme-neutral)]/40"
    : "text-[var(--theme-primary)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex h-[150px] flex-col justify-between rounded-[var(--theme-radius-box)] p-[var(--theme-space-md)] text-left",
        "transition-all duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-1 hover:border-[var(--theme-primary)] hover:bg-[var(--theme-primary)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-base)]",
        isDashed
          ? "border border-dashed border-[var(--theme-neutral)]/15 hover:border-solid"
          : "border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)]",
      ].join(" ")}
    >
      <p
        className={[
          "text-[length:var(--theme-text-md)] font-medium leading-tight transition-colors duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-white",
          isDashed ? "text-[var(--theme-neutral)]/70" : "text-[var(--theme-neutral)]",
        ].join(" ")}
      >
        {title}
      </p>
      <div className="flex items-center justify-between">
        {Icon ? (
          <Icon
            className={[
              "h-8 w-8 transition-colors duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-white",
              iconColorClass,
            ].join(" ")}
            stroke={1.5}
          />
        ) : iconSrc ? (
          <span
            aria-hidden
            dangerouslySetInnerHTML={{ __html: iconSrc }}
            className={[
              "inline-flex h-8 w-8 items-center justify-center transition-colors duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-white",
              iconColorClass,
              "[&_svg]:h-8 [&_svg]:w-8",
            ].join(" ")}
          />
        ) : null}
        <span
          aria-hidden
          className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[var(--theme-neutral)]/10 text-[var(--theme-neutral)] transition-colors duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-white/20 group-hover:text-white"
        >
          <IconArrowRight
            className="absolute h-4 w-4 transition-all duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-full group-hover:opacity-0"
            stroke={1.75}
          />
          <IconArrowRight
            className="absolute h-4 w-4 -translate-x-full opacity-0 transition-all duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0 group-hover:opacity-100"
            stroke={1.75}
          />
        </span>
      </div>
    </button>
  );
}
