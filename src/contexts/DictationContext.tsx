import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDictation, type DictationSegment } from "../hooks/useDictation";
import { chat } from "../services/ai/llm";
import { A2UI_CATALOG_SYSTEM, A2UI_ICD_TASK, A2UI_SOAP_TASK } from "../services/a2ui/catalog";
import {
  validateA2UIResponse,
  type A2UIActionEvent,
  type A2UIResponse,
} from "../services/a2ui/types";
import { useToast } from "./ToastContext";

interface DictationSessionOptions {
  prompt?: string;
  language?: string;
  onResult?: (text: string) => void;
}

export interface DictationContextValue {
  // useDictation passthroughs
  status: string;
  segments: DictationSegment[];
  isProcessing: boolean;
  /** Number of ASR partial requests currently waiting on the server. */
  asrInFlight: number;
  isRecording: boolean;
  source: "mic" | "tab";
  // modal lifecycle
  minimized: boolean;
  setMinimized: (v: boolean) => void;
  reviewing: boolean;
  normalizedSegments: DictationSegment[] | null;
  isNormalizing: boolean;
  summaryUi: A2UIResponse | null;
  isSummarizing: boolean;
  icdUi: A2UIResponse | null;
  isIcdLoading: boolean;
  // controls
  startSession: (source: "mic" | "tab", opts?: DictationSessionOptions) => void;
  /** Continue ("บันทึกต่อ") the current transcript: resumes recording with the
   *  prior segments seeded so new audio appends instead of wiping them. */
  resumeSession: (source: "mic" | "tab") => void;
  stopSession: () => Promise<void>;
  handleSummarize: () => Promise<void>;
  handleSuggestIcd: () => Promise<void>;
  handleSummaryAction: (event: A2UIActionEvent) => void;
  handleClose: () => void;
  /** Persist a manually-typed/pasted transcript as the active session. */
  saveManualTranscript: (text: string) => void;
  /** Live audio RMS (0..1) — updated per audio buffer while recording.
   *  Ref-based so the UI can sample it from `requestAnimationFrame`
   *  without forcing React re-renders. Reads 0 when idle. */
  levelRef: React.RefObject<number>;
}

const DictationCtx = createContext<DictationContextValue | null>(null);

export function useDictationContext(): DictationContextValue {
  const ctx = useContext(DictationCtx);
  if (!ctx) throw new Error("useDictationContext must be used within DictationProvider");
  return ctx;
}

function segmentsToText(segments: DictationSegment[]): string {
  return segments.map((s) => `Speaker ${s.speaker}: ${s.text}`).join("\n");
}

// ---------------------------------------------------------------------------
// Session persistence — every frozen transcript (and its summary/normalized
// state) is kept in localStorage so the user can refresh, close the tab, or
// come back later and still pick up the same review session.

const STORAGE_KEY = "dictation.session.v1";
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface PersistedSession {
  v: 1;
  ts: number;
  source: "mic" | "tab";
  reviewing: boolean;
  segments: DictationSegment[];
  normalizedSegments: DictationSegment[] | null;
  summaryUi: A2UIResponse | null;
}

function loadPersistedSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (parsed?.v !== 1) return null;
    if (typeof parsed.ts !== "number" || Date.now() - parsed.ts > STORAGE_TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (!Array.isArray(parsed.segments)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedSession(data: Omit<PersistedSession, "v" | "ts">) {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedSession = { v: 1, ts: Date.now(), ...data };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota/serialization — ignore */
  }
}

function clearPersistedSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

async function normalizeSegments(segments: DictationSegment[]): Promise<DictationSegment[]> {
  if (segments.length === 0) return segments;
  const numbered = segments.map((s, i) => `${i}|S${s.speaker}|${s.text}`).join("\n");
  const result = await chat(
    [
      {
        role: "system",
        content: [
          "You are a bilingual Thai/English medical ASR post-editor for clinical conversations in Thailand.",
          "Speakers code-switch between Thai narrative and English clinical terms.",
          "Input is one segment per line in the form `INDEX|SX|TEXT`.",
          "",
          "TASK 1 — Speaker re-diarization (most important):",
          "Re-assign each segment to either speaker 1 (DOCTOR / clinician / staff) or speaker 2 (PATIENT / accompanying family) using conversation context. The on-device acoustic guess is unreliable — ignore it if context disagrees.",
          "Doctor cues: asks history questions, uses medical jargon (hypertension, ECG, lab orders), gives instructions ('ลองนอนหงายดูนะครับ'), proposes plans ('แอดมิทไว้สังเกตอาการ'), formal politeness ('ครับ' from male voice).",
          "Patient cues: describes symptoms in lay terms ('ปวดท้อง', 'เจ็บตรงนี้'), answers questions briefly, refers to themselves ('หนู', 'ผม'), expresses worry/uncertainty.",
          "Heuristics: turn-taking implies switch; same-side follow-ups stay; if a segment is ambiguous, prefer whichever speaker matches the question/answer flow with neighbors. If only one speaker is plausible across all segments, label everything as speaker 1.",
          "",
          "TASK 2 — Text normalization (apply to the rewritten TEXT):",
          "1. Preserve each word's original language — Thai stays Thai, English stays English. Never translate either direction.",
          "2. Restore English clinical terms transliterated into Thai back to English: 'ไฮเปอร์เทนชั่น' → 'hypertension', 'พาราเซตามอล' → 'paracetamol', 'ซีบีซี' → 'CBC', 'เอ็มอาร์ไอ' → 'MRI', 'อินซูลิน' → 'insulin', 'แอสไพริน' → 'aspirin'.",
          "3. Fix obvious misrecognitions in medical context.",
          "4. Standardize abbreviations: BP, HR, RR, T, SpO2, BMI, GCS, BUN, Cr, eGFR, HbA1c, LDL, HDL, ECG, EKG, CT, MRI, U/S, CBC, UA, ICD-10.",
          "5. Standardize units: mg, mcg, g, mL, L, mmHg, bpm, °C. Frequencies: OD, BID, TID, QID, q4h, q6h, PRN, HS, AC, PC. Routes: PO, IV, IM, SC, SL, PR, NEB.",
          "6. Fix Thai medical phrasing typos but keep colloquial patient speech intact.",
          "7. Do NOT add, remove, merge, split, or reorder segments. Do NOT invent information.",
          "",
          'Return JSON exactly: {"segments":[{"index":<n>,"speaker":1|2,"text":"..."}]}',
        ].join("\n"),
      },
      { role: "user", content: numbered },
    ],
    { temperature: 0, maxTokens: 2200, responseFormat: "json_object", fast: true },
  );
  try {
    const parsed = JSON.parse(result.text) as {
      segments: { index: number; speaker?: 1 | 2; text: string }[];
    };
    const out = segments.map((s) => ({ ...s }));
    for (const item of parsed.segments) {
      if (!out[item.index]) continue;
      if (typeof item.text === "string" && item.text.trim()) {
        out[item.index].text = item.text.trim();
      }
      if (item.speaker === 1 || item.speaker === 2) {
        out[item.index].speaker = item.speaker;
      }
    }
    return out;
  } catch {
    return segments;
  }
}

export function DictationProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const sourceRef = useRef<"mic" | "tab">("mic");
  // The page-supplied callback that consumes the final / normalized / summary
  // text. Stored in a ref so the provider keeps the latest reference across
  // route changes — if the page that registered it unmounts mid-session, the
  // closure simply no-ops harmlessly when invoked.
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const sessionOptsRef = useRef<DictationSessionOptions | null>(null);
  const lastNormalizedKeyRef = useRef("");

  // Hydrate from localStorage so a refresh or tab close doesn't wipe an
  // in-review transcript. We restore state synchronously on first render.
  const persisted = useMemo(() => loadPersistedSession(), []);

  const [reviewing, setReviewing] = useState(persisted?.reviewing ?? false);
  const [summaryUi, setSummaryUi] = useState<A2UIResponse | null>(
    persisted?.summaryUi ?? null,
  );
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [normalizedSegments, setNormalizedSegments] = useState<DictationSegment[] | null>(
    persisted?.normalizedSegments ?? null,
  );
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [icdUi, setIcdUi] = useState<A2UIResponse | null>(null);
  const [isIcdLoading, setIsIcdLoading] = useState(false);
  // Frozen segments survive page refresh; effective segments fall back to
  // these whenever the live useDictation hook isn't actively running.
  const [frozenSegments, setFrozenSegments] = useState<DictationSegment[]>(
    persisted?.segments ?? [],
  );

  if (persisted?.source) sourceRef.current = persisted.source;

  // Restored segments should not retrigger the normalize pass since we
  // already have the LLM-normalized result saved alongside.
  useEffect(() => {
    if (persisted) {
      lastNormalizedKeyRef.current = (persisted.segments ?? [])
        .map((s) => `${s.speaker}:${s.text}`)
        .join("|");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { status, segments, isProcessing, asrInFlight, start, stop, levelRef } = useDictation({
    onResult: async (text) => {
      if (!text.trim()) {
        toast.info("ไม่พบเสียง", "ลองพูดอีกครั้ง");
        return;
      }
      toast.success("ถอดเสียงสำเร็จ", text.slice(0, 120));
      setReviewing(true);
    },
    onError: (err) => toast.error("ถอดเสียงล้มเหลว", err.message),
  });

  const isRecording = status === "recording";
  const isBusy = status === "transcribing" || status === "requesting";

  // Freeze live segments whenever recording is active so an unexpected
  // reload / tab close still has the latest audio captured. After stop we
  // also keep them frozen for the review session.
  useEffect(() => {
    if (segments.length > 0) {
      setFrozenSegments(segments);
    }
  }, [segments]);

  // Effective segments: live hook segments while recording, frozen otherwise.
  const effectiveSegments = useMemo(() => {
    if (isRecording || isBusy) return segments;
    return frozenSegments.length > 0 ? frozenSegments : segments;
  }, [isRecording, isBusy, segments, frozenSegments]);

  // Persist session state to localStorage whenever anything reviewable changes.
  useEffect(() => {
    if (frozenSegments.length === 0 && !reviewing && !summaryUi) {
      // Nothing worth saving yet.
      return;
    }
    savePersistedSession({
      source: sourceRef.current,
      reviewing,
      segments: frozenSegments,
      normalizedSegments,
      summaryUi,
    });
  }, [frozenSegments, reviewing, normalizedSegments, summaryUi]);

  // Auto-run normalization once segments stabilize after stop.
  if (reviewing && !isRecording && !isBusy && !isNormalizing) {
    const key = segments.map((s) => `${s.speaker}:${s.text}`).join("|");
    if (key && key !== lastNormalizedKeyRef.current) {
      lastNormalizedKeyRef.current = key;
      setIsNormalizing(true);
      void (async () => {
        try {
          const normalized = await normalizeSegments(segments);
          setNormalizedSegments(normalized);
          onResultRef.current?.(segmentsToText(normalized));
        } catch {
          onResultRef.current?.(segmentsToText(segments));
        } finally {
          setIsNormalizing(false);
        }
      })();
    }
  }

  const startSession = useCallback(
    (source: "mic" | "tab", opts: DictationSessionOptions = {}) => {
      sourceRef.current = source;
      sessionOptsRef.current = opts;
      onResultRef.current = opts.onResult ?? null;
      setReviewing(false);
      setSummaryUi(null);
      setNormalizedSegments(null);
      setFrozenSegments([]);
      setMinimized(false);
      lastNormalizedKeyRef.current = "";
      clearPersistedSession();
      void start(source);
    },
    [start],
  );

  const resumeSession = useCallback(
    (source: "mic" | "tab") => {
      sourceRef.current = source;
      setReviewing(false);
      setMinimized(false);
      // Seed from whatever transcript is currently shown (live or frozen) so
      // "บันทึกต่อ" extends it rather than starting over. Frozen segments are
      // intentionally NOT cleared.
      const seed = effectiveSegments;
      lastNormalizedKeyRef.current = "";
      void start(source, { seed });
    },
    [start, effectiveSegments],
  );

  const stopSession = useCallback(async () => {
    await stop();
  }, [stop]);

  const handleSummarize = useCallback(async () => {
    const src = normalizedSegments ?? segments;
    if (!src.length || isSummarizing) return;
    setIsSummarizing(true);
    setSummaryUi(null);
    try {
      const transcript = segmentsToText(src);
      const result = await chat(
        [
          { role: "system", content: `${A2UI_CATALOG_SYSTEM}\n\n${A2UI_SOAP_TASK}` },
          { role: "user", content: transcript },
        ],
        { temperature: 0.2, maxTokens: 2200, responseFormat: "json_object" },
      );
      const parsed = JSON.parse(result.text);
      const validated = validateA2UIResponse(parsed);
      if (!validated) throw new Error("A2UI response failed validation");
      setSummaryUi(validated);
    } catch (e) {
      toast.error("สรุปไม่สำเร็จ", (e as Error).message);
    } finally {
      setIsSummarizing(false);
    }
  }, [segments, normalizedSegments, isSummarizing, toast]);

  const handleSuggestIcd = useCallback(async () => {
    const src = normalizedSegments ?? segments;
    if (!src.length || isIcdLoading) return;
    setIsIcdLoading(true);
    setIcdUi(null);
    try {
      const transcript = segmentsToText(src);
      const result = await chat(
        [
          { role: "system", content: `${A2UI_CATALOG_SYSTEM}\n\n${A2UI_ICD_TASK}` },
          { role: "user", content: transcript },
        ],
        { temperature: 0.1, maxTokens: 1800, responseFormat: "json_object" },
      );
      const parsed = JSON.parse(result.text);
      const validated = validateA2UIResponse(parsed);
      if (!validated) throw new Error("A2UI response failed validation");
      setIcdUi(validated);
    } catch (e) {
      toast.error("แนะนำรหัส ICD ไม่สำเร็จ", (e as Error).message);
    } finally {
      setIsIcdLoading(false);
    }
  }, [segments, normalizedSegments, isIcdLoading, toast]);

  const handleSummaryAction = useCallback(
    (event: A2UIActionEvent) => {
      if (event.action === "insert_all") {
        const sections: Array<[string, string]> = [
          ["อาการสำคัญ (CC)", event.data["soap.cc"] ?? ""],
          ["ประวัติปัจจุบัน (HPI)", event.data["soap.hpi"] ?? ""],
          ["ตรวจร่างกาย / ผลตรวจ (PE/Labs)", event.data["soap.peLabs"] ?? ""],
          ["การวินิจฉัย (Assessment)", event.data["soap.assessment"] ?? ""],
          ["แผนการรักษา (Plan)", event.data["soap.plan"] ?? ""],
        ];
        const text = sections
          .filter(([, v]) => v && v.trim() && v.trim() !== "—")
          .map(([h, v]) => `${h}\n${v}`)
          .join("\n\n");
        if (text && onResultRef.current) {
          onResultRef.current(text);
          toast.success("แทรกสรุปแล้ว", "เพิ่มสรุปเข้าใน Note แล้ว");
        } else if (!onResultRef.current) {
          toast.info("ไม่มีฟอร์มเปิดอยู่", "กลับไปหน้า OPD เพื่อแทรกสรุป");
        }
        setReviewing(false);
        setSummaryUi(null);
        return;
      }
      if (event.action === "accept_all_icd") {
        const codes = Object.values(event.data).join(", ");
        if (codes.trim() && onResultRef.current) {
          onResultRef.current(`รหัส ICD-10:\n${codes}`);
          toast.success("แทรกรหัส ICD แล้ว", codes);
        } else if (!onResultRef.current) {
          toast.info("ไม่มีฟอร์มเปิดอยู่", "กลับไปหน้า OPD เพื่อแทรกรหัส");
        }
        setIcdUi(null);
        return;
      }
      if (event.action === "copy_icd") {
        const codes = Object.values(event.data).join(", ");
        void navigator.clipboard.writeText(codes);
        toast.success("คัดลอกรหัส ICD แล้ว", codes);
        return;
      }
      if (event.action === "copy") {
        const text = Object.entries(event.data)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        void navigator.clipboard.writeText(text);
        toast.success("คัดลอกแล้ว", "วางจาก clipboard ได้");
        return;
      }
      if (event.action === "discard") {
        setSummaryUi(null);
        setIcdUi(null);
        return;
      }
    },
    [toast],
  );

  const handleClose = useCallback(() => {
    setReviewing(false);
    setSummaryUi(null);
    setIcdUi(null);
    setNormalizedSegments(null);
    setFrozenSegments([]);
    lastNormalizedKeyRef.current = "";
    clearPersistedSession();
  }, []);

  // Save a manually-typed (or pasted) transcript as the frozen session.
  // Wraps the text in a single `DictationSegment` so downstream consumers
  // (summarize, normalize, persistence) behave identically to a real
  // recording. Marks the session reviewing so the UI treats it as a
  // finished capture instead of an empty pre-recording state.
  const saveManualTranscript = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setFrozenSegments([]);
      setReviewing(false);
      lastNormalizedKeyRef.current = "";
      clearPersistedSession();
      return;
    }
    setFrozenSegments([{ speaker: 1, text: trimmed }]);
    setReviewing(true);
    // Force re-normalization on next pass by clearing the dedupe key.
    lastNormalizedKeyRef.current = "";
  }, []);

  const value: DictationContextValue = {
    status,
    segments: effectiveSegments,
    isProcessing,
    asrInFlight,
    isRecording,
    source: sourceRef.current,
    minimized,
    setMinimized,
    reviewing,
    normalizedSegments,
    isNormalizing,
    summaryUi,
    icdUi,
    isIcdLoading,
    isSummarizing,
    startSession,
    resumeSession,
    stopSession,
    handleSummarize,
    handleSuggestIcd,
    handleSummaryAction,
    handleClose,
    saveManualTranscript,
    levelRef,
  };

  return <DictationCtx.Provider value={value}>{children}</DictationCtx.Provider>;
}
