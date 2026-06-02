import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconCheck } from "@tabler/icons-react";
import type { ComponentType } from "react";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface SaveCommitField {
  key: string;
  label: string;
  value?: string;
  Icon?: ComponentType<{ className?: string; stroke?: number }>;
}

export interface SaveCommitModule {
  label: string;
  sublabel?: string;
  Icon?: ComponentType<{ className?: string; stroke?: number }>;
  accent?: "violet" | "emerald" | "blue";
}

interface SaveCommitOverlayProps {
  open: boolean;
  module: SaveCommitModule;
  fields: SaveCommitField[];
  /** Total animation duration before `onComplete` fires (ms). */
  duration?: number;
  onComplete?: () => void;
}

/**
 * Save-commit visualizer — left module card + right field rows that fly in
 * with stagger, each with an avatar circle and a written bar. Reads as
 * "data being filed into this module" without going full database-aesthetic.
 */
export default function SaveCommitOverlay({
  open,
  module,
  fields,
  duration = 2200,
  onComplete,
}: SaveCommitOverlayProps) {
  useEffect(() => {
    if (!open || !onComplete) return;
    const t = setTimeout(onComplete, duration);
    return () => clearTimeout(t);
  }, [open, duration, onComplete]);

  const accent = ACCENT_BY_TONE[module.accent ?? "violet"];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[80] bg-white/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.5, ease: EASE_TV }}
            className="fixed inset-0 z-[81] flex items-center justify-center p-6"
          >
            <div className="grid w-full max-w-[860px] grid-cols-[minmax(0,300px)_minmax(0,1fr)] items-center gap-10">
              {/* Left — current module being written to */}
              <ModuleCard module={module} accent={accent} />

              {/* Right — field rows streaming in */}
              <div className="flex flex-col gap-3">
                {fields.map((f, i) => (
                  <FieldRow
                    key={f.key}
                    field={f}
                    index={i}
                    total={fields.length}
                    accent={accent}
                    duration={duration}
                  />
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="absolute bottom-14 left-1/2 -translate-x-1/2 text-center"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                กำลังบันทึก
              </p>
              <p className="mt-1 text-base font-medium text-neutral-700">
                {module.label}
              </p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------

const ACCENT_BY_TONE = {
  violet: {
    ring: "ring-violet-300/50",
    bg: "bg-violet-100",
    fg: "text-violet-700",
    line: "rgba(167,139,250,0.45)",
    rowFrom: "rgba(245,243,255,1)",
    rowTo: "rgba(237,233,254,0.6)",
  },
  emerald: {
    ring: "ring-emerald-300/50",
    bg: "bg-emerald-100",
    fg: "text-emerald-700",
    line: "rgba(52,211,153,0.45)",
    rowFrom: "rgba(236,253,245,1)",
    rowTo: "rgba(209,250,229,0.6)",
  },
  blue: {
    ring: "ring-blue-300/50",
    bg: "bg-blue-100",
    fg: "text-blue-700",
    line: "rgba(96,165,250,0.45)",
    rowFrom: "rgba(239,246,255,1)",
    rowTo: "rgba(219,234,254,0.6)",
  },
} as const;

type AccentDef = (typeof ACCENT_BY_TONE)["violet"];

function ModuleCard({
  module,
  accent,
}: {
  module: SaveCommitModule;
  accent: AccentDef;
}) {
  const Icon = module.Icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -16, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: EASE_TV }}
      className={`relative flex aspect-[5/3] flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl bg-neutral-100 px-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ${accent.ring}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${accent.line} 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {Icon && (
        <div
          className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${accent.bg}`}
        >
          <Icon className={`h-7 w-7 ${accent.fg}`} stroke={1.5} />
        </div>
      )}
      <div className="relative text-center">
        <p className="text-base font-semibold text-neutral-800">{module.label}</p>
        {module.sublabel && (
          <p className="mt-0.5 text-xs text-neutral-500">{module.sublabel}</p>
        )}
      </div>
    </motion.div>
  );
}

function FieldRow({
  field,
  index,
  total,
  accent,
  duration,
}: {
  field: SaveCommitField;
  index: number;
  total: number;
  accent: AccentDef;
  duration: number;
}) {
  // Pace rows to land just before the overlay closes — leave ~25% of the
  // duration as a "settle" window so all rows are visible together.
  const window = (duration / 1000) * 0.7;
  const appearAt = (index / Math.max(total, 1)) * window + 0.1;
  const commitAt = appearAt + 0.35;
  const Icon = field.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: appearAt, ease: EASE_TV }}
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
      style={{
        background: `linear-gradient(90deg, ${accent.rowFrom}, ${accent.rowTo} 75%, rgba(255,255,255,0))`,
      }}
    >
      {/* Avatar circle */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.4,
          delay: appearAt + 0.05,
          ease: [0.34, 1.6, 0.5, 1],
        }}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.06)]"
      >
        {Icon ? (
          <Icon className={`h-4 w-4 ${accent.fg}`} stroke={1.75} />
        ) : (
          <span className="h-2 w-2 rounded-full bg-neutral-400" />
        )}
        {/* Commit check overlay */}
        <motion.div
          aria-hidden
          className={`absolute inset-0 flex items-center justify-center rounded-full ${accent.bg}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: commitAt, ease: EASE_TV }}
        >
          <IconCheck className={`h-4 w-4 ${accent.fg}`} stroke={2.5} />
        </motion.div>
      </motion.div>

      {/* Solid bar — visualizes the field value being "written" */}
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/80">
        <motion.div
          className="h-full"
          style={{ background: accent.line }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.45, delay: appearAt + 0.05, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
