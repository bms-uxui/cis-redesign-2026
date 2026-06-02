import { AnimatePresence, motion, type Variants } from "framer-motion";
import { IconX, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { DockItem, DockSubItem } from "./MacDock";
import HERO_BG from "../assets/figma/hero-bg.jpg";
import MENU_DOCTOR from "../assets/figma/menu-doctor.jpg";
import MENU_RECORDS from "../assets/figma/menu-records.jpg";
import MENU_ONESTOP from "../assets/figma/menu-onestop.jpg";
import MENU_TELEHEALTH from "../assets/figma/menu-telehealth.jpg";
import MENU_CLAIMS from "../assets/figma/menu-claims.jpg";

interface AllMenuModalProps {
  visible: boolean;
  items: DockItem[];
  onClose: () => void;
  onPick?: (item: DockItem) => void;
  onPickSub?: (parent: DockItem, sub: DockSubItem) => void;
}

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Per-module hero image — Figma assets first, Unsplash placeholders to fill.
// Swap any URL for a Figma asset when available.
const MODULE_IMAGE: Record<string, string> = {
  Home: MENU_DOCTOR,
  "OPD Registry": MENU_RECORDS,
  Workbench: MENU_ONESTOP,
  "Data Export":
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80",
  EPIDEM:
    "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=80",
  Setting:
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
  "Claims Submission": MENU_CLAIMS,
  PCU: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80",
  Referral:
    "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=900&q=80",
  Report:
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80",
  Inventory:
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
  Telehealth: MENU_TELEHEALTH,
  System:
    "https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=900&q=80",
  "เมนูทั้งหมด":
    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=900&q=80",
};

const FALLBACK_IMAGE = MENU_DOCTOR;

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.08, staggerChildren: 0.05 } },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 32, filter: "blur(12px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: EASE_TV },
  },
};

export default function AllMenuModal({
  visible,
  items,
  onClose,
  onPick,
  onPickSub,
}: AllMenuModalProps) {
  const [query, setQuery] = useState("");

  const modules = useMemo(
    () =>
      items.filter(
        (it): it is Extract<DockItem, { kind: "icon" | "label-icon" }> =>
          it.kind === "icon" || it.kind === "label-icon",
      ),
    [items],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules.map((m) => ({ module: m, hits: m.subItems ?? [] }));
    return modules
      .map((m) => {
        const labelHit = m.label.toLowerCase().includes(q);
        const hits = (m.subItems ?? []).filter(
          (s) =>
            s.label.toLowerCase().includes(q) ||
            (s.description?.toLowerCase().includes(q) ?? false),
        );
        if (!labelHit && hits.length === 0) return null;
        return { module: m, hits: labelHit ? (m.subItems ?? []) : hits };
      })
      .filter(
        (x): x is { module: (typeof modules)[number]; hits: DockSubItem[] } => x !== null,
      );
  }, [modules, query]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* cinematic backdrop — hospital BG + dark veil */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.85) 100%), url(${HERO_BG})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "saturate(1.1)",
            }}
            onClick={onClose}
          />

          {/* modal shell */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 16, scale: 0.98, filter: "blur(6px)" }}
            transition={{ duration: 0.6, ease: EASE_TV }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="pointer-events-auto flex h-[min(90vh,920px)] w-full max-w-[1440px] flex-col overflow-hidden rounded-[30px] bg-black/40 text-white shadow-[0_60px_180px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
              {/* header */}
              <div className="relative shrink-0 px-12 pt-10 pb-7">
                <div className="flex items-end justify-between gap-6">
                  <div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.6, ease: EASE_TV }}
                      className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/55"
                    >
                      All Modules · {modules.length} รายการ
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.7, ease: EASE_TV, delay: 0.05 }}
                      className="mt-2 text-[40px] font-semibold leading-tight tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
                    >
                      เมนูทั้งหมด
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.45, ease: EASE_TV, delay: 0.1 }}
                      className="flex h-12 w-[340px] items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.08] px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur"
                    >
                      <IconSearch className="h-4 w-4 text-white/55" />
                      <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ค้นหาเมนู, sub-menu, หรือคำอธิบาย…"
                        className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/45"
                      />
                    </motion.div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                      }}
                      aria-label="close"
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white transition hover:bg-white/15"
                    >
                      <IconX className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* body — cinematic image-tile grid */}
              <div className="flex-1 overflow-y-auto px-12 pb-10">
                {matches.length === 0 ? (
                  <EmptyState query={query} />
                ) : (
                  <motion.div
                    key={query}
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 gap-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
                  >
                    {matches.map(({ module, hits }, i) => (
                      <ModuleTile
                        key={`${module.label}-${i}`}
                        module={module}
                        hits={hits}
                        onPick={onPick}
                        onPickSub={onPickSub}
                        onClose={onClose}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ModuleTile({
  module,
  hits,
  onPick,
  onClose,
}: {
  module: Extract<DockItem, { kind: "icon" | "label-icon" }>;
  hits: DockSubItem[];
  onPick?: (item: DockItem) => void;
  onPickSub?: (parent: DockItem, sub: DockSubItem) => void;
  onClose: () => void;
}) {
  const img = MODULE_IMAGE[module.label] ?? FALLBACK_IMAGE;
  const totalSubs = module.subItems?.length ?? 0;
  const matchCount = hits.length;

  return (
    <motion.div variants={tileVariants} className="group relative">
      {/* ambient halo on hover */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-[32px] opacity-0 blur-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(52,133,255,0.55), rgba(106,76,255,0.45))",
        }}
        variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
        initial="rest"
        whileHover="hover"
        transition={{ duration: 0.5, ease: EASE_TV }}
      />

      <motion.button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          module.onClick?.();
          onPick?.(module);
          onClose();
        }}
        className="relative block aspect-square w-full overflow-hidden rounded-[28px] text-left shadow-[0_8px_28px_rgba(0,0,0,0.45)] ring-1 ring-white/5"
        initial="rest"
        whileHover="hover"
        whileTap={{ scale: 0.985 }}
        variants={{
          rest: { scale: 1, y: 0 },
          hover: { scale: 1.05, y: -4 },
        }}
        transition={{ duration: 0.5, ease: EASE_TV }}
      >
        {/* image */}
        <motion.img
          src={img}
          alt={module.label}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          variants={{
            rest: { scale: 1, filter: "brightness(0.92) saturate(1)" },
            hover: { scale: 1.12, filter: "brightness(1.05) saturate(1.15)" },
          }}
          transition={{ duration: 0.7, ease: EASE_TV }}
        />

        {/* bottom gradient veil for label legibility */}
        <motion.div
          aria-hidden
          className="absolute inset-0"
          variants={{
            rest: {
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0) 35%, rgba(0,0,0,0.7) 100%)",
            },
            hover: {
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,0.8) 100%)",
            },
          }}
          transition={{ duration: 0.5, ease: EASE_TV }}
        />

        {/* sub-count chip (top-right) */}
        {totalSubs > 0 && (
          <span className="absolute top-4 right-4 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
            {matchCount > 0 && matchCount < totalSubs
              ? `${matchCount}/${totalSubs} match`
              : `${totalSubs} sub`}
          </span>
        )}

        {/* label */}
        <motion.div
          className="absolute inset-x-0 bottom-0 p-6"
          variants={{
            rest: { y: 0 },
            hover: { y: -4 },
          }}
          transition={{ duration: 0.45, ease: EASE_TV }}
        >
          <p className="text-[22px] font-bold leading-tight tracking-tight text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
            {module.label}
          </p>
        </motion.div>
      </motion.button>
    </motion.div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center text-white/70">
      <IconSearch className="h-10 w-10 text-white/25" />
      <div className="text-[16px] font-medium text-white">ไม่พบเมนู</div>
      <div className="text-[13px] text-white/55">
        ลองคำอื่นหรือเคลียร์คำค้น "{query}"
      </div>
    </div>
  );
}
