import type { Widget } from "./types";
import WidgetRenderer from "./widgets";

/**
 * Renders an array of widgets into a 4-column CSS grid. Each widget's
 * `layout` (col, row, w, h) controls placement directly. `compact` mode
 * shrinks the row height for the in-modal preview.
 */
export default function DashboardGrid({
  widgets,
  compact,
}: {
  widgets: Widget[];
  compact?: boolean;
}) {
  const rowHeight = compact ? 80 : 130;
  return (
    <div
      className="grid grid-cols-4 gap-3"
      style={{ gridAutoRows: `${rowHeight}px` }}
    >
      {widgets.map((w) => (
        <div
          key={w.id}
          style={{
            gridColumnStart: w.layout.col,
            gridColumnEnd: `span ${Math.min(w.layout.w, 4)}`,
            gridRowStart: w.layout.row,
            gridRowEnd: `span ${w.layout.h}`,
          }}
        >
          <WidgetRenderer widget={w} />
        </div>
      ))}
    </div>
  );
}
