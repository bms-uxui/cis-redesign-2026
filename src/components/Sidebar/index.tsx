import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Tooltip } from "@heroui/react";
import {
  IconAdjustmentsHorizontal,
  IconHome,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSearch,
} from "@tabler/icons-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";
import { RAIL_LIST } from "./config";
import type { RailEntry, PanelItem } from "./types";
import EHP_LOGO from "../../assets/figma/ehp-logo.png";

/**
 * Notion-style sidebar — a single scrolling panel with a header, a
 * quick-action icon row, grouped sections (one per menu category), and
 * a bottom customize control. The old rail (vertical icon strip) is
 * gone; rails with panels become sections, rails that navigate directly
 * become quick-action chips, the rest go into a catch-all "อื่น ๆ".
 *
 * Behaviour mirrors Notion: a hide control collapses the whole sidebar
 * off-screen; hovering the far-left edge peeks it back as an overlay;
 * a "lock open" affordance pins it back to the persisted state.
 */

const TOOLTIP_CLASSES = {
  content:
    "bg-[var(--theme-neutral)] text-white text-[length:var(--theme-text-xs)] font-medium px-2.5 py-1.5 rounded-lg shadow-[var(--theme-shadow-md)]",
};

export default function Sidebar() {
  const { openTab } = useTabs();
  const location = useLocation();
  const {
    railHidden,
    toggleRailHiddenSidebar,
    setPinnedRail,
    activeChild,
    setActiveChild,
    openCustomize,
    openPalette,
    railOrder,
    hiddenRails,
    panelOrders,
    hiddenPanelItems,
  } = useSidebar();

  // Match the active route prefix (e.g. /opd matches both /opd and /opd/123).
  const isRouteActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  // Edge-peek state — local, transient. Tracks whether the user is
  // hovering the left-edge trigger while railHidden is true.
  const [edgePeek, setEdgePeek] = useState(false);
  const edgePeekTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!railHidden) setEdgePeek(false);
  }, [railHidden]);

  useEffect(
    () => () => {
      window.clearTimeout(edgePeekTimer.current);
    },
    [],
  );

  const isPeeking = railHidden && edgePeek;
  const visibleNow = !railHidden || edgePeek;

  const triggerPeek = () => {
    window.clearTimeout(edgePeekTimer.current);
    edgePeekTimer.current = window.setTimeout(() => setEdgePeek(true), 60);
  };
  const cancelPeek = () => {
    window.clearTimeout(edgePeekTimer.current);
    setEdgePeek(false);
  };

  // Reorder + filter the rail list using the user's customization.
  const visibleRails = useMemo<RailEntry[]>(() => {
    const byKey = new Map(RAIL_LIST.map((r) => [r.key, r] as const));
    const seen = new Set<string>();
    const ordered: RailEntry[] = [];
    for (const key of railOrder) {
      const entry = byKey.get(key);
      if (entry && !seen.has(key)) {
        ordered.push(entry);
        seen.add(key);
      }
    }
    for (const r of RAIL_LIST) {
      if (!seen.has(r.key)) ordered.push(r);
    }
    return ordered.filter((r) => !hiddenRails.has(r.key));
  }, [railOrder, hiddenRails]);

  // Categorize: rails with panels become sections, rails with navigateTo
  // become quick-action chips, the rest go in "อื่น ๆ".
  const quickActions = visibleRails.filter((r) => r.navigateTo && !r.panel);
  const sections = visibleRails.filter((r) => r.panel);
  const otherRails = visibleRails.filter((r) => !r.panel && !r.navigateTo);

  const handleQuickClick = (entry: RailEntry) => {
    if (entry.navigateTo) {
      openTab(entry.navigateTo, { title: entry.label });
      setPinnedRail("");
    }
  };

  const handleItemClick = (railKey: string, item: PanelItem) => {
    setPinnedRail(railKey);
    setActiveChild(item.key);
    // Items currently don't carry their own route — selecting one pins
    // the section and highlights the row. The host page reads activeChild
    // from context to decide what to render.
  };

  return (
    <>
      {/* Left-edge peek trigger — only mounted while hidden. */}
      {railHidden && (
        <div
          aria-hidden
          onMouseEnter={triggerPeek}
          className="fixed inset-y-0 left-0 z-20 hidden w-3 lg:block"
        />
      )}

      <aside
        aria-label="Sidebar"
        aria-hidden={!visibleNow}
        onMouseEnter={isPeeking ? triggerPeek : undefined}
        onMouseLeave={isPeeking ? cancelPeek : undefined}
        className={[
          "fixed bottom-0 top-0 left-0 z-30 hidden w-[280px] flex-col overflow-hidden border-r border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:flex",
          visibleNow
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0 pointer-events-none",
          isPeeking && "z-50 shadow-[var(--theme-shadow-md)]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <img
              src={EHP_LOGO}
              alt=""
              className="h-7 w-auto shrink-0 object-contain"
            />
            <span className="truncate text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
              EHP CIS
            </span>
          </div>
          <Tooltip
            content={isPeeking ? "ตรึงแถบเครื่องมือ" : "ซ่อนแถบเครื่องมือ"}
            placement="bottom"
            delay={120}
            closeDelay={0}
            classNames={TOOLTIP_CLASSES}
          >
            <button
              type="button"
              onClick={toggleRailHiddenSidebar}
              aria-label={isPeeking ? "ตรึงแถบเครื่องมือ" : "ซ่อนแถบเครื่องมือ"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--theme-neutral)]/55 transition-colors hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
            >
              {isPeeking ? (
                <IconLayoutSidebarLeftExpand className="h-4 w-4" stroke={1.75} />
              ) : (
                <IconLayoutSidebarLeftCollapse className="h-4 w-4" stroke={1.75} />
              )}
            </button>
          </Tooltip>
        </header>

        {/* ── Quick-action row ────────────────────────────────────── */}
        {/* The button matching the current route gets a pill background +
            inline label (Notion treatment); the rest stay as icon-only
            chips with tooltips. */}
        <nav className="flex flex-wrap items-center gap-1 px-3 pb-3" aria-label="ทางลัด">
          <QuickButton
            icon={<IconHome className="h-4 w-4" stroke={1.75} />}
            label="หน้าหลัก"
            active={isRouteActive("/")}
            onClick={() => {
              openTab("/", { title: "หน้าหลัก" });
              setPinnedRail("");
            }}
          />
          {quickActions.map((entry) => (
            <QuickButton
              key={entry.key}
              icon={<RailIcon entry={entry} className="h-4 w-4" />}
              label={entry.label}
              active={!!entry.navigateTo && isRouteActive(entry.navigateTo)}
              onClick={() => handleQuickClick(entry)}
            />
          ))}
          <QuickButton
            icon={<IconSearch className="h-4 w-4" stroke={1.75} />}
            label="ค้นหา"
            active={false}
            onClick={openPalette}
          />
        </nav>

        {/* ── Sections (scroll area) ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {sections.map((rail) => {
            if (!rail.panel) return null;
            // Apply per-panel customization (order + hide).
            const order = panelOrders[rail.key] ?? [];
            const hidden = hiddenPanelItems[rail.key] ?? new Set<string>();
            const orderIndex = new Map<string, number>();
            order.forEach((k, i) => orderIndex.set(k, i));
            const items = rail.panel.groups
              .flatMap((g) => g.items)
              .filter((it) => !hidden.has(it.key))
              .sort((a, b) => {
                const ai = orderIndex.has(a.key)
                  ? orderIndex.get(a.key)!
                  : Infinity;
                const bi = orderIndex.has(b.key)
                  ? orderIndex.get(b.key)!
                  : Infinity;
                return ai - bi;
              });
            if (items.length === 0) return null;
            return (
              <Section key={rail.key} title={rail.label}>
                {items.map((item) => (
                  <SectionItem
                    key={item.key}
                    item={item}
                    active={activeChild === item.key}
                    onClick={() => handleItemClick(rail.key, item)}
                  />
                ))}
              </Section>
            );
          })}

          {otherRails.length > 0 && (
            <Section title="อื่น ๆ">
              {otherRails.map((rail) => (
                <RailRow
                  key={rail.key}
                  entry={rail}
                  onClick={() => setPinnedRail(rail.key)}
                />
              ))}
            </Section>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer className="flex items-center justify-between border-t border-[var(--theme-neutral)]/10 px-3 py-2">
          <Tooltip
            content="ปรับแต่งแถบเครื่องมือ"
            placement="top"
            delay={200}
            closeDelay={0}
            classNames={TOOLTIP_CLASSES}
          >
            <button
              type="button"
              onClick={openCustomize}
              aria-label="ปรับแต่งแถบเครื่องมือ"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--theme-neutral)]/55 transition-colors hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
            >
              <IconAdjustmentsHorizontal className="h-4 w-4" stroke={1.75} />
            </button>
          </Tooltip>
        </footer>
      </aside>
    </>
  );
}

// ── Section primitive ──────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3">
      <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-[var(--theme-neutral)]/45">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

function SectionItem({
  item,
  active,
  onClick,
}: {
  item: PanelItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[length:var(--theme-text-sm)] transition-colors",
        active
          ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]"
          : "text-[var(--theme-neutral)]/80 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]",
      ].join(" ")}
    >
      <span aria-hidden className="flex h-4 w-4 shrink-0 items-center justify-center">
        {item.Icon ? <item.Icon className="h-4 w-4" stroke={1.75} /> : null}
      </span>
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function RailRow({
  entry,
  onClick,
}: {
  entry: RailEntry;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/80 transition-colors hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
    >
      <span aria-hidden className="flex h-4 w-4 shrink-0 items-center justify-center">
        <RailIcon entry={entry} className="h-4 w-4" />
      </span>
      <span className="truncate">{entry.label}</span>
    </button>
  );
}

const QUICK_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

/** Cache `<canvas>` so we don't allocate one per measurement. */
let measureCtx: CanvasRenderingContext2D | null = null;
function measureLabelWidth(label: string): number {
  if (typeof document === "undefined") return 0;
  if (!measureCtx) {
    const canvas = document.createElement("canvas");
    measureCtx = canvas.getContext("2d");
  }
  if (!measureCtx) return 0;
  measureCtx.font =
    '500 14px "Google Sans", "Noto Sans Thai Looped", "Helvetica Neue", Arial, sans-serif';
  return Math.ceil(measureCtx.measureText(label).width);
}

/** Quick-action chip — animates between two pixel widths: 32px when
 *  inactive (icon square), grows to the label's measured width when
 *  selected. Width is measured via an offscreen canvas so there's no
 *  hidden DOM node that could leak through layout. */
function QuickButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  // 32 (icon square) + 6 (gap) + measured label + 12 (pr-3)
  const targetWidth = active ? 32 + 6 + measureLabelWidth(label) + 12 : 32;

  const button = (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      initial={false}
      animate={{ width: targetWidth }}
      transition={{ duration: 0.32, ease: QUICK_EASE }}
      className={[
        "flex h-8 shrink-0 items-center overflow-hidden rounded-full text-[length:var(--theme-text-sm)] font-medium",
        active
          ? "justify-start gap-1.5 bg-[var(--theme-neutral)]/10 pl-2 pr-3 text-[var(--theme-neutral)]"
          : "justify-center text-[var(--theme-neutral)]/65 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]",
      ].join(" ")}
    >
      <span className="flex shrink-0 items-center">{icon}</span>
      <AnimatePresence initial={false}>
        {active && (
          <motion.span
            key="label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: QUICK_EASE }}
            className="whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );

  if (active) return button;
  return (
    <Tooltip
      content={label}
      placement="bottom"
      delay={120}
      closeDelay={0}
      classNames={TOOLTIP_CLASSES}
    >
      {button}
    </Tooltip>
  );
}

function RailIcon({
  entry,
  className,
}: {
  entry: RailEntry;
  className?: string;
}) {
  if (entry.iconSrc) {
    return (
      <span
        aria-hidden
        className={`${className ?? "h-4 w-4"} [&>svg]:h-full [&>svg]:w-full`}
        dangerouslySetInnerHTML={{ __html: entry.iconSrc }}
      />
    );
  }
  if (entry.Icon) {
    return <entry.Icon className={className ?? "h-4 w-4"} stroke={1.75} />;
  }
  return null;
}
