import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconCalendarWeek,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react";

/**
 * Date range picker — dual-month calendar, modelled on the CIS-2026 Figma
 * (node 1086:2035). All accent colors are mapped onto the design-system
 * theme tokens (--theme-primary / --theme-primary-soft …) instead of the
 * Figma blue, so it follows whatever preset is active.
 *
 * Thai locale: Buddhist-era years (CE + 543), Thai month + weekday labels.
 */

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

const FULL_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const SHORT_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const beYear = (d: Date) => d.getFullYear() + 543;
export const formatThai = (d: Date) =>
  `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${beYear(d)}`;

// Midnight-normalised day key for safe comparisons.
const dayValue = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const sameDay = (a: Date, b: Date) => dayValue(a) === dayValue(b);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

interface Props {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  /** Initial range when uncontrolled. */
  defaultValue?: DateRange;
  className?: string;
  /** "single" picks one day (start=end) and closes on the first click. */
  mode?: "range" | "single";
  /** Override the trigger button's look (size/shape/border) so it can match
   *  surrounding form fields. When set, replaces the default pill styling. */
  triggerClassName?: string;
}

export default function DateRangePicker({ value, onChange, defaultValue, className, mode = "range", triggerClassName }: Props) {
  const [internal, setInternal] = useState<DateRange>(
    defaultValue ?? { start: null, end: null },
  );
  const range = value ?? internal;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(
    () => addMonths(range.start ?? new Date(), 0),
  );
  const [hover, setHover] = useState<Date | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // Popover rendered in a portal (escapes ancestor `overflow:hidden/auto`
  // clipping, e.g. inside scrollable panels) and anchored to the trigger.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const place = () => {
      const r = rootRef.current!.getBoundingClientRect();
      const W = 300; // single-month popover approx width
      let left = r.right - W;
      if (left < 8) left = 8;
      if (left + W > window.innerWidth - 8) left = window.innerWidth - 8 - W;
      setPos({ top: r.bottom + 8, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commit = (next: DateRange) => {
    if (!value) setInternal(next);
    onChange?.(next);
  };

  // In-progress selection, decoupled from the (possibly always-complete)
  // controlled value so the 1st click can set a pending start without the
  // parent immediately collapsing it back to a single day. Seeded on open.
  const [draft, setDraft] = useState<DateRange>(range);
  useEffect(() => {
    if (open) setDraft(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectDay = (d: Date) => {
    if (mode === "single") {
      const next = { start: d, end: d };
      setDraft(next);
      commit(next);
      setOpen(false);
      return;
    }
    // 1st click (or after a full range) → pending start only.
    if (!draft.start || (draft.start && draft.end)) {
      setDraft({ start: d, end: null });
      return;
    }
    // 2nd click → complete the range, commit, close.
    const next: DateRange =
      dayValue(d) < dayValue(draft.start)
        ? { start: d, end: draft.start }
        : { start: draft.start, end: d };
    setDraft(next);
    commit(next);
    setOpen(false);
  };

  const shown = open ? draft : range;
  const triggerLabel =
    mode === "single"
      ? shown.start
        ? formatThai(shown.start)
        : "เลือกวันที่"
      : shown.start && shown.end
        ? `${formatThai(shown.start)} - ${formatThai(shown.end)}`
        : shown.start
          ? `${formatThai(shown.start)} - …`
          : "เลือกช่วงวันที่";

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={
          triggerClassName
            ? [
                "group flex w-full shrink-0 items-center gap-2 outline-none transition",
                triggerClassName,
                open ? "border-[#3965e1]" : "",
              ].join(" ")
            : [
                "group flex h-12 w-full shrink-0 items-center gap-2.5 rounded-full border bg-[var(--theme-surface)] px-4 text-[var(--theme-neutral)] outline-none transition",
                open
                  ? "border-[var(--theme-primary)] bg-[var(--theme-primary-soft)] text-[var(--theme-primary)]"
                  : "border-[var(--theme-neutral)]/15 hover:border-[var(--theme-primary)] hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]",
              ].join(" ")
        }
      >
        <IconCalendarWeek
          className={[
            "h-5 w-5 transition-colors",
            open ? "text-[var(--theme-primary)]" : "text-[var(--theme-neutral)]/70 group-hover:text-[var(--theme-primary)]",
          ].join(" ")}
          stroke={1.75}
        />
        <span className="flex-1 truncate text-left text-[length:var(--theme-text-sm)] tabular-nums">
          {triggerLabel}
        </span>
        <IconChevronDown
          className={[
            "h-4 w-4 transition-transform",
            open ? "rotate-180 text-[var(--theme-primary)]" : "text-[var(--theme-neutral)]/50 group-hover:text-[var(--theme-primary)]",
          ].join(" ")}
          stroke={1.75}
        />
      </button>

      {/* Popover — portalled to <body> so it isn't clipped by scroll panels */}
      {open && pos && createPortal(
        <div
          ref={popRef}
          role="dialog"
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-[1000] flex rounded-[var(--theme-radius-box)] border border-[var(--theme-neutral)]/12 bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow-md)]"
        >
          <MonthGrid
            date={view}
            range={draft}
            hover={hover}
            onHover={setHover}
            onPick={selectDay}
            onPrev={() => setView((v) => addMonths(v, -1))}
            onNext={() => setView((v) => addMonths(v, 1))}
            showPrev
            showNext
          />
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Single month ────────────────────────────────────────────────────────────
function MonthGrid({
  date,
  range,
  hover,
  onHover,
  onPick,
  onPrev,
  onNext,
  showPrev,
  showNext,
}: {
  date: Date;
  range: DateRange;
  hover: Date | null;
  onHover: (d: Date | null) => void;
  onPick: (d: Date) => void;
  onPrev?: () => void;
  onNext?: () => void;
  showPrev?: boolean;
  showNext?: boolean;
}) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
    return out;
  }, [year, month]);

  // Effective range end while hovering (preview) before the 2nd click lands.
  const previewEnd =
    range.start && !range.end && hover && dayValue(hover) >= dayValue(range.start)
      ? hover
      : range.end;

  const inRange = (d: Date) => {
    if (!range.start || !previewEnd) return false;
    const v = dayValue(d);
    return v > dayValue(range.start) && v < dayValue(previewEnd);
  };
  const isStart = (d: Date) => range.start && sameDay(d, range.start);
  const isEnd = (d: Date) => previewEnd && sameDay(d, previewEnd);
  const hasRange = Boolean(range.start && previewEnd && dayValue(range.start) !== dayValue(previewEnd));

  return (
    <div className="w-[258px]">
      {/* Header */}
      <div className="flex h-8 items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          aria-label="เดือนก่อนหน้า"
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full text-[var(--theme-neutral)]/60 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]",
            showPrev ? "" : "invisible",
          ].join(" ")}
        >
          <IconChevronLeft className="h-4 w-4" stroke={2} />
        </button>
        <span className="text-[length:var(--theme-text-sm)] font-semibold text-[var(--theme-neutral)]">
          {FULL_MONTHS[month]} {year + 543}
        </span>
        <button
          type="button"
          onClick={onNext}
          aria-label="เดือนถัดไป"
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full text-[var(--theme-neutral)]/60 transition hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]",
            showNext ? "" : "invisible",
          ].join(" ")}
        >
          <IconChevronRight className="h-4 w-4" stroke={2} />
        </button>
      </div>

      {/* Weekday labels */}
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

      {/* Days */}
      <div className="mt-1 grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="h-9" />;
          const start = isStart(d);
          const end = isEnd(d);
          const between = inRange(d);
          const endpoint = start || end;
          return (
            <div key={dayValue(d)} className="relative h-9">
              {/* Range band — connects across cells, rounded at the ends */}
              {hasRange && (between || endpoint) && (
                <div
                  className={[
                    "absolute inset-y-1 bg-[var(--theme-primary-soft)]",
                    start && end ? "left-0 right-0 rounded-full"
                      : start ? "left-1/2 right-0 rounded-l-full"
                        : end ? "left-0 right-1/2 rounded-r-full"
                          : "left-0 right-0",
                  ].join(" ")}
                />
              )}
              <button
                type="button"
                onClick={() => onPick(d)}
                onMouseEnter={() => onHover(d)}
                onMouseLeave={() => onHover(null)}
                className={[
                  "relative z-10 mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[length:var(--theme-text-sm)] tabular-nums transition",
                  endpoint
                    ? "bg-[var(--theme-primary)] font-semibold text-white"
                    : between
                      ? "text-[var(--theme-neutral)] hover:bg-[var(--theme-primary)]/15"
                      : "text-[var(--theme-neutral)]/85 hover:bg-[var(--theme-primary-soft)]",
                ].join(" ")}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
