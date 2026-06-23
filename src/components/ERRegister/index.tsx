import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  IconZoomReset,
  IconPlus,
  IconMinus,
  IconUser,
  IconUserScan,
  IconCircle,
  IconHeartbeat,
  IconPhone,
  IconClipboardText,
  IconRestore,
  IconClockHour4,
  IconLoader2,
  IconSparkles,
} from "@tabler/icons-react";
import { PATIENTS, type Patient } from "../../data/mock/patients";
import { useSidebar } from "../../contexts/SidebarContext";
import { useToast } from "../../contexts/ToastContext";
import { chatJSON } from "../../services/ai/llm";
import DatePicker from "../DatePicker";
import { ScanningCardView, CameraCaptureView } from "../NewPatientByVoice";
import BODY_FRONT from "../../assets/figma/body/adult-man-front.svg";
import BODY_BACK from "../../assets/figma/body/adult-man-back.svg";
import { BODY_VIEWBOX, BODY_VIEWBOX_BACK, BODY_REGIONS } from "../../data/bodyRegions";

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

// ER attending physicians (mock) — picked by the nurse on the review step.
const ER_DOCTORS = [
  { value: "d1", label: "พญ. สุดารัตน์ ทองดี", sub: "เวชศาสตร์ฉุกเฉิน · เวรเช้า" },
  { value: "d2", label: "นพ. ธีรพงษ์ วัฒนา", sub: "อายุรกรรม · เวรบ่าย" },
  { value: "d3", label: "นพ. อนุชา ใจกล้า", sub: "Resuscitation · เวรประจำ" },
  { value: "d4", label: "พญ. ปิยะดา ศรีสุข", sub: "ศัลยกรรม · เวรดึก" },
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
  /** nearest anatomical region label (front view), e.g. "ต้นขาซ้าย". */
  location?: string;
}

/** Region landmark centres (viewBox coords) used to name a clicked point. */
type RegionCenter = { label: string; cx: number; cy: number };

// Front: reuse the shared taxonomy from data/bodyRegions.
const FRONT_REGION_CENTERS: RegionCenter[] = BODY_REGIONS.map((r) => ({
  label: r.labelTh,
  cx: r.shape.kind === "ellipse" ? r.shape.cx : r.shape.x + r.shape.w / 2,
  cy: r.shape.kind === "ellipse" ? r.shape.cy : r.shape.y + r.shape.h / 2,
}));

// Back: landmark lattice for the adult-man-back figure (viewBox 358×948).
// Coordinates placed against the figure silhouette; "ขวา/ซ้าย" follow the
// patient's own side (anatomical), which for a back view is mirrored on screen.
const BACK_REGION_CENTERS: RegionCenter[] = [
  { label: "ท้ายทอย", cx: 160, cy: 65 },
  { label: "ต้นคอด้านหลัง", cx: 155, cy: 120 },
  { label: "ไหล่ขวา", cx: 235, cy: 175 },
  { label: "ไหล่ซ้าย", cx: 95, cy: 175 },
  { label: "สะบักขวา", cx: 198, cy: 235 },
  { label: "สะบักซ้าย", cx: 122, cy: 235 },
  { label: "ต้นแขนขวา", cx: 265, cy: 255 },
  { label: "ต้นแขนซ้าย", cx: 60, cy: 255 },
  { label: "กลางหลัง", cx: 158, cy: 305 },
  { label: "ปลายแขนขวา", cx: 295, cy: 380 },
  { label: "ปลายแขนซ้าย", cx: 45, cy: 380 },
  { label: "บั้นเอวขวา", cx: 195, cy: 370 },
  { label: "บั้นเอวซ้าย", cx: 125, cy: 370 },
  { label: "หลังส่วนล่าง (เอว)", cx: 160, cy: 380 },
  { label: "มือขวา", cx: 320, cy: 455 },
  { label: "มือซ้าย", cx: 40, cy: 455 },
  { label: "ก้นขวา", cx: 193, cy: 455 },
  { label: "ก้นซ้าย", cx: 127, cy: 455 },
  { label: "ต้นขาด้านหลังขวา", cx: 193, cy: 560 },
  { label: "ต้นขาด้านหลังซ้าย", cx: 127, cy: 560 },
  { label: "ข้อพับเข่าขวา", cx: 180, cy: 668 },
  { label: "ข้อพับเข่าซ้าย", cx: 115, cy: 668 },
  { label: "น่องขวา", cx: 175, cy: 775 },
  { label: "น่องซ้าย", cx: 110, cy: 775 },
  { label: "ข้อเท้าขวา", cx: 173, cy: 865 },
  { label: "ข้อเท้าซ้าย", cx: 112, cy: 865 },
  { label: "ส้นเท้า/เท้าขวา", cx: 173, cy: 915 },
  { label: "ส้นเท้า/เท้าซ้าย", cx: 112, cy: 915 },
];

/** Map a click (figure-relative %) to the nearest anatomical region's label —
 *  works for both front and back views. */
function nearestRegionLabel(xPct: number, yPct: number, side: Side): string | undefined {
  const back = side === "back";
  const centers = back ? BACK_REGION_CENTERS : FRONT_REGION_CENTERS;
  const vb = back ? BODY_VIEWBOX_BACK : BODY_VIEWBOX;
  const vx = (xPct / 100) * vb.width;
  const vy = (yPct / 100) * vb.height;
  let best: { label: string; d: number } | null = null;
  for (const c of centers) {
    const d = (c.cx - vx) ** 2 + (c.cy - vy) ** 2;
    if (!best || d < best.d) best = { label: c.label, d };
  }
  return best?.label;
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
  arrivalDate: string;
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
  arrivalDate: "",
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

/** Shared signal for per-field voice-fill indicators: which form keys were
 *  filled by dictation, and whether an extraction is currently running. */
const VoiceFillContext = createContext<{ fillingKey: string | null; filled: Set<string> }>({
  fillingKey: null,
  filled: new Set<string>(),
});

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Fresh form with arrival date/time defaulted to "now". */
function freshForm(): ERForm {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    ...INIT,
    arrivalDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    arrivalTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

export default function ERRegister() {
  const navigate = useNavigate();
  const toast = useToast();
  const { railHidden } = useSidebar();

  const [form, setForm] = useState<ERForm>(freshForm);
  // Latest form value for async voice-fill comparisons (avoids stale closures).
  const formRef = useRef(form);
  formRef.current = form;
  const set = <K extends keyof ERForm>(key: K, value: ERForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const [scanning, setScanning] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const ocrFileRef = useRef<HTMLInputElement>(null);

  // Voice form-fill: dictate (Web Speech API) → LLM extracts structured fields
  // (incl. selects) → fills the form LIVE while speaking (debounced, no wait).
  const [recording, setRecording] = useState(false);
  // The field key currently being written (shows a spinner on that one field).
  const [fillingKey, setFillingKey] = useState<string | null>(null);
  const [voiceFilledKeys, setVoiceFilledKeys] = useState<Set<string>>(() => new Set());
  const filledKeysRef = useRef<Set<string>>(new Set());
  const recRef = useRef<SpeechRec | null>(null);
  const voiceTextRef = useRef("");
  const extractTimerRef = useRef<number | null>(null);
  const extractBusyRef = useRef(false);
  const lastExtractedRef = useRef("");
  useEffect(() => () => recRef.current?.stop(), []);

  const toggleDictation = () => {
    if (recording) {
      recRef.current?.stop();
      recRef.current = null;
      setRecording(false);
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("เบราว์เซอร์ไม่รองรับการบันทึกเสียง", "พิมพ์ข้อมูลด้วยตนเองได้");
      return;
    }
    const rec = new Ctor();
    rec.lang = "th-TH";
    rec.continuous = true;
    rec.interimResults = true;
    voiceTextRef.current = "";
    lastExtractedRef.current = "";
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      voiceTextRef.current = transcript.trim();
      // Debounce: extract ~700ms after the speaker pauses, so fields fill live.
      if (extractTimerRef.current) window.clearTimeout(extractTimerRef.current);
      extractTimerRef.current = window.setTimeout(() => runExtract(voiceTextRef.current), 700);
    };
    rec.onend = () => {
      setRecording(false);
      if (extractTimerRef.current) window.clearTimeout(extractTimerRef.current);
      runExtract(voiceTextRef.current); // final pass on the full transcript
    };
    recRef.current = rec;
    rec.start();
    setRecording(true);
  };

  // Send the (partial) dictated text to the LLM and merge the result into the
  // form. Runs in the background — only one request in flight at a time.
  const runExtract = async (text: string) => {
    const t = text.trim();
    if (!t || t === lastExtractedRef.current || extractBusyRef.current) return;
    extractBusyRef.current = true;
    lastExtractedRef.current = t;
    try {
      const data = await chatJSON<Record<string, unknown>>(
        [
          {
            role: "system",
            content:
              "คุณเป็นผู้ช่วยแยกข้อมูลผู้ป่วยห้องฉุกเฉินจากคำพูดภาษาไทย " +
              "ตอบกลับเป็น JSON object เท่านั้น ใส่เฉพาะคีย์ที่พูดถึงจริง (เว้นคีย์ที่ไม่ทราบ) " +
              "คีย์และค่าที่อนุญาต: " +
              "prefix(นาย|นาง|นางสาว|ด.ช.|ด.ญ.), firstName, lastName, " +
              "gender(M=ชาย|F=หญิง), cid(เลข 13 หลัก), " +
              "birthDate(วันเกิด รูปแบบ YYYY-MM-DD เป็น ค.ศ. เท่านั้น — ถ้าพูดเป็น พ.ศ. ให้ลบ 543, แปลงชื่อเดือนไทยเป็นเลข), " +
              "insurance(uc=บัตรทอง|sss=ประกันสังคม|ocsc=ข้าราชการ|self=ชำระเงินเอง), " +
              "maritalStatus(single|married|widowed|divorced|separated), " +
              "bloodGroup(A|B|AB|O|unknown), triage(1-5 ตัวเลข), " +
              "arrival(walk=เดินมาเอง|ems=รถพยาบาล|refer=ส่งต่อ|police=ตำรวจ), " +
              "chiefComplaint(อาการสำคัญ), sbp, dbp, pulse, temp, rr, spo2 (ตัวเลขล้วน), " +
              "consciousness, contactName, contactRelation, contactPhone, allergies, chronic, currentMeds",
          },
          { role: "user", content: t },
        ],
        { fast: true },
      );
      await applyVoiceExtract(data, t);
    } catch {
      // LLM unreachable — keep the raw transcript in the chief complaint.
      set("chiefComplaint", t);
    } finally {
      extractBusyRef.current = false;
      // If more speech arrived while we were busy, extract the latest now.
      const latest = voiceTextRef.current.trim();
      if (latest && latest !== lastExtractedRef.current) runExtract(latest);
    }
  };

  // Whitelist + type-guard the LLM output, then fill the form ONE FIELD AT A
  // TIME — each target field shows a spinner while it's written, then a
  // sparkles badge once done.
  const applyVoiceExtract = async (data: Record<string, unknown>, rawText: string) => {
    const strKeys: (keyof ERForm)[] = [
      "prefix", "firstName", "lastName", "gender", "cid", "birthDate", "insurance",
      "maritalStatus", "bloodGroup", "arrival", "chiefComplaint",
      "sbp", "dbp", "pulse", "temp", "rr", "spo2", "consciousness",
      "contactName", "contactRelation", "contactPhone", "allergies", "chronic", "currentMeds",
    ];
    // Build the ordered work-list: include a field only when the spoken value
    // DIFFERS from what's already in the form — so saying something new
    // overwrites the old value, but unchanged fields don't re-animate.
    const cur = formRef.current;
    const entries: { key: keyof ERForm; value: string | number }[] = [];
    for (const k of strKeys) {
      const v = data[k];
      let val: string | null = null;
      if (typeof v === "string" && v.trim()) val = v.trim();
      else if (typeof v === "number") val = String(v);
      if (val == null) continue;
      if (k === "birthDate") {
        const bd = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (bd && Number(bd[1]) > 2300) val = `${Number(bd[1]) - 543}-${bd[2]}-${bd[3]}`;
      }
      if (String(cur[k] ?? "") === val) continue; // unchanged → skip
      entries.push({ key: k, value: val });
    }
    const tri = Number(data.triage);
    if (tri >= 1 && tri <= 5 && cur.triage !== tri) {
      entries.push({ key: "triage", value: tri });
    }
    // Fall back to dropping the raw transcript into the chief complaint.
    if (
      !entries.some((e) => e.key === "chiefComplaint") &&
      !cur.chiefComplaint.trim() &&
      rawText
    ) {
      entries.push({ key: "chiefComplaint", value: rawText });
    }

    // Write them sequentially with a brief spinner on the active field.
    for (const e of entries) {
      setFillingKey(e.key);
      await sleep(420);
      setForm((f) => {
        const n = { ...f };
        if (e.key === "triage") n.triage = e.value as number;
        else (n[e.key] as string) = e.value as string;
        return n;
      });
      filledKeysRef.current.add(e.key);
      setVoiceFilledKeys(new Set(filledKeysRef.current));
      setFillingKey(null);
      await sleep(140);
    }
  };

  // Clear the whole form + body map back to a fresh start.
  const doReset = () => {
    if (recording) {
      recRef.current?.stop();
      recRef.current = null;
      setRecording(false);
    }
    setForm(freshForm());
    setPoints([]);
    setSelectedId(null);
    filledKeysRef.current = new Set();
    setVoiceFilledKeys(new Set());
    setFillingKey(null);
    resetZoom();
    setConfirmReset(false);
  };

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
      // identity (from the picked record)
      hn: p.hn,
      cid: p.citizenId,
      prefix: p.prefix,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      birthDate: p.birthDate,
      bloodGroup: p.bloodType,
      // remaining fields — mock data so every field/select is populated
      insurance: "uc",
      ethnicity: "ไทย",
      nationality: "ไทย",
      religion: "พุทธ",
      maritalStatus: "single",
      triage: 3,
      arrival: "walk",
      chiefComplaint: "ปวดศีรษะ มีไข้ต่ำ ๆ มา 2 วัน",
      sbp: "120",
      dbp: "80",
      pulse: "82",
      temp: "37.2",
      rr: "18",
      spo2: "98",
      consciousness: "A",
      contactName: "นางสาวมาลี ใจดี",
      contactRelation: "บุตรสาว",
      contactPhone: "0812345678",
      allergies: "Penicillin (ผื่นลมพิษ)",
      chronic: "เบาหวาน, ความดันโลหิตสูง",
      currentMeds: "Metformin, Amlodipine",
    }));
    // a search-picked patient isn't a voice fill — clear those indicators.
    filledKeysRef.current = new Set();
    setVoiceFilledKeys(new Set());
    setFillingKey(null);
    setSearching(false);
    toast.success("เลือกผู้ป่วยแล้ว", `${p.prefix}${p.firstName} ${p.lastName} · HN ${p.hn}`);
  };

  const [side, setSide] = useState<Side>("front");
  // Body-map zoom/pan transform (OPD focus behaviour): centre + magnify a point.
  const [tf, setTf] = useState({ scale: 1, x: 0, y: 0 });
  // Animate the transform for focus/zoom-button actions, but track 1:1 (no
  // transition) for direct drag / trackpad gestures.
  const [animate, setAnimate] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const figRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<PainPoint[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nextId, setNextId] = useState(1);

  const sidePoints = points.filter((p) => p.side === side);
  const selected = points.find((p) => p.id === selectedId) ?? null;

  const bodyFigure = side === "back" ? BODY_BACK : BODY_FRONT;
  const bodyVb = side === "back" ? BODY_VIEWBOX_BACK : BODY_VIEWBOX;

  const clampScale = (s: number) => Math.min(3, Math.max(1, s));

  // Auto-zoom so the given point (figure-relative %) sits centred — OPD focus.
  const focusOn = (xPct: number, yPct: number, sc = 2) => {
    const fig = figRef.current;
    if (!fig) return;
    const scale = clampScale(sc);
    const ox = (xPct / 100 - 0.5) * fig.offsetWidth;
    const oy = (yPct / 100 - 0.5) * fig.offsetHeight;
    setAnimate(true);
    setTf({ scale, x: -ox * scale, y: -oy * scale });
  };

  const zoomAt = (factor: number) => {
    setAnimate(true);
    setTf((prev) => {
      const scale = clampScale(prev.scale * factor);
      const k = scale / prev.scale;
      return { scale, x: prev.x * k, y: prev.y * k };
    });
  };
  const resetZoom = () => {
    setAnimate(true);
    setTf({ scale: 1, x: 0, y: 0 });
  };

  // Trackpad gestures (no button held): two-finger scroll pans, pinch zooms
  // toward the cursor. Native non-passive listener so we can preventDefault
  // the page scroll/zoom.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setAnimate(false);
      if (e.ctrlKey) {
        // pinch-to-zoom — keep the point under the cursor fixed
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left - rect.width / 2;
        const py = e.clientY - rect.top - rect.height / 2;
        setTf((prev) => {
          const scale = Math.min(3, Math.max(1, prev.scale * Math.exp(-e.deltaY * 0.01)));
          const k = scale / prev.scale;
          return { scale, x: px - (px - prev.x) * k, y: py - (py - prev.y) * k };
        });
      } else {
        // two-finger scroll — pan
        setTf((prev) => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const selectSide = (s: Side) => {
    setSide(s);
    resetZoom();
  };

  // Free drag-to-pan (no bounds). A small move = drag; a tap drops a point.
  const [panning, setPanning] = useState(false);
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean; id: number } | null>(null);
  const didPanRef = useRef(false);

  const onFigPointerDown = (e: React.PointerEvent) => {
    panRef.current = { x: e.clientX, y: e.clientY, tx: tf.x, ty: tf.y, moved: false, id: e.pointerId };
    didPanRef.current = false;
  };
  const onFigPointerMove = (e: React.PointerEvent) => {
    const d = panRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 5) {
      d.moved = true;
      didPanRef.current = true;
      setPanning(true);
      setAnimate(false);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    if (d.moved) setTf((prev) => ({ ...prev, x: d.tx + dx, y: d.ty + dy }));
  };
  const onFigPointerUp = (e: React.PointerEvent) => {
    const d = panRef.current;
    if (d && d.id === e.pointerId) {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      panRef.current = null;
      setPanning(false);
    }
  };

  const addPoint = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore the click that ends a drag-pan.
    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const id = nextId;
    const location = nearestRegionLabel(xPct, yPct, side);
    setPoints((ps) => [
      ...ps,
      { id, side, xPct, yPct, type: PAIN_TYPES[0], severity: 5, location },
    ]);
    setSelectedId(id);
    setNextId((n) => n + 1);
    focusOn(xPct, yPct);
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
  const [review, setReview] = useState(false);
  const [doctor, setDoctor] = useState("");

  const handleNext = () => {
    if (!canNext) return;
    setReview(true);
  };
  const handleConfirm = () => {
    if (!doctor) {
      toast.error("ยังไม่ได้เลือกแพทย์ผู้รับผิดชอบ", "กรุณาเลือกแพทย์ประจำแผนก ER ก่อนบันทึก");
      return;
    }
    const dr = ER_DOCTORS.find((d) => d.value === doctor);
    toast.success(
      "บันทึกข้อมูลผู้ป่วยแล้ว",
      `${form.prefix}${form.firstName} ${form.lastName} · มอบหมาย ${dr?.label ?? ""}`,
    );
    navigate("/patient/new");
  };

  return (
    <VoiceFillContext.Provider value={{ fillingKey, filled: voiceFilledKeys }}>
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
            {review ? (
              <button
                type="button"
                onClick={() => setReview(false)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3eaf3f] px-4 py-2 text-[14px] font-medium text-white"
              >
                <IconCircleCheck className="h-4 w-4" stroke={2} />
                บันทึกประวัติ
              </button>
            ) : (
              <span className="rounded-xl bg-[var(--theme-primary)]/10 px-4 py-2 text-[14px] font-medium text-[var(--theme-primary)]">
                บันทึกประวัติ
              </span>
            )}
            <IconChevronRight className="h-4 w-4 text-[var(--theme-neutral)]/40" stroke={2} />
            <span
              className={`rounded-xl px-4 py-2 text-[14px] font-medium ${
                review ? "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]" : "text-black/50"
              }`}
            >
              ตรวจสอบข้อมูล
            </span>
          </div>
          <div className="flex items-center gap-3">
            {review ? (
              <>
                <button
                  type="button"
                  onClick={() => setReview(false)}
                  className="rounded-full px-4 py-2 text-[14px] font-medium text-black transition hover:bg-[var(--theme-neutral)]/8"
                >
                  กลับไปแก้ไข
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!doctor}
                  className="rounded-full bg-[#3eaf3f] px-5 py-2 text-[14px] font-medium text-white transition enabled:hover:brightness-110 disabled:opacity-50"
                >
                  ยืนยันการบันทึก
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* ── Body: review summary, or form (left) + body map (right) ────── */}
        {review ? (
          <ReviewView form={form} points={points} doctor={doctor} onDoctorChange={setDoctor} />
        ) : (
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
              {/* Form sections — collapsible cards (Figma OPD-style) */}
              <div className="flex flex-col gap-4 p-6">
                {/* 1. Patient identity — unknown walk-ins get a minimal HN + เพศ
                    row; a fully-identified patient gets the avatar layout. */}
                <SectionCard title="ข้อมูลผู้ป่วย" icon={IconUser}>
                  {form.unknownIdentity ? (
                    <div className="flex items-start gap-4">
                      <div className="min-w-px flex-1">
                        <Field label="HN" required>
                          <HNInput value={form.hn} onChange={(v) => set("hn", v)} onGenerate={generateHN} />
                        </Field>
                      </div>
                      <div className="min-w-px flex-1">
                        <Field label="เพศ" name="gender">
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
                </SectionCard>
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

            {/* Sticky bottom bar — speech-to-text dictation for chief complaint */}
            <div className="flex items-center gap-3 border-t border-[var(--theme-neutral)]/10 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                aria-label="ล้างข้อมูลฟอร์ม"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--theme-neutral)]/20 text-[var(--theme-neutral)]/70 transition hover:bg-[var(--theme-neutral)]/5 hover:text-[var(--theme-neutral)]"
              >
                <IconRestore className="h-5 w-5" stroke={2} />
              </button>
              <button
                type="button"
                onClick={toggleDictation}
                aria-pressed={recording}
                className={[
                  "flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-semibold text-white transition",
                  recording
                    ? "animate-pulse bg-[#ff383c]"
                    : "bg-[var(--theme-primary)] hover:brightness-110",
                ].join(" ")}
              >
                <IconMicrophone className="h-5 w-5" stroke={2} />
                {recording ? "กำลังฟัง… พูดได้เลย" : "กรอกข้อมูลด้วยเสียง"}
              </button>
            </div>
          </div>

          {/* RIGHT — body map (OPD-style full-height panel) */}
          <div ref={boxRef} className="relative flex h-full min-h-0 w-[381px] shrink-0 flex-col overflow-hidden rounded-3xl bg-white p-5">
            {/* Body model = panel background. The zoomed figure overflows freely
                but is clipped to this card; white fades blend it under the UI. */}
            <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
                <div
                  ref={figRef}
                  className="relative h-full max-h-[560px]"
                  style={{
                    aspectRatio: `${bodyVb.width} / ${bodyVb.height}`,
                    transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.scale})`,
                    transformOrigin: "center center",
                    transition: animate && !panning ? "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
                    cursor: panning ? "grabbing" : "crosshair",
                    touchAction: "none",
                  }}
                  onClick={addPoint}
                  onPointerDown={onFigPointerDown}
                  onPointerMove={onFigPointerMove}
                  onPointerUp={onFigPointerUp}
                  onPointerCancel={onFigPointerUp}
                >
                  <img
                    src={bodyFigure}
                    alt="แผนภาพร่างกาย"
                    className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                    style={{ filter: "grayscale(1) opacity(0.4)" }}
                    draggable={false}
                  />
                  {sidePoints.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(p.id);
                        focusOn(p.xPct, p.yPct);
                      }}
                      style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      aria-label={`${p.type} ระดับ ${p.severity}/10`}
                    >
                      {/* Soft region-like highlight (OPD focus look) */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                          width: `${56 + p.severity * 8}px`,
                          height: `${(56 + p.severity * 8) * 1.25}px`,
                          background:
                            "radial-gradient(closest-side, rgba(255,56,60,0.42), rgba(255,56,60,0.16) 55%, transparent 78%)",
                          filter: "blur(3px)",
                          opacity: selectedId === p.id ? 1 : 0.45,
                          transition: "opacity 300ms ease, width 300ms ease, height 300ms ease",
                        }}
                      />
                      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                        <span
                          className={`relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-[#ff383c] ${selectedId === p.id ? "ring-2 ring-[#ff383c]/40" : ""}`}
                        />
                      </span>
                      {selectedId === p.id && (
                        <span className="absolute left-5 top-1/2 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-lg bg-white px-2 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                          <IconFlame className="h-4 w-4 text-[#ff383c]" stroke={2} />
                          <span className="text-left leading-tight">
                            <span className="block text-[13px] font-bold text-[#ff383c]">
                              {p.location ?? p.type}
                            </span>
                            <span className="block text-[11px] text-black/60">
                              {p.location ? `${p.type} · ` : ""}ระดับ {p.severity}/10
                            </span>
                          </span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Faded edges so the model blends beneath the floating UI */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-32 rounded-t-3xl bg-gradient-to-b from-white via-white/80 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-28 rounded-b-3xl bg-gradient-to-t from-white via-white/85 to-transparent" />

              {/* Zoom controls — bottom-right */}
              <div className="absolute bottom-2 right-2 z-[2] flex flex-col gap-1 rounded-full bg-white/90 p-1 shadow-[0_2px_8px_rgba(0,0,0,0.1)] ring-1 ring-black/5 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => zoomAt(1.25)}
                  disabled={tf.scale >= 3}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--theme-neutral)]/70 transition hover:bg-black/5 hover:text-[var(--theme-neutral)] disabled:opacity-30"
                  aria-label="ขยาย"
                >
                  <IconPlus className="h-4 w-4" stroke={2} />
                </button>
                <button
                  type="button"
                  onClick={() => zoomAt(1 / 1.25)}
                  disabled={tf.scale <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--theme-neutral)]/70 transition hover:bg-black/5 hover:text-[var(--theme-neutral)] disabled:opacity-30"
                  aria-label="ย่อ"
                >
                  <IconMinus className="h-4 w-4" stroke={2} />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  disabled={tf.scale === 1 && tf.x === 0 && tf.y === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--theme-neutral)]/70 transition hover:bg-black/5 hover:text-[var(--theme-neutral)] disabled:opacity-30"
                  aria-label="รีเซ็ตซูม"
                >
                  <IconZoomReset className="h-4 w-4" stroke={2} />
                </button>
              </div>

              {/* Top floating — legend */}
              <div className="relative z-10 flex items-center gap-2 self-start">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: points.length > 0 ? "#ffe4e6" : "#f1f5f9" }}
                >
                  {points.length > 0 ? (
                    <IconFlame className="h-5 w-5 text-[#ff383c]" stroke={2} />
                  ) : (
                    <IconCircle className="h-5 w-5 text-[#94a3b8]" stroke={2} />
                  )}
                </span>
                <div className="leading-tight">
                  <p
                    className="text-[13px] font-bold"
                    style={{ color: points.length > 0 ? "#ff383c" : "#64748b" }}
                  >
                    {selected
                      ? selected.location ?? selected.type
                      : points.length > 0
                        ? `${points.length} จุดที่เลือก`
                        : "ไม่มีอาการเฉพาะที่"}
                  </p>
                  {selected && (
                    <p className="text-[11px] text-black/50">
                      {selected.type} · ระดับ {selected.severity}/10
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom floating — selected-point editor + front/back pill */}
              <div className="relative z-10 mt-auto flex flex-col items-center gap-3 pt-3">
                {selected && (
                  <div className="flex w-full flex-col gap-3 rounded-2xl border border-[var(--theme-neutral)]/15 bg-white/95 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[var(--theme-neutral)]">
                        {selected.location ?? "จุดที่เลือก"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => removePoint(selected.id)}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium text-[#ff383c] transition hover:bg-[#ff383c]/10"
                        >
                          <IconTrash className="h-3.5 w-3.5" stroke={2} />
                          ลบ
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedId(null)}
                          aria-label="ปิด"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-neutral)]/8 hover:text-[var(--theme-neutral)]"
                        >
                          <IconX className="h-4 w-4" stroke={2} />
                        </button>
                      </div>
                    </div>
                    <Field label="ชนิดอาการ">
                      <FormSelect
                        value={selected.type}
                        onChange={(v) => updatePoint(selected.id, { type: v })}
                        options={PAIN_TYPES.map((t) => ({ value: t, label: t }))}
                        triggerClassName="h-10 rounded-xl px-3 text-[14px]"
                        dropUp
                      />
                    </Field>
                    <Field label={`ระดับความรุนแรง: ${selected.severity}/10`}>
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
                )}

                {/* Front / back pill */}
                <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
                  {(["front", "back"] as Side[]).map((s) => {
                    const active = side === s;
                    const Icon = s === "front" ? IconUser : IconUserScan;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => selectSide(s)}
                        className={[
                          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition",
                          active ? "bg-[#f2f2f2] text-[#22202a]" : "text-black/45",
                        ].join(" ")}
                      >
                        <Icon
                          className="h-4 w-4"
                          stroke={2}
                          style={{ color: active ? "#22202a" : "#9ca3af" }}
                        />
                        {s === "front" ? "หน้า" : "หลัง"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* Reset confirmation */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="flex w-full max-w-[360px] flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-[var(--theme-shadow-md)]"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ff383c]/10 text-[#ff383c]">
              <IconRestore className="h-7 w-7" stroke={2} />
            </span>
            <div className="leading-tight">
              <h3 className="text-[16px] font-bold text-[var(--theme-neutral)]">ล้างข้อมูลฟอร์ม?</h3>
              <p className="mt-1 text-[13px] text-[var(--theme-neutral)]/60">
                ข้อมูลที่กรอกทั้งหมดจะถูกล้าง การกระทำนี้ย้อนกลับไม่ได้
              </p>
            </div>
            <div className="mt-4 flex w-full justify-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 rounded-full border border-[var(--theme-neutral)]/20 px-4 py-2 text-[14px] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-neutral)]/8"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={doReset}
                className="flex-1 rounded-full bg-[#ff383c] px-4 py-2 text-[14px] font-semibold text-white transition hover:brightness-110"
              >
                ล้างข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </VoiceFillContext.Provider>
  );
}

type ReviewPlan = {
  assessment?: string;
  investigations?: string[];
  management?: string[];
  cautions?: string[];
};

// ── Review (ตรวจสอบข้อมูล) — read-only summary before confirming ───────────
function ReviewView({
  form,
  points,
  doctor,
  onDoctorChange,
}: {
  form: ERForm;
  points: PainPoint[];
  doctor: string;
  onDoctorChange: (v: string) => void;
}) {
  // AI suggests the on-call doctor by acuity: high triage → resuscitation.
  const recDr = ER_DOCTORS.find((d) => d.value === (form.triage && form.triage <= 2 ? "d3" : "d1"));
  const fmtDate = (iso: string) => {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${Number(m[1]) + 543}` : "—";
  };
  const v = (s: string) => (s && s.trim() ? s : "—");
  const map = (m: Record<string, string>, k: string) => m[k] ?? (k || "—");
  const GENDER: Record<string, string> = { M: "ชาย", F: "หญิง" };
  const INSURANCE: Record<string, string> = { uc: "บัตรทอง (UC)", sss: "ประกันสังคม", ocsc: "ข้าราชการ", self: "ชำระเงินเอง" };
  const MARITAL: Record<string, string> = { single: "โสด", married: "คู่ (สมรส)", widowed: "หม้าย", divorced: "หย่าร้าง", separated: "แยกกันอยู่" };
  const BLOOD: Record<string, string> = { A: "A", B: "B", AB: "AB", O: "O", unknown: "ไม่ทราบ" };
  const ARRIVALMAP: Record<string, string> = { walk: "เดินมาเอง", ems: "รถพยาบาล (EMS)", refer: "ส่งต่อ (Refer)", police: "นำส่งโดยตำรวจ" };
  const CONSCIOUS: Record<string, string> = { A: "A — รู้สึกตัวดี (Alert)", V: "V — ตอบสนองต่อเสียง", P: "P — ตอบสนองต่อความเจ็บ", U: "U — ไม่ตอบสนอง" };

  // AI-summarised initial care plan for the ER doctor.
  const [plan, setPlan] = useState<ReviewPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planErr, setPlanErr] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPlanLoading(true);
      setPlanErr(false);
      const summary = [
        `เพศ: ${form.gender === "M" ? "ชาย" : form.gender === "F" ? "หญิง" : "-"}`,
        form.birthDate && `วันเกิด: ${form.birthDate}`,
        form.chiefComplaint && `อาการสำคัญ: ${form.chiefComplaint}`,
        form.triage && `Triage: ${form.triage}`,
        (form.sbp || form.dbp) && `ความดัน: ${form.sbp}/${form.dbp} mmHg`,
        form.pulse && `ชีพจร: ${form.pulse}/min`,
        form.temp && `อุณหภูมิ: ${form.temp}°C`,
        form.rr && `อัตราหายใจ: ${form.rr}/min`,
        form.spo2 && `SpO2: ${form.spo2}%`,
        form.consciousness && `ระดับความรู้สึกตัว: ${form.consciousness}`,
        form.allergies && `แพ้ยา/อาหาร: ${form.allergies}`,
        form.chronic && `โรคประจำตัว: ${form.chronic}`,
        form.currentMeds && `ยาประจำ: ${form.currentMeds}`,
        points.length &&
          `ตำแหน่งอาการ: ${points.map((p) => `${p.location ?? "-"} (${p.type} ${p.severity}/10)`).join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n");
      try {
        const data = await chatJSON<ReviewPlan>(
          [
            {
              role: "system",
              content:
                "คุณเป็นแพทย์เวชศาสตร์ฉุกเฉิน สรุป 'แผนการดูแลเบื้องต้น' สำหรับแพทย์ ER จากข้อมูลผู้ป่วยที่ให้มา " +
                "ตอบกลับเป็น JSON เท่านั้น รูปแบบ: {assessment: string, investigations: string[], management: string[], cautions: string[]} " +
                "ทุกข้อความเป็นภาษาไทย กระชับ เป็นแนวทาง ไม่ใช่คำสั่งแพทย์ขั้นสุดท้าย",
            },
            { role: "user", content: summary },
          ],
          { fast: true },
        );
        if (!cancelled) setPlan(data);
      } catch {
        if (!cancelled) setPlanErr(true);
      } finally {
        if (!cancelled) setPlanLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form, points]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Doctor assignment — nurse picks the responsible ER physician here */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl border border-[var(--theme-neutral)]/12 bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-[14px] font-bold text-[var(--theme-neutral)]">
          <IconUser className="h-5 w-5 text-[var(--theme-primary)]" stroke={2} />
          แพทย์ผู้รับผิดชอบ (ER)
          <span className="text-[#ff383c]">*</span>
        </div>
        <div className="w-[320px]">
          <FormSelect
            value={doctor}
            onChange={onDoctorChange}
            placeholder="เลือกแพทย์ประจำแผนก"
            options={ER_DOCTORS.map((d) => ({ value: d.value, label: `${d.label} · ${d.sub}` }))}
            triggerClassName="h-10 rounded-xl px-3 text-[14px]"
          />
        </div>
        {!doctor && recDr && (
          <button
            type="button"
            onClick={() => onDoctorChange(recDr.value)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-primary)]/10 px-3 py-1.5 text-[12px] font-semibold text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary)]/15"
          >
            <IconSparkles className="h-4 w-4" stroke={2} />
            AI แนะนำ: {recDr.label}
          </button>
        )}
      </div>

      {/* Three equal-width summary columns */}
      <div className="flex min-h-0 flex-1 items-stretch gap-4">
      {/* LEFT — field summary */}
      <div className="min-w-px flex-1 overflow-y-auto rounded-3xl border border-[var(--theme-neutral)]/12 bg-white p-6">
        <div className="flex flex-col gap-4">
          <ReviewCard title="ข้อมูลผู้ป่วย" icon={IconUser}>
            <RevRow label="HN" value={v(form.hn)} />
            <RevRow label="คำนำหน้า" value={v(form.prefix)} />
            <RevRow label="ชื่อ-นามสกุล" value={v(`${form.firstName} ${form.lastName}`.trim())} />
            <RevRow label="เพศ" value={map(GENDER, form.gender)} />
            <RevRow label="เลขบัตรประชาชน" value={v(form.cid)} />
            <RevRow label="วันเกิด" value={fmtDate(form.birthDate)} />
            <RevRow label="สิทธิการรักษา" value={map(INSURANCE, form.insurance)} />
            <RevRow label="เชื้อชาติ / สัญชาติ" value={`${v(form.ethnicity)} / ${v(form.nationality)}`} />
            <RevRow label="ศาสนา" value={v(form.religion)} />
            <RevRow label="สถานภาพ" value={map(MARITAL, form.maritalStatus)} />
            <RevRow label="หมู่เลือด" value={map(BLOOD, form.bloodGroup)} />
          </ReviewCard>

          <ReviewCard title="ข้อมูลการมา ER" icon={IconAmbulance}>
            <RevRow
              label="ระดับความเร่งด่วน (Triage)"
              value={form.triage ? `${form.triage} — ${TRIAGE.find((t) => t.level === form.triage)?.label ?? ""}` : "—"}
            />
            <RevRow label="ช่องทางการมา" value={map(ARRIVALMAP, form.arrival)} />
            <RevRow label="วันเวลาที่มาถึง" value={`${fmtDate(form.arrivalDate)} ${v(form.arrivalTime)}`} />
            <RevRow label="อาการสำคัญ" value={v(form.chiefComplaint)} wide />
          </ReviewCard>

          <ReviewCard title="สัญญาณชีพแรกรับ" icon={IconHeartbeat}>
            <RevRow label="ความดัน (SBP/DBP)" value={form.sbp || form.dbp ? `${v(form.sbp)}/${v(form.dbp)} mmHg` : "—"} />
            <RevRow label="ชีพจร" value={form.pulse ? `${form.pulse} /min` : "—"} />
            <RevRow label="อุณหภูมิ" value={form.temp ? `${form.temp} °C` : "—"} />
            <RevRow label="อัตราหายใจ" value={form.rr ? `${form.rr} /min` : "—"} />
            <RevRow label="SpO₂" value={form.spo2 ? `${form.spo2} %` : "—"} />
            <RevRow label="ระดับความรู้สึกตัว" value={map(CONSCIOUS, form.consciousness)} />
          </ReviewCard>

          <ReviewCard title="ผู้ติดต่อฉุกเฉิน" icon={IconPhone}>
            <RevRow label="ชื่อผู้ติดต่อ" value={v(form.contactName)} />
            <RevRow label="ความสัมพันธ์" value={v(form.contactRelation)} />
            <RevRow label="เบอร์โทร" value={v(form.contactPhone)} />
          </ReviewCard>

          <ReviewCard title="ประวัติสำคัญ" icon={IconClipboardText}>
            <RevRow label="ประวัติแพ้ยา / อาหาร" value={v(form.allergies)} wide />
            <RevRow label="โรคประจำตัว" value={v(form.chronic)} wide />
            <RevRow label="ยาที่ใช้ประจำ" value={v(form.currentMeds)} wide />
          </ReviewCard>
        </div>
      </div>

      {/* MIDDLE — body-map points summary */}
      <div className="min-w-px flex-1 overflow-y-auto rounded-3xl border border-[var(--theme-neutral)]/12 bg-white p-6">
        <h3 className="mb-3 text-[15px] font-bold text-[var(--theme-neutral)]">
          ตำแหน่งอาการ ({points.length} จุด)
        </h3>
        {points.length === 0 ? (
          <p className="text-[13px] text-[var(--theme-neutral)]/50">ไม่มีการระบุตำแหน่งอาการ</p>
        ) : (
          <div className="flex flex-col gap-2">
            {points.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-[var(--theme-neutral)]/12 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff383c]/10 text-[#ff383c]">
                  <IconFlame className="h-5 w-5" stroke={2} />
                </span>
                <div className="leading-tight">
                  <p className="text-[13px] font-semibold text-[var(--theme-neutral)]">
                    {p.location ?? "ตำแหน่งบนร่างกาย"} · {p.side === "front" ? "ด้านหน้า" : "ด้านหลัง"}
                  </p>
                  <p className="text-[11px] text-black/55">
                    {p.type} · ระดับ {p.severity}/10
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT — AI-summarised treatment plan for the doctor */}
      <div className="min-w-px flex-1 overflow-y-auto rounded-3xl border border-[var(--theme-primary)]/25 bg-[var(--theme-primary)]/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary)]/12 text-[var(--theme-primary)]">
            <IconSparkles className="h-5 w-5" stroke={2} />
          </span>
          <div className="leading-tight">
            <h3 className="text-[15px] font-bold text-[var(--theme-neutral)]">แผนการรักษาสำหรับแพทย์</h3>
            <p className="text-[11px] text-[var(--theme-neutral)]/55">สรุปเบื้องต้นโดย AI</p>
          </div>
        </div>
        {planLoading ? (
          <div className="flex items-center gap-2 py-6 text-[13px] text-[var(--theme-neutral)]/60">
            <IconLoader2 className="h-4 w-4 animate-spin text-[var(--theme-primary)]" stroke={2} />
            กำลังวิเคราะห์โดย AI…
          </div>
        ) : planErr || !plan ? (
          <p className="py-6 text-[13px] text-[var(--theme-neutral)]/50">
            ไม่สามารถสร้างแผนการรักษาได้ในขณะนี้
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {plan.assessment && (
              <div>
                <h4 className="mb-1 text-[13px] font-bold text-[var(--theme-primary)]">การประเมินเบื้องต้น</h4>
                <p className="text-[13px] leading-relaxed text-[var(--theme-neutral)]/85">{plan.assessment}</p>
              </div>
            )}
            <PlanList title="การตรวจที่แนะนำ" items={plan.investigations} />
            <PlanList title="แนวทางการดูแลเบื้องต้น" items={plan.management} />
            <PlanList title="ข้อควรระวัง" items={plan.cautions} />
            <p className="border-t border-[var(--theme-neutral)]/10 pt-3 text-[11px] text-[var(--theme-neutral)]/45">
              * เป็นข้อเสนอแนะจาก AI โปรดใช้วิจารณญาณทางการแพทย์
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function PlanList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 text-[13px] font-bold text-[var(--theme-primary)]">{title}</h4>
      <ul className="flex flex-col gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-[var(--theme-neutral)]/85">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--theme-primary)]" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; stroke?: number }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--theme-neutral)]/12 bg-white">
      <div className="flex items-center gap-2.5 border-b border-[var(--theme-neutral)]/8 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--theme-primary)]">
          <Icon className="h-5 w-5" stroke={2} />
        </span>
        <h3 className="text-[15px] font-bold text-[var(--theme-neutral)]">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4">{children}</div>
    </section>
  );
}

function RevRow({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 ${wide ? "col-span-2" : ""}`}>
      <span className="text-[12px] text-[var(--theme-neutral)]/55">{label}</span>
      <span className="text-[14px] text-[var(--theme-neutral)]">{value}</span>
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
          <div className="flex flex-1 items-center gap-2 rounded-full border border-[var(--theme-neutral)]/20 bg-white py-1.5 pl-5 pr-1.5 transition hover:border-[var(--theme-primary)]/40 focus-within:border-[var(--theme-primary)] focus-within:ring-4 focus-within:ring-[var(--theme-primary)]/15">
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
  dropUp = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  triggerClassName: string;
  /** Open the menu upward (for triggers near the bottom of a clipped panel). */
  dropUp?: boolean;
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
          className={`absolute left-0 right-0 z-30 overflow-hidden rounded-2xl border border-[var(--theme-neutral)]/10 bg-white py-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.14)] ${dropUp ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"}`}
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
  name,
  children,
}: {
  label: string;
  required?: boolean;
  /** form key — when set & filled by voice, shows a spinner/sparkles badge. */
  name?: keyof ERForm;
  children: React.ReactNode;
}) {
  const { fillingKey, filled } = useContext(VoiceFillContext);
  // The single field being written shows a spinner; fields already written keep
  // a sparkles badge. Fields not touched by voice show nothing.
  const indicator = !name ? null : name === fillingKey ? "loading" : filled.has(name) ? "done" : null;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--theme-neutral)]/70">
        {label}
        {required && <span className="text-[#ff383c]">*</span>}
        {indicator === "loading" ? (
          <IconLoader2 className="h-3.5 w-3.5 animate-spin text-[var(--theme-primary)]" stroke={2} />
        ) : indicator === "done" ? (
          <IconSparkles className="h-3.5 w-3.5 text-[var(--theme-primary)]" stroke={2} />
        ) : null}
      </span>
      {children}
    </label>
  );
}

function SectionCard({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string; stroke?: number }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-[var(--theme-neutral)]/12 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-[var(--theme-neutral)]/[0.03] ${open ? "rounded-t-2xl" : "rounded-2xl"}`}
      >
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--theme-primary)]">
            <Icon className="h-5 w-5" stroke={2} />
          </span>
        )}
        <h3 className="flex-1 text-[15px] font-bold text-[var(--theme-neutral)]">{title}</h3>
        <IconChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--theme-neutral)]/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          stroke={2}
        />
      </button>
      {open && <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>}
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
    <div className="flex flex-col gap-6">
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
          <Field label="HN" required>
            <HNInput value={form.hn} onChange={(v) => set("hn", v)} onGenerate={onGenerate} />
          </Field>
          <Field label="คำนำหน้า" name="prefix">
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
        <Field label="ชื่อ" required name="firstName">
          <input
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className={INPUT_CLS}
          />
        </Field>
        <Field label="นามสกุล" name="lastName">
          <input
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            className={INPUT_CLS}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="เลขบัตรประชาชน" name="cid">
          <input
            value={form.cid}
            onChange={(e) => set("cid", e.target.value.replace(/\D/g, "").slice(0, 13))}
            inputMode="numeric"
            placeholder="x-xxxx-xxxxx-xx-x"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="วันเกิด" name="birthDate">
          <DatePicker
            value={form.birthDate}
            onChange={(v) => set("birthDate", v)}
            placeholder="เลือกวันเกิด"
          />
        </Field>
        <Field label="เพศ" name="gender">
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
        <Field label="สิทธิการรักษา" name="insurance">
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
        <Field label="สถานภาพ" name="maritalStatus">
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
        <Field label="หมู่เลือด" name="bloodGroup">
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
    <SectionCard title="ข้อมูลการมา ER" icon={IconAmbulance}>
      <Field label="ระดับความเร่งด่วน (Triage)" required name="triage">
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
      <Field label="ช่องทางการมา" name="arrival">
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
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="วันที่มาถึง">
            <DatePicker
              value={form.arrivalDate}
              onChange={(v) => set("arrivalDate", v)}
              placeholder="เลือกวันที่"
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="เวลาที่มาถึง">
            <div className="relative">
              <input
                type="time"
                value={form.arrivalTime}
                onChange={(e) => set("arrivalTime", e.target.value)}
                className={`${INPUT_CLS} er-time-input pr-10`}
              />
              <IconClockHour4
                className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--theme-neutral)]/50"
                stroke={2}
              />
            </div>
          </Field>
        </div>
      </div>
      <Field label="อาการสำคัญ (Chief complaint)" required name="chiefComplaint">
        <textarea
          id="er-chief-complaint"
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
    <SectionCard title="สัญญาณชีพแรกรับ" icon={IconHeartbeat}>
      <div className="grid grid-cols-3 gap-4">
        <Field label="ความดัน (SBP)" name="sbp">
          <input value={form.sbp} onChange={(e) => set("sbp", e.target.value)} inputMode="numeric" className={INPUT_CLS} />
        </Field>
        <Field label="ความดัน (DBP)" name="dbp">
          <input value={form.dbp} onChange={(e) => set("dbp", e.target.value)} inputMode="numeric" className={INPUT_CLS} />
        </Field>
        <Field label="ชีพจร (/min)" name="pulse">
          <input value={form.pulse} onChange={(e) => set("pulse", e.target.value)} inputMode="numeric" className={INPUT_CLS} />
        </Field>
        <Field label="อุณหภูมิ (°C)" name="temp">
          <input value={form.temp} onChange={(e) => set("temp", e.target.value)} inputMode="decimal" className={INPUT_CLS} />
        </Field>
        <Field label="อัตราหายใจ (/min)" name="rr">
          <input value={form.rr} onChange={(e) => set("rr", e.target.value)} inputMode="numeric" className={INPUT_CLS} />
        </Field>
        <Field label="SpO₂ (%)" name="spo2">
          <input value={form.spo2} onChange={(e) => set("spo2", e.target.value)} inputMode="numeric" className={INPUT_CLS} />
        </Field>
      </div>
      <Field label="ระดับความรู้สึกตัว" name="consciousness">
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
    <SectionCard title="ผู้ติดต่อฉุกเฉิน" icon={IconPhone}>
      <div className="grid grid-cols-3 gap-4">
        <Field label="ชื่อผู้ติดต่อ" name="contactName">
          <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className={INPUT_CLS} />
        </Field>
        <Field label="ความสัมพันธ์" name="contactRelation">
          <input value={form.contactRelation} onChange={(e) => set("contactRelation", e.target.value)} className={INPUT_CLS} />
        </Field>
        <Field label="เบอร์โทร" name="contactPhone">
          <input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} inputMode="tel" className={INPUT_CLS} />
        </Field>
      </div>
    </SectionCard>
  );
}

function HistorySection({ form, set }: SectionProps) {
  return (
    <SectionCard title="ประวัติสำคัญ" icon={IconClipboardText}>
      <Field label="ประวัติแพ้ยา / อาหาร" name="allergies">
        <input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="เช่น Penicillin (ผื่น)" className={INPUT_CLS} />
      </Field>
      <Field label="โรคประจำตัว" name="chronic">
        <input value={form.chronic} onChange={(e) => set("chronic", e.target.value)} placeholder="เช่น เบาหวาน, ความดันโลหิตสูง" className={INPUT_CLS} />
      </Field>
      <Field label="ยาที่ใช้ประจำ" name="currentMeds">
        <input value={form.currentMeds} onChange={(e) => set("currentMeds", e.target.value)} className={INPUT_CLS} />
      </Field>
    </SectionCard>
  );
}
