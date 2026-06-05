import { Fragment } from "react";
import { motion } from "framer-motion";
import {
  IconBell,
  IconCalendarPlus,
  IconNote,
  IconSparkles,
  IconCalendar,
  IconCircleDot,
  IconHandClick,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import {
  EVENT_LABELS,
  STEP_LABELS,
  type Step,
  type StepType,
  type Trigger,
} from "./types";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STEP_ICONS: Record<StepType, typeof IconBell> = {
  notify: IconBell,
  "create-appointment": IconCalendarPlus,
  "draft-soap": IconNote,
  "ai-summarize": IconSparkles,
};

const TRIGGER_ICONS = {
  manual: IconHandClick,
  schedule: IconCalendar,
  event: IconCircleDot,
};

export interface PipelineFlowProps {
  trigger: Trigger;
  steps: Step[];
  mode?: "compact" | "full";
  selectedStepId?: string | null;
  onSelectStep?: (id: string) => void;
  onInsertSlot?: (atIndex: number) => void;
  onRemoveStep?: (id: string) => void;
}

/**
 * Horizontal n8n-style flow visualization. Trigger sits on the left, steps
 * flow right with curved connector lines between them. Compact mode is used
 * inside list rows (icon + label); full mode is the primary view in the
 * Builder (cards with config snippet, click to select for editing).
 */
export default function PipelineFlow({
  trigger,
  steps,
  mode = "compact",
  selectedStepId,
  onSelectStep,
  onInsertSlot,
  onRemoveStep,
}: PipelineFlowProps) {
  const editable = !!onInsertSlot;
  const gap = mode === "compact" ? "gap-1" : "gap-2";
  return (
    <div
      className={[
        "flex flex-row items-center overflow-x-auto py-1",
        gap,
        "[&::-webkit-scrollbar]:hidden [scrollbar-width:none]",
      ].join(" ")}
    >
      <TriggerNode trigger={trigger} mode={mode} />

      {steps.length > 0 && <Connector mode={mode} />}
      {editable && steps.length === 0 && (
        <>
          <Connector mode={mode} dashed />
          <InsertSlot onClick={() => onInsertSlot?.(0)} mode={mode} />
        </>
      )}

      {steps.map((step, i) => (
        <Fragment key={step.id}>
          <StepNode
            step={step}
            index={i + 1}
            mode={mode}
            selected={selectedStepId === step.id}
            onClick={onSelectStep ? () => onSelectStep(step.id) : undefined}
            onRemove={onRemoveStep ? () => onRemoveStep(step.id) : undefined}
          />
          {editable && (
            <>
              <Connector mode={mode} dashed />
              <InsertSlot
                onClick={() => onInsertSlot?.(i + 1)}
                mode={mode}
              />
            </>
          )}
          {!editable && i < steps.length - 1 && <Connector mode={mode} />}
        </Fragment>
      ))}
    </div>
  );
}

function TriggerNode({
  trigger,
  mode,
}: {
  trigger: Trigger;
  mode: "compact" | "full";
}) {
  const Icon = TRIGGER_ICONS[trigger.type];
  const label =
    trigger.type === "manual"
      ? "Manual"
      : trigger.type === "schedule"
        ? trigger.label
        : EVENT_LABELS[trigger.event];

  if (mode === "compact") {
    return (
      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--theme-primary-soft)] px-2.5 py-1 text-[length:var(--theme-text-xs)] font-medium text-[var(--theme-primary)]">
        <Icon className="h-3.5 w-3.5" stroke={1.75} />
        <span className="truncate max-w-[120px]">{label}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: EASE_TV }}
      className="flex w-[220px] shrink-0 flex-col gap-2 rounded-[var(--theme-radius-box)] border-2 border-[var(--theme-primary)]/40 bg-[var(--theme-primary)]/8 p-3"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--theme-primary)] text-white">
          <Icon className="h-4 w-4" stroke={2} />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-primary)]">
          Trigger
        </span>
      </div>
      <p className="line-clamp-2 text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">
        {label}
      </p>
    </motion.div>
  );
}

interface StepNodeProps {
  step: Step;
  index: number;
  mode: "compact" | "full";
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

function StepNode({ step, index, mode, selected, onClick, onRemove }: StepNodeProps) {
  const Icon = STEP_ICONS[step.type];
  const summary = describeStep(step);

  if (mode === "compact") {
    return (
      <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-2.5 py-1 text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/80">
        <Icon className="h-3.5 w-3.5 text-[var(--theme-primary)]" stroke={1.75} />
        <span className="truncate max-w-[140px]">{STEP_LABELS[step.type]}</span>
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: EASE_TV }}
      className={[
        "group relative flex w-[220px] shrink-0 cursor-pointer flex-col gap-2 rounded-[var(--theme-radius-box)] border-2 bg-[var(--theme-surface)] p-3 text-left transition-colors",
        selected
          ? "border-[var(--theme-primary)] shadow-[var(--theme-shadow-md)]"
          : "border-[var(--theme-neutral)]/15 hover:border-[var(--theme-neutral)]/30",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--theme-primary-soft)] text-[length:var(--theme-text-xs)] font-bold text-[var(--theme-primary)]">
          {index}
        </span>
        <Icon className="h-4 w-4 text-[var(--theme-primary)]" stroke={1.75} />
        <span className="text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">
          {STEP_LABELS[step.type]}
        </span>
        {onRemove && (
          <span
            role="button"
            tabIndex={0}
            aria-label="ลบขั้นตอน"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }
            }}
            className="ml-auto flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[var(--theme-neutral)]/40 opacity-0 transition group-hover:opacity-100 hover:bg-[var(--theme-error)]/10 hover:text-[var(--theme-error)]"
          >
            <IconTrash className="h-3.5 w-3.5" stroke={1.75} />
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
        {summary || "—"}
      </p>
    </motion.button>
  );
}

function Connector({
  mode,
  dashed,
}: {
  mode: "compact" | "full";
  dashed?: boolean;
}) {
  if (mode === "compact") {
    return (
      <span
        aria-hidden
        className={[
          "h-px shrink-0",
          dashed ? "border-t border-dashed border-[var(--theme-neutral)]/25" : "bg-[var(--theme-neutral)]/25",
          "w-3",
        ].join(" ")}
      />
    );
  }
  // Full mode: SVG curve from left edge to right edge of a 36px gap.
  return (
    <svg
      width="36"
      height="20"
      viewBox="0 0 36 20"
      className="shrink-0"
      aria-hidden
    >
      <defs>
        <marker
          id={`arrow-${dashed ? "d" : "s"}`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path
            d="M0 0 L10 5 L0 10 Z"
            fill="var(--theme-neutral)"
            opacity="0.35"
          />
        </marker>
      </defs>
      <path
        d="M 0 10 C 12 10, 24 10, 36 10"
        stroke="var(--theme-neutral)"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeDasharray={dashed ? "3 3" : undefined}
        fill="none"
        markerEnd={`url(#arrow-${dashed ? "d" : "s"})`}
      />
    </svg>
  );
}

function InsertSlot({
  onClick,
  mode,
}: {
  onClick: () => void;
  mode: "compact" | "full";
}) {
  if (mode === "compact") return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="เพิ่มขั้นตอน"
      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-[var(--theme-neutral)]/30 text-[var(--theme-neutral)]/55 transition hover:border-[var(--theme-primary)] hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]"
    >
      <IconPlus className="h-4 w-4" stroke={2} />
    </button>
  );
}

function describeStep(step: Step): string {
  switch (step.type) {
    case "notify":
      return `${step.channel.toUpperCase()} · ${step.message || "(ไม่มีข้อความ)"}`;
    case "create-appointment":
      return `${step.service} · +${step.offsetDays} วัน`;
    case "draft-soap":
      return step.template || "(ไม่มี template)";
    case "ai-summarize":
      return step.prompt || "(ไม่มี prompt)";
  }
}
