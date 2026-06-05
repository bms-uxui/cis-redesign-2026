import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import {
  IconX,
  IconGripVertical,
  IconPlus,
  IconCheck,
  IconSparkles,
  IconLayoutDashboard,
} from "@tabler/icons-react";
import type { Dashboard } from "../../Dashboards/types";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface AddWidgetsModalProps {
  open: boolean;
  /** Current pinned dashboard ids (ordered) from the parent store. */
  selectedIds: string[];
  /** All saved dashboards available to pin. */
  dashboards: Dashboard[];
  onClose: () => void;
  onApply: (nextIds: string[]) => void;
}

/**
 * Picks which saved dashboards appear pinned on Home. Top section is the
 * current pin list (drag to reorder, X to unpin), bottom section is the
 * remaining saved dashboards (click to pin). Changes stay in a local
 * draft until "บันทึก" so the user can experiment freely.
 */
export default function AddWidgetsModal({
  open,
  selectedIds,
  dashboards,
  onClose,
  onApply,
}: AddWidgetsModalProps) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) setDraft(selectedIds);
  }, [open, selectedIds]);

  const byId = new Map(dashboards.map((d) => [d.id, d] as const));
  const available = dashboards.filter((d) => !draft.includes(d.id));

  const handleApply = () => {
    onApply(draft);
    onClose();
  };
  const handleClearAll = () => setDraft([]);
  const addId = (id: string) => setDraft((d) => [...d, id]);
  const removeId = (id: string) => setDraft((d) => d.filter((x) => x !== id));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_TV }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm"
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE_TV }}
            role="dialog"
            aria-label="ปักหมุดแดชบอร์ด"
            className="fixed left-1/2 top-1/2 z-[81] flex max-h-[85vh] w-[min(720px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--theme-radius-box)] bg-[var(--theme-surface)] shadow-[var(--theme-shadow-lg)]"
          >
            <header className="flex items-center justify-between border-b border-[var(--theme-neutral)]/10 p-[var(--theme-space-md)]">
              <div className="flex flex-col">
                <h2 className="text-[length:var(--theme-text-lg)] font-semibold text-[var(--theme-neutral)]">
                  ปักหมุดแดชบอร์ด
                </h2>
                <p className="text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                  ปักหมุดแล้ว {draft.length} จาก {dashboards.length} แดชบอร์ด
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate("/dashboards");
                  }}
                  className="inline-flex items-center gap-1.5 text-[length:var(--theme-text-xs)] font-medium text-[var(--theme-primary)] hover:underline"
                >
                  <IconSparkles className="h-3 w-3" stroke={2} />
                  สร้างแดชบอร์ดใหม่
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="ปิด"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--theme-neutral)]/55 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-neutral)]"
                >
                  <IconX className="h-4 w-4" stroke={1.75} />
                </button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-[var(--theme-space-lg)] overflow-y-auto p-[var(--theme-space-md)]">
              {/* Pinned — draggable */}
              <section className="flex flex-col gap-[var(--theme-space-sm)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/55">
                  ปักหมุดแล้ว ({draft.length})
                </p>
                {draft.length === 0 ? (
                  <div className="rounded-[var(--theme-radius-box)] border border-dashed border-[var(--theme-neutral)]/15 p-[var(--theme-space-md)] text-center text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55">
                    ยังไม่ได้ปักหมุดแดชบอร์ดใดๆ
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={draft}
                    onReorder={setDraft}
                    className="flex flex-col gap-2"
                  >
                    {draft.map((id) => {
                      const d = byId.get(id);
                      if (!d) return null;
                      return (
                        <Reorder.Item
                          key={id}
                          value={id}
                          className="flex cursor-grab items-center gap-3 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-surface)] p-[var(--theme-space-sm)] active:cursor-grabbing"
                        >
                          <IconGripVertical
                            className="h-4 w-4 shrink-0 text-[var(--theme-neutral)]/40"
                            stroke={1.75}
                          />
                          <IconLayoutDashboard
                            className="h-5 w-5 shrink-0 text-[var(--theme-primary)]"
                            stroke={1.75}
                          />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <p className="truncate text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">
                              {d.name}
                            </p>
                            {d.description && (
                              <p className="truncate text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                                {d.description}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeId(id)}
                            aria-label="เลิกปักหมุด"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--theme-neutral)]/55 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <IconX className="h-4 w-4" stroke={1.75} />
                          </button>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                )}
              </section>

              {/* Available — click to pin */}
              {available.length > 0 && (
                <section className="flex flex-col gap-[var(--theme-space-sm)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-neutral)]/55">
                    แดชบอร์ดที่บันทึกไว้
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {available.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => addId(d.id)}
                        className="group flex items-start gap-3 rounded-[var(--theme-radius-field)] border border-[var(--theme-neutral)]/10 bg-[var(--theme-base)] p-[var(--theme-space-sm)] text-left transition hover:border-[var(--theme-primary)]/50 hover:bg-[var(--theme-primary-soft)]"
                      >
                        <IconLayoutDashboard
                          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--theme-primary)]"
                          stroke={1.75}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="truncate text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]">
                            {d.name}
                          </p>
                          {d.description && (
                            <p className="line-clamp-2 text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/55">
                              {d.description}
                            </p>
                          )}
                        </div>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--theme-surface)] text-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]/20 group-hover:bg-[var(--theme-primary)] group-hover:text-white">
                          <IconPlus className="h-4 w-4" stroke={2} />
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {dashboards.length === 0 && (
                <div className="rounded-[var(--theme-radius-box)] border border-dashed border-[var(--theme-neutral)]/15 p-[var(--theme-space-lg)] text-center text-[length:var(--theme-text-sm)] text-[var(--theme-neutral)]/55">
                  ยังไม่มีแดชบอร์ดที่บันทึกไว้
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-[var(--theme-neutral)]/10 p-[var(--theme-space-md)]">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={draft.length === 0}
                className="text-[length:var(--theme-text-sm)] font-medium text-[var(--theme-neutral)]/65 hover:text-[var(--theme-neutral)] disabled:opacity-40"
              >
                ล้างทั้งหมด
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-2 rounded-[var(--theme-radius-field)] bg-[var(--theme-primary)] px-[var(--theme-space-lg)] py-[var(--theme-space-sm)] text-[length:var(--theme-text-sm)] font-semibold text-white transition hover:bg-[var(--theme-primary)]/85"
              >
                <IconCheck className="h-4 w-4" stroke={2} />
                บันทึก
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
