import { useMemo } from "react";
import { Select, SelectItem } from "@heroui/react";
import { IconSignature } from "@tabler/icons-react";
import {
  CERT_TEMPLATES,
  CERT_TEMPLATE_BY_ID,
  emptyCert,
  logCertIssuance,
  type MedicalCert,
} from "../../data/medCertTemplates";
import type { Patient } from "../../data/mock/patients";
import { useUser } from "../../contexts/UserContext";
import { useToast } from "../../contexts/ToastContext";
import DateRangePicker, { type DateRange } from "../DateRangePicker";

const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** YYYY-MM-DD → "14 มิถุนายน 2569" (พ.ศ.). Empty in → "". */
function thaiDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return "";
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number): string {
  const base = iso ? new Date(iso) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Local-tz YYYY-MM-DD ↔ Date (avoids the UTC shift of toISOString). */
function toISOLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function fromISO(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return y && m && d ? new Date(y, m - 1, d) : null;
}
function daysBetween(from: string, to: string): number {
  const a = fromISO(from);
  const b = fromISO(to);
  if (!a || !b) return 1;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

const field =
  "w-full rounded-xl border-2 border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-2.5 py-1.5 text-[13px] text-[var(--theme-neutral)] outline-none transition focus:border-[#3965e1]";
const lbl = "text-[11px] font-bold text-[var(--theme-neutral)]/45";

/**
 * Structured medical-certificate builder (ใบรับรองแพทย์).
 *
 * Flow: เลือก template → ช่อง auto-fill (ผู้ป่วย, Dx, วันที่, หมอ+เลขใบประกอบ,
 * วันพัก) → เลือกประโยคความเห็น → ตรวจ → ลงนาม → พิมพ์/ส่ง.
 *
 * Guard-rails (แพทยสภา / กฎหมาย):
 *  - จำนวนวันพัก = AI เสนอ แต่แพทย์ต้องยืนยัน/แก้
 *  - ห้าม auto-ออกใบ — พิมพ์/ส่ง ปลดล็อกหลัง "ลงนาม" เท่านั้น
 *  - ลงนามต้องมีครบ: เลขใบประกอบ + วันที่ + ลายมือชื่อ → เก็บ log การออก
 */
export default function CertificateBuilder({
  patient,
  dxLabel,
  cert,
  onChange,
}: {
  patient: Patient;
  dxLabel: string;
  cert?: MedicalCert;
  onChange: (c: MedicalCert) => void;
}) {
  const { user } = useUser();
  const toast = useToast();

  // Initialise on first render of the tab with sensible auto-fills.
  const c = useMemo<MedicalCert>(() => {
    const base = cert ?? emptyCert("none");
    const tpl = CERT_TEMPLATE_BY_ID[base.template];
    return {
      ...base,
      diagnosis: base.diagnosis || dxLabel,
      restFrom: base.restFrom || (tpl.usesRest ? todayISO() : ""),
      restTo: base.restTo || (tpl.usesRest ? addDaysISO(todayISO(), Math.max(0, base.restDays - 1)) : ""),
      opinion: base.opinion || tpl.opinions[0] || "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cert, dxLabel]);

  const tpl = CERT_TEMPLATE_BY_ID[c.template];
  const patientName = `${patient.prefix}${patient.firstName} ${patient.lastName}`;
  const licenseNo = user.providerId ?? "—";
  // normalise so we don't print a double "ว." prefix
  const licenseDisplay = licenseNo === "—" ? "—" : /^ว/.test(licenseNo) ? licenseNo : `ว.${licenseNo}`;

  // editing any field re-opens the certificate (must re-sign).
  const set = (p: Partial<MedicalCert>) => onChange({ ...c, ...p, signed: false });

  const pickTemplate = (id: MedicalCert["template"]) => {
    const t = CERT_TEMPLATE_BY_ID[id];
    onChange({
      ...c,
      template: id,
      signed: false,
      restDays: t.defaultRestDays,
      restFrom: t.usesRest ? todayISO() : "",
      restTo: t.usesRest ? addDaysISO(todayISO(), Math.max(0, t.defaultRestDays - 1)) : "",
      opinion: t.opinions[0],
    });
  };

  const setRestRange = (r: DateRange) => {
    if (!r.start) return;
    const from = toISOLocal(r.start);
    const to = r.end ? toISOLocal(r.end) : from;
    set({ restFrom: from, restTo: to, restDays: daysBetween(from, to) });
  };

  const canSign = licenseNo !== "—" && (!tpl.usesRest || (c.restDays > 0 && !!c.restFrom)) && !!c.diagnosis;

  const sign = () => {
    if (!canSign) return;
    const signedAt = new Date().toISOString();
    const next: MedicalCert = { ...c, signed: true, signedBy: user.name, licenseNo, signedAt };
    onChange(next);
    logCertIssuance({
      hn: patient.hn,
      patientName,
      template: c.template,
      diagnosis: c.diagnosis,
      signedBy: user.name,
      licenseNo,
      signedAt,
    });
    toast.success("ลงนามใบรับรองแพทย์แล้ว", `${tpl.label} · HN ${patient.hn}`);
  };

  return (
    <div className="flex flex-col">
      {/* ── Forms ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
      {/* 1 + 3 — ชนิดใบรับรอง + ระยะเวลาพักรักษาตัว (row เดียว) */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={lbl}>ชนิดใบรับรอง</span>
          <Select
            aria-label="ชนิดใบรับรอง"
            selectedKeys={[c.template]}
            onSelectionChange={(keys) => {
              const k = Array.from(keys)[0];
              if (k != null) pickTemplate(String(k) as MedicalCert["template"]);
            }}
            variant="bordered"
            radius="md"
            size="sm"
            classNames={{
              trigger:
                "h-9 min-h-9 rounded-xl border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] data-[open=true]:!border-[#3965e1]",
              value: "text-[13px] !text-[var(--theme-neutral)]",
              popoverContent: "bg-[var(--theme-surface)] !text-[var(--theme-neutral)]",
              listbox: "!text-[var(--theme-neutral)]",
            }}
          >
            {CERT_TEMPLATES.map((t) => (
              <SelectItem key={t.id} textValue={t.label}>{t.label}</SelectItem>
            ))}
          </Select>
        </label>

        {tpl.usesRest && (
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={lbl}>ระยะเวลาพักรักษาตัว ({c.restDays} วัน)</span>
            <DateRangePicker
              className="w-full"
              triggerClassName="h-9 rounded-xl border-2 border-[var(--theme-neutral)]/15 bg-[var(--theme-surface)] px-2.5 text-[13px] text-[var(--theme-neutral)]"
              value={{ start: fromISO(c.restFrom), end: fromISO(c.restTo) }}
              onChange={setRestRange}
            />
          </div>
        )}
      </div>

      {c.template === "none" ? (
        <p className="rounded-[12px] bg-[var(--theme-neutral)]/[0.05] px-3 py-2.5 text-[13px] text-[var(--theme-neutral)]/50">
          ไม่ออกใบรับรองแพทย์สำหรับการตรวจครั้งนี้
        </p>
      ) : (
        <>
          {/* 4 — ประโยคความเห็น (dropdown สำเร็จรูป + แก้ได้) */}
          <label className="flex flex-col gap-1">
            <span className={lbl}>ความเห็นแพทย์</span>
            <select value={tpl.opinions.includes(c.opinion) ? c.opinion : "__custom"} onChange={(e) => e.target.value !== "__custom" && set({ opinion: e.target.value })} className={field}>
              {tpl.opinions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
              {!tpl.opinions.includes(c.opinion) && <option value="__custom">แก้ไขเอง…</option>}
            </select>
            <textarea
              value={c.opinion}
              onChange={(e) => set({ opinion: e.target.value })}
              rows={2}
              className={field}
              placeholder="ข้อความความเห็น"
            />
          </label>

          {/* 6 — ลงนาม → พิมพ์/ส่ง */}
          {!c.signed ? (
            <button
              type="button"
              disabled={!canSign}
              onClick={sign}
              className={[
                "flex items-center justify-center gap-2 rounded-[14px] py-3 text-[14px] font-bold transition",
                canSign ? "bg-[#1f9d52] text-white hover:brightness-110" : "cursor-not-allowed bg-[var(--theme-neutral)]/10 text-[var(--theme-neutral)]/35",
              ].join(" ")}
            >
              <IconSignature className="h-5 w-5" stroke={2.2} />
              ลงนามรับรอง (ยืนยันโดยแพทย์)
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-[12px] bg-[#1f9d52]/10 px-3 py-2 text-[12px] font-semibold text-[#1f7a43]">
              <IconSignature className="h-4 w-4" stroke={2.2} />
              ลงนามโดย {c.signedBy} ({licenseDisplay}) · {thaiDate((c.signedAt ?? "").slice(0, 10))} — พิมพ์/ส่งได้จากการ์ดใบรับรอง
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

/** Preview ตามองค์ประกอบบังคับมาตรฐานแพทยสภา. */
export function CertPreview({
  c,
  patientName,
  hospital,
  doctorName,
  licenseNo,
  signatureUrl,
}: {
  c: MedicalCert;
  patientName: string;
  hospital: string;
  doctorName: string;
  licenseNo: string;
  signatureUrl?: string;
}) {
  const tpl = CERT_TEMPLATE_BY_ID[c.template];
  return (
    // A4 portrait (210×297 → ratio ~1:1.414). กระดาษจริงมี shadow + ขอบ.
    <div className="mx-auto flex aspect-[210/297] w-full max-w-[420px] flex-col rounded-[6px] border border-black/[0.08] bg-white px-[9%] py-[8%] text-[#22202a] shadow-[0_4px_24px_rgba(0,0,0,0.10)]">
      <p className="text-center text-[15px] font-bold">{tpl.label}</p>
      <p className="mt-0.5 text-center text-[11px] text-black/45">{hospital}</p>
      <div className="mt-5 space-y-2 text-[13px] leading-relaxed">
        <p className="indent-8">
          ข้าพเจ้า <span className="font-semibold">{doctorName}</span> เลขที่ใบประกอบวิชาชีพเวชกรรม{" "}
          <span className="font-semibold">{licenseNo}</span> ได้ทำการตรวจร่างกาย
        </p>
        <p>
          <span className="text-black/45">ผู้ป่วย</span> <span className="font-semibold">{patientName}</span>
        </p>
        {c.diagnosis && (
          <p>
            <span className="text-black/45">การวินิจฉัย</span>{" "}
            <span className="font-semibold">{c.diagnosis}</span>
          </p>
        )}
        {tpl.usesRest && c.restFrom && (
          <p>
            เห็นควรให้หยุดพักรักษาตัวเป็นเวลา <span className="font-semibold">{c.restDays}</span> วัน ตั้งแต่วันที่{" "}
            <span className="font-semibold">{thaiDate(c.restFrom)}</span> ถึง{" "}
            <span className="font-semibold">{thaiDate(c.restTo)}</span>
          </p>
        )}
        {c.opinion && <p className="text-black/70">{c.opinion}</p>}
      </div>
      {/* signature block ดันลงล่างสุดของหน้า */}
      <div className="mt-auto flex items-end justify-between pt-6">
        <p className="text-[11px] text-black/45">
          ออกให้ ณ วันที่<br />
          <span className="font-semibold text-[#22202a]">
            {thaiDate((c.signedAt ?? todayISO()).slice(0, 10))}
          </span>
        </p>
        <div className="text-center">
          <div className="mb-1 flex h-9 items-end justify-center border-b border-dashed border-black/30 px-6">
            {c.signed &&
              (signatureUrl ? (
                <img src={signatureUrl} alt="ลายเซ็น" className="max-h-9 object-contain" />
              ) : (
                <span className="text-[13px] font-semibold italic text-[#1f7a43]">{doctorName}</span>
              ))}
          </div>
          <p className="text-[11px] text-black/45">ลงนามแพทย์ผู้ตรวจ</p>
        </div>
      </div>
    </div>
  );
}
