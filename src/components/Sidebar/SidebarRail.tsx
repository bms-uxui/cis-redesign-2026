import { Tooltip } from "@heroui/react";
import EHP_LOGO from "../../assets/figma/ehp-logo.png";
import { RAIL_GROUPS } from "./config";
import type { RailEntry } from "./types";

interface SidebarRailProps {
  activeKey: string;
  onSelect: (entry: RailEntry) => void;
}

/** Narrow icon column on the left of the sidebar — always white. */
export default function SidebarRail({ activeKey, onSelect }: SidebarRailProps) {
  return (
    <div className="flex w-[74px] flex-col items-center gap-4 bg-[var(--theme-surface)] px-4 py-6">
      <img
        src={EHP_LOGO}
        alt="EHP"
        className="h-10 w-auto shrink-0 object-contain"
      />
      <nav className="flex w-full flex-col gap-4">
        {RAIL_GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-2">
            {group.items.map((it) => (
              <RailButton
                key={it.key}
                entry={it}
                active={activeKey === it.key}
                onClick={() => onSelect(it)}
              />
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
}

interface RailButtonProps {
  entry: RailEntry;
  active: boolean;
  onClick: () => void;
}

function RailButton({ entry, active, onClick }: RailButtonProps) {
  return (
    <Tooltip
      content={entry.label}
      placement="right"
      delay={200}
      closeDelay={0}
      offset={12}
      classNames={{
        content:
          "bg-[#1f1f1f] text-white text-[12px] font-medium px-2.5 py-1.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.25)]",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={entry.label}
        aria-current={active ? "page" : undefined}
        className={[
          "flex h-[42px] w-full cursor-pointer items-center justify-center rounded-lg transition",
          active
            ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]"
            : "text-[var(--theme-neutral)]/70 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]",
        ].join(" ")}
      >
        <entry.Icon className="h-5 w-5" stroke={1.6} />
      </button>
    </Tooltip>
  );
}
