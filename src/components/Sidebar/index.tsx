import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";
import { RAIL_LIST } from "./config";
import type { RailEntry } from "./types";
import SidebarRail from "./SidebarRail";
import SidebarPanel from "./SidebarPanel";

/**
 * Resolve the user's customized rail list. Reorder per `railOrder` if set
 * (defaulting to the source order), append any rail keys the user has not
 * seen yet (newly-added in code), then drop the hidden ones. Hidden rails
 * still exist in the menu palette index so the user can find them.
 */
function resolveVisibleRails(
  order: string[],
  hidden: Set<string>,
): RailEntry[] {
  const byKey = new Map(RAIL_LIST.map((r) => [r.key, r] as const));
  const seen = new Set<string>();
  const ordered: RailEntry[] = [];
  for (const key of order) {
    const entry = byKey.get(key);
    if (entry && !seen.has(key)) {
      ordered.push(entry);
      seen.add(key);
    }
  }
  // Append any rails not yet in user's order (new rails since last save).
  for (const r of RAIL_LIST) {
    if (!seen.has(r.key)) ordered.push(r);
  }
  return ordered.filter((r) => !hidden.has(r.key));
}

/**
 * Global two-pane sidebar with "peek + pin" behavior:
 *   • Hovering a rail icon opens its panel after a short intent delay (peek).
 *   • Clicking pins the panel — it stays open even after the cursor leaves.
 *   • Leaving both rail and panel area closes the peek (but not the pin).
 *   • Switching between rails while open swaps the content with a crossfade,
 *     no width re-animation, so the eye doesn't see the panel "blink".
 */

const HOVER_OPEN_MS = 140;
const HOVER_CLOSE_MS = 200;
const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Sidebar() {
  const { openTab } = useTabs();
  const {
    setCollapsed,
    railHidden,
    pinnedRail,
    setPinnedRail,
    activeChild,
    setActiveChild,
    railOrder,
    hiddenRails,
    openCustomize,
  } = useSidebar();

  const visibleRails = useMemo(
    () => resolveVisibleRails(railOrder, hiddenRails),
    [railOrder, hiddenRails],
  );

  /** The rail item the user is currently hovering — transient, local. */
  const [peekRail, setPeekRail] = useState<string>("");

  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);

  // Peek wins while it's set; otherwise the pinned panel shows.
  const displayedKey = peekRail || pinnedRail;
  const displayedEntry = RAIL_LIST.find((r) => r.key === displayedKey);
  const panel = displayedEntry?.panel;
  const showPanel = !!panel;

  // The visually-active rail icon: peek takes precedence so the icon under
  // the cursor lights up immediately, but the pinned one stays highlighted
  // when nothing is being hovered.
  const activeRailKey = peekRail || pinnedRail;

  // Keep external layout (Home, TopBar) in sync with whether a panel is
  // currently visible — they read this to slide content rightward.
  useEffect(() => {
    setCollapsed(!showPanel);
  }, [showPanel, setCollapsed]);

  // Clean up any pending timers on unmount.
  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
    },
    [],
  );

  // Esc closes the panel — peek first, then unpin. Mirrors the way Mac apps
  // dismiss popovers and gives keyboard users a way out without the mouse.
  useEffect(() => {
    if (!showPanel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (peekRail) {
        setPeekRail("");
      } else if (pinnedRail) {
        setPinnedRail("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPanel, peekRail, pinnedRail]);

  const clearTimers = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    openTimer.current = undefined;
    closeTimer.current = undefined;
  };

  const handleRailHover = useCallback((entry: RailEntry) => {
    // Cancel any in-flight close — cursor is back on a rail item.
    window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;

    if (!entry.panel) {
      // Rail-only items shouldn't open anything; clear pending peek.
      window.clearTimeout(openTimer.current);
      openTimer.current = undefined;
      setPeekRail("");
      return;
    }

    // If a panel is already open, swap content instantly (intent already
    // proven). Otherwise wait for the intent delay before opening.
    setPeekRail((prev) => {
      if (prev || pinnedRail) {
        window.clearTimeout(openTimer.current);
        openTimer.current = undefined;
        return entry.key;
      }
      window.clearTimeout(openTimer.current);
      openTimer.current = window.setTimeout(() => {
        setPeekRail(entry.key);
      }, HOVER_OPEN_MS);
      return prev;
    });
  }, [pinnedRail]);

  const handleRailLeave = useCallback(() => {
    // User moved away from a rail icon — cancel pending open, start close.
    window.clearTimeout(openTimer.current);
    openTimer.current = undefined;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setPeekRail("");
    }, HOVER_CLOSE_MS);
  }, []);

  const handlePanelEnter = useCallback(() => {
    // Cursor entered the panel — keep it open as long as it's there.
    window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  }, []);

  const handlePanelLeave = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setPeekRail("");
    }, HOVER_CLOSE_MS);
  }, []);

  const handleRailSelect = useCallback(
    (entry: RailEntry) => {
      clearTimers();

      if (entry.navigateTo) {
        setPinnedRail(entry.key);
        setPeekRail("");
        openTab(entry.navigateTo, { title: entry.label });
        return;
      }

      if (!entry.panel) {
        setPinnedRail(entry.key);
        setPeekRail("");
        return;
      }

      // Click on an already-pinned item → unpin (collapse).
      if (pinnedRail === entry.key && !peekRail) {
        setPinnedRail("");
        return;
      }

      setPinnedRail(entry.key);
      setPeekRail("");
    },
    [openTab, peekRail, pinnedRail],
  );

  return (
    <aside
      aria-label="Sidebar"
      aria-hidden={railHidden}
      className={[
        "fixed bottom-4 top-4 z-30 hidden flex-row overflow-hidden rounded-[16px] shadow-[var(--theme-shadow-sm)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:flex",
        // When hidden the whole sidebar slides off the left edge. Tab-focus
        // is removed via aria-hidden + pointer-events-none below.
        railHidden
          ? "left-4 -translate-x-[120%] opacity-0 pointer-events-none"
          : "left-4 translate-x-0 opacity-100",
      ].join(" ")}
    >
      <SidebarRail
        entries={visibleRails}
        activeKey={activeRailKey}
        pinnedKey={pinnedRail}
        onSelect={handleRailSelect}
        onHover={handleRailHover}
        onLeave={handleRailLeave}
        onCustomize={openCustomize}
      />

      {/* Panel shell — width animates once on open/close; content crossfades
          when the displayed key changes so switching between rails reads as
          a single fluid motion rather than collapse-then-expand. */}
      <AnimatePresence initial={false}>
        {showPanel && (
          <motion.div
            key="panel-shell"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 264, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_TV }}
            onMouseEnter={handlePanelEnter}
            onMouseLeave={handlePanelLeave}
            className="overflow-hidden border-l border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)]"
          >
            <div className="relative h-full w-[264px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={displayedKey}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.18, ease: EASE_TV }}
                  className="h-full"
                >
                  {panel && (
                    <SidebarPanel
                      railKey={displayedKey}
                      panel={panel}
                      activeChildKey={activeChild}
                      onSelectChild={setActiveChild}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
