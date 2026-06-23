/**
 * Generative dashboards — types. The LLM emits JSON conforming to
 * `Dashboard`; the renderer maps `kind` to a vetted React widget. All
 * `source` references must match an id from the data-source catalog.
 */

export type WidgetKind =
  | "kpi"
  | "line-chart"
  | "bar-chart"
  | "table"
  | "info"
  | "patient-card"
  | "patient-lab-trend";

export interface LayoutCell {
  /** Column start (1-indexed in a 4-col grid). */
  col: number;
  /** Row start. */
  row: number;
  /** Width in columns (1–4). */
  w: number;
  /** Height in rows. */
  h: number;
}

export interface Widget {
  id: string;
  kind: WidgetKind;
  title: string;
  /** ID of the data source query. Must be in DATA_SOURCES. */
  source: string;
  /** Dimension to group by, if applicable. */
  groupBy?: string;
  /** Measure to aggregate, if applicable. */
  metric?: string;
  /** Filters applied to the data source. */
  filters?: Record<string, string | number | boolean>;
  /** For info widgets: the body text to render. */
  message?: string;
  /** Widget-specific render props (e.g. format hints). */
  props?: Record<string, unknown>;
  layout: LayoutCell;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  /** Original natural-language prompt that produced this. */
  prompt?: string;
  /** Audit: when the AI generated it. */
  generatedAt?: string;
  /** Audit: which model. */
  model?: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
}

/** Output shapes a data source can produce — drives kind↔source compatibility. */
export type WidgetOutput = "kpi" | "points" | "rows";

/** What the data-source catalog exposes to the model. */
export interface DataSourceDef {
  id: string;
  description: string;
  dimensions: string[];
  measures: string[];
  /** Which widget output shapes this source can produce. Single source of
   *  truth for kind↔source compatibility — the validator + system prompt
   *  derive their rules from this field. */
  outputs: WidgetOutput[];
  filterOptions?: Record<string, string[]>;
}

/** What a data-source query returns at runtime. */
export interface DataSourceResult {
  /** For KPI: a single primary value (and optional comparison). */
  kpi?: { value: number; previous?: number; format?: "number" | "minutes" | "percent" | "currency"; unit?: string };
  /** For categorical / time series: array of points. */
  points?: Array<{ label: string; value: number; x?: string | number; series?: string }>;
  /** For tables: rows + column spec. */
  rows?: Array<Record<string, string | number>>;
  columns?: Array<{ key: string; label: string }>;
}
