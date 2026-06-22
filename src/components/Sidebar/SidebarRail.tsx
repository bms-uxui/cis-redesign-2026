import { Tooltip } from "@heroui/react";
import {
  IconAdjustmentsHorizontal,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import EHP_LOGO from "../../assets/figma/ehp-logo.png";
import type { RailEntry } from "./types";

interface SidebarRailProps {
  /** Customized + filtered list of rail entries to render (in order). */
  entries: RailEntry[];
  /** Which icon is visually highlighted (peek or pinned). */
  activeKey: string;
  /** Which icon is currently pinned — gets a small marker. */
  pinnedKey: string;
  onSelect: (entry: RailEntry) => void;
  onHover: (entry: RailEntry) => void;
  onLeave: () => void;
  /** Opens the customize-sidebar modal. */
  onCustomize: () => void;
  /** Notion-style hide toggle: collapses the entire sidebar offscreen.
   *  When hidden, a left-edge hover zone (in the parent Sidebar) peeks it
   *  back; a "lock open" button restores the pinned state. */
  onHide: () => void;
  /** True when the rail is showing as an edge-peek overlay (railHidden +
   *  user hovering the edge). Swaps the hide control for a "lock open"
   *  affordance so the user can pin it back. */
  isPeeking?: boolean;
}


/** Narrow icon column on the left of the sidebar — always white. */
export default function SidebarRail({
  entries,
  activeKey,
  pinnedKey,
  onSelect,
  onHover,
  onLeave,
  onCustomize,
  onHide,
  isPeeking = false,
}: SidebarRailProps) {
  return (
    <div
      className="flex w-[74px] flex-col items-center gap-4 bg-[var(--theme-surface)] px-4 py-6"
      // Leaving the rail column starts the close timer (handled in parent);
      // entering any RailButton cancels it via onHover.
      onMouseLeave={onLeave}
    >
      {/* Brand + hide / lock-open control. Hovering the logo reveals
          the toggle button. When the rail is pinned open we show the
          collapse icon (hide); while edge-peeking we swap to an expand
          icon labelled "lock sidebar open" (Notion pattern). */}
      <div className="group relative flex h-10 w-full items-center justify-center">
        <img
          src={EHP_LOGO}
          alt="EHP"
          className="h-10 w-auto shrink-0 object-contain transition-opacity duration-150 group-hover:opacity-0"
        />
        <Tooltip
          content={isPeeking ? "ตรึงแถบเครื่องมือ" : "ซ่อนแถบเครื่องมือ"}
          placement="right"
          delay={120}
          closeDelay={0}
          offset={12}
        >
          <button
            type="button"
            onClick={onHide}
            aria-label={isPeeking ? "ตรึงแถบเครื่องมือ" : "ซ่อนแถบเครื่องมือ"}
            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-lg text-[var(--theme-neutral)]/55 opacity-0 transition-opacity duration-150 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)] group-hover:opacity-100"
          >
            {isPeeking ? (
              <IconLayoutSidebarLeftExpand className="h-5 w-5" stroke={1.6} />
            ) : (
              <IconLayoutSidebarLeftCollapse className="h-5 w-5" stroke={1.6} />
            )}
          </button>
        </Tooltip>
      </div>
      {/* my-auto vertically centers the menu list between the logo (top)
          and the customize button (bottom). If entries overflow on small
          viewports the column scrolls; on typical desktops the items sit
          comfortably in the middle. */}
      <nav className="my-auto flex w-full flex-col gap-2 overflow-y-auto">
        {entries.map((it) => (
          <RailButton
            key={it.key}
            entry={it}
            active={activeKey === it.key}
            pinned={pinnedKey === it.key}
            onClick={() => onSelect(it)}
            onHover={() => onHover(it)}
          />
        ))}
      </nav>
      {/* Customize sidebar — bottom-aligned, opens the customization modal. */}
      <Tooltip
        content="ปรับแต่งแถบเครื่องมือ"
        placement="right"
        delay={200}
        closeDelay={0}
        offset={12}
        classNames={{
          content:
            "bg-[var(--theme-neutral)] text-white text-[length:var(--theme-text-xs)] font-medium px-2.5 py-1.5 rounded-lg shadow-[var(--theme-shadow-md)]",
        }}
      >
        <button
          type="button"
          onClick={onCustomize}
          aria-label="ปรับแต่งแถบเครื่องมือ"
          className="flex h-[42px] w-full cursor-pointer items-center justify-center rounded-lg text-[var(--theme-neutral)]/55 transition-colors duration-200 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
        >
          <IconAdjustmentsHorizontal className="h-5 w-5" stroke={1.6} />
        </button>
      </Tooltip>
    </div>
  );
}

interface RailButtonProps {
  entry: RailEntry;
  active: boolean;
  pinned: boolean;
  onClick: () => void;
  onHover: () => void;
}

function RailButton({ entry, active, pinned, onClick, onHover }: RailButtonProps) {
  return (
    <Tooltip
      content={entry.label}
      placement="right"
      delay={200}
      closeDelay={0}
      offset={12}
      classNames={{
        content:
          "bg-[var(--theme-neutral)] text-white text-[length:var(--theme-text-xs)] font-medium px-2.5 py-1.5 rounded-lg shadow-[var(--theme-shadow-md)]",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onHover}
        onFocus={onHover}
        aria-label={entry.label}
        aria-current={active ? "page" : undefined}
        className={[
          "relative flex h-[42px] w-full cursor-pointer items-center justify-center rounded-lg transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          active
            ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]"
            : "text-[var(--theme-neutral)]/70 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]",
        ].join(" ")}
      >
        {entry.iconSrc ? (
          <span
            aria-hidden
            className="block h-5 w-5 [&>svg]:h-full [&>svg]:w-full"
            // SVG content uses currentColor for strokes — inlining lets it
            // inherit the text color the way Tabler icons did.
            dangerouslySetInnerHTML={{ __html: entry.iconSrc }}
          />
        ) : entry.Icon ? (
          <entry.Icon className="h-5 w-5" stroke={1.6} />
        ) : null}
        {/* Pin indicator — small primary dot at the top-right corner so
            the user can tell which panel will return when they stop peeking. */}
        {pinned && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--theme-primary)]"
          />
        )}
      </button>
    </Tooltip>
  );
}
