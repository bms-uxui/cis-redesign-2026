/**
 * Widget renderers — shadcn/ui primitives on top of Recharts.
 *
 * Each `WidgetKind` maps to a small component below. Frames use shadcn
 * `Card`; charts use `ChartContainer` + Recharts series; table uses
 * shadcn `Table`. Colors come from `var(--theme-*)` via `ChartConfig` —
 * no parallel shadcn `--chart-N` variables.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import type { Widget } from "./types";
import { queryDataSource } from "./catalog";
import PatientProfileCard from "../PatientProfileCard";
import LabTrendCard from "../LabTrendCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

const CHART_CONFIG: ChartConfig = {
  value: { label: "ค่า", color: "var(--theme-primary)" },
};

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

  // Generative-UI cards are self-contained (own chrome + self-fetch by HN), so
  // they render full-bleed without the outer KPI/chart card wrapper.
  if (widget.kind === "patient-card" || widget.kind === "patient-lab-trend") {
    const hn = String(widget.props?.hn ?? "");
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: EASE_TV }}
        className="h-full w-full overflow-auto"
      >
        {widget.kind === "patient-card" ? (
          <PatientProfileCard hn={hn} />
        ) : (
          <LabTrendCard hn={hn} />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE_TV }}
      className="h-full w-full"
    >
      <Card className="flex h-full w-full flex-col overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-[length:var(--theme-text-xs)] font-semibold uppercase tracking-[0.06em] text-[var(--theme-neutral)]/55">
            {widget.title}
          </CardTitle>
        </CardHeader>
        {/* `min-h-0` is critical — flex items default to min-height:auto which
            lets them grow past the parent and breaks `overflow-auto` on
            scrolling children like the table widget. */}
        <CardContent className="flex min-h-0 flex-1 flex-col p-4 pt-0">
          {widget.kind === "kpi" && <Kpi data={data} />}
          {widget.kind === "line-chart" && <LineChartW data={data} />}
          {widget.kind === "bar-chart" && <BarChartW data={data} />}
          {widget.kind === "table" && <TableW data={data} />}
          {widget.kind === "info" && <Info message={widget.message} />}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── KPI ─────────────────────────────────────────────────────────────────────
function Kpi({ data }: { data: ReturnType<typeof queryDataSource> }) {
  const k = data.kpi;
  if (!k) return <Empty />;
  const delta = k.previous !== undefined ? k.value - k.previous : null;
  const pct = k.previous && k.previous !== 0 ? (delta! / k.previous) * 100 : null;
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

// ── Line chart (Recharts AreaChart) ──────────────────────────────────────
function LineChartW({ data }: { data: ReturnType<typeof queryDataSource> }) {
  const pts = data.points ?? [];
  if (pts.length === 0) return <Empty />;
  const rows = pts.map((p) => ({ label: p.label, value: p.value }));
  return (
    <ChartContainer config={CHART_CONFIG} className="h-full w-full aspect-auto">
      <AreaChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          minTickGap={24}
        />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />
        <Area
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          fill="url(#lc-fill)"
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

// ── Bar chart (Recharts) ──────────────────────────────────────────────────
function BarChartW({ data }: { data: ReturnType<typeof queryDataSource> }) {
  const pts = data.points ?? [];
  if (pts.length === 0) return <Empty />;
  const rows = pts.map((p) => ({ label: p.label, value: p.value }));
  return (
    <ChartContainer config={CHART_CONFIG} className="h-full w-full aspect-auto">
      <RechartsBarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={88}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
      </RechartsBarChart>
    </ChartContainer>
  );
}

// ── Table (shadcn Table) ─────────────────────────────────────────────────
function TableW({ data }: { data: ReturnType<typeof queryDataSource> }) {
  const rows = data.rows ?? [];
  const cols = data.columns ?? [];
  if (rows.length === 0 || cols.length === 0) return <Empty />;
  return (
    <div className="-mx-2 max-h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((c) => (
              <TableHead key={c.key}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {cols.map((c) => (
                <TableCell key={c.key} className="text-[var(--theme-neutral)]/85">
                  {r[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Info({ message }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center px-2">
      <p className="whitespace-pre-line text-center text-[length:var(--theme-text-sm)] leading-relaxed text-[var(--theme-neutral)]/75">
        {message ?? "ไม่มีข้อมูลสำหรับคำขอนี้ในแคตตาล็อก"}
      </p>
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
