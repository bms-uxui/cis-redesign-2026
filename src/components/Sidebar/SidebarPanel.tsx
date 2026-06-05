import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Tooltip } from "@heroui/react";
import {
  IconChevronDown,
  IconLayoutSidebarLeftCollapse,
  IconSearch,
} from "@tabler/icons-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";
import type { PanelDef, PanelItem, PanelGroup } from "./types";

interface SidebarPanelProps {
  /** Rail key this panel belongs to — used to look up per-panel customization. */
  railKey: string;
  panel: PanelDef;
  activeChildKey: string;
  onSelectChild: (key: string) => void;
}

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Wide section panel content. The width animation lives one level up in
 * <Sidebar> so peeking / pinned switching only crossfades content — no
 * collapse-then-expand jank.
 */
export default function SidebarPanel({
  railKey,
  panel,
  activeChildKey,
  onSelectChild,
}: SidebarPanelProps) {
  const {
    openPalette,
    toggleRailHiddenSidebar,
    panelOrders,
    hiddenPanelItems,
  } = useSidebar();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // Apply user customization first (reorder within group + hide), THEN the
  // in-panel search filter. Reorder is flat across the panel but group
  // membership is stable — items can't jump groups.
  const customizedGroups = useMemo<PanelGroup[]>(() => {
    const order = panelOrders[railKey] ?? [];
    const hidden = hiddenPanelItems[railKey] ?? new Set<string>();
    const orderIndex = new Map<string, number>();
    order.forEach((k, i) => orderIndex.set(k, i));
    return panel.groups
      .map((group) => {
        const items = [...group.items].sort((a, b) => {
          const ai = orderIndex.has(a.key) ? orderIndex.get(a.key)! : Infinity;
          const bi = orderIndex.has(b.key) ? orderIndex.get(b.key)! : Infinity;
          return ai - bi;
        });
        return { ...group, items: items.filter((it) => !hidden.has(it.key)) };
      })
      .filter((g) => g.items.length > 0);
  }, [panel.groups, panelOrders, hiddenPanelItems, railKey]);

  // In-panel filter: keep items whose label matches, OR whose children
  // include a match (children get pruned to the matches). Groups with no
  // remaining items drop out. Children always render expanded while the
  // user is searching so matches are visible immediately.
  const filteredGroups = useMemo<PanelGroup[]>(() => {
    if (!q) return customizedGroups;
    return customizedGroups
      .map((group) => ({
        ...group,
        items: group.items
          .map((item) => {
            const itemMatches = item.label.toLowerCase().includes(q);
            const matchingChildren =
              item.children?.filter((c) => c.label.toLowerCase().includes(q)) ??
              [];
            if (itemMatches) return item;
            if (matchingChildren.length > 0) {
              return { ...item, children: matchingChildren };
            }
            return null;
          })
          .filter((x): x is PanelItem => x !== null),
      }))
      .filter((g) => g.items.length > 0);
  }, [customizedGroups, q]);

  const hasResults = filteredGroups.length > 0;

  return (
    <div className="flex h-full w-[264px] flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <p className="truncate text-[length:var(--theme-text-lg)] font-medium leading-tight text-[var(--theme-neutral)]">
          {panel.title}
        </p>
        <Tooltip
          content="ซ่อนแถบเครื่องมือ"
          placement="bottom"
          delay={200}
          closeDelay={0}
          classNames={{
            content:
              "bg-[var(--theme-neutral)] text-white text-[length:var(--theme-text-xs)] font-medium px-2.5 py-1.5 rounded-lg shadow-[var(--theme-shadow-md)]",
          }}
        >
          <button
            type="button"
            aria-label="ซ่อนแถบเครื่องมือ"
            onClick={toggleRailHiddenSidebar}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--theme-neutral)]/60 transition-colors duration-200 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
          >
            <IconLayoutSidebarLeftCollapse className="h-4 w-4" stroke={1.75} />
          </button>
        </Tooltip>
      </header>

      <SearchBox query={query} onChange={setQuery} onOpenGlobal={openPalette} />

      {!hasResults && q ? (
        <div className="flex flex-col items-center gap-1 px-4 pt-4 text-center">
          <p className="text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]/70">
            ไม่พบเมนูในแผงนี้
          </p>
          <button
            type="button"
            onClick={openPalette}
            className="text-[length:var(--theme-text-xs)] text-[var(--theme-primary)] hover:underline"
          >
            ค้นหาทั้งระบบ (/)
          </button>
        </div>
      ) : (
        <nav className="flex flex-col gap-4 overflow-y-auto">
          {filteredGroups.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-2">
              {group.label && (
                <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/45">
                  {group.label}
                </p>
              )}
              {group.items.map((it) => (
                <PanelEntry
                  key={it.key}
                  item={it}
                  activeChildKey={activeChildKey}
                  onSelectChild={onSelectChild}
                  forceExpand={!!q}
                />
              ))}
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}

interface SearchBoxProps {
  query: string;
  onChange: (v: string) => void;
  onOpenGlobal: () => void;
}

function SearchBox({ query, onChange, onOpenGlobal }: SearchBoxProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <IconSearch
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--theme-neutral)]/50"
          stroke={1.75}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ค้นหาในแผงนี้..."
          aria-label="ค้นหาในแถบเครื่องมือ"
          className="h-12 w-full rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)] pl-11 pr-4 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] placeholder:text-[var(--theme-neutral)]/50 outline-none transition focus:border-[var(--theme-primary)] focus:bg-[var(--theme-surface)] focus:shadow-[0_0_0_3px_var(--theme-primary-soft)]"
        />
      </div>
      <button
        type="button"
        onClick={onOpenGlobal}
        className="self-start px-4 text-[10px] text-[var(--theme-neutral)]/55 hover:text-[var(--theme-primary)]"
      >
        ค้นหาทั้งระบบ → กด <kbd className="rounded border border-[var(--theme-neutral)]/15 px-1 font-medium">/</kbd>
      </button>
    </div>
  );
}

interface PanelEntryProps {
  item: PanelItem;
  activeChildKey: string;
  onSelectChild: (key: string) => void;
  /** Override collapse — used while a filter query is active so matches show. */
  forceExpand?: boolean;
}

function PanelEntry({
  item,
  activeChildKey,
  onSelectChild,
  forceExpand,
}: PanelEntryProps) {
  const { openTab } = useTabs();
  const hasChildren = !!item.children && item.children.length > 0;
  const containsActive =
    hasChildren && item.children!.some((c) => c.key === activeChildKey);

  // Default expanded if any child is active; user can toggle from there.
  const [userExpanded, setExpanded] = useState(containsActive || !hasChildren);
  const expanded = forceExpand || userExpanded;

  const handleParentClick = () => {
    if (item.navigateTo) {
      openTab(item.navigateTo, { title: item.label });
      onSelectChild(item.key);
      return;
    }
    if (hasChildren) {
      setExpanded((v) => !v);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleParentClick}
        aria-expanded={hasChildren ? expanded : undefined}
        className="flex h-[44px] cursor-pointer items-center gap-2 rounded-lg px-4 text-left text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)] transition-colors duration-200 hover:bg-[var(--theme-primary-soft)]"
      >
        <item.Icon className="h-5 w-5 shrink-0" stroke={1.6} />
        <span className="flex-1 truncate">{item.label}</span>
        {hasChildren && (
          <motion.span
            aria-hidden
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: 0.22, ease: EASE_TV }}
            className="flex h-4 w-4 items-center justify-center text-[var(--theme-neutral)]/60"
          >
            <IconChevronDown className="h-4 w-4" stroke={1.75} />
          </motion.span>
        )}
      </button>

      {hasChildren && (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="children"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: EASE_TV }}
              className="overflow-hidden"
            >
              {/* Single thin vertical guide on the left — no horizontal
                  stubs, no L-bend. Children stand on a clean rail without
                  visual noise; indentation alone implies the hierarchy. */}
              <div className="relative flex flex-col gap-0.5 py-1 pl-4">
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-2 left-3 top-2 w-px bg-[var(--theme-neutral)]/10"
                />
                {item.children!.map((c) => {
                  const active = activeChildKey === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => onSelectChild(c.key)}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "relative flex min-h-[36px] w-full cursor-pointer items-center rounded-lg pl-4 pr-3 py-1.5 text-left text-[length:var(--theme-text-sm)]",
                        "transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        active
                          ? "font-medium text-[var(--theme-primary)]"
                          : "text-[var(--theme-neutral)]/75 hover:text-[var(--theme-neutral)] hover:bg-[var(--theme-primary-soft)]",
                      ].join(" ")}
                    >
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
