import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import {
  IconChevronDown,
  IconGripVertical,
  IconX,
  IconRefresh,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { Button } from "@heroui/react";
import { useSidebar } from "../contexts/SidebarContext";
import { useToast } from "../contexts/ToastContext";
import { RAIL_LIST } from "./Sidebar/config";
import type { PanelItem, RailEntry } from "./Sidebar/types";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Jira-style sidebar customization. Drag to reorder, checkbox to show/hide.
 * Changes are previewed instantly in the live sidebar via context; hitting
 * Save closes the modal, Cancel reverts to the snapshot we took on open.
 */
export default function CustomizeSidebarModal() {
  const {
    customizeOpen,
    closeCustomize,
    railOrder,
    hiddenRails,
    setRailOrder,
    toggleRailHidden,
    resetRailCustomization,
    panelOrders,
    hiddenPanelItems,
    setPanelOrder,
    togglePanelItemHidden,
    favoriteRails,
    toggleFavoriteRail,
    setFavoriteRails,
  } = useSidebar();


  // Snapshot on open so Cancel can roll back any in-progress edits.
  const snapshot = useRef<{ order: string[]; hidden: string[] } | null>(null);

  // Resolve the current working list: user's order + any newly-added rails
  // not yet in it. This is what we render and what reorder operates on.
  const workingList = useMemo<RailEntry[]>(() => {
    const byKey = new Map(RAIL_LIST.map((r) => [r.key, r] as const));
    const seen = new Set<string>();
    const out: RailEntry[] = [];
    for (const key of railOrder) {
      const e = byKey.get(key);
      if (e && !seen.has(key)) {
        out.push(e);
        seen.add(key);
      }
    }
    for (const r of RAIL_LIST) {
      if (!seen.has(r.key)) out.push(r);
    }
    return out;
  }, [railOrder]);

  useEffect(() => {
    if (customizeOpen && !snapshot.current) {
      snapshot.current = {
        order: [...railOrder],
        hidden: [...hiddenRails],
      };
    }
    if (!customizeOpen) {
      snapshot.current = null;
    }
  }, [customizeOpen, railOrder, hiddenRails]);

  const visibleCount = workingList.filter((r) => !hiddenRails.has(r.key)).length;

  // Split into the same 3 buckets the sidebar uses, so this modal mirrors
  // the layout the user sees on the left. Favorites bubble to the top (in
  // their starring order); rails with a panel become "หมวดหมู่"; rails
  // without a panel fall into "อื่น ๆ".
  const { favorites, withPanel, withoutPanel } = useMemo(() => {
    const fav: RailEntry[] = [];
    const wp: RailEntry[] = [];
    const wop: RailEntry[] = [];
    for (const r of workingList) {
      if (favoriteRails.includes(r.key)) fav.push(r);
      else if (r.panel) wp.push(r);
      else wop.push(r);
    }
    fav.sort(
      (a, b) => favoriteRails.indexOf(a.key) - favoriteRails.indexOf(b.key),
    );
    return { favorites: fav, withPanel: wp, withoutPanel: wop };
  }, [workingList, favoriteRails]);

  // Reorder helpers — each group has its own Reorder.Group, but we still
  // store a single combined railOrder so the sidebar reads it cleanly.
  const reorderFavorites = (newOrder: string[]) => {
    // Favorites group is rendered in favoriteRails order — update that
    // list directly so the change is visible.
    setFavoriteRails(newOrder);
    setRailOrder([
      ...newOrder,
      ...withPanel.map((r) => r.key),
      ...withoutPanel.map((r) => r.key),
    ]);
  };
  const reorderWithPanel = (newOrder: string[]) => {
    setRailOrder([
      ...favorites.map((r) => r.key),
      ...newOrder,
      ...withoutPanel.map((r) => r.key),
    ]);
  };
  const reorderWithoutPanel = (newOrder: string[]) => {
    setRailOrder([
      ...favorites.map((r) => r.key),
      ...withPanel.map((r) => r.key),
      ...newOrder,
    ]);
  };

  // Multi-expand: any number of rails can be open at once. Reset on close.
  const toast = useToast();
  const [expandedRails, setExpandedRails] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!customizeOpen) setExpandedRails(new Set());
  }, [customizeOpen]);
  const toggleExpand = (key: string) => {
    setExpandedRails((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCancel = () => {
    if (snapshot.current) {
      setRailOrder(snapshot.current.order);
      // Restore hidden set: clear current, re-add snapshot's.
      const currentHidden = Array.from(hiddenRails);
      for (const k of currentHidden) {
        if (!snapshot.current.hidden.includes(k)) toggleRailHidden(k);
      }
      for (const k of snapshot.current.hidden) {
        if (!hiddenRails.has(k)) toggleRailHidden(k);
      }
    }
    closeCustomize();
  };

  return (
    <AnimatePresence>
      {customizeOpen && (
        <>
          <motion.div
            key="customize-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE_TV }}
            onClick={closeCustomize}
            className="fixed inset-0 z-[85] bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            key="customize-modal"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE_TV }}
            role="dialog"
            aria-label="ปรับแต่งแถบเครื่องมือ"
            className="fixed left-1/2 top-[10vh] z-[86] flex max-h-[80vh] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-[var(--theme-radius-box)] bg-[var(--theme-surface)] shadow-[var(--theme-shadow-lg)] ring-1 ring-[var(--theme-neutral)]/10"
          >
            {/* Header */}
            <header className="flex items-start justify-between gap-3 border-b border-[var(--theme-neutral)]/10 px-6 py-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-[length:var(--theme-text-lg)] font-semibold text-[var(--theme-neutral)]">
                  ปรับแต่งแถบเครื่องมือ
                </h2>
                <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                  ลากเพื่อจัดเรียง · กดเช็คบ็อกซ์เพื่อซ่อน/แสดง · เมนูที่ซ่อนยังค้นหาได้ผ่าน /
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                aria-label="ปิด"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--theme-neutral)]/55 transition-colors hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
              >
                <IconX className="h-4 w-4" stroke={1.75} />
              </button>
            </header>

            {/* List — grouped to mirror the live sidebar's structure:
                "เมนูโปรด" first, then categories (rails with panels),
                then "อื่น ๆ" for plain rail items. Each group has its own
                Reorder.Group so drag stays scoped to a single category. */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {favorites.length > 0 && (
                <GroupBlock title="เมนูโปรด" hint="ปักหมุดบนสุด · แสดงบนหน้าหลัก">
                  <Reorder.Group
                    axis="y"
                    values={favorites.map((r) => r.key)}
                    onReorder={reorderFavorites}
                    className="flex flex-col"
                  >
                    {favorites.map((entry) => (
                      <RailRow
                        key={entry.key}
                        rail={entry}
                        isHidden={hiddenRails.has(entry.key)}
                        onToggleHidden={() => toggleRailHidden(entry.key)}
                        expanded={expandedRails.has(entry.key)}
                        onToggleExpand={() => toggleExpand(entry.key)}
                        isFavorite
                        onToggleFavorite={() => toggleFavoriteRail(entry.key)}
                        panelOrder={panelOrders[entry.key] ?? []}
                        hiddenPanelSet={
                          hiddenPanelItems[entry.key] ?? new Set<string>()
                        }
                        onPanelReorder={(newOrder) =>
                          setPanelOrder(entry.key, newOrder)
                        }
                        onTogglePanelItemHidden={(itemKey) =>
                          togglePanelItemHidden(entry.key, itemKey)
                        }
                      />
                    ))}
                  </Reorder.Group>
                </GroupBlock>
              )}

              {withPanel.length > 0 && (
                <GroupBlock title="หมวดหมู่" hint="เมนูที่มีรายการย่อย">
                  <Reorder.Group
                    axis="y"
                    values={withPanel.map((r) => r.key)}
                    onReorder={reorderWithPanel}
                    className="flex flex-col"
                  >
                    {withPanel.map((entry) => (
                      <RailRow
                        key={entry.key}
                        rail={entry}
                        isHidden={hiddenRails.has(entry.key)}
                        onToggleHidden={() => toggleRailHidden(entry.key)}
                        expanded={expandedRails.has(entry.key)}
                        onToggleExpand={() => toggleExpand(entry.key)}
                        isFavorite={favoriteRails.includes(entry.key)}
                        onToggleFavorite={() => toggleFavoriteRail(entry.key)}
                        panelOrder={panelOrders[entry.key] ?? []}
                        hiddenPanelSet={
                          hiddenPanelItems[entry.key] ?? new Set<string>()
                        }
                        onPanelReorder={(newOrder) =>
                          setPanelOrder(entry.key, newOrder)
                        }
                        onTogglePanelItemHidden={(itemKey) =>
                          togglePanelItemHidden(entry.key, itemKey)
                        }
                      />
                    ))}
                  </Reorder.Group>
                </GroupBlock>
              )}

              {withoutPanel.length > 0 && (
                <GroupBlock title="อื่น ๆ" hint="ทางลัด · ไม่มีเมนูย่อย">
                  <Reorder.Group
                    axis="y"
                    values={withoutPanel.map((r) => r.key)}
                    onReorder={reorderWithoutPanel}
                    className="flex flex-col"
                  >
                    {withoutPanel.map((entry) => (
                      <RailRow
                        key={entry.key}
                        rail={entry}
                        isHidden={hiddenRails.has(entry.key)}
                        onToggleHidden={() => toggleRailHidden(entry.key)}
                        expanded={expandedRails.has(entry.key)}
                        onToggleExpand={() => toggleExpand(entry.key)}
                        isFavorite={favoriteRails.includes(entry.key)}
                        onToggleFavorite={() => toggleFavoriteRail(entry.key)}
                        panelOrder={panelOrders[entry.key] ?? []}
                        hiddenPanelSet={
                          hiddenPanelItems[entry.key] ?? new Set<string>()
                        }
                        onPanelReorder={(newOrder) =>
                          setPanelOrder(entry.key, newOrder)
                        }
                        onTogglePanelItemHidden={(itemKey) =>
                          togglePanelItemHidden(entry.key, itemKey)
                        }
                      />
                    ))}
                  </Reorder.Group>
                </GroupBlock>
              )}
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-between gap-3 border-t border-[var(--theme-neutral)]/10 bg-[var(--theme-base)] px-6 py-3">
              <div className="flex items-center gap-3">
                <span className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                  แสดง {visibleCount}/{workingList.length}
                </span>
                <button
                  type="button"
                  onClick={resetRailCustomization}
                  className="flex items-center gap-1 text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55 transition-colors hover:text-[var(--theme-primary)]"
                >
                  <IconRefresh className="h-3 w-3" stroke={1.75} />
                  รีเซ็ต
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="light"
                  onPress={handleCancel}
                  className="rounded-lg text-[var(--theme-neutral)] data-[hover=true]:bg-[var(--theme-primary-soft)]"
                >
                  ยกเลิก
                </Button>
                <Button
                  size="sm"
                  onPress={() => {
                    closeCustomize();
                    toast.success(
                      "บันทึกการตั้งค่าแถบเครื่องมือแล้ว",
                      "การจัดเรียงและรายการที่ซ่อนถูกบันทึกในเครื่องนี้",
                    );
                  }}
                  className="rounded-lg bg-[var(--theme-primary)] text-white"
                >
                  เสร็จสิ้น
                </Button>
              </div>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function GroupBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-baseline justify-between px-3 pb-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/55">
          {title}
        </p>
        {hint && (
          <span className="text-[10px] text-[var(--theme-neutral)]/40">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

interface RailRowProps {
  rail: RailEntry;
  isHidden: boolean;
  onToggleHidden: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  panelOrder: string[];
  hiddenPanelSet: Set<string>;
  onPanelReorder: (newOrder: string[]) => void;
  onTogglePanelItemHidden: (itemKey: string) => void;
}

/**
 * One rail entry in the customize modal. When the rail has a panel, an
 * accordion chevron appears — clicking it expands the nested sub-items
 * directly underneath. The rail and (when open) its children move together
 * if the parent is dragged.
 */
function RailRow({
  rail,
  isHidden,
  onToggleHidden,
  expanded,
  onToggleExpand,
  isFavorite,
  onToggleFavorite,
  panelOrder,
  hiddenPanelSet,
  onPanelReorder,
  onTogglePanelItemHidden,
}: RailRowProps) {
  const hasPanel = !!rail.panel;
  const panelItems = useMemo(() => {
    if (!rail.panel) return [] as PanelItem[];
    const flat: PanelItem[] = [];
    for (const group of rail.panel.groups) flat.push(...group.items);
    const orderIndex = new Map<string, number>();
    panelOrder.forEach((k, i) => orderIndex.set(k, i));
    return [...flat].sort((a, b) => {
      const ai = orderIndex.has(a.key) ? orderIndex.get(a.key)! : Infinity;
      const bi = orderIndex.has(b.key) ? orderIndex.get(b.key)! : Infinity;
      return ai - bi;
    });
  }, [rail.panel, panelOrder]);

  const childKeys = useMemo(() => panelItems.map((i) => i.key), [panelItems]);

  return (
    <Reorder.Item
      value={rail.key}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      initial={false}
      animate={{ scale: 1, zIndex: 0, boxShadow: "0 0 0 rgba(0,0,0,0)" }}
      whileDrag={{
        scale: 1.02,
        zIndex: 10,
        boxShadow:
          "0 12px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)",
      }}
      dragMomentum={false}
      className="flex flex-col bg-[var(--theme-surface)]"
    >
      <div
        className="group flex cursor-grab items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--theme-base)] active:cursor-grabbing"
        onClick={(e) => {
          // Make the whole row toggle the accordion, but only when the
          // click didn't land on an interactive child (checkbox, chevron).
          if (!hasPanel) return;
          const target = e.target as HTMLElement;
          if (target.closest("input, button")) return;
          onToggleExpand();
        }}
      >
        <IconGripVertical
          className="h-4 w-4 shrink-0 text-[var(--theme-neutral)]/40 group-hover:text-[var(--theme-neutral)]/70"
          stroke={1.75}
        />
        <input
          type="checkbox"
          checked={!isHidden}
          onChange={onToggleHidden}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`แสดง ${rail.label}`}
          className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--theme-primary)]"
        />
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center text-[var(--theme-neutral)]/70"
        >
          {rail.iconSrc ? (
            <span
              className="block h-5 w-5 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: rail.iconSrc }}
            />
          ) : rail.Icon ? (
            <rail.Icon className="h-5 w-5" stroke={1.6} />
          ) : null}
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={[
              "min-w-0 truncate text-[length:var(--theme-text-sm)] font-medium",
              isHidden
                ? "text-[var(--theme-neutral)]/40 line-through"
                : "text-[var(--theme-neutral)]",
            ].join(" ")}
          >
            {rail.label}
          </span>
          {hasPanel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={expanded ? "ยุบเมนูย่อย" : "ขยายเมนูย่อย"}
              aria-expanded={expanded}
              className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--theme-neutral)]/40 transition-colors hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
            >
              <motion.span
                animate={{ rotate: expanded ? 0 : -90 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <IconChevronDown className="h-4 w-4" stroke={1.75} />
              </motion.span>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={isFavorite ? "เอาออกจากเมนูโปรด" : "เพิ่มในเมนูโปรด"}
          aria-pressed={isFavorite}
          title="เมนูโปรด — ปักหมุดบนสุด sidebar + แสดงบนหน้าหลัก"
          className={[
            "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded transition-colors",
            isFavorite
              ? "text-amber-500 hover:bg-amber-500/10"
              : "text-[var(--theme-neutral)]/30 hover:bg-[var(--theme-primary-soft)] hover:text-amber-500",
          ].join(" ")}
        >
          {isFavorite ? (
            <IconStarFilled className="h-4 w-4" />
          ) : (
            <IconStar className="h-4 w-4" stroke={1.75} />
          )}
        </button>
      </div>

      {/* Accordion sub-items — only rendered (and only mounted) while the
          rail is expanded. Children sit indented under their parent and
          reorder independently within their own scope. */}
      <AnimatePresence initial={false}>
        {hasPanel && expanded && panelItems.length > 0 && (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="relative ml-5 mt-0.5 mb-1 pl-4">
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-1 left-2 top-1 w-px bg-[var(--theme-neutral)]/10"
              />
              <Reorder.Group
                axis="y"
                values={childKeys}
                onReorder={onPanelReorder}
                className="flex flex-col"
              >
                {panelItems.map((item) => (
                  <PanelItemRow
                    key={item.key}
                    item={item}
                    isHidden={hiddenPanelSet.has(item.key)}
                    onToggleHidden={() => onTogglePanelItemHidden(item.key)}
                  />
                ))}
              </Reorder.Group>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

interface PanelItemRowProps {
  item: PanelItem;
  isHidden: boolean;
  groupHeader?: string;
  onToggleHidden: () => void;
}

function PanelItemRow({
  item,
  isHidden,
  groupHeader,
  onToggleHidden,
}: PanelItemRowProps) {
  return (
    <>
      {groupHeader && (
        <p className="mt-1 px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/45">
          {groupHeader}
        </p>
      )}
      <Reorder.Item
        value={item.key}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        initial={false}
        animate={{ scale: 1, zIndex: 0, boxShadow: "0 0 0 rgba(0,0,0,0)" }}
        whileDrag={{
          scale: 1.02,
          zIndex: 10,
          boxShadow: "0 8px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
        }}
        dragMomentum={false}
        className="group flex cursor-grab items-center gap-2.5 rounded-md bg-[var(--theme-surface)] px-2 py-1.5 active:cursor-grabbing"
      >
        <IconGripVertical
          className="h-3.5 w-3.5 shrink-0 text-[var(--theme-neutral)]/40 group-hover:text-[var(--theme-neutral)]/70"
          stroke={1.75}
        />
        <input
          type="checkbox"
          checked={!isHidden}
          onChange={onToggleHidden}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`แสดง ${item.label}`}
          className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--theme-primary)]"
        />
        <span
          className={[
            "flex-1 truncate text-[length:var(--theme-text-sm)]",
            isHidden
              ? "text-[var(--theme-neutral)]/40 line-through"
              : "text-[var(--theme-neutral)]/85",
          ].join(" ")}
        >
          {item.label}
        </span>
      </Reorder.Item>
    </>
  );
}
