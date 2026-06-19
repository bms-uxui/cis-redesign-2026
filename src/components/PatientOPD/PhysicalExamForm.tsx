import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconCircleCheck, IconAlertTriangle } from "@tabler/icons-react";

/**
 * Physical-examination checklist for the Dr. Note. Each system is marked
 * ปกติ / ผิดปกติ; an abnormal system reveals a free-text detail box. Core
 * systems are always shown; less-common ones are added on demand. The formatted
 * PE text is reported up via `onChange` so it can be folded into the saved note.
 */

type Status = "unset" | "normal" | "abnormal" | "not-exam";

interface PeSystem {
  key: string;
  abbr: string;
  labelTh: string;
}

const CORE_SYSTEMS: PeSystem[] = [
  { key: "ga", abbr: "GA", labelTh: "สภาพทั่วไป" },
  { key: "heent", abbr: "HEENT", labelTh: "ศีรษะ ตา หู คอ จมูก" },
  { key: "neck", abbr: "Neck", labelTh: "คอ" },
  { key: "heart", abbr: "Heart", labelTh: "หัวใจ" },
  { key: "lungs", abbr: "Lungs", labelTh: "ปอด" },
  { key: "abdomen", abbr: "Abdomen", labelTh: "ท้อง" },
  { key: "ext", abbr: "Ext", labelTh: "แขนขา" },
  { key: "neuro", abbr: "Neuro", labelTh: "ระบบประสาท" },
];

const EXTRA_SYSTEMS: PeSystem[] = [
  { key: "skin", abbr: "Skin", labelTh: "ผิวหนัง" },
  { key: "back", abbr: "Back/CVA", labelTh: "หลัง" },
  { key: "lymph", abbr: "Lymph", labelTh: "ต่อมน้ำเหลือง" },
  { key: "breast", abbr: "Breast", labelTh: "เต้านม" },
  { key: "pr-pv", abbr: "PR/PV", labelTh: "ทวาร/ช่องคลอด" },
  { key: "msk", abbr: "MSK", labelTh: "กล้ามเนื้อ-ข้อ" },
];

interface SystemState {
  status: Status;
  detail: string;
}

const EMPTY: SystemState = { status: "unset", detail: "" };

export function buildPeText(
  systems: PeSystem[],
  state: Record<string, SystemState>,
): string {
  const lines = systems
    .map((s) => {
      const st = state[s.key] ?? EMPTY;
      if (st.status === "unset") return null;
      if (st.status === "normal") return `${s.abbr}: ปกติ`;
      if (st.status === "not-exam") return `${s.abbr}: ไม่ได้ตรวจ`;
      return `${s.abbr}: ผิดปกติ${st.detail.trim() ? ` — ${st.detail.trim()}` : ""}`;
    })
    .filter(Boolean);
  return lines.join("\n");
}

export default function PhysicalExamForm({
  onChange,
}: {
  onChange?: (text: string) => void;
}) {
  const [state, setState] = useState<Record<string, SystemState>>({});
  const [extrasOpen, setExtrasOpen] = useState(false);
  // Extra systems the user has explicitly added (so the row stays visible).
  const [addedExtras, setAddedExtras] = useState<string[]>([]);

  const shownSystems = useMemo(
    () => [...CORE_SYSTEMS, ...EXTRA_SYSTEMS.filter((s) => addedExtras.includes(s.key))],
    [addedExtras],
  );

  const peText = useMemo(() => buildPeText(shownSystems, state), [shownSystems, state]);
  useEffect(() => onChange?.(peText), [peText, onChange]);

  const setStatus = (key: string, status: Status) =>
    setState((s) => ({ ...s, [key]: { ...(s[key] ?? EMPTY), status } }));
  const setDetail = (key: string, detail: string) =>
    setState((s) => ({ ...s, [key]: { ...(s[key] ?? EMPTY), detail } }));

  const markAllNormal = () =>
    setState((s) => {
      const next = { ...s };
      for (const sys of shownSystems) {
        next[sys.key] = { status: "normal", detail: next[sys.key]?.detail ?? "" };
      }
      return next;
    });

  const availableExtras = EXTRA_SYSTEMS.filter((s) => !addedExtras.includes(s.key));

  return (
    <section className="rounded-2xl bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold text-[var(--theme-neutral)]">
          ตรวจร่างกาย (Physical Exam)
        </h3>
        <button
          type="button"
          onClick={markAllNormal}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-primary)]/30 px-3 py-1.5 text-[12px] font-medium text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary-soft)]"
        >
          <IconCircleCheck className="h-3.5 w-3.5" stroke={2} />
          ปกติทั้งหมด
        </button>
      </div>

      <div className="flex flex-col divide-y divide-[var(--theme-neutral)]/8">
        {shownSystems.map((sys) => {
          const st = state[sys.key] ?? EMPTY;
          return (
            <div key={sys.key} className="flex flex-col gap-2 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="text-[14px] font-semibold text-[var(--theme-neutral)]">
                    {sys.abbr}
                  </span>
                  <span className="ml-2 text-[12px] text-[var(--theme-neutral)]/50">
                    {sys.labelTh}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <StatusPill
                    active={st.status === "normal"}
                    tone="normal"
                    onClick={() => setStatus(sys.key, st.status === "normal" ? "unset" : "normal")}
                  >
                    ปกติ
                  </StatusPill>
                  <StatusPill
                    active={st.status === "abnormal"}
                    tone="abnormal"
                    onClick={() =>
                      setStatus(sys.key, st.status === "abnormal" ? "unset" : "abnormal")
                    }
                  >
                    ผิดปกติ
                  </StatusPill>
                  <StatusPill
                    active={st.status === "not-exam"}
                    tone="not-exam"
                    onClick={() =>
                      setStatus(sys.key, st.status === "not-exam" ? "unset" : "not-exam")
                    }
                  >
                    ไม่ได้ตรวจ
                  </StatusPill>
                </div>
              </div>
              {st.status === "abnormal" && (
                <input
                  value={st.detail}
                  onChange={(e) => setDetail(sys.key, e.target.value)}
                  placeholder={`รายละเอียดที่ผิดปกติ (${sys.abbr})…`}
                  className="w-full rounded-xl border border-[var(--theme-danger)]/25 bg-[var(--theme-danger)]/[0.03] px-3 py-2 text-[13px] text-[var(--theme-neutral)] outline-none transition focus:border-[var(--theme-danger)]/50"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Add extra systems */}
      {availableExtras.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExtrasOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-medium text-[var(--theme-neutral)]/60 transition hover:text-[var(--theme-primary)]"
          >
            <IconPlus className="h-3.5 w-3.5" stroke={2} />
            เพิ่มการตรวจ
          </button>
          {extrasOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {availableExtras.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setAddedExtras((a) => [...a, s.key])}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--theme-neutral)]/15 px-2.5 py-1 text-[12px] text-[var(--theme-neutral)]/70 transition hover:border-[var(--theme-primary)]/40 hover:bg-[var(--theme-primary-soft)] hover:text-[var(--theme-primary)]"
                >
                  <IconPlus className="h-3 w-3" stroke={2} />
                  {s.abbr}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hint when nothing recorded yet */}
      {!peText && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--theme-neutral)]/40">
          <IconAlertTriangle className="h-3.5 w-3.5" stroke={1.75} />
          ยังไม่ได้บันทึกผลตรวจร่างกาย
        </p>
      )}
    </section>
  );
}

function StatusPill({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "normal" | "abnormal" | "not-exam";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeTone: Record<typeof tone, string> = {
    normal: "border-transparent bg-[var(--theme-success)] text-white",
    abnormal: "border-transparent bg-[var(--theme-danger)] text-white",
    "not-exam": "border-transparent bg-[var(--theme-neutral)]/45 text-white",
  };
  const toneCls = active
    ? activeTone[tone]
    : "border-[var(--theme-neutral)]/15 text-[var(--theme-neutral)]/60 hover:bg-[var(--theme-neutral)]/5";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${toneCls}`}
    >
      {children}
    </button>
  );
}
