import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPlus,
  IconTrash,
  IconBolt,
  IconChevronDown,
  IconCalendar,
  IconCircleDot,
  IconHandClick,
  IconBell,
  IconCalendarPlus,
  IconNote,
  IconSparkles,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";
import { useToast } from "../../contexts/ToastContext";
import {
  getPipeline,
  savePipeline,
  newPipeline,
  newStep,
} from "./store";
import {
  EVENT_LABELS,
  STEP_LABELS,
  STEP_DESCRIPTIONS,
  type EventName,
  type Pipeline,
  type Step,
  type StepType,
  type Trigger,
} from "./types";
import PipelineFlow from "./PipelineFlow";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STEP_ICONS: Record<StepType, typeof IconBell> = {
  notify: IconBell,
  "create-appointment": IconCalendarPlus,
  "draft-soap": IconNote,
  "ai-summarize": IconSparkles,
};

const EVENT_OPTIONS: EventName[] = [
  "patient.registered",
  "lab.result.received",
  "appointment.cancelled",
  "soap.saved",
];

const SCHEDULE_PRESETS = [
  { label: "ทุกวัน 08:00", cron: "0 8 * * *" },
  { label: "ทุกวัน 08:30", cron: "30 8 * * *" },
  { label: "ทุกชั่วโมงในเวลาทำการ", cron: "0 8-17 * * 1-5" },
  { label: "ทุกวันจันทร์ 09:00", cron: "0 9 * * 1" },
];

export default function AutomationBuilder() {
  const params = useParams();
  const { railHidden } = useSidebar();
  const { closeTab, activeId, openTab } = useTabs();
  const toast = useToast();
  const [pipeline, setPipeline] = useState<Pipeline>(() => newPipeline());

  // Load existing pipeline, or start fresh when route ends in /new.
  useEffect(() => {
    if (!params.id || params.id === "new") {
      setPipeline(newPipeline());
      return;
    }
    const found = getPipeline(params.id);
    if (found) setPipeline(found);
  }, [params.id]);

  const setTrigger = (t: Trigger) =>
    setPipeline((p) => ({ ...p, trigger: t }));

  const updateStep = (id: string, patch: Partial<Step>) =>
    setPipeline((p) => ({
      ...p,
      steps: p.steps.map((s) =>
        s.id === id ? ({ ...s, ...patch } as Step) : s,
      ),
    }));

  const removeStep = (id: string) =>
    setPipeline((p) => ({ ...p, steps: p.steps.filter((s) => s.id !== id) }));

  const insertStep = (atIndex: number, type: StepType) =>
    setPipeline((p) => {
      const next = [...p.steps];
      next.splice(atIndex, 0, newStep(type));
      return { ...p, steps: next };
    });

  const handleSave = () => {
    if (!pipeline.name.trim()) {
      toast.error("ตั้งชื่อ pipeline ก่อน");
      return;
    }
    if (pipeline.steps.length === 0) {
      toast.error("ต้องมีอย่างน้อย 1 ขั้นตอน");
      return;
    }
    savePipeline(pipeline);
    toast.success("บันทึก pipeline แล้ว", `${pipeline.steps.length} ขั้นตอน`);
    // Close this tab and reopen the list.
    if (activeId) closeTab(activeId);
    openTab("/automation", { title: "Automation" });
  };

  const handleCancel = () => {
    if (activeId) closeTab(activeId);
  };

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      <div className="h-16 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-6rem)] mr-4 mt-4 mb-4 overflow-hidden rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-4 lg:ml-[296px]",
        ].join(" ")}
      >
        <div className="mx-auto flex h-full w-full max-w-[760px] flex-col overflow-y-auto px-8 pb-8 pt-10 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {/* Back link */}
          <button
            type="button"
            onClick={handleCancel}
            className="mb-6 inline-flex w-fit cursor-pointer items-center gap-1.5 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55 transition hover:text-[var(--theme-neutral)]"
          >
            <IconArrowLeft className="h-4 w-4" stroke={1.75} />
            กลับไปยังรายการ Pipeline
          </button>

          {/* Header */}
          <header className="mb-8 flex flex-col gap-2">
            <h1 className="flex items-center gap-2 text-[length:var(--theme-text-2xl)] font-bold text-[var(--theme-neutral)]">
              <IconBolt className="h-6 w-6 text-[var(--theme-primary)]" stroke={1.75} />
              {pipeline.name || "Pipeline ใหม่"}
            </h1>
            <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55">
              เลือก trigger จากนั้นเพิ่มขั้นตอน — ระบบจะรันตามลำดับเมื่อ trigger เกิดขึ้น
            </p>
          </header>

          {/* Name + description */}
          <div className="mb-8 flex flex-col gap-4">
            <Field label="ชื่อ Pipeline">
              <input
                type="text"
                value={pipeline.name}
                onChange={(e) =>
                  setPipeline((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="เช่น ติดตาม HbA1c"
                className="h-11 w-full rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)] px-3 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none transition focus:border-[var(--theme-primary)] focus:bg-[var(--theme-surface)]"
              />
            </Field>
            <Field label="คำอธิบาย (ทางเลือก)">
              <textarea
                value={pipeline.description ?? ""}
                onChange={(e) =>
                  setPipeline((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="บอกเล่าสั้น ๆ ว่า pipeline นี้ทำอะไร"
                rows={2}
                className="w-full resize-none rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)] px-3 py-2 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none transition focus:border-[var(--theme-primary)] focus:bg-[var(--theme-surface)]"
              />
            </Field>
          </div>

          {/* Trigger */}
          <section className="mb-6 flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/45">
              Trigger
            </p>
            <TriggerPicker trigger={pipeline.trigger} onChange={setTrigger} />
          </section>

          {/* Flow canvas — n8n-style horizontal pipeline view. Click a step
              card to scroll to its inline edit form below. */}
          <section className="mb-2 flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/45">
              Flow
            </p>
            <div className="rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 p-4">
              <PipelineFlow
                trigger={pipeline.trigger}
                steps={pipeline.steps}
                mode="full"
                onSelectStep={(id) => {
                  const el = document.getElementById(`step-${id}`);
                  if (el)
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                onRemoveStep={removeStep}
                onInsertSlot={(atIndex) => {
                  // Default to "notify" when inserting from the canvas — user
                  // can change the type in the edit form. Quick + small.
                  insertStep(atIndex, "notify");
                }}
              />
            </div>
          </section>

          {/* Steps — vertical edit forms (the canvas above is the map). */}
          <section className="flex flex-col gap-1">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/45">
                ขั้นตอน ({pipeline.steps.length})
              </p>
            </div>

            <InsertSlot onPick={(t) => insertStep(0, t)} index={0} />
            <AnimatePresence initial={false}>
              {pipeline.steps.map((step, i) => (
                <motion.div
                  key={step.id}
                  id={`step-${step.id}`}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: EASE_TV }}
                >
                  <StepCard
                    step={step}
                    index={i}
                    onChange={(patch) => updateStep(step.id, patch)}
                    onRemove={() => removeStep(step.id)}
                  />
                  <InsertSlot
                    onPick={(t) => insertStep(i + 1, t)}
                    index={i + 1}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </section>

          {/* Footer actions */}
          <div className="mt-8 flex items-center justify-end gap-2 border-t border-[var(--theme-neutral)]/10 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="h-10 cursor-pointer rounded-[var(--theme-radius-field)] px-4 text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]/70 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-10 cursor-pointer rounded-[var(--theme-radius-field)] bg-[var(--theme-primary)] px-4 text-[length:var(--theme-text-sm)] font-semibold text-white shadow-[var(--theme-shadow-sm)] transition hover:brightness-110"
            >
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[length:var(--theme-text-xs)] font-medium text-[var(--theme-neutral)]/70">
        {label}
      </span>
      {children}
    </label>
  );
}

interface TriggerPickerProps {
  trigger: Trigger;
  onChange: (t: Trigger) => void;
}
function TriggerPicker({ trigger, onChange }: TriggerPickerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)]/40 p-4">
      <div className="grid grid-cols-3 gap-2">
        <TriggerTab
          active={trigger.type === "manual"}
          icon={IconHandClick}
          label="Manual"
          onClick={() => onChange({ type: "manual" })}
        />
        <TriggerTab
          active={trigger.type === "schedule"}
          icon={IconCalendar}
          label="Schedule"
          onClick={() =>
            onChange({ type: "schedule", label: SCHEDULE_PRESETS[0].label, cron: SCHEDULE_PRESETS[0].cron })
          }
        />
        <TriggerTab
          active={trigger.type === "event"}
          icon={IconCircleDot}
          label="Event"
          onClick={() => onChange({ type: "event", event: EVENT_OPTIONS[0] })}
        />
      </div>

      {trigger.type === "schedule" && (
        <Field label="ความถี่">
          <select
            value={trigger.label}
            onChange={(e) => {
              const preset = SCHEDULE_PRESETS.find((p) => p.label === e.target.value);
              if (preset)
                onChange({ type: "schedule", label: preset.label, cron: preset.cron });
            }}
            className="h-11 w-full rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none"
          >
            {SCHEDULE_PRESETS.map((p) => (
              <option key={p.cron} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {trigger.type === "event" && (
        <Field label="เหตุการณ์">
          <select
            value={trigger.event}
            onChange={(e) =>
              onChange({ type: "event", event: e.target.value as EventName })
            }
            className="h-11 w-full rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none"
          >
            {EVENT_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {EVENT_LABELS[e]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {trigger.type === "manual" && (
        <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
          Pipeline จะรันก็ต่อเมื่อกด "Run now" ในหน้ารายการ
        </p>
      )}
    </div>
  );
}

function TriggerTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof IconBell;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-col items-center gap-1 rounded-[var(--theme-radius-selector)] border px-3 py-2.5 transition",
        active
          ? "border-[var(--theme-primary)] bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]"
          : "border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] text-[var(--theme-neutral)]/70 hover:border-[var(--theme-neutral)]/30",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" stroke={1.75} />
      <span className="text-[length:var(--theme-text-xs)] font-medium">{label}</span>
    </button>
  );
}

interface StepCardProps {
  step: Step;
  index: number;
  onChange: (patch: Partial<Step>) => void;
  onRemove: () => void;
}
function StepCard({ step, index, onChange, onRemove }: StepCardProps) {
  const Icon = STEP_ICONS[step.type];
  return (
    <div className="flex flex-col gap-3 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary-soft)] text-[length:var(--theme-text-xs)] font-semibold text-[var(--theme-primary)]">
          {index + 1}
        </span>
        <Icon
          className="h-5 w-5 text-[var(--theme-primary)]"
          stroke={1.75}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
            {STEP_LABELS[step.type]}
          </span>
          <span className="truncate text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
            {STEP_DESCRIPTIONS[step.type]}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="ลบขั้นตอน"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--theme-radius-selector)] text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-error)]/10 hover:text-[var(--theme-error)]"
        >
          <IconTrash className="h-4 w-4" stroke={1.75} />
        </button>
      </div>

      {step.type === "notify" && (
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <select
            value={step.channel}
            onChange={(e) =>
              onChange({ channel: e.target.value as "in-app" | "line" | "email" })
            }
            className="h-10 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)] px-2 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none"
          >
            <option value="in-app">In-app</option>
            <option value="line">LINE</option>
            <option value="email">Email</option>
          </select>
          <input
            type="text"
            value={step.message}
            onChange={(e) => onChange({ message: e.target.value })}
            placeholder="ข้อความที่จะส่ง"
            className="h-10 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)] px-3 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none focus:border-[var(--theme-primary)]"
          />
        </div>
      )}

      {step.type === "create-appointment" && (
        <div className="grid grid-cols-[140px_1fr] gap-2">
          <input
            type="number"
            min={0}
            value={step.offsetDays}
            onChange={(e) =>
              onChange({ offsetDays: parseInt(e.target.value, 10) || 0 })
            }
            className="h-10 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)] px-3 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none"
          />
          <input
            type="text"
            value={step.service}
            onChange={(e) => onChange({ service: e.target.value })}
            placeholder="ชื่อคลินิก / หน่วยบริการ"
            className="h-10 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)] px-3 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none focus:border-[var(--theme-primary)]"
          />
        </div>
      )}

      {step.type === "draft-soap" && (
        <textarea
          value={step.template}
          onChange={(e) => onChange({ template: e.target.value })}
          placeholder="Template ที่จะใช้ร่าง SOAP (ใส่ตัวแปรเช่น {{patient.name}})"
          rows={3}
          className="w-full resize-none rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)] px-3 py-2 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none focus:border-[var(--theme-primary)]"
        />
      )}

      {step.type === "ai-summarize" && (
        <textarea
          value={step.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="Prompt ที่จะส่งให้ LLM"
          rows={3}
          className="w-full resize-none rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)] px-3 py-2 text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)] outline-none focus:border-[var(--theme-primary)]"
        />
      )}
    </div>
  );
}

interface InsertSlotProps {
  onPick: (type: StepType) => void;
  index: number;
}
function InsertSlot({ onPick }: InsertSlotProps) {
  const [open, setOpen] = useState(false);
  const types = useMemo(
    () =>
      Object.entries(STEP_LABELS).map(([type, label]) => ({
        type: type as StepType,
        label,
      })),
    [],
  );
  return (
    <div className="relative flex justify-center py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="เพิ่มขั้นตอน"
        className={[
          "flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[length:var(--theme-text-xs)] font-medium transition",
          open
            ? "bg-[var(--theme-primary)] text-white"
            : "bg-[var(--theme-base)] text-[var(--theme-neutral)]/55 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]",
        ].join(" ")}
      >
        <IconPlus className="h-3.5 w-3.5" stroke={2} />
        <span>เพิ่มขั้นตอน</span>
        <IconChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          stroke={2}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: EASE_TV }}
            className="absolute top-full z-10 mt-1 flex w-[280px] flex-col rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] p-1 shadow-[var(--theme-shadow-md)]"
          >
            {types.map((t) => {
              const Icon = STEP_ICONS[t.type];
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => {
                    onPick(t.type);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-[var(--theme-radius-selector)] px-3 py-2 text-left transition hover:bg-[var(--theme-primary-soft)]"
                >
                  <Icon
                    className="h-4 w-4 shrink-0 text-[var(--theme-primary)]"
                    stroke={1.75}
                  />
                  <span className="flex flex-col">
                    <span className="text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">
                      {t.label}
                    </span>
                    <span className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                      {STEP_DESCRIPTIONS[t.type]}
                    </span>
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
