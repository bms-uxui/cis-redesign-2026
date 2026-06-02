import { useMemo, useState, type ReactNode } from "react";
import { Button, Input, Textarea } from "@heroui/react";
import {
  IconCopy,
  IconNotes,
  IconPencil,
  IconSparkles,
  IconTrash,
  IconQuote,
  IconActivity,
  IconAlertTriangle,
  IconCalendarEvent,
  IconChartBar,
  IconClipboardList,
  IconHeartbeat,
  IconPill,
  IconStethoscope,
  IconUser,
  IconUsers,
  IconTestPipe,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconBuildingHospital,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import type {
  A2UIActionEvent,
  A2UICiteEvent,
  A2UINode,
  A2UINodeId,
  A2UIPaletteTone,
  A2UIResponse,
} from "../../services/a2ui/types";

// ---------------------------------------------------------------------------
// Gallery tokens — palettes and icon map shared by image-tile, stat-card,
// action-card, chip-group, metric-grid, avatar.

const PALETTE: Record<
  A2UIPaletteTone,
  { from: string; to: string; ring: string; chipBg: string; chipText: string; iconBg: string; iconText: string }
> = {
  default: {
    from: "#f4f4f5",
    to: "#e4e4e7",
    ring: "rgba(0,0,0,0.06)",
    chipBg: "rgba(0,0,0,0.06)",
    chipText: "#1f2937",
    iconBg: "rgba(0,0,0,0.04)",
    iconText: "#1f2937",
  },
  blue: {
    from: "#3485ff",
    to: "#6aa3ff",
    ring: "rgba(52,133,255,0.32)",
    chipBg: "rgba(52,133,255,0.12)",
    chipText: "#1e6fe6",
    iconBg: "rgba(52,133,255,0.18)",
    iconText: "#1e6fe6",
  },
  violet: {
    from: "#6a4cff",
    to: "#a288ff",
    ring: "rgba(106,76,255,0.32)",
    chipBg: "rgba(106,76,255,0.12)",
    chipText: "#5740d6",
    iconBg: "rgba(106,76,255,0.18)",
    iconText: "#5740d6",
  },
  emerald: {
    from: "#10a37f",
    to: "#3ad19f",
    ring: "rgba(16,163,127,0.32)",
    chipBg: "rgba(16,163,127,0.14)",
    chipText: "#0a7a5e",
    iconBg: "rgba(16,163,127,0.18)",
    iconText: "#0a7a5e",
  },
  amber: {
    from: "#ea7c1c",
    to: "#ffaa5a",
    ring: "rgba(234,124,28,0.3)",
    chipBg: "rgba(234,124,28,0.14)",
    chipText: "#c66a13",
    iconBg: "rgba(234,124,28,0.18)",
    iconText: "#c66a13",
  },
  rose: {
    from: "#e0245e",
    to: "#ff5a8a",
    ring: "rgba(224,36,94,0.32)",
    chipBg: "rgba(224,36,94,0.14)",
    chipText: "#c8262a",
    iconBg: "rgba(224,36,94,0.18)",
    iconText: "#c8262a",
  },
  indigo: {
    from: "#4f46e5",
    to: "#a5b4fc",
    ring: "rgba(79,70,229,0.32)",
    chipBg: "rgba(79,70,229,0.14)",
    chipText: "#3730a3",
    iconBg: "rgba(79,70,229,0.18)",
    iconText: "#3730a3",
  },
  teal: {
    from: "#0d9488",
    to: "#5eead4",
    ring: "rgba(13,148,136,0.32)",
    chipBg: "rgba(13,148,136,0.14)",
    chipText: "#0f766e",
    iconBg: "rgba(13,148,136,0.18)",
    iconText: "#0f766e",
  },
  slate: {
    from: "#475569",
    to: "#94a3b8",
    ring: "rgba(71,85,105,0.3)",
    chipBg: "rgba(71,85,105,0.14)",
    chipText: "#334155",
    iconBg: "rgba(71,85,105,0.18)",
    iconText: "#334155",
  },
};

const ICON_BY_HINT: Record<string, TablerIcon> = {
  patient: IconUser,
  patients: IconUsers,
  doctor: IconStethoscope,
  vitals: IconHeartbeat,
  lab: IconTestPipe,
  pill: IconPill,
  pharmacy: IconPill,
  calendar: IconCalendarEvent,
  appointments: IconCalendarEvent,
  chart: IconChartBar,
  report: IconClipboardList,
  alert: IconAlertTriangle,
  activity: IconActivity,
  hospital: IconBuildingHospital,
  sparkles: IconSparkles,
};

function getHintIcon(hint?: string): TablerIcon | null {
  if (!hint) return null;
  return ICON_BY_HINT[hint] ?? null;
}

export type A2UITheme = "light" | "dark";

interface A2UIRendererProps {
  response: A2UIResponse;
  onAction?: (event: A2UIActionEvent) => void;
  onCite?: (event: A2UICiteEvent) => void;
  className?: string;
  theme?: A2UITheme;
}

export default function A2UIRenderer({
  response,
  onAction,
  onCite,
  className,
  theme = "light",
}: A2UIRendererProps) {
  const [data, setData] = useState<Record<string, string>>(() => ({
    ...(response.data ?? {}),
  }));

  const byId = useMemo(() => {
    const map = new Map<A2UINodeId, A2UINode>();
    for (const c of response.components) map.set(c.id, c);
    return map;
  }, [response]);

  const handleFieldChange = (binding: string, value: string) =>
    setData((d) => ({ ...d, [binding]: value }));

  const handleButton = (action: string, source: A2UINodeId) =>
    onAction?.({ action, source, data });

  const handleCite = (segmentIndex: number) => onCite?.({ segmentIndex });

  return (
    <div className={className}>
      {renderNode(response.rootId, byId, data, theme, handleFieldChange, handleButton, handleCite)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tokens — kept in one place so the two themes stay in sync visually.

const TOKENS: Record<
  A2UITheme,
  {
    section: string;
    sectionAccent: string;
    sectionLabel: string;
    heading: (level: 1 | 2 | 3) => string;
    text: Record<"default" | "muted" | "danger" | "success", string>;
    fieldClassNames: {
      inputWrapper: string;
      label: string;
      input: string;
    };
    citation: string;
    citationIcon: string;
    citationIndex: string;
    badge: Record<string, string>;
    buttonClass: (variant: "primary" | "ghost" | "danger") => string;
  }
> = {
  light: {
    section:
      "rounded-[32px] border border-black/5 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]",
    sectionAccent:
      "rounded-[32px] border border-[#3485ff]/15 bg-[#3485ff]/[0.04] p-4 shadow-[0_2px_8px_rgba(52,133,255,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]",
    sectionLabel:
      "mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#3485ff]",
    heading: (level) =>
      level === 1
        ? "text-[18px] font-semibold text-gray-900"
        : level === 2
          ? "text-[15px] font-semibold text-gray-900"
          : "text-[12px] font-semibold uppercase tracking-wider text-gray-500",
    text: {
      default: "text-[14px] leading-relaxed text-gray-800",
      muted: "text-[14px] leading-relaxed text-gray-500",
      danger: "text-[14px] leading-relaxed text-[#ff383c]",
      success: "text-[14px] leading-relaxed text-emerald-600",
    },
    fieldClassNames: {
      inputWrapper:
        "bg-white border border-black/[0.06] shadow-[0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] data-[hover=true]:bg-white data-[focus=true]:border-[#3485ff]/40",
      label: "text-gray-600 text-[12px] font-medium",
      input: "text-gray-900",
    },
    citation:
      "group inline-flex max-w-full items-start gap-2 rounded-lg border border-[#3485ff]/15 bg-[#3485ff]/[0.04] px-2 py-1 text-left text-[11px] text-gray-600 transition hover:bg-[#3485ff]/[0.08]",
    citationIcon: "mt-0.5 h-3 w-3 shrink-0 text-[#3485ff]",
    citationIndex: "font-semibold text-[#3485ff]",
    badge: {
      blue: "bg-[#3485ff]/12 text-[#1e6fe6] border-[#3485ff]/25",
      orange: "bg-[#ff9a3c]/15 text-[#c66a13] border-[#ff9a3c]/30",
      red: "bg-[#ff383c]/12 text-[#c8262a] border-[#ff383c]/25",
      green: "bg-emerald-500/12 text-emerald-700 border-emerald-500/25",
      gray: "bg-gray-100 text-gray-600 border-gray-200",
    },
    buttonClass: (variant) =>
      variant === "primary"
        ? "bg-[#3485ff] text-white shadow-[0_6px_16px_rgba(52,133,255,0.28),inset_0_1px_0_rgba(255,255,255,0.25)] data-[hover=true]:bg-[#1e6fe6]"
        : variant === "danger"
          ? "bg-[#ff383c]/8 text-[#c8262a] border border-[#ff383c]/25 data-[hover=true]:bg-[#ff383c]/14"
          : "bg-gray-100 text-gray-800 border border-black/[0.06] data-[hover=true]:bg-gray-200",
  },
  dark: {
    section: "rounded-[32px] border border-white/10 bg-white/[0.04] p-5",
    sectionAccent: "rounded-[32px] border border-violet-300/15 bg-white/[0.03] p-4",
    sectionLabel:
      "mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-violet-200/90",
    heading: (level) =>
      level === 1
        ? "text-[18px] font-semibold text-white"
        : level === 2
          ? "text-[15px] font-semibold text-white"
          : "text-[13px] font-medium uppercase tracking-wider text-white/70",
    text: {
      default: "text-[14px] leading-relaxed text-white/90",
      muted: "text-[14px] leading-relaxed text-white/60",
      danger: "text-[14px] leading-relaxed text-red-300",
      success: "text-[14px] leading-relaxed text-emerald-300",
    },
    fieldClassNames: {
      inputWrapper:
        "bg-white/[0.06] border-white/10 data-[hover=true]:bg-white/[0.09]",
      label: "text-white/70",
      input: "text-white",
    },
    citation:
      "group inline-flex max-w-full items-start gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1 text-left text-[11px] text-white/60 transition hover:bg-white/[0.08]",
    citationIcon: "mt-0.5 h-3 w-3 shrink-0 text-violet-300/80",
    citationIndex: "font-semibold text-violet-300/90",
    badge: {
      blue: "bg-[#3485ff]/20 text-[#9cc1ff] border-[#3485ff]/40",
      orange: "bg-[#ff9a3c]/20 text-[#ffd6a8] border-[#ff9a3c]/40",
      red: "bg-[#ff383c]/20 text-[#ffaaad] border-[#ff383c]/40",
      green: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
      gray: "bg-white/10 text-white/70 border-white/15",
    },
    buttonClass: (variant) =>
      variant === "primary"
        ? "bg-gradient-to-r from-[#6a4cff] to-[#3485ff] text-white shadow-[0_8px_24px_rgba(106,76,255,0.35)]"
        : variant === "danger"
          ? "bg-[#ff383c]/15 text-[#ffaaad] border border-[#ff383c]/30"
          : "bg-white/10 text-white border border-white/10 data-[hover=true]:bg-white/15",
  },
};

function renderNode(
  id: A2UINodeId,
  byId: Map<A2UINodeId, A2UINode>,
  data: Record<string, string>,
  theme: A2UITheme,
  onField: (binding: string, value: string) => void,
  onButton: (action: string, source: A2UINodeId) => void,
  onCite: (segmentIndex: number) => void,
): ReactNode {
  const node = byId.get(id);
  if (!node) return null;
  const t = TOKENS[theme];

  switch (node.type) {
    case "section":
      return (
        <div key={id} className={node.tone === "accent" ? t.sectionAccent : t.section}>
          {node.title && (
            <div className={t.sectionLabel}>
              <IconSparkles className="h-4 w-4" />
              {node.title}
            </div>
          )}
          <div
            className="gap-3"
            style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
          >
            {node.children.map((cid) => {
              const child = byId[cid];
              const isShortField =
                child?.type === "field" &&
                !(child as { multiline?: boolean }).multiline;
              return (
                <div
                key={cid}
                style={isShortField ? undefined : { gridColumn: "1 / -1" }}
              >
                  {renderNode(cid, byId, data, theme, onField, onButton, onCite)}
                </div>
              );
            })}
          </div>
        </div>
      );

    case "stack":
      // Desktop/tablet-oriented form layout: single-line fields auto-flow
      // into a 2-column grid; everything else (multiline fields, buttons,
      // headings, sections, citations, chip groups…) spans the full width.
      // This keeps simple inputs side-by-side without breaking the layout of
      // rich content surfaces (SOAP/ICD cards stay readable).
      return (
        <div
          key={id}
          className="gap-3"
          style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
        >
          {node.children.map((cid) => {
            const child = byId[cid];
            const isShortField =
              child?.type === "field" && !(child as { multiline?: boolean }).multiline;
            return (
              <div
                key={cid}
                style={isShortField ? undefined : { gridColumn: "1 / -1" }}
              >
                {renderNode(cid, byId, data, theme, onField, onButton, onCite)}
              </div>
            );
          })}
        </div>
      );

    case "row":
      return (
        <div key={id} className="flex flex-wrap items-center gap-2">
          {node.children.map((cid) =>
            renderNode(cid, byId, data, theme, onField, onButton, onCite),
          )}
        </div>
      );

    case "heading":
      return (
        <div key={id} className={t.heading(node.level ?? 2)}>
          {node.text}
        </div>
      );

    case "text":
      return (
        <div key={id} className={t.text[node.tone ?? "default"]}>
          {node.value}
        </div>
      );

    case "field": {
      const value = data[node.binding] ?? "";
      // Mental Model + Common Region: visually mark fields the AI actually
      // populated so the clinician can tell suggestions from blanks at a glance.
      const isAiFilled = !!value.trim() && value.trim() !== "—";
      const labelWithMarker = isAiFilled ? `✦ ${node.label}` : node.label;
      const common = {
        label: labelWithMarker,
        value,
        onValueChange: (v: string) => onField(node.binding, v),
        placeholder: node.placeholder,
        isRequired: node.required,
        size: "md" as const,
        variant: "flat" as const,
        radius: "lg" as const,
        classNames: t.fieldClassNames,
      };
      return node.multiline ? (
        <Textarea key={id} {...common} minRows={2} />
      ) : (
        <Input key={id} {...common} />
      );
    }

    case "badge": {
      const cls = t.badge[node.color ?? "gray"] ?? t.badge.gray;
      return (
        <span
          key={id}
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}
        >
          {node.label}
        </span>
      );
    }

    case "button": {
      const Icon =
        node.iconHint === "insert"
          ? IconNotes
          : node.iconHint === "copy"
            ? IconCopy
            : node.iconHint === "discard"
              ? IconTrash
              : node.iconHint === "edit"
                ? IconPencil
                : node.iconHint === "sparkles"
                  ? IconSparkles
                  : null;
      return (
        <Button
          key={id}
          type="button"
          size="md"
          radius="lg"
          onPress={() => onButton(node.action, node.id)}
          className={t.buttonClass(node.variant ?? "ghost")}
          startContent={Icon ? <Icon className="h-4 w-4" /> : undefined}
        >
          {node.label}
        </Button>
      );
    }

    case "list":
      return node.ordered ? (
        <ol
          key={id}
          className={`ml-5 list-decimal space-y-1 text-[14px] ${theme === "light" ? "text-gray-800" : "text-white/85"}`}
        >
          {node.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      ) : (
        <ul
          key={id}
          className={`ml-5 list-disc space-y-1 text-[14px] ${theme === "light" ? "text-gray-800" : "text-white/85"}`}
        >
          {node.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );

    case "citation":
      return (
        <button
          key={id}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCite(node.segmentIndex);
          }}
          className={t.citation}
          title={`อ้างอิงประโยคที่ ${node.segmentIndex + 1}`}
        >
          <IconQuote className={t.citationIcon} />
          <span className="truncate">
            <span className={t.citationIndex}>#{node.segmentIndex + 1}</span>{" "}
            {node.preview}
          </span>
        </button>
      );

    // ----- Gallery blocks -------------------------------------------------

    case "image-tile": {
      const handle = () => {
        if (node.action) onButton(node.action, node.id);
      };
      return (
        <button
          key={id}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handle();
          }}
          className="group relative block aspect-square w-full overflow-hidden rounded-[24px] text-left shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-white/5 transition hover:-translate-y-1 hover:scale-[1.02]"
        >
          <img
            src={node.img}
            alt={node.title}
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
            loading="lazy"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.78) 100%)",
            }}
          />
          {node.chip && (
            <span className="absolute top-4 left-4 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              {node.chip}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="line-clamp-3 text-[18px] font-semibold leading-snug text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
              {node.title}
            </p>
            {node.meta && (
              <p className="mt-1 text-[12px] text-white/80">{node.meta}</p>
            )}
          </div>
        </button>
      );
    }

    case "stat-card": {
      const p = PALETTE[node.tone ?? "blue"];
      const Icon = getHintIcon(node.iconHint) ?? IconActivity;
      const TrendIcon =
        node.trend === "up"
          ? IconTrendingUp
          : node.trend === "down"
            ? IconTrendingDown
            : node.trend === "flat"
              ? IconMinus
              : null;
      return (
        <div
          key={id}
          className="relative flex flex-col gap-3 overflow-hidden rounded-[24px] p-5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.2)]"
          style={{
            background: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)`,
          }}
        >
          <div className="flex items-start justify-between">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur"
              aria-hidden
            >
              <Icon className="h-6 w-6" stroke={1.8} />
            </span>
            {TrendIcon && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[11px] font-medium backdrop-blur">
                <TrendIcon className="h-3.5 w-3.5" stroke={2} />
                {node.trendLabel}
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="text-[36px] font-semibold leading-none tracking-tight">
              {node.value}
            </div>
            <div className="mt-2 text-[13px] font-medium text-white/90">
              {node.label}
            </div>
            {node.sublabel && (
              <div className="mt-0.5 text-[11px] text-white/70">{node.sublabel}</div>
            )}
          </div>
        </div>
      );
    }

    case "action-card": {
      const p = PALETTE[node.tone ?? "blue"];
      const Icon = getHintIcon(node.iconHint) ?? IconSparkles;
      return (
        <button
          key={id}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (node.action) onButton(node.action, node.id);
          }}
          className="relative flex items-center gap-4 overflow-hidden rounded-[24px] p-5 text-left text-white shadow-[0_8px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:-translate-y-0.5"
          style={{
            background: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)`,
          }}
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur">
            <Icon className="h-7 w-7" stroke={1.8} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[17px] font-semibold leading-tight">
              {node.title}
            </span>
            {node.caption && (
              <span className="mt-1 text-[12px] text-white/85">{node.caption}</span>
            )}
          </span>
        </button>
      );
    }

    case "chip-group":
      return (
        <div key={id} className="flex flex-wrap items-center gap-2">
          {node.chips.map((c, i) => {
            const p = PALETTE[c.tone ?? "default"];
            return (
              <span
                key={i}
                className="inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium"
                style={{
                  background: p.chipBg,
                  color: p.chipText,
                  borderColor: p.ring,
                }}
              >
                {c.label}
              </span>
            );
          })}
        </div>
      );

    case "info-row": {
      const RowIcon = getHintIcon(node.iconHint);
      const valueTone =
        node.tone === "danger"
          ? "text-[#c8262a]"
          : node.tone === "success"
            ? "text-emerald-700"
            : node.tone === "muted"
              ? "text-gray-500"
              : theme === "light"
                ? "text-gray-900"
                : "text-white";
      return (
        <div
          key={id}
          className={`flex items-center justify-between gap-3 py-1.5 ${theme === "light" ? "border-b border-black/[0.04]" : "border-b border-white/8"}`}
        >
          <span
            className={`inline-flex items-center gap-2 text-[12px] font-medium ${theme === "light" ? "text-gray-600" : "text-white/70"}`}
          >
            {RowIcon && <RowIcon className="h-3.5 w-3.5" stroke={1.8} />}
            {node.label}
          </span>
          <span className={`text-[14px] font-semibold ${valueTone}`}>{node.value}</span>
        </div>
      );
    }

    case "metric-grid": {
      const cols = node.columns ?? Math.min(4, Math.max(2, node.items.length));
      const colClass =
        cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4";
      return (
        <div key={id} className={`grid ${colClass} gap-3`}>
          {node.items.map((it, i) => {
            const p = PALETTE[it.tone ?? "default"];
            const MIcon = getHintIcon(it.iconHint);
            return (
              <div
                key={i}
                className={`flex flex-col gap-1.5 rounded-[16px] border p-3 ${theme === "light" ? "bg-white" : "bg-white/[0.04]"}`}
                style={{ borderColor: p.ring }}
              >
                <span className="flex items-center gap-1.5">
                  {MIcon && (
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-md"
                      style={{ background: p.iconBg, color: p.iconText }}
                    >
                      <MIcon className="h-3 w-3" stroke={2} />
                    </span>
                  )}
                  <span
                    className={`text-[11px] font-medium uppercase tracking-wider ${theme === "light" ? "text-gray-500" : "text-white/55"}`}
                  >
                    {it.label}
                  </span>
                </span>
                <span
                  className={`text-[18px] font-semibold leading-none ${theme === "light" ? "text-gray-900" : "text-white"}`}
                >
                  {it.value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    case "avatar": {
      const p = PALETTE[node.tone ?? "default"];
      const dim = node.size === "lg" ? "h-14 w-14 text-[18px]" : node.size === "sm" ? "h-8 w-8 text-[12px]" : "h-10 w-10 text-[14px]";
      const AvIcon = getHintIcon(node.iconHint);
      return (
        <span
          key={id}
          className="inline-flex items-center gap-2"
        >
          <span
            className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${dim}`}
            style={{
              background: p.iconBg,
              color: p.iconText,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4)`,
            }}
          >
            {node.img ? (
              <img src={node.img} alt={node.label ?? ""} className="h-full w-full object-cover" />
            ) : AvIcon ? (
              <AvIcon className="h-1/2 w-1/2" stroke={1.8} />
            ) : (
              node.initials ?? "?"
            )}
          </span>
          {node.label && (
            <span
              className={`text-[14px] font-medium ${theme === "light" ? "text-gray-900" : "text-white"}`}
            >
              {node.label}
            </span>
          )}
        </span>
      );
    }
  }
}
