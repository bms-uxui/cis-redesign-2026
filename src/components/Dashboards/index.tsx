import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconSparkles,
  IconTrash,
  IconLayoutDashboard,
  IconLoader2,
  IconRefresh,
  IconCheck,
  IconX,
  IconArrowRight,
  IconBolt,
  IconChevronLeft,
  IconChevronRight,
  IconWand,
} from "@tabler/icons-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { useTabs } from "../../contexts/TabsContext";
import { useToast } from "../../contexts/ToastContext";
import { listDashboards, deleteDashboard, saveDashboard } from "./store";
import { generateDashboard } from "./generator";
import type { Dashboard } from "./types";
import DashboardGrid from "./Grid";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

const SUGGESTIONS = [
  "ผู้ป่วยเบาหวานที่ควบคุมไม่ได้ + แนวโน้ม HbA1c",
  "ผู้ป่วยที่ขาดนัด ติดตามไม่ได้",
  "สัดส่วนสิทธิรักษาของผู้ป่วยทั้งหมด",
  "ยาที่สั่งจ่ายบ่อยที่สุด + ผู้ป่วยกลุ่มเสี่ยง",
  "ผู้ป่วยโรคเรื้อรัง แยกตามกลุ่มและช่วงอายุ",
  "ภาพรวม OPD วันนี้ + เวลารอ + no-show",
];

export default function Dashboards() {
  const { railHidden } = useSidebar();
  const { openTab } = useTabs();
  const toast = useToast();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);

  // Inline composer state — primary surface, not a modal.
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  // Preview keeps a VERSION HISTORY — each generate/refine pushes a version the
  // user can flip between before saving. `preview` is the active version.
  const [versions, setVersions] = useState<Dashboard[]>([]);
  const [versionIdx, setVersionIdx] = useState(0);
  const [basePrompt, setBasePrompt] = useState("");
  const [refineText, setRefineText] = useState("");
  const [refining, setRefining] = useState(false);
  const preview = versions[versionIdx] ?? null;
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => setDashboards(listDashboards()), []);
  useEffect(refresh, [refresh]);
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // Auto-scroll to the preview when one is generated.
  useEffect(() => {
    if (preview && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [preview]);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setVersions([]);
    setRefineText("");
    try {
      const d = await generateDashboard(prompt);
      setBasePrompt(prompt);
      setVersions([d]);
      setVersionIdx(0);
    } finally {
      setGenerating(false);
    }
  };

  // Refine the active version → a NEW version (branches off the one in view).
  const handleRefine = async () => {
    const cur = versions[versionIdx];
    if (!cur || !refineText.trim() || refining) return;
    setRefining(true);
    try {
      const summary = cur.widgets
        .map((w) => `${w.kind}:${w.title}${w.source ? ` (${w.source})` : ""}`)
        .join("; ");
      const p =
        `${basePrompt}\n\nนี่คือ dashboard เวอร์ชันปัจจุบัน — widgets: ${summary}. ` +
        `ปรับแก้ตามคำสั่งนี้ (คงสิ่งที่ดีอยู่แล้วไว้): ${refineText.trim()}`;
      const d = await generateDashboard(p);
      const next = [...versions.slice(0, versionIdx + 1), d];
      setVersions(next);
      setVersionIdx(next.length - 1);
      setRefineText("");
    } finally {
      setRefining(false);
    }
  };

  const handleAcceptPreview = () => {
    if (!preview) return;
    saveDashboard(preview);
    refresh();
    toast.success("บันทึก Dashboard แล้ว", preview.name);
    const id = preview.id;
    const name = preview.name;
    setVersions([]);
    setPrompt("");
    openTab(`/dashboards/${id}`, { title: name });
  };

  const handleDiscardPreview = () => {
    setVersions([]);
  };

  const handleOpen = (id: string, name: string) => {
    openTab(`/dashboards/${id}`, { title: name });
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`ลบ Dashboard "${name}"?`)) return;
    deleteDashboard(id);
    refresh();
    toast.success("ลบ dashboard แล้ว");
  };

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      <div className="h-16 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-6rem)] mr-4 mt-4 mb-4 overflow-hidden rounded-[24px] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-4 lg:ml-[296px]",
        ].join(" ")}
      >
        <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col gap-6 overflow-y-auto px-8 pb-12 pt-10 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {/* Header */}
          <header className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="flex items-center gap-2 text-[length:var(--theme-text-2xl)] font-bold text-[var(--theme-neutral)]">
                <IconLayoutDashboard
                  className="h-6 w-6 text-[var(--theme-primary)]"
                  stroke={1.75}
                />
                แดชบอร์ดของฉัน
              </h1>
              <p className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55">
                บอก AI ว่าอยากดูข้อมูลผู้ป่วยแบบไหน — ระบบจะประกอบหน้า dashboard ให้คุณทันที
              </p>
            </div>
          </header>

          {/* ── Prompt bar (primary surface) ────────────────────────── */}
          <motion.div
            layout
            transition={{ duration: 0.3, ease: EASE_TV }}
            className="relative flex flex-col gap-3 rounded-[var(--theme-radius-box)] border border-[var(--theme-primary)]/25 bg-gradient-to-br from-[var(--theme-primary-soft)] to-[var(--theme-surface)] p-5 shadow-[var(--theme-shadow-sm)]"
          >
            <div className="flex items-center gap-2 text-[length:var(--theme-text-xs)] font-semibold uppercase tracking-[0.08em] text-[var(--theme-primary)]">
              <IconBolt className="h-3.5 w-3.5" stroke={2} />
              Generative UI · จากข้อมูลผู้ป่วยของคุณ
            </div>

            <div className="flex items-stretch gap-2">
              <div className="flex flex-1 items-center gap-3 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-4 py-3 transition focus-within:border-[var(--theme-primary)] focus-within:shadow-[0_0_0_3px_var(--theme-primary-soft)]">
                <IconSparkles
                  className="h-5 w-5 shrink-0 text-[var(--theme-primary)]"
                  stroke={1.75}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder="เช่น ขอภาพรวมผู้ป่วยเบาหวานที่ควบคุมไม่ได้ พร้อมแนวโน้ม HbA1c"
                  className="flex-1 bg-transparent text-[length:var(--theme-text-md)] text-[var(--theme-neutral)] outline-none placeholder:text-[var(--theme-neutral)]/40"
                />
                {prompt && (
                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    aria-label="ล้าง"
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[var(--theme-neutral)]/40 transition hover:bg-[var(--theme-base)] hover:text-[var(--theme-neutral)]"
                  >
                    <IconX className="h-3.5 w-3.5" stroke={1.75} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="flex shrink-0 cursor-pointer items-center gap-2 rounded-[var(--theme-radius-field)] bg-[var(--theme-primary)] px-5 text-[length:var(--theme-text-sm)] font-semibold text-white shadow-[var(--theme-shadow-sm)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />
                    กำลังสร้าง
                  </>
                ) : (
                  <>
                    สร้าง
                    <IconArrowRight className="h-4 w-4" stroke={2} />
                  </>
                )}
              </button>
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2">
              <span className="self-center text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                ลอง:
              </span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setPrompt(s);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 py-1 text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/75 transition hover:border-[var(--theme-primary)]/40 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>

          {/* ── Generating spinner ───────────────────────────────────── */}
          <AnimatePresence>
            {generating && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: EASE_TV }}
                className="flex items-center justify-center gap-3 rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 px-6 py-12"
              >
                <IconLoader2
                  className="h-5 w-5 animate-spin text-[var(--theme-primary)]"
                  stroke={2}
                />
                <span className="text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/70">
                  AI กำลังประกอบหน้า dashboard จากข้อมูลผู้ป่วย…
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Inline preview ─────────────────────────────────────── */}
          <AnimatePresence>
            {preview && !generating && (
              <motion.div
                ref={previewRef}
                key={preview.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3, ease: EASE_TV }}
                className="flex flex-col gap-3"
              >
                {/* Preview header bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--theme-radius-field)] border border-[var(--theme-primary)]/25 bg-[var(--theme-primary-soft)]/50 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary)] text-white">
                      <IconSparkles className="h-4 w-4" stroke={2} />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <p className="truncate text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
                        ตัวอย่าง: {preview.name}
                      </p>
                      <p className="truncate text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                        {preview.widgets.length} widgets · ดึงจาก {countSources(preview)} แหล่งข้อมูล
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 text-[length:var(--theme-text-xs)] font-medium text-[var(--theme-neutral)]/70 transition hover:bg-[var(--theme-primary-soft)]"
                    >
                      <IconRefresh className="h-3.5 w-3.5" stroke={1.75} />
                      ลองใหม่
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscardPreview}
                      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[var(--theme-radius-field)] px-3 text-[length:var(--theme-text-xs)] font-medium text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-neutral)]/10"
                    >
                      <IconX className="h-3.5 w-3.5" stroke={1.75} />
                      ทิ้ง
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptPreview}
                      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[var(--theme-radius-field)] bg-[var(--theme-primary)] px-3 text-[length:var(--theme-text-xs)] font-semibold text-white shadow-[var(--theme-shadow-sm)] transition hover:brightness-110"
                    >
                      <IconCheck className="h-3.5 w-3.5" stroke={2} />
                      บันทึก
                    </button>
                  </div>
                </div>

                {/* Version control + refine — flip between versions and ask AI
                    to tweak the current one into a new version before saving. */}
                <div className="flex flex-wrap items-center gap-2 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/12 bg-[var(--theme-base)]/40 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setVersionIdx((i) => Math.max(0, i - 1))}
                      disabled={versionIdx === 0}
                      aria-label="เวอร์ชันก่อนหน้า"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--theme-neutral)]/60 transition enabled:hover:bg-[var(--theme-neutral)]/10 disabled:opacity-30"
                    >
                      <IconChevronLeft className="h-4 w-4" stroke={2} />
                    </button>
                    <span className="min-w-[64px] text-center text-[length:var(--theme-text-xs)] font-semibold text-[var(--theme-neutral)]">
                      เวอร์ชัน {versionIdx + 1}/{versions.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setVersionIdx((i) => Math.min(versions.length - 1, i + 1))}
                      disabled={versionIdx >= versions.length - 1}
                      aria-label="เวอร์ชันถัดไป"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--theme-neutral)]/60 transition enabled:hover:bg-[var(--theme-neutral)]/10 disabled:opacity-30"
                    >
                      <IconChevronRight className="h-4 w-4" stroke={2} />
                    </button>
                  </div>
                  <div className="flex min-w-[200px] flex-1 items-center gap-2">
                    <input
                      value={refineText}
                      onChange={(e) => setRefineText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRefine()}
                      placeholder="ปรับแก้ dashboard นี้… เช่น เพิ่มกราฟ no-show, เปลี่ยนเป็น bar chart"
                      disabled={refining}
                      className="min-w-0 flex-1 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-3 py-1.5 text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)] outline-none transition focus:border-[var(--theme-primary)] placeholder:text-[var(--theme-neutral)]/40"
                    />
                    <button
                      type="button"
                      onClick={handleRefine}
                      disabled={!refineText.trim() || refining}
                      className="flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--theme-radius-field)] bg-[var(--theme-primary)] px-3 text-[length:var(--theme-text-xs)] font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-50"
                    >
                      {refining ? (
                        <IconLoader2 className="h-3.5 w-3.5 animate-spin" stroke={2} />
                      ) : (
                        <IconWand className="h-3.5 w-3.5" stroke={2} />
                      )}
                      ปรับเวอร์ชัน
                    </button>
                  </div>
                </div>

                {/* The actual rendered preview — full widgets with live patient data */}
                <div className="rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)]/40 p-4">
                  <DashboardGrid widgets={preview.widgets} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Saved dashboards ─────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/45">
              Dashboard ที่บันทึกไว้ ({dashboards.length})
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AnimatePresence initial={false}>
                {dashboards.map((d) => (
                  <DashboardCard
                    key={d.id}
                    dashboard={d}
                    onOpen={() => handleOpen(d.id, d.name)}
                    onDelete={() => handleDelete(d.id, d.name)}
                  />
                ))}
              </AnimatePresence>
              {dashboards.length === 0 && (
                <p className="col-span-full py-12 text-center text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/45">
                  ยังไม่มี dashboard — พิมพ์ใน prompt bar ข้างบนเพื่อสร้างหน้าแรกของคุณ
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function countSources(d: Dashboard): number {
  return new Set(d.widgets.map((w) => w.source)).size;
}

interface DashboardCardProps {
  dashboard: Dashboard;
  onOpen: () => void;
  onDelete: () => void;
}

function DashboardCard({ dashboard: d, onOpen, onDelete }: DashboardCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: EASE_TV }}
      className="group flex flex-col gap-3 rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] p-4 transition hover:border-[var(--theme-neutral)]/25"
    >
      <button type="button" onClick={onOpen} className="flex flex-col gap-2 text-left">
        <div className="flex items-center gap-2">
          <p className="flex-1 truncate text-[length:var(--theme-text-md)] font-semibold text-[var(--theme-neutral)]">
            {d.name}
          </p>
          <span className="rounded-full bg-[var(--theme-primary-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--theme-primary)]">
            {d.widgets.length} widgets
          </span>
        </div>
        {d.description && (
          <p className="line-clamp-2 text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
            {d.description}
          </p>
        )}
      </button>

      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 8 }).map((_, i) => {
          const w = d.widgets[i];
          return (
            <span
              key={i}
              className={[
                "h-3 rounded-sm",
                w
                  ? w.kind === "kpi"
                    ? "bg-[var(--theme-primary)]/40"
                    : w.kind === "line-chart"
                      ? "bg-[var(--theme-primary)]/25"
                      : w.kind === "bar-chart"
                        ? "bg-[var(--theme-primary)]/30"
                        : "bg-[var(--theme-primary)]/15"
                  : "bg-[var(--theme-neutral)]/5",
              ].join(" ")}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/45">
        <span>{d.model ? `สร้างด้วย ${d.model}` : "Manual"}</span>
        <button
          type="button"
          onClick={onDelete}
          aria-label="ลบ"
          className="opacity-0 transition group-hover:opacity-100 hover:text-[var(--theme-error)]"
        >
          <IconTrash className="h-3.5 w-3.5" stroke={1.75} />
        </button>
      </div>
    </motion.div>
  );
}
