import {
  IconUser,
  IconDroplet,
  IconStethoscope,
  IconAlertTriangle,
  IconChevronRight,
} from "@tabler/icons-react";
import { PATIENTS } from "../data/mock/patients";

/**
 * Generative-UI card the chatbot (Mae) can render inline by emitting a
 * `::patient <HN>::` directive. Looks the patient up in the clinical mock DB
 * and shows a compact profile summary + a link into the full chart.
 */
export default function PatientProfileCard({
  hn,
  onNavigate,
}: {
  hn: string;
  onNavigate?: (path: string) => void;
}) {
  const p = PATIENTS.find((x) => x.hn === hn);
  if (!p) {
    return (
      <div className="rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-4 py-3 text-[13px] text-[var(--theme-neutral)]/55">
        ไม่พบผู้ป่วย HN {hn}
      </div>
    );
  }
  const fullName = `${p.prefix}${p.firstName} ${p.lastName}`.trim();
  const allergies = p.allergies;
  const dx = p.diagnoses.slice(0, 3);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-[var(--theme-neutral)]/10 bg-[var(--theme-primary)]/[0.06] px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary)]/12 text-[var(--theme-primary)]">
          <IconUser className="h-5 w-5" stroke={2} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-bold text-[var(--theme-neutral)]">{fullName}</p>
          <p className="text-[12px] text-[var(--theme-neutral)]/55">
            HN {p.hn} · {p.age} ปี · {p.gender === "M" ? "ชาย" : "หญิง"}
          </p>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-col gap-2 px-4 py-3">
        <Row icon={<IconDroplet className="h-3.5 w-3.5" stroke={2} />} label="หมู่เลือด">
          {p.bloodType}
          {p.rh}
        </Row>
        <Row icon={<IconStethoscope className="h-3.5 w-3.5" stroke={2} />} label="การวินิจฉัย">
          {dx.length ? (
            <span className="flex flex-wrap gap-1">
              {dx.map((d) => (
                <span
                  key={d.code}
                  className="rounded-full bg-[var(--theme-neutral)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--theme-neutral)]/80"
                >
                  {d.name} ({d.code})
                </span>
              ))}
            </span>
          ) : (
            <span className="text-[var(--theme-neutral)]/45">—</span>
          )}
        </Row>
        {allergies.length > 0 && (
          <Row
            icon={<IconAlertTriangle className="h-3.5 w-3.5 text-[#ff383c]" stroke={2} />}
            label="แพ้"
            danger
          >
            <span className="font-semibold text-[#ff383c]">
              {allergies.map((a) => a.substance).join(", ")}
            </span>
          </Row>
        )}
      </div>

      {/* footer link */}
      <button
        type="button"
        onClick={() => onNavigate?.(`/opd/${p.hn}`)}
        className="flex w-full items-center justify-between border-t border-[var(--theme-neutral)]/10 px-4 py-2.5 text-[13px] font-semibold text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary)]/[0.06]"
      >
        เปิดเวชระเบียน
        <IconChevronRight className="h-4 w-4" stroke={2} />
      </button>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <span className={`mt-0.5 shrink-0 ${danger ? "text-[#ff383c]" : "text-[var(--theme-neutral)]/40"}`}>
        {icon}
      </span>
      <span className="w-[68px] shrink-0 text-[var(--theme-neutral)]/50">{label}</span>
      <span className="min-w-0 flex-1 text-[var(--theme-neutral)]">{children}</span>
    </div>
  );
}
