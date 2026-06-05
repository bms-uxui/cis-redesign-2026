import { useMemo } from "react";
import { motion } from "framer-motion";
import { IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import type { Widget } from "./types";
import { queryDataSource } from "./catalog";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Single entrypoint — picks the right widget component for a given Widget
 * spec. Each widget queries its data source via `queryDataSource` and
 * renders the result. All charts are inline SVG (no chart library).
 */
export default function WidgetRenderer({ widget }: { widget: Widget }) {
  const data = useMemo(
    () =>
      queryDataSource(widget.source, {
        groupBy: widget.groupBy,
        metric: widget.metric,
        filters: widget.filters,
      }),
    [widget.source, widget.groupBy, widget.metric, widget.filters],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE_TV }}
      className="flex h-full w-full flex-col gap-2 rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] p-4"
    >
      <p className="text-[length:var(--theme-text-xs)] font-semibold uppercase tracking-[0.06em] text-[var(--theme-neutral)]/55">
        {widget.title}
      </p>
      <div className="flex flex-1 flex-col">
        {widget.kind === "kpi" && <Kpi data={data} />}
        {widget.kind === "line-chart" && <LineChart data={data} />}
        {widget.kind === "bar-chart" && <BarChart data={data} />}
        {widget.kind === "table" && <Table data={data} />}
      </div>
    </motion.div>
  );
}

// ── KPI ─────────────────────────────────────────────────────────────────────
function Kpi({ data }: { data: ReturnType<typeof queryDataSource> }) {
  const k = data.kpi;
  if (!k) return <Empty />;
  const delta = k.previous !== undefined ? k.value - k.previous : null;
  const pct =
    k.previous && k.previous !== 0 ? (delta! / k.previous) * 100 : null;
  return (
    <div className="flex h-full flex-col justify-center gap-1">
      <p className="text-[length:var(--theme-text-2xl)] font-bold text-[var(--theme-neutral)]">
        {formatValue(k.value, k.format)}
        {k.unit && (
          <span className="ml-1 text-[length:var(--theme-text-sm)] font-normal text-[var(--theme-neutral)]/55">
            {k.unit}
          </span>
        )}
      </p>
      {delta !== null && pct !== null && (
        <p
          className={[
            "flex items-center gap-1 text-[length:var(--theme-text-xs)] font-medium",
            delta > 0 ? "text-[var(--theme-success)]" : "text-[var(--theme-error)]",
          ].join(" ")}
        >
          {delta > 0 ? (
            <IconArrowUp className="h-3 w-3" stroke={2} />
          ) : (
            <IconArrowDown className="h-3 w-3" stroke={2} />
          )}
          {Math.abs(pct).toFixed(1)}% เทียบช่วงก่อน
        </p>
      )}
    </div>
  );
}

// ── Line chart ──────────────────────────────────────────────────────────────
function LineChart({ data }: { data: ReturnType<typeof queryDataSource> }) {
  const pts = data.points ?? [];
  if (pts.length === 0) return <Empty />;
  const values = pts.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 100;
  const H = 50;
  const stepX = pts.length > 1 ? W / (pts.length - 1) : 0;
  const path = pts
    .map((p, i) => {
      const x = i * stepX;
      const y = H - ((p.value - min) / range) * H;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const area = path + ` L ${(pts.length - 1) * stepX} ${H} L 0 ${H} Z`;
  return (
    <div className="flex h-full flex-col gap-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lc-fill)" />
        <path
          d={path}
          stroke="var(--theme-primary)"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-[var(--theme-neutral)]/45">
        <span>{pts[0]?.label}</span>
        <span>{pts[pts.length - 1]?.label}</span>
      </div>
    </div>
  );
}

// ── Bar chart ───────────────────────────────────────────────────────────────
function BarChart({ data }: { data: ReturnType<typeof queryDataSource> }) {
  const pts = data.points ?? [];
  if (pts.length === 0) return <Empty />;
  const max = Math.max(...pts.map((p) => p.value));
  return (
    <div className="flex h-full flex-col justify-end gap-1.5">
      {pts.map((p, i) => {
        const widthPct = (p.value / max) * 100;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-20 shrink-0 truncate text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/70">
              {p.label}
            </span>
            <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-[var(--theme-primary-soft)]/40">
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: EASE_TV }}
                className="absolute left-0 top-0 h-full rounded-full bg-[var(--theme-primary)]"
              />
            </div>
            <span className="w-10 shrink-0 text-right text-[length:var(--theme-text-xs)] font-medium tabular-nums text-[var(--theme-neutral)]">
              {p.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Table ───────────────────────────────────────────────────────────────────
function Table({ data }: { data: ReturnType<typeof queryDataSource> }) {
  const rows = data.rows ?? [];
  const cols = data.columns ?? [];
  if (rows.length === 0 || cols.length === 0) return <Empty />;
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full text-left text-[length:var(--theme-text-sm)]">
        <thead>
          <tr className="border-b border-[var(--theme-neutral)]/10 text-[length:var(--theme-text-xs)] uppercase tracking-[0.05em] text-[var(--theme-neutral)]/55">
            {cols.map((c) => (
              <th key={c.key} className="px-2 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-[var(--theme-neutral)]/5 last:border-0 hover:bg-[var(--theme-primary-soft)]/40"
            >
              {cols.map((c) => (
                <td
                  key={c.key}
                  className="px-2 py-2 text-[var(--theme-neutral)]/85"
                >
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return (
    <p className="flex h-full items-center justify-center text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/40">
      ไม่มีข้อมูล
    </p>
  );
}

function formatValue(v: number, format?: "number" | "minutes" | "percent" | "currency"): string {
  if (format === "percent") return `${v.toFixed(1)}%`;
  if (format === "currency") return v.toLocaleString();
  if (format === "minutes") return `${v}`;
  return v.toLocaleString();
}
