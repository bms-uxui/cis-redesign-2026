import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IconChartLine } from "@tabler/icons-react";
import { PATIENTS } from "../data/mock/patients";
import { labHistoryFor } from "../data/mock/clinical";

/** Clinical reference per panel: threshold value, which side is abnormal, and
 *  the human-readable normal range shown to the doctor. */
const LAB_REF: Record<string, { ref: number; high: boolean; range: string }> = {
  HbA1c: { ref: 6.5, high: true, range: "< 6.5%" },
  FBS: { ref: 100, high: true, range: "70–100 mg/dL" },
  LDL: { ref: 100, high: true, range: "< 100 mg/dL" },
  Creatinine: { ref: 1.2, high: true, range: "0.6–1.2 mg/dL" },
  Hb: { ref: 12, high: false, range: "12–16 g/dL" },
};

const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const thMonth = (iso: string) => TH_MONTH[Number(iso.slice(5, 7)) - 1] ?? iso.slice(5, 7);

/**
 * Generative-UI lab-trend card the chatbot renders via `::labs <HN>::`. A
 * 12-month line chart per lab panel with the reference threshold, month axis,
 * normal range and a plain-Thai trend summary so it reads at a glance.
 */
export default function LabTrendCard({ hn }: { hn: string }) {
  const p = PATIENTS.find((x) => x.hn === hn);
  const groups = useMemo(() => {
    if (!p) return [];
    const series = labHistoryFor(p);
    const byTest = new Map<string, { unit: string; points: { m: string; value: number; abn: boolean }[] }>();
    for (const s of series) {
      const g = byTest.get(s.test) ?? { unit: s.unit, points: [] };
      g.points.push({ m: thMonth(s.takenAt), value: s.value, abn: s.abnormal });
      byTest.set(s.test, g);
    }
    return [...byTest.entries()].map(([test, g]) => {
      const last = g.points[g.points.length - 1];
      const first = g.points[0];
      const dec = test === "HbA1c" || test === "Creatinine" ? 1 : 0;
      const delta = +(last.value - first.value).toFixed(dec);
      const ref = LAB_REF[test];
      const trend =
        Math.abs(delta) < (dec ? 0.2 : 2)
          ? "คงที่"
          : (delta > 0) === !!ref?.high
            ? "แย่ลง"
            : "ดีขึ้น";
      const vals = g.points.map((pt) => pt.value);
      return {
        test,
        unit: g.unit,
        points: g.points,
        last,
        delta,
        dec,
        ref,
        trend,
        min: Math.min(...vals),
        max: Math.max(...vals),
        abnormal: last.abn,
      };
    });
  }, [p]);

  if (!p) {
    return (
      <div className="rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-4 py-3 text-[13px] text-[var(--theme-neutral)]/55">
        ไม่พบผู้ป่วย HN {hn}
      </div>
    );
  }
  if (!groups.length) {
    return (
      <div className="rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-4 py-3 text-[13px] text-[var(--theme-neutral)]/55">
        ไม่มีผลแลปย้อนหลังสำหรับ {p.prefix}{p.firstName} {p.lastName}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--theme-neutral)]/10 bg-[var(--theme-primary)]/[0.06] px-4 py-2.5">
        <IconChartLine className="h-4 w-4 text-[var(--theme-primary)]" stroke={2} />
        <p className="text-[13px] font-bold text-[var(--theme-neutral)]">
          แนวโน้มผลแลป 12 เดือน · {p.prefix}{p.firstName} {p.lastName}
        </p>
      </div>

      <div className="flex flex-col divide-y divide-[var(--theme-neutral)]/10">
        {groups.map((g) => {
          const color = g.abnormal ? "#ff383c" : "var(--theme-primary)";
          const trendColor =
            g.trend === "แย่ลง" ? "#e1620a" : g.trend === "ดีขึ้น" ? "#1f9d52" : "var(--theme-neutral)";
          // pad the Y domain so the reference line + points all fit comfortably
          const lo = Math.min(g.min, g.ref?.ref ?? g.min);
          const hi = Math.max(g.max, g.ref?.ref ?? g.max);
          const pad = (hi - lo) * 0.15 || 1;
          return (
            <div key={g.test} className="px-4 py-3">
              {/* header line: test · latest value · trend pill */}
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-bold text-[var(--theme-neutral)]">{g.test}</span>
                  <span className="text-[11px] text-[var(--theme-neutral)]/45">เกณฑ์ {g.ref?.range ?? "—"}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[15px] font-bold tabular-nums" style={{ color }}>
                    {g.last.value}
                    <span className="ml-0.5 text-[10px] font-medium text-[var(--theme-neutral)]/45">{g.unit}</span>
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ color: trendColor, background: "color-mix(in srgb, currentColor 12%, transparent)" }}
                  >
                    {g.trend === "คงที่" ? "▬" : g.delta > 0 ? "▲" : "▼"} {g.trend}
                  </span>
                </div>
              </div>

              <div className="h-[88px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={g.points} margin={{ top: 6, bottom: 0, left: 0, right: 8 }}>
                    <CartesianGrid stroke="var(--theme-neutral)" strokeOpacity={0.08} vertical={false} />
                    <XAxis
                      dataKey="m"
                      interval={2}
                      tick={{ fontSize: 9, fill: "var(--theme-neutral)", opacity: 0.5 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      width={26}
                      domain={[lo - pad, hi + pad]}
                      tick={{ fontSize: 9, fill: "var(--theme-neutral)", opacity: 0.5 }}
                      tickLine={false}
                      axisLine={false}
                      tickCount={3}
                    />
                    {g.ref && (
                      <ReferenceLine
                        y={g.ref.ref}
                        stroke="#ff383c"
                        strokeOpacity={0.5}
                        strokeDasharray="4 3"
                        label={{
                          value: `เกณฑ์ ${g.ref.ref}`,
                          position: "insideTopRight",
                          fontSize: 9,
                          fill: "#ff383c",
                        }}
                      />
                    )}
                    <Tooltip
                      cursor={{ stroke: "var(--theme-neutral)", strokeOpacity: 0.15 }}
                      contentStyle={{
                        background: "var(--theme-surface)",
                        border: "1px solid rgba(127,127,127,0.25)",
                        borderRadius: 8,
                        fontSize: 11,
                        padding: "2px 8px",
                      }}
                      labelStyle={{ color: "var(--theme-neutral)" }}
                      itemStyle={{ color }}
                      formatter={(v) => [`${v} ${g.unit}`, g.test]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 1.5, fill: color }}
                      activeDot={{ r: 3.5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p className="mt-1 text-[11px] leading-snug text-[var(--theme-neutral)]/60">
                {g.test} ล่าสุด <span style={{ color }} className="font-semibold">{g.last.value} {g.unit}</span>{" "}
                {g.abnormal ? "ผิดปกติ (นอกเกณฑ์)" : "อยู่ในเกณฑ์"} · แนวโน้ม 12 เดือน{" "}
                <span style={{ color: trendColor }} className="font-semibold">{g.trend}</span>{" "}
                ({g.delta > 0 ? "+" : ""}{g.delta} {g.unit})
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
