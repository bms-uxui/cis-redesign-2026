import { useState } from "react";
import { useNavigate } from "react-router";
import { Reorder, useDragControls } from "framer-motion";
import {
  IconLayoutDashboard,
  IconPlus,
  IconSparkles,
  IconGripVertical,
} from "@tabler/icons-react";
import { useDashboards } from "./catalog";
import { useHomeWidgets, type PinnedWidget } from "./store";
import AddWidgetsModal from "./AddWidgetsModal";
import DashboardWidget from "./widgets";

/**
 * "วิดเจ็ตของฉัน" — drag-to-reorder grid of pinned dashboards. Two display
 * sizes per card (compact / full); full cards span the entire row so the
 * embedded `<DashboardGrid>` has room for its 4-col layout, compact cards
 * sit two-up on wide screens. Order + size persist via `useHomeWidgets`.
 */
export default function WidgetsSection() {
  const navigate = useNavigate();
  const { pins, setAll, setSize, remove } = useHomeWidgets();
  const dashboards = useDashboards();
  const byId = new Map(dashboards.map((d) => [d.id, d] as const));
  const [open, setOpen] = useState(false);

  // Drop pins whose dashboard was deleted in /dashboards so the row
  // doesn't render an empty card.
  const validPins = pins.filter((p) => byId.has(p.id));

  return (
    <section className="flex flex-col gap-[var(--theme-space-md)]">
      <div className="flex items-center justify-between text-[length:var(--theme-text-sm)] font-medium">
        <div className="flex items-center gap-2 text-[var(--theme-neutral)]/60">
          <IconLayoutDashboard className="h-4 w-4" stroke={1.75} />
          <p>วิดเจ็ตของฉัน</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--theme-primary)] hover:underline"
        >
          <IconPlus className="h-4 w-4" stroke={2} />
          ปักหมุดแดชบอร์ด
        </button>
      </div>

      {dashboards.length === 0 ? (
        <button
          type="button"
          onClick={() => navigate("/dashboards")}
          className="flex h-[120px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--theme-radius-box)] border border-dashed border-[var(--theme-neutral)]/20 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/60 transition hover:border-[var(--theme-primary)]/40 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]"
        >
          <IconSparkles className="h-5 w-5" stroke={1.75} />
          <span>ยังไม่มีแดชบอร์ด — สร้างแดชบอร์ดแรกของคุณก่อน</span>
        </button>
      ) : validPins.length === 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-[120px] cursor-pointer items-center justify-center rounded-[var(--theme-radius-box)] border border-dashed border-[var(--theme-neutral)]/20 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/60 transition hover:border-[var(--theme-primary)]/40 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]"
        >
          คลิกเพื่อปักหมุดแดชบอร์ดที่บันทึกไว้
        </button>
      ) : (
        <Reorder.Group
          axis="y"
          values={validPins}
          onReorder={setAll}
          className="grid grid-cols-1 gap-[var(--theme-space-md)] xl:grid-cols-2"
        >
          {validPins.map((pin) => {
            const d = byId.get(pin.id)!;
            return (
              <PinnedItem
                key={pin.id}
                pin={pin}
                dashboard={d}
                onToggleSize={() =>
                  setSize(pin.id, pin.size === "compact" ? "full" : "compact")
                }
                onRemove={() => remove(pin.id)}
              />
            );
          })}
        </Reorder.Group>
      )}

      <AddWidgetsModal
        open={open}
        selectedIds={validPins.map((p) => p.id)}
        dashboards={dashboards}
        onClose={() => setOpen(false)}
        onApply={(nextIds) => {
          // Preserve existing sizes; default new pins to compact.
          const prevSize = new Map(validPins.map((p) => [p.id, p.size] as const));
          setAll(
            nextIds.map((id) => ({
              id,
              size: prevSize.get(id) ?? "compact",
            })),
          );
        }}
      />
    </section>
  );
}

interface PinnedItemProps {
  pin: PinnedWidget;
  dashboard: import("../../Dashboards/types").Dashboard;
  onToggleSize: () => void;
  onRemove: () => void;
}

/**
 * Single Reorder.Item. Drag is controlled (via `useDragControls`) so only
 * the grip handle inside the card initiates a drag — clicking other
 * controls (toggle size, remove) doesn't accidentally start one.
 *
 * Full-size cards opt out of the 2-col layout by using `col-span-full`.
 */
function PinnedItem({ pin, dashboard, onToggleSize, onRemove }: PinnedItemProps) {
  const controls = useDragControls();
  const fullSpan = pin.size === "full" ? "xl:col-span-2" : "";

  return (
    <Reorder.Item
      value={pin}
      dragListener={false}
      dragControls={controls}
      className={[fullSpan, "list-none"].join(" ").trim()}
    >
      <DashboardWidget
        dashboard={dashboard}
        size={pin.size}
        onToggleSize={onToggleSize}
        onRemove={onRemove}
        dragHandle={
          <button
            type="button"
            aria-label="ลากเพื่อจัดเรียง"
            onPointerDown={(e) => controls.start(e)}
            className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-[var(--theme-neutral)]/40 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)] active:cursor-grabbing"
          >
            <IconGripVertical className="h-4 w-4" stroke={1.75} />
          </button>
        }
      />
    </Reorder.Item>
  );
}
