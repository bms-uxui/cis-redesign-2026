import { useMemo } from "react";
import { Select, SelectItem } from "@heroui/react";
import {
  APPT_INTERVALS,
  APPT_TYPES,
  addDaysISO,
  todayISO,
  type PlanAppt,
} from "../../data/apptIntervals";
import type { Patient } from "../../data/mock/patients";
import { CLINIC_NAMES, DOCTOR_NAMES } from "../../data/mock/operational";
import DateRangePicker from "../DateRangePicker";

/** options incl. the current value (so an out-of-list value still shows). */
function withCurrent(list: string[], current: string): string[] {
  return current && !list.includes(current) ? [current, ...list] : list;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
function fromISO(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return y && m && d ? new Date(y, m - 1, d) : null;
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const field =
  "w-full rounded-xl border-2 border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-2.5 py-1.5 text-[13px] text-[var(--theme-neutral)] outline-none transition focus:border-[#3965e1]";
const dateTrigger = "h-9 rounded-xl border-2 border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-2.5 text-[13px] text-[var(--theme-neutral)]";
const lbl = "text-[11px] font-bold text-[var(--theme-neutral)]/45";

/**
 * Auto-scheduled follow-up appointment in the treatment plan.
 *
 * The AI proposes an interval → a concrete date is computed automatically;
 * the doctor confirms or adjusts via the quick-interval chips or the date
 * field. Clinic / doctor / type are auto-filled from the patient.
 */
export default function AppointmentScheduler({
  appt,
  patient,
  onChange,
}: {
  appt?: PlanAppt;
  patient: Patient;
  onChange: (a: PlanAppt) => void;
}) {
  const a = useMemo<PlanAppt>(
    () =>
      appt ?? {
        date: addDaysISO(30),
        intervalKey: "1m",
        clinic: patient.nextAppointment?.clinic ?? "OPD อายุรกรรม",
        doctor: patient.nextAppointment?.doctor ?? patient.primaryDoctor,
        type: "ติดตามอาการ",
        note: "",
      },
    [appt, patient],
  );

  const set = (p: Partial<PlanAppt>) => onChange({ ...a, ...p });
  const pickInterval = (key: string, days: number) =>
    set({ intervalKey: key, date: addDaysISO(days, todayISO()) });
  const none = a.intervalKey === "none";

  return (
    <div className="flex flex-col gap-3">
      {/* quick intervals + ไม่มีนัด */}
      <div className="flex flex-col gap-1.5">
        <span className={lbl}>ระยะนัดถัดไป</span>
        <div className="flex flex-wrap gap-1.5">
          {APPT_INTERVALS.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={() => pickInterval(it.key, it.days)}
              className={[
                "rounded-[10px] px-3 py-1.5 text-[12px] font-bold transition",
                a.intervalKey === it.key
                  ? "bg-[#3965e1] text-white shadow-sm"
                  : "bg-[var(--theme-neutral)]/[0.06] text-[var(--theme-neutral)]/55 hover:bg-[var(--theme-neutral)]/10",
              ].join(" ")}
            >
              {it.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => set({ intervalKey: "none" })}
            className={[
              "rounded-[10px] px-3 py-1.5 text-[12px] font-bold transition",
              none ? "bg-[#ff383c] text-white shadow-sm" : "bg-[var(--theme-neutral)]/[0.06] text-[var(--theme-neutral)]/55 hover:bg-[var(--theme-neutral)]/10",
            ].join(" ")}
          >
            ไม่มีนัด
          </button>
        </div>
      </div>

      {none ? null : (
      <>
      {/* date + clinic/doctor */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <span className={lbl}>วันนัด</span>
          <DateRangePicker
            mode="single"
            className="w-full"
            triggerClassName={dateTrigger}
            value={{ start: fromISO(a.date), end: fromISO(a.date) }}
            onChange={(r) => r.start && set({ date: toISO(r.start), intervalKey: "custom" })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={lbl}>ประเภทนัด</span>
          <Select
            aria-label="ประเภทนัด"
            selectedKeys={[a.type]}
            onSelectionChange={(keys) => {
              const k = Array.from(keys)[0];
              if (k != null) set({ type: String(k) });
            }}
            variant="bordered"
            radius="md"
            size="sm"
            classNames={{ trigger: "h-9 min-h-9 rounded-xl border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)]", value: "text-[13px] !text-[var(--theme-neutral)]", popoverContent: "bg-[var(--theme-surface)] !text-[var(--theme-neutral)]", listbox: "!text-[var(--theme-neutral)]" }}
          >
            {withCurrent(APPT_TYPES.map((t) => t.label), a.type).map((label) => (
              <SelectItem key={label} textValue={label}>{label}</SelectItem>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className={lbl}>คลินิก</span>
          <Select
            aria-label="คลินิก"
            selectedKeys={[a.clinic]}
            onSelectionChange={(keys) => {
              const k = Array.from(keys)[0];
              if (k != null) set({ clinic: String(k) });
            }}
            variant="bordered"
            radius="md"
            size="sm"
            classNames={{ trigger: "h-9 min-h-9 rounded-xl border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)]", value: "text-[13px] !text-[var(--theme-neutral)]", popoverContent: "bg-[var(--theme-surface)] !text-[var(--theme-neutral)]", listbox: "!text-[var(--theme-neutral)]" }}
          >
            {withCurrent(CLINIC_NAMES, a.clinic).map((c) => (
              <SelectItem key={c} textValue={c}>{c}</SelectItem>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className={lbl}>แพทย์</span>
          <Select
            aria-label="แพทย์"
            selectedKeys={[a.doctor]}
            onSelectionChange={(keys) => {
              const k = Array.from(keys)[0];
              if (k != null) set({ doctor: String(k) });
            }}
            variant="bordered"
            radius="md"
            size="sm"
            classNames={{ trigger: "h-9 min-h-9 rounded-xl border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)]", value: "text-[13px] !text-[var(--theme-neutral)]", popoverContent: "bg-[var(--theme-surface)] !text-[var(--theme-neutral)]", listbox: "!text-[var(--theme-neutral)]" }}
          >
            {withCurrent(DOCTOR_NAMES, a.doctor).map((d) => (
              <SelectItem key={d} textValue={d}>{d}</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className={lbl}>หมายเหตุ</span>
        <textarea
          value={a.note ?? ""}
          onChange={(e) => set({ note: e.target.value })}
          rows={2}
          className={field}
          placeholder="เช่น ติดตามความดันและผลข้างเคียงยา"
        />
      </label>
      </>
      )}
    </div>
  );
}
