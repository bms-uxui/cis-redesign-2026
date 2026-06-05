import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconSearch, IconCornerDownLeft, IconSparkles } from "@tabler/icons-react";
import { useSidebar } from "../contexts/SidebarContext";
import {
  getMenuEntries,
  searchMenuEntries,
  type MenuEntry,
} from "./Sidebar/menuIndex";
import { suggestMenuByLLM, type MenuSuggestion } from "../services/ai/menuSuggest";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Global menu palette. Opens via "/" (or by clicking the sidebar search
 * box) and lets the user type to find any item across every rail panel.
 * Selection teleports them: pins the right rail, expands the panel, and
 * selects the child. Empty-state shows the most recently used items.
 */
export default function MenuPalette() {
  const {
    paletteOpen,
    closePalette,
    openMenu,
    recentMenus,
    pushRecent,
  } = useSidebar();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state every time the palette opens.
  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setHighlight(0);
      // Defer focus to after the modal mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen]);

  const { results, hadStrongMatch } = useMemo<{
    results: MenuEntry[];
    hadStrongMatch: boolean;
  }>(() => {
    if (query.trim()) {
      const r = searchMenuEntries(query);
      return { results: r.entries.slice(0, 30), hadStrongMatch: r.hadStrongMatch };
    }
    const all = getMenuEntries();
    const byId = new Map(all.map((e) => [e.id, e] as const));
    return {
      results: recentMenus.map((id) => byId.get(id)).filter((x): x is MenuEntry => !!x),
      hadStrongMatch: true,
    };
  }, [query, recentMenus]);

  // AI "did you mean" — only fire when local search has no strong substring
  // hit, after a 500ms debounce so the user is done typing. Aborts on
  // re-type so we don't show stale suggestions.
  const [aiSuggestions, setAiSuggestions] = useState<MenuSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  useEffect(() => {
    setAiSuggestions([]);
    const q = query.trim();
    if (!q || hadStrongMatch || q.length < 2) {
      setAiLoading(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setAiLoading(true);
      try {
        const s = await suggestMenuByLLM(q, ctrl.signal);
        if (!ctrl.signal.aborted) setAiSuggestions(s);
      } catch {
        // Silent — fuzzy local results are still shown above.
      } finally {
        if (!ctrl.signal.aborted) setAiLoading(false);
      }
    }, 500);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query, hadStrongMatch]);

  // Combined list — local results first, then AI suggestions (deduped by id).
  // Keyboard navigation walks both as one flat sequence.
  const combined = useMemo<MenuEntry[]>(() => {
    if (aiSuggestions.length === 0) return results;
    const seen = new Set(results.map((r) => r.id));
    const extra = aiSuggestions
      .map((s) => s.entry)
      .filter((e) => !seen.has(e.id));
    return [...results, ...extra];
  }, [results, aiSuggestions]);

  const aiReasonById = useMemo(() => {
    const m = new Map<string, string | undefined>();
    for (const s of aiSuggestions) m.set(s.entry.id, s.reason);
    return m;
  }, [aiSuggestions]);
  const localCount = results.length;

  // Keep highlight in bounds when results shrink.
  useEffect(() => {
    if (highlight >= combined.length) setHighlight(Math.max(0, combined.length - 1));
  }, [combined.length, highlight]);

  const handleSelect = (entry: MenuEntry) => {
    openMenu(entry.railKey, entry.childKey);
    pushRecent(entry.id);
    closePalette();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(combined.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = combined[highlight];
      if (entry) handleSelect(entry);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
    }
  };

  const showingRecent = !query.trim() && combined.length > 0;
  const localLabel = showingRecent
    ? "ใช้ล่าสุด"
    : hadStrongMatch
      ? "ผลการค้นหา"
      : "ใกล้เคียง";

  return (
    <AnimatePresence>
      {paletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE_TV }}
            onClick={closePalette}
            className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
          />
          {/* Modal */}
          <motion.div
            key="palette-modal"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE_TV }}
            role="dialog"
            aria-label="ค้นหาเมนู"
            className="fixed left-1/2 top-[14vh] z-[91] w-[min(640px,calc(100vw-32px))] -translate-x-1/2"
          >
            <div className="relative">
              {/* Magic search glow — two layers, scoped to the modal:
                  (1) a soft pulsing radial halo behind the modal for ambient
                      "thinking" mood, (2) a thin rotating conic ring along
                      the border using a mask so the gradient only shows on
                      the rounded edge — not bleeding across the backdrop. */}
              <AnimatePresence>
                {aiLoading && (
                  <>
                    <motion.div
                      key="magic-halo"
                      aria-hidden
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: EASE_TV }}
                      style={{
                        background:
                          "conic-gradient(from 0deg, var(--theme-primary), var(--theme-accent), var(--theme-primary), var(--theme-accent), var(--theme-primary))",
                      }}
                      className="magic-halo pointer-events-none absolute -inset-6 rounded-[calc(var(--theme-radius-box)+24px)] blur-3xl"
                    />
                    <motion.div
                      key="magic-ring"
                      aria-hidden
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: EASE_TV }}
                      className="magic-ring pointer-events-none absolute -inset-px rounded-[var(--theme-radius-box)]"
                    />
                  </>
                )}
              </AnimatePresence>

            <div
              className="relative overflow-hidden rounded-[var(--theme-radius-box)] bg-[var(--theme-surface)] ring-1 ring-[var(--theme-neutral)]/10"
              style={{
                boxShadow: aiLoading
                  ? "0 0 0 1px color-mix(in srgb, var(--theme-primary) 50%, transparent), 0 24px 72px -12px color-mix(in srgb, var(--theme-primary) 45%, transparent), var(--theme-shadow-lg)"
                  : "var(--theme-shadow-lg)",
                transition: "box-shadow 600ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Search input */}
              <div className="relative flex items-center gap-3 border-b border-[var(--theme-neutral)]/10 px-5 py-4">
                <div className="relative h-5 w-5 shrink-0">
                  <AnimatePresence mode="wait" initial={false}>
                    {aiLoading ? (
                      <motion.span
                        key="spark"
                        initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.6, rotate: 30 }}
                        transition={{ duration: 0.25, ease: EASE_TV }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <IconSparkles
                          className="h-5 w-5 text-[var(--theme-primary)]"
                          stroke={1.75}
                        />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="srch"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.18, ease: EASE_TV }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <IconSearch
                          className="h-5 w-5 text-[var(--theme-neutral)]/55"
                          stroke={1.75}
                        />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="ค้นหาเมนูทั้งระบบ..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlight(0);
                  }}
                  onKeyDown={onKeyDown}
                  className="flex-1 bg-transparent text-[length:var(--theme-text-md)] text-[var(--theme-neutral)] placeholder:text-[var(--theme-neutral)]/45 outline-none"
                />
                <kbd className="hidden shrink-0 rounded border border-[var(--theme-neutral)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--theme-neutral)]/55 sm:inline">
                  esc
                </kbd>
              </div>

              {/* Results / empty state */}
              <div className="max-h-[min(60vh,440px)] overflow-y-auto">
                {combined.length === 0 && !aiLoading ? (
                  <EmptyState query={query} />
                ) : (
                  <div className="py-2">
                    {localCount > 0 && (
                      <>
                        <p className="px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/45">
                          {localLabel}
                        </p>
                        {results.map((entry, i) => (
                          <ResultRow
                            key={entry.id}
                            entry={entry}
                            highlighted={i === highlight}
                            query={query}
                            onMouseEnter={() => setHighlight(i)}
                            onClick={() => handleSelect(entry)}
                          />
                        ))}
                      </>
                    )}
                    {aiLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: EASE_TV }}
                      >
                        <p className="mt-1 flex items-center gap-1.5 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
                          <motion.span
                            animate={{ rotate: [0, 12, -6, 0], scale: [1, 1.1, 1] }}
                            transition={{
                              duration: 2.6,
                              repeat: Infinity,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                            className="inline-flex"
                          >
                            <IconSparkles
                              className="h-3 w-3 text-[var(--theme-primary)]"
                              stroke={2}
                            />
                          </motion.span>
                          <motion.span
                            style={{
                              backgroundImage:
                                "linear-gradient(90deg, var(--theme-primary), var(--theme-accent), var(--theme-primary))",
                              backgroundSize: "200% 100%",
                              WebkitBackgroundClip: "text",
                              backgroundClip: "text",
                              color: "transparent",
                            }}
                            animate={{ backgroundPositionX: ["0%", "200%"] }}
                            transition={{
                              duration: 3.6,
                              ease: [0.45, 0, 0.55, 1],
                              repeat: Infinity,
                            }}
                          >
                            กำลังคิด...
                          </motion.span>
                        </p>
                        <SkeletonRow />
                        <SkeletonRow delay={0.12} />
                      </motion.div>
                    )}
                    {aiSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <p className="mt-1 flex items-center gap-1.5 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
                          <IconSparkles
                            className="h-3 w-3 text-[var(--theme-primary)]"
                            stroke={2}
                          />
                          <span className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-accent)] bg-clip-text text-transparent">
                            คุณหมายถึง
                          </span>
                        </p>
                        {aiSuggestions
                          .filter((s) => !results.find((r) => r.id === s.entry.id))
                          .map((s, i) => {
                            const idx = combined.findIndex((e) => e.id === s.entry.id);
                            return (
                              <motion.div
                                key={s.entry.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: 0.28,
                                  delay: i * 0.06,
                                  ease: EASE_TV,
                                }}
                              >
                                <ResultRow
                                  entry={s.entry}
                                  highlighted={idx === highlight}
                                  query={query}
                                  onMouseEnter={() => setHighlight(idx)}
                                  onClick={() => handleSelect(s.entry)}
                                  reason={aiReasonById.get(s.entry.id)}
                                />
                              </motion.div>
                            );
                          })}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer with hints */}
              <div className="flex items-center justify-between border-t border-[var(--theme-neutral)]/10 bg-[var(--theme-base)] px-5 py-2.5 text-[11px] text-[var(--theme-neutral)]/55">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Kbd>↑</Kbd>
                    <Kbd>↓</Kbd>
                    <span>เลือก</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Kbd>
                      <IconCornerDownLeft className="h-2.5 w-2.5" stroke={2} />
                    </Kbd>
                    <span>เปิด</span>
                  </span>
                </div>
                <span>{combined.length > 0 && `${combined.length} รายการ`}</span>
              </div>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Shimmering placeholder row shown while the LLM is composing suggestions. */
function SkeletonRow({ delay = 0 }: { delay?: number }) {
  const shimmer = {
    backgroundImage:
      "linear-gradient(90deg, var(--theme-primary-soft) 0%, var(--theme-primary) 50%, var(--theme-accent) 75%, var(--theme-primary-soft) 100%)",
    backgroundSize: "200% 100%",
  };
  return (
    <div className="flex w-full items-center gap-3 px-5 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <motion.span
          style={shimmer}
          animate={{ backgroundPositionX: ["100%", "-100%"] }}
          transition={{
            duration: 2.4,
            ease: [0.45, 0, 0.55, 1],
            repeat: Infinity,
            delay,
          }}
          className="block h-3 w-[55%] rounded-full"
        />
        <motion.span
          style={shimmer}
          animate={{ backgroundPositionX: ["100%", "-100%"] }}
          transition={{
            duration: 2.4,
            ease: [0.45, 0, 0.55, 1],
            repeat: Infinity,
            delay: delay + 0.25,
          }}
          className="block h-2 w-[35%] rounded-full opacity-70"
        />
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-[var(--theme-neutral)]/15 px-1 text-[10px] font-medium text-[var(--theme-neutral)]/55">
      {children}
    </kbd>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
      <p className="text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]/70">
        {query.trim() ? "ไม่พบเมนูที่ตรงกัน" : "พิมพ์เพื่อค้นหา"}
      </p>
      <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/45">
        {query.trim()
          ? "ลองคำอื่นหรือชื่อภาษาอังกฤษ"
          : "เริ่มต้นด้วยชื่อเมนู เช่น Lab, ส่งตรวจ, ส่งต่อ"}
      </p>
    </div>
  );
}

interface ResultRowProps {
  entry: MenuEntry;
  highlighted: boolean;
  query: string;
  onMouseEnter: () => void;
  onClick: () => void;
  /** LLM-provided rationale shown as a quiet trailing line. */
  reason?: string;
}

function ResultRow({ entry, highlighted, query, onMouseEnter, onClick, reason }: ResultRowProps) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors duration-150",
        highlighted
          ? "bg-[var(--theme-primary-soft)]"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">
          <HighlightedText text={entry.label} query={query} />
        </p>
        <p className="truncate text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
          {reason ? reason : entry.breadcrumb}
        </p>
      </div>
      {highlighted && (
        <IconCornerDownLeft
          className="h-3.5 w-3.5 shrink-0 text-[var(--theme-neutral)]/55"
          stroke={1.75}
        />
      )}
    </button>
  );
}

/**
 * Global hotkey: pressing "/" anywhere (unless the user is typing into an
 * input/textarea/contentEditable) opens the menu palette. Renders nothing.
 * Mount once inside <SidebarProvider> so it can call openPalette().
 */
export function MenuPaletteHotkey() {
  const { openPalette, paletteOpen } = useSidebar();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      // Don't hijack the key while the user is typing.
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const editable =
        t?.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT";
      if (editable) return;
      if (paletteOpen) return;
      e.preventDefault();
      openPalette();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette, paletteOpen]);
  return null;
}

/** Wraps the matching substring in <mark> so users see what hit the query. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent font-bold text-[var(--theme-primary)]">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
