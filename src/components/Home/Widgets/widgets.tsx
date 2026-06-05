import { useNavigate } from "react-router";
import {
  IconExternalLink,
  IconGripVertical,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconX,
} from "@tabler/icons-react";
import type { Dashboard } from "../../Dashboards/types";
import DashboardGrid from "../../Dashboards/Grid";
import type { WidgetSize } from "./store";

interface DashboardWidgetProps {
  dashboard: Dashboard;
  size: WidgetSize;
  onToggleSize: () => void;
  onRemove: () => void;
  /** Drag handle ref / listeners passed by the parent Reorder.Item. */
  dragHandle?: React.ReactNode;
}

/**
 * Pinned dashboard card on Home. Two sizes:
 *   - compact: shrunk row height (80px), good for at-a-glance pinning
 *   - full: native row height (130px), reads like the /dashboards page
 * The card chrome stays the same in both; only `DashboardGrid`'s compact
 * prop and the outer col-span (set by the parent) actually change.
 */
export default function DashboardWidget({
  dashboard,
  size,
  onToggleSize,
  onRemove,
  dragHandle,
}: DashboardWidgetProps) {
  const navigate = useNavigate();
  const isCompact = size === "compact";

  return (
    <div className="flex h-full flex-col gap-[var(--theme-space-md)] rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] p-[var(--theme-space-md)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {dragHandle ?? (
            <IconGripVertical
              className="h-4 w-4 shrink-0 text-[var(--theme-neutral)]/30"
              stroke={1.75}
            />
          )}
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
              {dashboard.name}
            </p>
            {dashboard.description && (
              <p className="truncate text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                {dashboard.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconBtn
            label={isCompact ? "ขยายเต็ม" : "ย่อให้กระชับ"}
            onClick={onToggleSize}
          >
            {isCompact ? (
              <IconArrowsMaximize className="h-4 w-4" stroke={1.75} />
            ) : (
              <IconArrowsMinimize className="h-4 w-4" stroke={1.75} />
            )}
          </IconBtn>
          <IconBtn
            label="เปิดแบบเต็มหน้าจอ"
            onClick={() => navigate(`/dashboards/${dashboard.id}`)}
          >
            <IconExternalLink className="h-4 w-4" stroke={1.75} />
          </IconBtn>
          <IconBtn label="เลิกปักหมุด" onClick={onRemove}>
            <IconX className="h-4 w-4" stroke={1.75} />
          </IconBtn>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <DashboardGrid widgets={dashboard.widgets} compact={isCompact} />
      </div>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--theme-neutral)]/55 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
    >
      {children}
    </button>
  );
}
