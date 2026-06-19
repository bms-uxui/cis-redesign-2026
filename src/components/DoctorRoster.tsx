import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconPhone,
  IconCheck,
  IconArrowsExchange,
  IconBeach,
  IconCalendarStats,
} from "@tabler/icons-react";
import { useToast } from "../contexts/ToastContext";
import {
  ROSTER_DOCTORS,
  SHIFTS,
  ROOMS,
  findDoctor,
  findShift,
  seedRoster,
  seedLeaves,
  seedSwaps,
  type RosterEntry,
  type LeaveEntry,
  type SwapRequest,
  type DutyKind,
} from "../data/mock/roster";

// ── date helpers (self-contained) ──────────────────────────────────────────
const TH_DOW = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function weekOf(ref: Date): Date[] {
  const d = new Date(ref);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return x;
  });
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function thaiShort(d: Date) {
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]}`;
}

const LEAVE_TINT: Record<string, string> = {
  ลาพักร้อน: "#0891b2",
  ลากิจ: "#ca8a04",
  ลาป่วย: "#dc2626",
  "ประชุม/อบรม": "#7c3aed",
};

// ── time-grid geometry ──────────────────────────────────────────────────────
const DAY_START = 7; // first hour shown
const DAY_END = 24; // last hour shown (exclusive bottom)
const HOUR_PX = 52;
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
const GRID_H = (DAY_END - DAY_START) * HOUR_PX;

interface PlacedEntry {
  entry: RosterEntry;
  start: number;
  end: number;
  col: number;
  total: number;
}

/** Column-pack a day's entries so overlapping shifts sit side-by-side (Teams
 *  style). Entries that don't overlap reuse the full width. */
function layoutDay(items: RosterEntry[]): PlacedEntry[] {
  const sorted = items
    .map((entry) => {
      const sh = SHIFTS.find((s) => s.key === entry.shiftKey);
      return { entry, start: sh?.start ?? DAY_START, end: sh?.end ?? DAY_START + 1 };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const out: PlacedEntry[] = [];
  let cluster: { entry: RosterEntry; start: number; end: number; col: number }[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const colEnds: number[] = [];
    for (const it of cluster) {
      let c = colEnds.findIndex((end) => end <= it.start);
      if (c === -1) {
        c = colEnds.length;
        colEnds.push(it.end);
      } else colEnds[c] = it.end;
      it.col = c;
    }
    const total = colEnds.length;
    for (const it of cluster) out.push({ ...it, total });
    cluster = [];
  };
  for (const it of sorted) {
    if (cluster.length && it.start >= clusterEnd) flush();
    cluster.push({ ...it, col: 0 });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();
  return out;
}

export default function DoctorRoster() {
  const toast = useToast();
  const [weekOffset, setWeekOffset] = useState(0);

  const week = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return weekOf(base);
  }, [weekOffset]);
  const weekKeys = useMemo(() => week.map(dateKey), [week]);
  const todayKey = dateKey(new Date());

  // Roster state is reseeded per week so any week is populated. Edits live until
  // the week changes (mock — a real backend would persist per-week).
  const [entries, setEntries] = useState<RosterEntry[]>(() => seedRoster(weekKeys));
  const [leaves, setLeaves] = useState<LeaveEntry[]>(() => seedLeaves(weekKeys));
  const [swaps, setSwaps] = useState<SwapRequest[]>(() => seedSwaps(weekKeys));
  const [seededFor, setSeededFor] = useState(weekKeys[0]);
  if (seededFor !== weekKeys[0]) {
    setEntries(seedRoster(weekKeys));
    setLeaves(seedLeaves(weekKeys));
    setSwaps(seedSwaps(weekKeys));
    setSeededFor(weekKeys[0]);
  }

  // assign modal target
  const [assign, setAssign] = useState<{ dateKey: string; shiftKey: string } | null>(null);

  const cellEntries = (dk: string, sk: string) => entries.filter((e) => e.dateKey === dk && e.shiftKey === sk);
  const dayEntries = (dk: string) => entries.filter((e) => e.dateKey === dk);
  const dayLeaves = (dk: string) => leaves.filter((l) => l.dateKey === dk);

  // red "now" line — only drawn on today's column when within the visible range
  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const nowVisible = nowHour >= DAY_START && nowHour <= DAY_END;
  const nowTop = (nowHour - DAY_START) * HOUR_PX;

  // click an empty slot → open the assign modal with the shift nearest the click
  const createAt = (dk: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hour = DAY_START + (e.clientY - rect.top) / HOUR_PX;
    const shift =
      SHIFTS.find((s) => hour >= s.start && hour < s.end) ??
      SHIFTS.reduce((best, s) => (Math.abs(s.start - hour) < Math.abs(best.start - hour) ? s : best));
    setAssign({ dateKey: dk, shiftKey: shift.key });
  };

  const removeEntry = (id: string) => {
    setEntries((xs) => xs.filter((e) => e.id !== id));
    toast.remove("ลบออกจากเวรแล้ว");
  };

  const addEntry = (doctorId: string, room: string, kind: DutyKind) => {
    if (!assign) return;
    const id = `${assign.dateKey}__${assign.shiftKey}__${doctorId}`;
    if (entries.some((e) => e.id === id)) {
      toast.warning("แพทย์ท่านนี้อยู่ในเวรนี้แล้ว");
      return;
    }
    setEntries((xs) => [
      ...xs,
      { id, doctorId, dateKey: assign.dateKey, shiftKey: assign.shiftKey, room, kind },
    ]);
    const sh = SHIFTS.find((s) => s.key === assign.shiftKey);
    toast.add("เพิ่มเข้าเวรแล้ว", `${findDoctor(doctorId)?.short} · ${sh?.label}`);
    setAssign(null);
  };

  const resolveSwap = (sw: SwapRequest, approve: boolean) => {
    setSwaps((xs) => xs.map((s) => (s.id === sw.id ? { ...s, status: approve ? "approved" : "rejected" } : s)));
    if (approve) {
      setEntries((xs) =>
        xs.map((e) =>
          e.id === sw.entryId
            ? { ...e, doctorId: sw.toDoctorId, id: `${e.dateKey}__${e.shiftKey}__${sw.toDoctorId}` }
            : e,
        ),
      );
      toast.success("อนุมัติการเปลี่ยนเวรแล้ว", `${findDoctor(sw.fromDoctorId)?.short} → ${findDoctor(sw.toDoctorId)?.short}`);
    } else {
      toast.error("ปฏิเสธคำขอเปลี่ยนเวรแล้ว");
    }
  };

  // workload — duty + on-call counts per doctor across the visible week
  const workload = useMemo(() => {
    const m = new Map<string, number>();
    entries.forEach((e) => m.set(e.doctorId, (m.get(e.doctorId) ?? 0) + 1));
    const max = Math.max(1, ...m.values());
    return ROSTER_DOCTORS.map((d) => ({ doc: d, count: m.get(d.id) ?? 0, pct: ((m.get(d.id) ?? 0) / max) * 100 }));
  }, [entries]);

  const pendingSwaps = swaps.filter((s) => s.status === "pending");
  const rangeLabel = `${thaiShort(week[0])} – ${thaiShort(week[6])} ${week[6].getFullYear() + 543}`;

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      {/* ── Roster grid ─────────────────────────────────────────────── */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white p-4">
        {/* header */}
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold text-[#22202a]">จัดเวรแพทย์</h2>
            <p className="text-[13px] text-black/45">{rangeLabel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="grid h-9 w-9 place-items-center rounded-full bg-black/5 text-black/60 transition hover:bg-black/10"
              aria-label="สัปดาห์ก่อนหน้า"
            >
              <IconChevronLeft className="h-5 w-5" stroke={2} />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className={[
                "rounded-full px-4 py-2 text-[13px] font-bold transition",
                weekOffset === 0 ? "bg-[#21502c]/10 text-[#21502c]" : "bg-black/5 text-black/60 hover:bg-black/10",
              ].join(" ")}
            >
              สัปดาห์นี้
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="grid h-9 w-9 place-items-center rounded-full bg-black/5 text-black/60 transition hover:bg-black/10"
              aria-label="สัปดาห์ถัดไป"
            >
              <IconChevronRight className="h-5 w-5" stroke={2} />
            </button>
          </div>
        </div>

        {/* ── day header (sticky) ─────────────────────────────────── */}
        <div className="flex shrink-0">
          <div className="w-[52px] shrink-0" />
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {week.map((d, i) => {
              const isToday = weekKeys[i] === todayKey;
              return (
                <div
                  key={weekKeys[i]}
                  className={[
                    "flex items-center justify-center gap-1.5 rounded-[12px] px-2 py-1.5 text-center",
                    isToday ? "bg-[#21502c] text-white" : "bg-[#f4f4f4] text-black/70",
                  ].join(" ")}
                >
                  <span className="text-[12px] font-bold">{TH_DOW[i]}</span>
                  <span className={["text-[11px]", isToday ? "text-white/80" : "text-black/45"].join(" ")}>{thaiShort(d)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── all-day leave row ───────────────────────────────────── */}
        <div className="mt-1.5 flex shrink-0">
          <div className="flex w-[52px] shrink-0 items-center justify-end pr-2 text-[10px] font-semibold text-black/30">
            ทั้งวัน
          </div>
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {weekKeys.map((dk) => (
              <div key={dk} className="flex min-h-[26px] flex-col gap-1 rounded-[10px] bg-[#f7f7f8] p-1">
                {dayLeaves(dk).map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: `${LEAVE_TINT[l.type]}14`, color: LEAVE_TINT[l.type] }}
                  >
                    <IconBeach className="h-3 w-3 shrink-0" stroke={2} />
                    <span className="truncate">{findDoctor(l.doctorId)?.short} · {l.type}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── scrollable time grid ────────────────────────────────── */}
        <div className="mt-1.5 min-h-0 flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <div className="flex" style={{ height: GRID_H }}>
            {/* hour gutter */}
            <div className="relative w-[52px] shrink-0">
              {HOURS.map((h) => (
                <span
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-black/35"
                  style={{ top: (h - DAY_START) * HOUR_PX }}
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>

            {/* day columns */}
            <div className="grid flex-1 grid-cols-7 gap-1.5">
              {weekKeys.map((dk, di) => {
                const isToday = dk === todayKey;
                const placed = layoutDay(dayEntries(dk));
                return (
                  <div
                    key={dk}
                    onClick={(e) => createAt(dk, e)}
                    className="relative cursor-pointer rounded-[10px] bg-[#fbfbfc] ring-1 ring-inset ring-black/[0.04] transition hover:bg-[#f5f7f5]"
                  >
                    {/* hour gridlines */}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="pointer-events-none absolute inset-x-0 border-t border-black/[0.05]"
                        style={{ top: (h - DAY_START) * HOUR_PX }}
                      />
                    ))}

                    {/* now line */}
                    {isToday && nowVisible && (
                      <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowTop }}>
                        <div className="relative h-px bg-[#ef4444]">
                          <span className="absolute -left-0.5 -top-[3px] h-[7px] w-[7px] rounded-full bg-[#ef4444]" />
                        </div>
                      </div>
                    )}

                    {/* event blocks */}
                    {placed.map(({ entry, start, end, col, total }) => (
                      <EventBlock
                        key={entry.id}
                        entry={entry}
                        style={{
                          top: (start - DAY_START) * HOUR_PX + 1,
                          height: (end - start) * HOUR_PX - 2,
                          left: `calc(${(col / total) * 100}% + 1px)`,
                          width: `calc(${(1 / total) * 100}% - 2px)`,
                        }}
                        onRemove={() => removeEntry(entry.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Sidebar: workload · swaps · leave ───────────────────────── */}
      <aside className="hidden w-[330px] shrink-0 flex-col gap-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] xl:flex">
        {/* workload */}
        <div className="shrink-0 rounded-[24px] bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-[14px] font-semibold text-black/60">
            <IconCalendarStats className="h-4 w-4" stroke={2} />
            ภาระงานสัปดาห์นี้
          </h3>
          <div className="flex flex-col gap-2.5">
            {workload.map(({ doc, count, pct }) => (
              <div key={doc.id} className="flex items-center gap-2.5">
                <span className="w-[64px] shrink-0 truncate text-[12px] font-semibold text-[#22202a]">{doc.short}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: doc.color }} />
                </div>
                <span className="w-[34px] shrink-0 text-right text-[12px] font-bold tabular-nums text-black/55">{count} เวร</span>
              </div>
            ))}
          </div>
        </div>

        {/* swap requests */}
        <div className="shrink-0 rounded-[24px] bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-[14px] font-semibold text-black/60">
            <IconArrowsExchange className="h-4 w-4" stroke={2} />
            คำขอเปลี่ยนเวร
            {pendingSwaps.length > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#ea580c] px-1.5 text-[11px] font-bold text-white">
                {pendingSwaps.length}
              </span>
            )}
          </h3>
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {pendingSwaps.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-black/35">ไม่มีคำขอค้างอยู่</p>
              ) : (
                pendingSwaps.map((sw) => {
                  const e = entries.find((x) => x.id === sw.entryId);
                  const sh = e ? SHIFTS.find((s) => s.key === e.shiftKey) : undefined;
                  return (
                    <motion.div
                      key={sw.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: -8 }}
                      className="rounded-[14px] border border-black/[0.06] bg-[#fafafa] p-2.5"
                    >
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#22202a]">
                        <span>{findDoctor(sw.fromDoctorId)?.short}</span>
                        <IconArrowsExchange className="h-3.5 w-3.5 text-black/35" stroke={2} />
                        <span>{findDoctor(sw.toDoctorId)?.short}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-black/45">
                        {sh?.label} · {e ? thaiShort(new Date(e.dateKey)) : "—"} — {sw.reason}
                      </p>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => resolveSwap(sw, true)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-[10px] bg-[#21502c] py-1.5 text-[12px] font-bold text-white transition hover:brightness-110"
                        >
                          <IconCheck className="h-4 w-4" stroke={2.4} />
                          อนุมัติ
                        </button>
                        <button
                          type="button"
                          onClick={() => resolveSwap(sw, false)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-[10px] border border-black/10 bg-white py-1.5 text-[12px] font-bold text-black/55 transition hover:bg-black/5"
                        >
                          <IconX className="h-4 w-4" stroke={2.4} />
                          ปฏิเสธ
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* leave this week */}
        <div className="shrink-0 rounded-[24px] bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-[14px] font-semibold text-black/60">
            <IconBeach className="h-4 w-4" stroke={2} />
            การลา / ไม่อยู่
          </h3>
          <div className="flex flex-col gap-2">
            {leaves.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-black/35">ไม่มีการลาในสัปดาห์นี้</p>
            ) : (
              leaves
                .slice()
                .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
                .map((l) => (
                  <div key={l.id} className="flex items-center gap-2.5 rounded-[14px] bg-[#fafafa] p-2.5">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold"
                      style={{ background: `${LEAVE_TINT[l.type]}1a`, color: LEAVE_TINT[l.type] }}
                    >
                      {findDoctor(l.doctorId)?.short.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#22202a]">{findDoctor(l.doctorId)?.name}</p>
                      <p className="text-[11px] text-black/45">
                        {l.type} · {thaiShort(new Date(l.dateKey))}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </aside>

      {/* ── Assign modal ────────────────────────────────────────────── */}
      <AssignModal
        target={assign}
        existing={assign ? cellEntries(assign.dateKey, assign.shiftKey).map((e) => e.doctorId) : []}
        leaveIds={assign ? dayLeaves(assign.dateKey).map((l) => l.doctorId) : []}
        onClose={() => setAssign(null)}
        onAdd={addEntry}
      />
    </div>
  );
}

// ── pieces ─────────────────────────────────────────────────────────────────

/** A calendar event block — absolutely positioned by its time range, coloured
 *  by doctor with a left accent bar (Teams style). Hover reveals the remove ✕. */
function EventBlock({
  entry,
  style,
  onRemove,
}: {
  entry: RosterEntry;
  style: React.CSSProperties;
  onRemove: () => void;
}) {
  const doc = findDoctor(entry.doctorId);
  const sh = findShift(entry.shiftKey);
  if (!doc) return null;
  const oncall = entry.kind === "oncall";
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="group/ev absolute z-10 flex flex-col overflow-hidden rounded-[7px] px-1.5 py-1 text-left"
      style={{ ...style, background: `${doc.color}1f`, boxShadow: `inset 3px 0 0 ${doc.color}` }}
    >
      <p className="truncate text-[11px] font-bold leading-tight text-[#22202a]">{doc.short}</p>
      <p className="flex items-center gap-1 truncate text-[10px] leading-tight text-black/50">
        {oncall && <IconPhone className="h-3 w-3 shrink-0" stroke={2} />}
        {oncall ? "on-call" : entry.room}
      </p>
      {sh && <p className="mt-auto truncate text-[9px] tabular-nums text-black/35">{sh.time}</p>}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="ลบออกจากเวร"
        className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-white/70 text-black/40 opacity-0 transition hover:text-[#dc2626] group-hover/ev:opacity-100"
      >
        <IconX className="h-3 w-3" stroke={2.6} />
      </button>
    </div>
  );
}

function AssignModal({
  target,
  existing,
  leaveIds,
  onClose,
  onAdd,
}: {
  target: { dateKey: string; shiftKey: string } | null;
  existing: string[];
  leaveIds: string[];
  onClose: () => void;
  onAdd: (doctorId: string, room: string, kind: DutyKind) => void;
}) {
  const sh = target ? SHIFTS.find((s) => s.key === target.shiftKey) : undefined;
  const [room, setRoom] = useState(ROOMS[0]);
  const [kind, setKind] = useState<DutyKind>("duty");

  return (
    <Modal isOpen={!!target} onClose={onClose} size="md" placement="center">
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex flex-col gap-0.5">
              <span className="text-[16px] font-bold">เพิ่มแพทย์เข้าเวร</span>
              {sh && target && (
                <span className="text-[13px] font-normal text-black/50">
                  {sh.label} · {thaiShort(new Date(target.dateKey))} ({sh.time})
                </span>
              )}
            </ModalHeader>
            <ModalBody>
              {/* duty / on-call + room */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-full bg-[#ebebec] p-1">
                  {(["duty", "oncall"] as DutyKind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={[
                        "rounded-full px-3 py-1 text-[12px] font-bold transition",
                        kind === k ? "bg-white text-[#18181b] shadow-sm" : "text-black/45",
                      ].join(" ")}
                    >
                      {k === "duty" ? "เวรปกติ" : "on-call"}
                    </button>
                  ))}
                </div>
                {kind === "duty" && (
                  <div className="flex flex-wrap gap-1">
                    {ROOMS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRoom(r)}
                        className={[
                          "rounded-full px-2.5 py-1 text-[12px] font-semibold transition",
                          room === r ? "bg-[#21502c] text-white" : "bg-black/5 text-black/55 hover:bg-black/10",
                        ].join(" ")}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* doctor list */}
              <div className="mt-1 flex max-h-[300px] flex-col gap-1 overflow-y-auto">
                {ROSTER_DOCTORS.map((doc) => {
                  const onDuty = existing.includes(doc.id);
                  const onLeave = leaveIds.includes(doc.id);
                  const disabled = onDuty || onLeave;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onAdd(doc.id, kind === "oncall" ? "—" : room, kind)}
                      className={[
                        "flex items-center gap-2.5 rounded-[14px] border p-2 text-left transition",
                        disabled
                          ? "cursor-not-allowed border-transparent bg-black/[0.03] opacity-55"
                          : "border-black/[0.06] bg-white hover:border-[#21502c]/40 hover:bg-[#21502c]/[0.04]",
                      ].join(" ")}
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
                        style={{ background: doc.color }}
                      >
                        {doc.short.slice(0, 2)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-[#22202a]">{doc.name}</p>
                        <p className="text-[11px] text-black/45">{doc.specialty}</p>
                      </div>
                      {onDuty && <span className="shrink-0 text-[11px] font-semibold text-black/40">อยู่ในเวรแล้ว</span>}
                      {onLeave && <span className="shrink-0 text-[11px] font-semibold text-[#dc2626]">ลา</span>}
                    </button>
                  );
                })}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={close}>
                ปิด
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
