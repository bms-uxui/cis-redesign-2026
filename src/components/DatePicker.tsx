import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconCalendarWeek,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { formatThai } from "./DateRangePicker";

/**
 * Single-date picker — same dual-purpose visual language as DateRangePicker
 * (Thai Buddhist-era calendar, theme-token accents) but for picking ONE day.
 * Value is an ISO `yyyy-mm-dd` string so it drops in where a native
 * `<input type="date">` was used.
 */

const FULL_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const SHORT_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const YEARS_PER_PAGE = 12;

const dayValue = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const sameDay = (a: Date, b: Date) => dayValue(a) === dayValue(b);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromISO = (s: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export default function DatePicker({
  value,
  onChange,
  placeholder = "เลือกวันที่",
  triggerClassName,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  triggerClassName?: string;
}) {
  const selected = fromISO(value);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  const [view, setView] = useState<Date>(() => addMonths(selected ?? new Date(), 0));
  const rootRef = useRef<HTMLDivElement>(null);

  // Always reopen on the day grid.
  useEffect(() => {
    if (open) setMode("days");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
    return out;
  }, [year, month]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={[
          "flex w-full items-center gap-2 bg-white outline-none transition border",
          open ? "border-[var(--theme-primary)]" : "border-[var(--theme-neutral)]/20",
          triggerClassName ?? "h-10 rounded-xl px-3 text-[14px]",
        ].join(" ")}
      >
        <span className={`flex-1 text-left ${selected ? "text-[var(--theme-neutral)]" : "text-[var(--theme-neutral)]/40"}`}>
          {selected ? formatThai(selected) : placeholder}
        </span>
        <IconCalendarWeek className="h-5 w-5 shrink-0 text-[var(--theme-neutral)]/50" stroke={1.75} />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[290px] rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/12 bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow-md)]"
        >
          {(() => {
            const pageStart = Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE;
            const step = (dir: number) =>
              setView((v) =>
                mode === "days"
                  ? addMonths(v, dir)
                  : mode === "months"
                    ? new Date(v.getFullYear() + dir, v.getMonth(), 1)
                    : new Date(v.getFullYear() + dir * YEARS_PER_PAGE, v.getMonth(), 1),
              );
            const headerLabel =
              mode === "days"
                ? `${FULL_MONTHS[month]} ${year + 543}`
                : mode === "months"
                  ? `${year + 543}`
                  : `${pageStart + 543} - ${pageStart + YEARS_PER_PAGE - 1 + 543}`;
            return (
              <>
                {/* Header — center label drills into month / year pickers */}
                <div className="flex h-8 items-center justify-between">
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="ก่อนหน้า"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--theme-neutral)]/60 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]"
                  >
                    <IconChevronLeft className="h-4 w-4" stroke={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode(mode === "days" ? "months" : "years")}
                    className="rounded-lg px-3 py-1 text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]"
                  >
                    {headerLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="ถัดไป"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--theme-neutral)]/60 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]"
                  >
                    <IconChevronRight className="h-4 w-4" stroke={2} />
                  </button>
                </div>

                {mode === "days" && (
                  <>
                    <div className="mt-2 grid grid-cols-7">
                      {WEEKDAYS.map((w) => (
                        <div
                          key={w}
                          className="flex h-7 items-center justify-center text-[length:var(--theme-text-xs)] text-[var(--theme-neutral)]/45"
                        >
                          {w}
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 grid grid-cols-7">
                      {cells.map((d, i) => {
                        if (!d) return <div key={`e${i}`} className="h-9" />;
                        const isSel = selected && sameDay(d, selected);
                        return (
                          <div key={dayValue(d)} className="flex h-9 items-center justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                onChange(toISO(d));
                                setOpen(false);
                              }}
                              className={[
                                "flex h-9 w-9 items-center justify-center rounded-full text-[length:var(--theme-text-sm)] tabular-nums transition",
                                isSel
                                  ? "bg-[var(--theme-primary)] font-semibold text-white"
                                  : "text-[var(--theme-neutral)]/85 hover:bg-[var(--theme-primary-soft)]",
                              ].join(" ")}
                            >
                              {d.getDate()}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {mode === "months" && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {SHORT_MONTHS.map((mLabel, m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setView(new Date(year, m, 1));
                          setMode("days");
                        }}
                        className={[
                          "flex h-10 items-center justify-center rounded-lg text-[length:var(--theme-text-sm)] transition",
                          m === month
                            ? "bg-[var(--theme-primary)] font-semibold text-white"
                            : "text-[var(--theme-neutral)]/85 hover:bg-[var(--theme-primary-soft)]",
                        ].join(" ")}
                      >
                        {mLabel}
                      </button>
                    ))}
                  </div>
                )}

                {mode === "years" && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStart + i).map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          setView(new Date(y, month, 1));
                          setMode("months");
                        }}
                        className={[
                          "flex h-10 items-center justify-center rounded-lg text-[length:var(--theme-text-sm)] tabular-nums transition",
                          y === year
                            ? "bg-[var(--theme-primary)] font-semibold text-white"
                            : "text-[var(--theme-neutral)]/85 hover:bg-[var(--theme-primary-soft)]",
                        ].join(" ")}
                      >
                        {y + 543}
                      </button>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
