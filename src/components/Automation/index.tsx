import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPlus,
  IconPlayerPlay,
  IconPencil,
  IconTrash,
  IconBolt,
  IconCalendar,
  IconCircleDot,
  IconHandClick,
} from "@tabler/icons-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";
import { useToast } from "../../contexts/ToastContext";
import {
  listPipelines,
  togglePipeline,
  deletePipeline,
  recordRun,
} from "./store";
import { EVENT_LABELS, type Pipeline } from "./types";
import PipelineFlow from "./PipelineFlow";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Automation() {
  const { railHidden } = useSidebar();
  const { openTab } = useTabs();
  const toast = useToast();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  const refresh = useCallback(() => setPipelines(listPipelines()), []);
  useEffect(refresh, [refresh]);

  // Refresh when window regains focus (so edits from the builder tab show up).
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const handleToggle = (id: string, next: boolean) => {
    togglePipeline(id, next);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("ลบ pipeline นี้?")) return;
    deletePipeline(id);
    refresh();
    toast.success("ลบ pipeline แล้ว");
  };

  const handleRun = (p: Pipeline) => {
    if (!p.enabled) {
      toast.error("Pipeline ปิดอยู่", "เปิดใช้งานก่อน หรือคลิก toggle");
      return;
    }
    recordRun(p.id, {
      at: new Date().toISOString(),
      status: "success",
      message: `รัน ${p.steps.length} ขั้นตอนสำเร็จ (mock)`,
    });
    refresh();
    toast.success(`รัน "${p.name}" แล้ว`, `${p.steps.length} ขั้นตอนสำเร็จ`);
  };

  const handleEdit = (id: string) => {
    openTab(`/automation/${id}`, { title: "แก้ไข Pipeline" });
  };

  const handleNew = () => {
    openTab(`/automation/new`, { title: "สร้าง Pipeline" });
  };

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      <div className="h-20 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-7rem)] mr-4 mt-4 mb-4 overflow-hidden rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-[296px]",
        ].join(" ")}
      >
        <div className="mx-auto flex h-full w-full max-w-[1080px] flex-col gap-6 overflow-y-auto px-8 pb-8 pt-12 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {/* Header */}
          <header className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="flex items-center gap-2 text-[length:var(--theme-text-2xl)] font-bold text-[var(--theme-neutral)]">
                <IconBolt
                  className="h-6 w-6 text-[var(--theme-primary)]"
                  stroke={1.75}
                />
                Automation
              </h1>
              <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55">
                ตั้ง pipeline อัตโนมัติ — เมื่อเหตุการณ์เกิดขึ้น ระบบทำตามขั้นตอนที่กำหนด
              </p>
            </div>
            <button
              type="button"
              onClick={handleNew}
              className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-[var(--theme-radius-field)] bg-[var(--theme-primary)] px-4 text-[length:var(--theme-text-sm)] font-semibold text-white shadow-[var(--theme-shadow-sm)] transition hover:brightness-110"
            >
              <IconPlus className="h-4 w-4" stroke={2} />
              สร้าง Pipeline
            </button>
          </header>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              label="Pipelines ทั้งหมด"
              value={pipelines.length.toString()}
            />
            <StatTile
              label="กำลังทำงาน"
              value={pipelines.filter((p) => p.enabled).length.toString()}
              tone="success"
            />
            <StatTile
              label="รันสำเร็จ 24 ชม."
              value={pipelines.filter((p) => p.lastRun?.status === "success").length.toString()}
              tone="primary"
            />
          </div>

          {/* Pipeline list */}
          <section className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/45">
              Pipelines
            </p>
            <AnimatePresence initial={false}>
              {pipelines.map((p) => (
                <PipelineRow
                  key={p.id}
                  pipeline={p}
                  onToggle={(v) => handleToggle(p.id, v)}
                  onRun={() => handleRun(p)}
                  onEdit={() => handleEdit(p.id)}
                  onDelete={() => handleDelete(p.id)}
                />
              ))}
            </AnimatePresence>
            {pipelines.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-[var(--theme-radius-box)] border border-dashed border-[var(--theme-neutral)]/15 py-12 text-center">
                <p className="text-[length:var(--theme-text-md)] font-medium text-[var(--theme-neutral)]/70">
                  ยังไม่มี pipeline
                </p>
                <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/45">
                  เริ่มต้นด้วยการสร้าง pipeline แรกของคุณ
                </p>
                <button
                  type="button"
                  onClick={handleNew}
                  className="mt-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[var(--theme-radius-field)] bg-[var(--theme-primary)] px-3 text-[length:var(--theme-text-sm)] font-medium text-white"
                >
                  <IconPlus className="h-4 w-4" stroke={2} />
                  สร้าง Pipeline
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "primary";
}) {
  const accent =
    tone === "success"
      ? "text-[var(--theme-success)]"
      : tone === "primary"
        ? "text-[var(--theme-primary)]"
        : "text-[var(--theme-neutral)]";
  return (
    <div className="flex flex-col gap-1 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 px-4 py-3">
      <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
        {label}
      </p>
      <p className={`text-[length:var(--theme-text-xl)] font-bold ${accent}`}>
        {value}
      </p>
    </div>
  );
}

interface PipelineRowProps {
  pipeline: Pipeline;
  onToggle: (enabled: boolean) => void;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PipelineRow({
  pipeline: p,
  onToggle,
  onRun,
  onEdit,
  onDelete,
}: PipelineRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18, ease: EASE_TV }}
      className="flex items-center gap-4 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] p-4 transition hover:border-[var(--theme-neutral)]/20"
    >
      {/* Toggle */}
      <button
        type="button"
        onClick={() => onToggle(!p.enabled)}
        aria-pressed={p.enabled}
        aria-label={p.enabled ? "ปิดใช้งาน" : "เปิดใช้งาน"}
        className={[
          "relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
          p.enabled
            ? "bg-[var(--theme-primary)]"
            : "bg-[var(--theme-neutral)]/20",
        ].join(" ")}
      >
        <span
          aria-hidden
          className={[
            "absolute h-5 w-5 rounded-full bg-white shadow transition-transform",
            p.enabled ? "translate-x-[22px]" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>

      {/* Name + flow */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p
          className={[
            "truncate text-[length:var(--theme-text-md)] font-semibold",
            p.enabled
              ? "text-[var(--theme-neutral)]"
              : "text-[var(--theme-neutral)]/55",
          ].join(" ")}
        >
          {p.name}
        </p>
        {/* n8n-style horizontal flow: trigger → step → step (compact). */}
        <PipelineFlow trigger={p.trigger} steps={p.steps} mode="compact" />
      </div>

      {/* Last run */}
      <div className="hidden w-[140px] shrink-0 flex-col text-right text-[length:var(--theme-text-xs)] sm:flex">
        <span className="text-[var(--theme-neutral)]/45">รันล่าสุด</span>
        <span
          className={[
            "font-medium",
            p.lastRun?.status === "success"
              ? "text-[var(--theme-success)]"
              : p.lastRun?.status === "error"
                ? "text-[var(--theme-error)]"
                : "text-[var(--theme-neutral)]/55",
          ].join(" ")}
        >
          {p.lastRun ? formatRunTime(p.lastRun.at) : "ยังไม่เคยรัน"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <ActionButton onClick={onRun} aria="รันเดี๋ยวนี้" tone="primary">
          <IconPlayerPlay className="h-4 w-4" stroke={1.75} />
        </ActionButton>
        <ActionButton onClick={onEdit} aria="แก้ไข">
          <IconPencil className="h-4 w-4" stroke={1.75} />
        </ActionButton>
        <ActionButton onClick={onDelete} aria="ลบ" tone="danger">
          <IconTrash className="h-4 w-4" stroke={1.75} />
        </ActionButton>
      </div>
    </motion.div>
  );
}

function ActionButton({
  children,
  onClick,
  aria,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  aria: string;
  tone?: "primary" | "danger";
}) {
  const color =
    tone === "primary"
      ? "text-[var(--theme-primary)] hover:bg-[var(--theme-primary-soft)]"
      : tone === "danger"
        ? "text-[var(--theme-neutral)]/55 hover:bg-[var(--theme-error)]/10 hover:text-[var(--theme-error)]"
        : "text-[var(--theme-neutral)]/55 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]";
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--theme-radius-selector)] transition-colors ${color}`}
    >
      {children}
    </button>
  );
}

function describeTrigger(p: Pipeline): string {
  switch (p.trigger.type) {
    case "manual":
      return "ทำงานเอง (manual)";
    case "schedule":
      return p.trigger.label;
    case "event":
      return `เมื่อ: ${EVENT_LABELS[p.trigger.event]}`;
  }
}

function formatRunTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "เพิ่งจะ";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hrs / 24);
  return `${days} วันที่แล้ว`;
}
