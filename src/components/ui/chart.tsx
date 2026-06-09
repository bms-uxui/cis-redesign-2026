/**
 * shadcn/ui Chart primitives — adapted from
 * https://ui.shadcn.com/docs/components/chart. Provides a typed
 * `ChartContainer` that maps named series → CSS variables → recharts
 * colors, plus a custom `ChartTooltipContent` styled like shadcn.
 *
 * Color resolution: each entry in `ChartConfig` has `color` (a CSS value
 * like `var(--theme-primary)`); ChartContainer emits inline CSS variables
 * `--color-<key>` for each, which recharts series reference as
 * `stroke="var(--color-foo)"`.
 */
import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "../../lib/utils";

// ── Config ────────────────────────────────────────────────────────────────

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

type ChartContextValue = { config: ChartConfig };

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within a <ChartContainer>");
  return ctx;
}

// ── ChartContainer ────────────────────────────────────────────────────────

interface ChartContainerProps extends React.ComponentProps<"div"> {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;
    return (
      <ChartContext.Provider value={{ config }}>
        <div
          ref={ref}
          data-chart={chartId}
          className={cn(
            "flex aspect-video justify-center text-[length:var(--theme-text-xs)] [&_.recharts-cartesian-axis-tick_text]:fill-[var(--theme-neutral)]/55 [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-[var(--theme-neutral)]/10 [&_.recharts-tooltip-cursor]:stroke-[var(--theme-neutral)]/20 [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
            className,
          )}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  },
);
ChartContainer.displayName = "ChartContainer";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorEntries = Object.entries(config).filter(([, v]) => v.color);
  if (colorEntries.length === 0) return null;
  const css = `[data-chart=${id}] {\n${colorEntries
    .map(([k, v]) => `  --color-${k}: ${v.color};`)
    .join("\n")}\n}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

// ── Tooltip ───────────────────────────────────────────────────────────────

const ChartTooltip = RechartsPrimitive.Tooltip;

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    dataKey?: string;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  className?: string;
  labelFormatter?: (label: string) => React.ReactNode;
  formatter?: (value: number | string, name: string) => React.ReactNode;
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      label,
      hideLabel,
      hideIndicator,
      indicator = "dot",
      className,
      labelFormatter,
      formatter,
    },
    ref,
  ) => {
    const { config } = useChart();
    if (!active || !payload?.length) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-2.5 py-1.5 text-[length:var(--theme-text-xs)] shadow-[var(--theme-shadow-md)]",
          className,
        )}
      >
        {!hideLabel && label && (
          <div className="font-medium text-[var(--theme-neutral)]">
            {labelFormatter ? labelFormatter(label) : label}
          </div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, i) => {
            const key = item.dataKey ?? item.name ?? "value";
            const itemConfig = config[key];
            const seriesColor = item.color ?? itemConfig?.color;
            const display =
              itemConfig?.label ??
              (typeof item.name === "string" ? item.name : key);
            return (
              <div
                key={i}
                className="flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5"
              >
                {!hideIndicator && (
                  <span
                    className={cn(
                      "shrink-0 rounded-[2px]",
                      indicator === "dot" && "h-2.5 w-2.5",
                      indicator === "line" && "h-0.5 w-3 self-center",
                      indicator === "dashed" && "h-0.5 w-3 self-center border border-dashed",
                    )}
                    style={
                      indicator === "dashed"
                        ? { borderColor: seriesColor, background: "transparent" }
                        : { background: seriesColor }
                    }
                  />
                )}
                <div className="flex flex-1 justify-between gap-2 leading-none">
                  <span className="text-[var(--theme-neutral)]/70">{display}</span>
                  {item.value !== undefined && (
                    <span className="font-mono font-medium tabular-nums text-[var(--theme-neutral)]">
                      {formatter
                        ? formatter(item.value, key)
                        : typeof item.value === "number"
                          ? item.value.toLocaleString()
                          : String(item.value)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent };
