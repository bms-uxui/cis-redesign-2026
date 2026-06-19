import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  IconCircleCheck,
  IconChevronRight,
  IconFlame,
  IconTrash,
  IconWalk,
  IconAmbulance,
  IconArrowsExchange,
  IconShield,
  IconCreditCard,
  IconCamera,
  IconSearch,
  IconCheck,
  IconChevronDown,
  IconArrowsShuffle,
  IconX,
  IconArrowUp,
  IconMicrophone,
} from "@tabler/icons-react";
import { PATIENTS, type Patient } from "../../data/mock/patients";
import { useSidebar } from "../../contexts/SidebarContext";
import { useToast } from "../../contexts/ToastContext";
import DatePicker from "../DatePicker";
import { ScanningCardView, CameraCaptureView } from "../NewPatientByVoice";
import BODY_FRONT from "../../assets/figma/er/body-front.svg";

// ── ER triage levels (ESI-style) ──────────────────────────────────────────
const TRIAGE = [
  { level: 1, label: "วิกฤต", color: "#ef4444" },
  { level: 2, label: "ฉุกเฉินมาก", color: "#f97316" },
  { level: 3, label: "ฉุกเฉิน", color: "#eab308" },
  { level: 4, label: "กึ่งฉุกเฉิน", color: "#22c55e" },
  { level: 5, label: "ไม่ฉุกเฉิน", color: "#3b82f6" },
] as const;

const ARRIVAL = [
  { key: "walk", label: "เดินมาเอง", Icon: IconWalk },
  { key: "ems", label: "รถพยาบาล (EMS)", Icon: IconAmbulance },
  { key: "refer", label: "ส่งต่อ (Refer)", Icon: IconArrowsExchange },
  { key: "police", label: "นำส่งโดยตำรวจ", Icon: IconShield },
] as const;

const PAIN_TYPES = [
  "ปวดแสบ/ร้อน",
  "ปวดตื้อ",
  "ปวดเสียด/แทง",
  "ปวดบีบ",
  "ปวดร้าว",
  "ชา/อ่อนแรง",
  "บวม",
  "บาดแผล",
];

// Minimal Web Speech API typings (single phrase dictation).
type SpeechResultEvent = {
  results: { length: number; [i: number]: { [j: number]: { transcript: string } } };
};
type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type Side = "front" | "back";
interface PainPoint {
  id: number;
  side: Side;
  xPct: number;
  yPct: number;
  type: string;
  severity: number;
}

interface ERForm {
  unknownIdentity: boolean;
  photo: string;
  hn: string;
  cid: string;
  prefix: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  insurance: string;
  ethnicity: string;
  nationality: string;
  religion: string;
  maritalStatus: string;
  bloodGroup: string;
  triage: number | null;
  arrival: string;
  arrivalTime: string;
  chiefComplaint: string;
  sbp: string;
  dbp: string;
  pulse: string;
  temp: string;
  rr: string;
  spo2: string;
  consciousness: string;
  contactName: string;
  contactRelation: string;
  contactPhone: string;
  allergies: string;
  chronic: string;
  currentMeds: string;
}

const INIT: ERForm = {
  unknownIdentity: false,
  photo: "",
  hn: "",
  cid: "",
  prefix: "",
  firstName: "",
  lastName: "",
  gender: "",
  birthDate: "",
  insurance: "",
  ethnicity: "ไทย",
  nationality: "ไทย",
  religion: "พุทธ",
  maritalStatus: "",
  bloodGroup: "",
  triage: null,
  arrival: "",
  arrivalTime: "",
  chiefComplaint: "",
  sbp: "",
  dbp: "",
  pulse: "",
  temp: "",
  rr: "",
  spo2: "",
  consciousness: "",
  contactName: "",
  contactRelation: "",
  contactPhone: "",
  allergies: "",
  chronic: "",
  currentMeds: "",
};

export default function ERRegister() {
  const navigate = useNavigate();
  const toast = useToast();
  const { railHidden } = useSidebar();

  const [form, setForm] = useState<ERForm>(INIT);
  const set = <K extends keyof ERForm>(key: K, value: ERForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const [scanning, setScanning] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const ocrFileRef = useRef<HTMLInputElement>(null);

  // Identity read from a Thai ID card (mock) — shared by the smart-card scan
  // and the camera/OCR capture flows.
  const prefillIdentity = () =>
    setForm((f) => ({
      ...f,
      unknownIdentity: false,
      photo: portraitUrl("M", 0),
      prefix: "นาย",
      firstName: "สมชาย",
      lastName: "ใจดี",
      cid: "1103702456789",
      gender: "M",
      birthDate: "1962-03-14",
    }));

  const onScanDone = () => {
    prefillIdentity();
    setScanning(false);
    toast.success("อ่านบัตรประชาชนสำเร็จ", "ดึงข้อมูลผู้ป่วยจากบัตรแล้ว");
  };
  const onOcrDone = () => {
    prefillIdentity();
    setCapturing(false);
    toast.success("อ่านบัตรด้วย OCR สำเร็จ", "ดึงข้อมูลผู้ป่วยจากภาพถ่ายแล้ว");
  };

  const [searching, setSearching] = useState(false);
  const onPickPatient = (p: Patient, photo: string) => {
    setForm((f) => ({
      ...f,
      unknownIdentity: false,
      photo,
      hn: p.hn,
      cid: p.citizenId,
      prefix: p.prefix,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      birthDate: p.birthDate,
      bloodGroup: p.bloodType,
    }));
    setSearching(false);
    toast.success("เลือกผู้ป่วยแล้ว", `${p.prefix}${p.firstName} ${p.lastName} · HN ${p.hn}`);
  };

  const [side, setSide] = useState<Side>("front");
  const [points, setPoints] = useState<PainPoint[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nextId, setNextId] = useState(1);

  const sidePoints = points.filter((p) => p.side === side);
  const selected = points.find((p) => p.id === selectedId) ?? null;

  const addPoint = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const id = nextId;
    setPoints((ps) => [
      ...ps,
      { id, side, xPct, yPct, type: PAIN_TYPES[0], severity: 5 },
    ]);
    setSelectedId(id);
    setNextId((n) => n + 1);
  };
  const updatePoint = (id: number, patch: Partial<PainPoint>) =>
    setPoints((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removePoint = (id: number) => {
    setPoints((ps) => ps.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const generateHN = () =>
    set("hn", `ER${Math.floor(100000 + Math.random() * 900000)}`);

  const canNext = !!form.triage && !!form.chiefComplaint.trim();

  const handleNext = () => {
    if (!canNext) return;
    toast.success("ลงทะเบียน ER แล้ว", "ไปขั้นถัดไป: บันทึกประวัติ");
    navigate("/patient/new");
  };

  return (
    <div className="min-h-screen w-full bg-[var(--theme-base)]">
      {/* Reserve space for the floating TopBar card. */}
      <div className="h-16 shrink-0" aria-hidden />
      <main
        className={[
          "flex min-w-0 flex-col gap-4 overflow-hidden h-[calc(100vh-6rem)] mr-4 mt-4 mb-4 transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-4 lg:ml-[296px]",
        ].join(" ")}
      >
        {/* ── Stepper + actions bar (Figma 1431:3835) ───────────────────── */}
        <div className="flex h-[50px] shrink-0 items-center justify-between rounded-2xl border border-[#dadada] bg-white p-2">
          <div className="flex min-w-px flex-1 items-center gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#3eaf3f] px-4 py-2 text-[14px] font-medium text-white">
              <IconCircleCheck className="h-4 w-4" stroke={2} />
              ลงทะเบียน ER
            </span>
            <IconChevronRight className="h-4 w-4 text-[var(--theme-neutral)]/40" stroke={2} />
            <span className="rounded-xl bg-[var(--theme-primary)]/10 px-4 py-2 text-[14px] font-medium text-[var(--theme-primary)]">
              บันทึกประวัติ
            </span>
            <IconChevronRight className="h-4 w-4 text-[var(--theme-neutral)]/40" stroke={2} />
            <span className="rounded-xl px-4 py-2 text-[14px] font-medium text-black/50">
              ตรวจสอบข้อมูล
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/patient/new")}
              className="w-[124px] rounded-full px-4 py-2 text-[14px] font-medium text-black transition hover:bg-[var(--theme-neutral)]/8"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="w-[124px] rounded-full bg-[var(--theme-primary)] px-4 py-2 text-[14px] font-medium text-white transition enabled:hover:brightness-110 disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>

        {/* ── Body: form (left) + body map (right) ──────────────────────── */}
        <div className="flex min-h-0 flex-1 items-stretch gap-4">
          {/* LEFT — blue header bar (Figma 1436:4267) + white form panel */}
          <div className="flex min-w-px flex-1 flex-col overflow-hidden rounded-3xl bg-[var(--theme-primary)]">
            {/* Header: unknown-patient toggle + quick capture actions */}
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <label className="flex cursor-pointer items-center gap-2 text-[14px] font-medium text-white">
                <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
                  <input
                    type="checkbox"
                    checked={form.unknownIdentity}
                    onChange={(e) => set("unknownIdentity", e.target.checked)}
                    className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[5px] border-2 border-white bg-transparent transition checked:bg-white"
                  />
                  <IconCheck
                    className="pointer-events-none absolute h-3 w-3 text-[var(--theme-primary)] opacity-0 peer-checked:opacity-100"
                    stroke={3.5}
                  />
                </span>
                ผู้ป่วยไม่ทราบตัวตน
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={form.unknownIdentity}
                  onClick={() => setScanning(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[14px] text-black transition enabled:hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconCreditCard className="h-5 w-5" stroke={1.75} />
                  สแกนบัตรประชาชน
                </button>
                <button
                  type="button"
                  disabled={form.unknownIdentity}
                  onClick={() => setCapturing(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[14px] text-black transition enabled:hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconCamera className="h-5 w-5" stroke={1.75} />
                  ถ่ายภาพบัตรประชาชน
                </button>
                <button
                  type="button"
                  disabled={form.unknownIdentity}
                  onClick={() => setSearching(true)}
                  aria-label="ค้นหาผู้ป่วย"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition enabled:hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconSearch className="h-5 w-5" stroke={1.75} />
                </button>
              </div>
            </div>

            {/* White form panel */}
            <div className="min-h-0 flex-1 overflow-y-auto rounded-t-3xl bg-white">
              {/* Identity area — unknown walk-ins get a minimal HN + เพศ
                  row; a fully-identified patient gets the avatar layout
                  (Figma 1454:3768) with the full identity fields. */}
              {form.unknownIdentity ? (
                <div className="flex items-start gap-4 border-b border-[var(--theme-neutral)]/12 p-6">
                  <div className="min-w-px flex-1">
                    <Field label="HN">
                      <HNInput value={form.hn} onChange={(v) => set("hn", v)} onGenerate={generateHN} />
                    </Field>
                  </div>
                  <div className="min-w-px flex-1">
                    <Field label="เพศ">
                      <FormSelect
                        value={form.gender}
                        onChange={(v) => set("gender", v)}
                        placeholder="เลือกเพศ"
                        options={[
                          { value: "M", label: "ชาย" },
                          { value: "F", label: "หญิง" },
                        ]}
                        triggerClassName="h-10 rounded-xl px-3 text-[14px]"
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <FullIdentityBlock form={form} set={set} onGenerate={generateHN} />
              )}
              {/* Remaining sections */}
              <div className="flex flex-col gap-6 p-6">
                <EmergencySection form={form} set={set} />
                <VitalsSection form={form} set={set} />
                {!form.unknownIdentity && (
                  <>
                    <ContactSection form={form} set={set} />
                    <HistorySection form={form} set={set} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — body map */}
          <div className="flex w-[381px] shrink-0 flex-col gap-4 overflow-y-auto rounded-3xl bg-white px-6 pt-6">
            {/* Front / back tabs */}
            <div className="flex w-full items-center gap-0.5 rounded-[28px] bg-[#ebebec] p-1">
              {(["front", "back"] as Side[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={[
                    "flex flex-1 items-center justify-center rounded-[24px] px-3 py-1.5 text-[14px] font-medium transition",
                    side === s
                      ? "bg-white text-[#18181b] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                      : "text-[#71717a]",
                  ].join(" ")}
                >
                  {s === "front" ? "ด้านหน้า" : "ด้านหลัง"} ({sidePointsCount(points, s)} จุด)
                </button>
              ))}
            </div>

            {/* Body diagram — click to drop a pain point */}
            <div className="relative h-[560px] w-full overflow-hidden">
              <div
                className="relative h-full w-full cursor-crosshair"
                onClick={addPoint}
              >
                <img
                  src={BODY_FRONT}
                  alt="แผนภาพร่างกาย"
                  className={`pointer-events-none absolute left-0 top-0 w-full select-none ${side === "back" ? "-scale-x-100" : ""}`}
                  draggable={false}
                />
                {sidePoints.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(p.id);
                    }}
                    style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    aria-label={`${p.type} ระดับ ${p.severity}/10`}
                  >
                    <span className="relative flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff383c]/60" />
                      <span
                        className={`relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-[#ff383c] ${selectedId === p.id ? "ring-2 ring-[#ff383c]/40" : ""}`}
                      />
                    </span>
                    {selectedId === p.id && (
                      <span className="absolute left-5 top-1/2 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-lg bg-white px-2 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                        <IconFlame className="h-4 w-4 text-[#ff383c]" stroke={2} />
                        <span className="text-left leading-tight">
                          <span className="block text-[13px] font-bold text-[#ff383c]">
                            {p.type}
                          </span>
                          <span className="block text-[11px] text-black/60">
                            ระดับ {p.severity}/10
                          </span>
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected-point editor */}
            {selected ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-[var(--theme-neutral)]/15 bg-[var(--theme-base)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--theme-neutral)]">
                    จุดที่เลือก
                  </span>
                  <button
                    type="button"
                    onClick={() => removePoint(selected.id)}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium text-[#ff383c] transition hover:bg-[#ff383c]/10"
                  >
                    <IconTrash className="h-3.5 w-3.5" stroke={2} />
                    ลบ
                  </button>
                </div>
                <Field label="ชนิดอาการ">
                  <FormSelect
                    value={selected.type}
                    onChange={(v) => updatePoint(selected.id, { type: v })}
                    options={PAIN_TYPES.map((t) => ({ value: t, label: t }))}
                    triggerClassName="h-10 rounded-xl px-3 text-[14px]"
                  />
                </Field>
                <Field label={`ระดับความปวด: ${selected.severity}/10`}>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={selected.severity}
                    onChange={(e) =>
                      updatePoint(selected.id, { severity: Number(e.target.value) })
                    }
                    className="w-full accent-[#ff383c]"
                  />
                </Field>
              </div>
            ) : (
              <p className="pb-4 text-center text-[13px] text-[var(--theme-neutral)]/50">
                แตะบนภาพร่างกายเพื่อระบุตำแหน่งที่มีอาการ
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Smart-card scan overlay — reuses the shared ScanningCardView. */}
      {scanning && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="flex h-[440px] w-full max-w-[680px] flex-col rounded-3xl bg-[var(--theme-surface)] p-6 shadow-[var(--theme-shadow-md)]">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[var(--theme-neutral)]">
                สแกนบัตรประชาชน
              </h3>
              <button
                type="button"
                onClick={() => setScanning(false)}
                aria-label="ปิด"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-neutral)]/8"
              >
                <IconX className="h-4 w-4" stroke={2} />
              </button>
            </div>
            <ScanningCardView onDone={onScanDone} />
          </div>
        </div>
      )}

      {/* Camera / OCR capture overlay — reuses the shared CameraCaptureView. */}
      {capturing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-[760px] flex-col rounded-3xl bg-[var(--theme-surface)] p-6 shadow-[var(--theme-shadow-md)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[var(--theme-neutral)]">
                ถ่ายภาพบัตรประชาชน (OCR)
              </h3>
              <button
                type="button"
                onClick={() => setCapturing(false)}
                aria-label="ปิด"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-neutral)]/8"
              >
                <IconX className="h-4 w-4" stroke={2} />
              </button>
            </div>
            <div className="flex min-h-[420px] flex-1 flex-col">
              <CameraCaptureView
                onCapture={onOcrDone}
                onPickFile={() => ocrFileRef.current?.click()}
                onCancel={() => setCapturing(false)}
              />
            </div>
          </div>
        </div>
      )}
      <input
        ref={ocrFileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) onOcrDone();
          e.target.value = "";
        }}
      />

      {/* Patient search popup (Figma 1485:3834) */}
      {searching && (
        <PatientSearchModal onClose={() => setSearching(false)} onSelect={onPickPatient} />
      )}
    </div>
  );
}

// Deterministic random portrait per patient (randomuser.me), keyed by gender
// + list index so each result row gets a distinct face.
function portraitUrl(gender: string, index: number): string {
  const bucket = gender === "F" ? "women" : "men";
  const n = (index * 7 + 3) % 90;
  return `https://randomuser.me/api/portraits/${bucket}/${n}.jpg`;
}

// ── Patient search popup (Figma 1485:3834) ────────────────────────────────
function PatientSearchModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (p: Patient, photo: string) => void;
}) {
  const [q, setQ] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => () => recRef.current?.stop(), []);

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      recRef.current = null;
      setListening(false);
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return; // unsupported browser — typing still works
    const rec = new Ctor();
    rec.lang = "th-TH";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = (last?.[0]?.transcript ?? "").trim();
      if (text) setQ(text);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PATIENTS;
    return PATIENTS.filter(
      (p) =>
        p.hn.toLowerCase().includes(s) ||
        p.citizenId.includes(s) ||
        `${p.prefix}${p.firstName} ${p.lastName}`.toLowerCase().includes(s),
    );
  }, [q]);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[76vh] w-full max-w-[700px] flex-col gap-4 rounded-3xl bg-white p-6 shadow-[var(--theme-shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search row — matches the app's global search bar style */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-[var(--theme-neutral)]/20 bg-white py-1.5 pl-5 pr-1.5">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหา HN, เลขบัตรประชาชน, ชื่อ-นามสกุล..."
              className="min-w-px flex-1 bg-transparent text-[16px] text-[var(--theme-neutral)] outline-none placeholder:text-[var(--theme-neutral)]/45"
            />
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary)] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
              <IconArrowUp className="h-6 w-6" stroke={2} />
            </span>
          </div>
          <button
            type="button"
            onClick={toggleMic}
            aria-label="ค้นหาด้วยเสียง"
            aria-pressed={listening}
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition",
              listening
                ? "animate-pulse border-[#ff383c] bg-[#ff383c] text-white"
                : "border-[var(--theme-neutral)]/20 text-[var(--theme-neutral)]/70 hover:bg-[var(--theme-neutral)]/5 hover:text-[var(--theme-primary)]",
            ].join(" ")}
          >
            <IconMicrophone className="h-6 w-6" stroke={1.75} />
          </button>
        </div>

        {/* Results */}
        <div className="-mx-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
          {results.length === 0 ? (
            <p className="py-12 text-center text-[14px] text-[var(--theme-neutral)]/50">
              ไม่พบผู้ป่วยที่ตรงกับคำค้นหา
            </p>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p, portraitUrl(p.gender, i))}
                className="flex items-center gap-4 border-b border-[#eee] px-6 py-4 text-left transition hover:bg-[var(--theme-neutral)]/[0.04]"
              >
                <img
                  src={portraitUrl(p.gender, i)}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full bg-[var(--theme-neutral)]/10 object-cover"
                />
                <span className="flex min-w-px flex-1 flex-col gap-1">
                  <span className="text-[16px] text-black/80">
                    {p.prefix}
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-[12px] text-black/80">{p.citizenId}</span>
                </span>
                <span className="shrink-0 text-[16px] text-black/80">HN : {p.hn}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function sidePointsCount(points: PainPoint[], side: Side) {
  return points.filter((p) => p.side === side).length;
}

// ── Shared field primitives ────────────────────────────────────────────────
const INPUT_CLS =
  "h-10 w-full rounded-xl border border-[var(--theme-neutral)]/20 bg-white px-3 text-[14px] text-[var(--theme-neutral)] outline-none transition focus:border-[var(--theme-primary)] placeholder:text-[var(--theme-neutral)]/40";

interface SelectOption {
  value: string;
  label: string;
  Icon?: typeof IconCheck;
  danger?: boolean;
}

/** Custom dropdown styled like the design-system action menu — white rounded
 *  card, icon + label rows, optional danger item. Replaces native <select>
 *  so the menu can be themed (which a native <select> popup cannot). */
function FormSelect({
  value,
  onChange,
  options,
  placeholder = "— เลือก —",
  triggerClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  triggerClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "flex w-full items-center justify-between gap-2 bg-white outline-none transition border",
          open ? "border-[var(--theme-primary)]" : "border-[var(--theme-neutral)]/20",
          triggerClassName,
        ].join(" ")}
      >
        <span className={selected ? "text-[var(--theme-neutral)]" : "text-[var(--theme-neutral)]/40"}>
          {selected ? selected.label : placeholder}
        </span>
        <IconChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--theme-neutral)]/50 transition-transform ${open ? "rotate-180" : ""}`}
          stroke={2}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border border-[var(--theme-neutral)]/10 bg-white py-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.14)]"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] transition",
                  o.danger
                    ? "text-[#ff383c] hover:bg-[#ff383c]/8"
                    : "text-[var(--theme-neutral)] hover:bg-[var(--theme-neutral)]/6",
                  active && !o.danger ? "bg-[var(--theme-primary)]/8" : "",
                ].join(" ")}
              >
                {o.Icon && <o.Icon className="h-5 w-5 shrink-0" stroke={1.75} />}
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-[var(--theme-neutral)]/70">
        {label}
        {required && <span className="ml-0.5 text-[#ff383c]">*</span>}
      </span>
      {children}
    </label>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-[15px] font-bold text-[var(--theme-neutral)]">{title}</h3>
      {children}
    </section>
  );
}

type SectionProps = {
  form: ERForm;
  set: <K extends keyof ERForm>(key: K, value: ERForm[K]) => void;
};

/** HN text field with the in-line "random HN" generate button. Shared by the
 *  unknown-walk-in row and the full identity block. */
function HNInput({
  value,
  onChange,
  onGenerate,
}: {
  value: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--theme-neutral)]/20 bg-white pl-3 pr-1 transition focus-within:border-[var(--theme-primary)]">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="เลข HN"
        className="min-w-px flex-1 bg-transparent text-[14px] text-[var(--theme-neutral)] outline-none placeholder:text-[var(--theme-neutral)]/40"
      />
      <button
        type="button"
        onClick={onGenerate}
        aria-label="สุ่มเลข HN"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-primary)] text-white transition hover:brightness-110"
      >
        <IconArrowsShuffle className="h-5 w-5" stroke={2} />
      </button>
    </div>
  );
}

/** Full identity block for an identified patient (Figma 1454:3768) — profile
 *  photo on the left, HN + prefix beside it, then the rest of the identity
 *  fields in a two-column grid. */
function FullIdentityBlock({
  form,
  set,
  onGenerate,
}: SectionProps & { onGenerate: () => void }) {
  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("photo", String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-6 border-b border-[var(--theme-neutral)]/12 p-6">
      <div className="flex items-center gap-6">
        {/* Profile photo upload */}
        <div className="flex flex-1 items-center justify-center">
          <label className="group relative h-40 w-40 cursor-pointer overflow-hidden rounded-full bg-[var(--theme-neutral)]/8 transition hover:bg-[var(--theme-neutral)]/12">
            {form.photo ? (
              <img src={form.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--theme-neutral)]/40">
                <IconCamera className="h-8 w-8" stroke={1.5} />
                <span className="text-[12px] font-medium">เพิ่มรูปโปรไฟล์</span>
              </span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          </label>
        </div>
        {/* HN + คำนำหน้า */}
        <div className="flex flex-1 flex-col gap-4">
          <Field label="HN">
            <HNInput value={form.hn} onChange={(v) => set("hn", v)} onGenerate={onGenerate} />
          </Field>
          <Field label="คำนำหน้า">
            <FormSelect
              value={form.prefix}
              onChange={(v) => set("prefix", v)}
              placeholder="—"
              options={[
                { value: "นาย", label: "นาย" },
                { value: "นาง", label: "นาง" },
                { value: "นางสาว", label: "นางสาว" },
                { value: "ด.ช.", label: "ด.ช." },
                { value: "ด.ญ.", label: "ด.ญ." },
              ]}
              triggerClassName="h-10 rounded-xl px-3 text-[14px]"
            />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="ชื่อ" required>
          <input
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className={INPUT_CLS}
          />
        </Field>
        <Field label="นามสกุล">
          <input
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            className={INPUT_CLS}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="เลขบัตรประชาชน">
          <input
            value={form.cid}
            onChange={(e) => set("cid", e.target.value.replace(/\D/g, "").slice(0, 13))}
            inputMode="numeric"
            placeholder="x-xxxx-xxxxx-xx-x"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="วันเกิด">
          <DatePicker
            value={form.birthDate}
            onChange={(v) => set("birthDate", v)}
            placeholder="เลือกวันเกิด"
          />
        </Field>
        <Field label="เพศ">
          <FormSelect
            value={form.gender}
            onChange={(v) => set("gender", v)}
            placeholder="เลือกเพศ"
            options={[
              { value: "M", label: "ชาย" },
              { value: "F", label: "หญิง" },
            ]}
            triggerClassName="h-10 rounded-xl px-3 text-[14px]"
          />
        </Field>
        <Field label="สิทธิการรักษา">
          <FormSelect
            value={form.insurance}
            onChange={(v) => set("insurance", v)}
            options={[
              { value: "uc", label: "บัตรทอง (UC)" },
              { value: "sss", label: "ประกันสังคม" },
              { value: "ocsc", label: "ข้าราชการ" },
              { value: "self", label: "ชำระเงินเอง" },
            ]}
            triggerClassName="h-10 rounded-xl px-3 text-[14px]"
          />
        </Field>
        <Field label="เชื้อชาติ">
          <FormSelect
            value={form.ethnicity}
            onChange={(v) => set("ethnicity", v)}
            options={[
              { value: "ไทย", label: "ไทย" },
              { value: "จีน", label: "จีน" },
              { value: "ลาว", label: "ลาว" },
              { value: "เขมร", label: "เขมร" },
              { value: "มลายู", label: "มลายู" },
              { value: "พม่า", label: "พม่า" },
              { value: "อื่น ๆ", label: "อื่น ๆ" },
            ]}
            triggerClassName="h-10 rounded-xl px-3 text-[14px]"
          />
        </Field>
        <Field label="สัญชาติ">
          <FormSelect
            value={form.nationality}
            onChange={(v) => set("nationality", v)}
            options={[
              { value: "ไทย", label: "ไทย" },
              { value: "ลาว", label: "ลาว" },
              { value: "กัมพูชา", label: "กัมพูชา" },
              { value: "เมียนมา", label: "เมียนมา" },
              { value: "จีน", label: "จีน" },
              { value: "อื่น ๆ", label: "อื่น ๆ" },
            ]}
            triggerClassName="h-10 rounded-xl px-3 text-[14px]"
          />
        </Field>
        <Field label="ศาสนา">
          <FormSelect
            value={form.religion}
            onChange={(v) => set("religion", v)}
            options={[
              { value: "พุทธ", label: "พุทธ" },
              { value: "อิสลาม", label: "อิสลาม" },
              { value: "คริสต์", label: "คริสต์" },
              { value: "ฮินดู", label: "ฮินดู" },
              { value: "ซิกข์", label: "ซิกข์" },
              { value: "ไม่นับถือ", label: "ไม่นับถือศาสนา" },
              { value: "อื่น ๆ", label: "อื่น ๆ" },
            ]}
            triggerClassName="h-10 rounded-xl px-3 text-[14px]"
          />
        </Field>
        <Field label="สถานภาพ">
          <FormSelect
            value={form.maritalStatus}
            onChange={(v) => set("maritalStatus", v)}
            placeholder="— เลือก —"
            options={[
              { value: "single", label: "โสด" },
              { value: "married", label: "คู่ (สมรส)" },
              { value: "widowed", label: "หม้าย" },
              { value: "divorced", label: "หย่าร้าง" },
              { value: "separated", label: "แยกกันอยู่" },
            ]}
            triggerClassName="h-10 rounded-xl px-3 text-[14px]"
          />
        </Field>
        <Field label="หมู่เลือด">
          <FormSelect
            value={form.bloodGroup}
            onChange={(v) => set("bloodGroup", v)}
            placeholder="— เลือก —"
            options={[
              { value: "A", label: "A" },
              { value: "B", label: "B" },
              { value: "AB", label: "AB" },
              { value: "O", label: "O" },
              { value: "unknown", label: "ไม่ทราบ" },
            ]}
            triggerClassName="h-10 rounded-xl px-3 text-[14px]"
          />
        </Field>
      </div>
    </div>
  );
}

function EmergencySection({ form, set }: SectionProps) {
  return (
    <SectionCard title="ข้อมูลการมา ER">
      <Field label="ระดับความเร่งด่วน (Triage)" required>
        <div className="flex flex-col gap-2">
          {/* Gradient triage bar — selected level is a white pill (Figma 1488:3820) */}
          <div
            className="flex items-center rounded-full p-1"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #ef4444 8%, #fa7315 24%, #ebb30b 48%, #22c55e 75%, #3b83f6 91%)",
            }}
          >
            {TRIAGE.map((t, i) => {
              const active = form.triage === t.level;
              const align =
                i === 0 ? "justify-start" : i === TRIAGE.length - 1 ? "justify-end" : "justify-center";
              return (
                <div key={t.level} className={`flex flex-1 ${align}`}>
                  <button
                    type="button"
                    onClick={() => set("triage", t.level)}
                    aria-label={`Triage ${t.level} — ${t.label}`}
                    aria-pressed={active}
                    className={[
                      "flex h-12 w-12 items-center justify-center rounded-full text-[22px] font-bold text-black outline-none transition",
                      active
                        ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
                        : "hover:bg-white/25",
                    ].join(" ")}
                  >
                    {t.level}
                  </button>
                </div>
              );
            })}
          </div>
          {/* Labels share the same columns/alignment so each sits under its number */}
          <div className="flex px-1 text-[14px] text-[var(--theme-neutral)]">
            {TRIAGE.map((t, i) => (
              <span
                key={t.level}
                className={[
                  "flex-1",
                  i === 0 ? "text-left" : i === TRIAGE.length - 1 ? "text-right" : "text-center",
                ].join(" ")}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </Field>
      <Field label="ช่องทางการมา">
        <div className="grid grid-cols-2 gap-2">
          {ARRIVAL.map((a) => {
            const active = form.arrival === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => set("arrival", a.key)}
                className={[
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition",
                  active
                    ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]"
                    : "border-[var(--theme-neutral)]/20 text-[var(--theme-neutral)]/70 hover:border-[var(--theme-primary)]/40",
                ].join(" ")}
              >
                <a.Icon className="h-4 w-4" stroke={1.75} />
                {a.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="วันเวลาที่มาถึง">
        <input
          type="datetime-local"
          value={form.arrivalTime}
          onChange={(e) => set("arrivalTime", e.target.value)}
          className={INPUT_CLS}
        />
      </Field>
      <Field label="อาการสำคัญ (Chief complaint)" required>
        <textarea
          value={form.chiefComplaint}
          onChange={(e) => set("chiefComplaint", e.target.value)}
          rows={2}
          placeholder="เช่น เจ็บแน่นหน้าอก 30 นาที ก่อนมา รพ."
          className={`${INPUT_CLS} h-auto resize-none py-2`}
        />
      </Field>
    </SectionCard>
  );
}

function VitalsSection({ form, set }: SectionProps) {
  return (
    <SectionCard title="สัญญาณชีพแรกรับ">
      <div className="grid grid-cols-3 gap-4">
        <Field label="ความดัน (SBP)">
          <input value={form.sbp} onChange={(e) => set("sbp", e.target.value)} inputMode="numeric" className={INPUT_CLS} />
        </Field>
        <Field label="ความดัน (DBP)">
          <input value={form.dbp} onChange={(e) => set("dbp", e.target.value)} inputMode="numeric" className={INPUT_CLS} />
        </Field>
        <Field label="ชีพจร (/min)">
          <input value={form.pulse} onChange={(e) => set("pulse", e.target.value)} inputMode="numeric" className={INPUT_CLS} />
        </Field>
        <Field label="อุณหภูมิ (°C)">
          <input value={form.temp} onChange={(e) => set("temp", e.target.value)} inputMode="decimal" className={INPUT_CLS} />
        </Field>
        <Field label="อัตราหายใจ (/min)">
          <input value={form.rr} onChange={(e) => set("rr", e.target.value)} inputMode="numeric" className={INPUT_CLS} />
        </Field>
        <Field label="SpO₂ (%)">
          <input value={form.spo2} onChange={(e) => set("spo2", e.target.value)} inputMode="numeric" className={INPUT_CLS} />
        </Field>
      </div>
      <Field label="ระดับความรู้สึกตัว">
        <FormSelect
          value={form.consciousness}
          onChange={(v) => set("consciousness", v)}
          options={[
            { value: "A", label: "A — รู้สึกตัวดี (Alert)" },
            { value: "V", label: "V — ตอบสนองต่อเสียง (Voice)" },
            { value: "P", label: "P — ตอบสนองต่อความเจ็บ (Pain)" },
            { value: "U", label: "U — ไม่ตอบสนอง (Unresponsive)" },
          ]}
          triggerClassName="h-10 rounded-xl px-3 text-[14px]"
        />
      </Field>
    </SectionCard>
  );
}

function ContactSection({ form, set }: SectionProps) {
  return (
    <SectionCard title="ผู้ติดต่อฉุกเฉิน">
      <div className="grid grid-cols-3 gap-4">
        <Field label="ชื่อผู้ติดต่อ">
          <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className={INPUT_CLS} />
        </Field>
        <Field label="ความสัมพันธ์">
          <input value={form.contactRelation} onChange={(e) => set("contactRelation", e.target.value)} className={INPUT_CLS} />
        </Field>
        <Field label="เบอร์โทร">
          <input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} inputMode="tel" className={INPUT_CLS} />
        </Field>
      </div>
    </SectionCard>
  );
}

function HistorySection({ form, set }: SectionProps) {
  return (
    <SectionCard title="ประวัติสำคัญ">
      <Field label="ประวัติแพ้ยา / อาหาร">
        <input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="เช่น Penicillin (ผื่น)" className={INPUT_CLS} />
      </Field>
      <Field label="โรคประจำตัว">
        <input value={form.chronic} onChange={(e) => set("chronic", e.target.value)} placeholder="เช่น เบาหวาน, ความดันโลหิตสูง" className={INPUT_CLS} />
      </Field>
      <Field label="ยาที่ใช้ประจำ">
        <input value={form.currentMeds} onChange={(e) => set("currentMeds", e.target.value)} className={INPUT_CLS} />
      </Field>
    </SectionCard>
  );
}
