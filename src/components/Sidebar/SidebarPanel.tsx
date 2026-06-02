import { motion } from "framer-motion";
import { Tooltip } from "@heroui/react";
import { IconChevronLeft, IconSearch } from "@tabler/icons-react";
import type { PanelDef, PanelItem } from "./types";

interface SidebarPanelProps {
  /** Stable key per panel so AnimatePresence keys the slide-in cleanly. */
  panelKey: string;
  panel: PanelDef;
  activeChildKey: string;
  onSelectChild: (key: string) => void;
  onCollapse: () => void;
}

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Wide section panel that slides in next to the rail when expanded. */
export default function SidebarPanel({
  panelKey,
  panel,
  activeChildKey,
  onSelectChild,
  onCollapse,
}: SidebarPanelProps) {
  return (
    <motion.div
      key={panelKey}
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 309, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE_TV }}
      className="overflow-hidden border-l border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]"
    >
      <div className="flex h-full w-[309px] flex-col gap-6 px-4 py-6">
        <header className="flex items-center justify-between gap-2">
          <p className="truncate text-[20px] font-medium leading-tight text-[var(--theme-neutral)]">
            {panel.title}
          </p>
          <Tooltip
            content="ย่อแถบเครื่องมือ"
            placement="bottom"
            delay={200}
            closeDelay={0}
            classNames={{
              content:
                "bg-[#1f1f1f] text-white text-[12px] font-medium px-2.5 py-1.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.25)]",
            }}
          >
            <button
              type="button"
              aria-label="ย่อแถบเครื่องมือ"
              onClick={onCollapse}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--theme-neutral)]/60 transition hover:bg-[var(--theme-surface)] hover:text-[var(--theme-neutral)]"
            >
              <IconChevronLeft className="h-4 w-4" stroke={1.75} />
            </button>
          </Tooltip>
        </header>

        <SearchBox />

        <nav className="flex flex-col gap-4 overflow-y-auto">
          {panel.items.map((it) => (
            <PanelEntry
              key={it.key}
              item={it}
              activeChildKey={activeChildKey}
              onSelectChild={onSelectChild}
            />
          ))}
        </nav>
      </div>
    </motion.div>
  );
}

function SearchBox() {
  return (
    <div className="relative">
      <IconSearch
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--theme-neutral)]/50"
        stroke={1.75}
      />
      <input
        type="text"
        placeholder="ค้นหา"
        aria-label="ค้นหาในแถบเครื่องมือ"
        className="h-12 w-full rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] pl-11 pr-4 text-[14px] text-[var(--theme-neutral)] placeholder:text-[var(--theme-neutral)]/50 outline-none transition focus:border-[var(--theme-primary)] focus:shadow-[0_0_0_3px_var(--theme-primary-soft)]"
      />
    </div>
  );
}

interface PanelEntryProps {
  item: PanelItem;
  activeChildKey: string;
  onSelectChild: (key: string) => void;
}

function PanelEntry({ item, activeChildKey, onSelectChild }: PanelEntryProps) {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex h-[50px] cursor-pointer items-center gap-2 rounded-lg px-4 py-3 text-left text-[14px] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-surface)]"
      >
        <item.Icon className="h-5 w-5 shrink-0" stroke={1.6} />
        <span className="truncate">{item.label}</span>
      </button>

      {hasChildren && (
        <div className="flex flex-col gap-2 pl-4">
          {item.children!.map((c) => {
            const active = activeChildKey === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => onSelectChild(c.key)}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex min-h-[50px] cursor-pointer items-center rounded-2xl px-4 py-3 text-left text-[14px] font-medium transition",
                  active
                    ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]"
                    : "text-[var(--theme-neutral)] hover:bg-[var(--theme-surface)]",
                ].join(" ")}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
