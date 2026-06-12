import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconX,
  IconSparkles,
  IconLoader2,
  IconCheck,
  IconNotes,
  IconChevronLeft,
} from "@tabler/icons-react";
import { useDictationContext } from "../../contexts/DictationContext";
import { useToast } from "../../contexts/ToastContext";
import { chat } from "../../services/ai/llm";
import { A2UI_CATALOG_SYSTEM } from "../../services/a2ui/catalog";
import {
  validateA2UIResponse,
  type A2UIResponse,
  type A2UIActionEvent,
} from "../../services/a2ui/types";
import A2UIRenderer from "../a2ui/A2UIRenderer";
import { saveProfile } from "../../data/patientStore";
import type { Patient } from "../../data/mock/patients";
import {
  ConversationCard,
  useSymptomTopicsFromLLM,
  useHpiNarrativeFromLLM,
  useMedsFromLLM,
  type PatientEhr,
} from "../NewPatientByVoice";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
type CenterTab = "summary" | "transcript" | "oldcarts";

// SOAP-style note distilled from the consultation transcript.
const NOTE_SYSTEM =
  "คุณคือ AI ผู้ช่วยแพทย์ในระบบ CIS ของโรงพยาบาลไทย สรุปบทสนทนาการซักประวัติเป็นบันทึกทางคลินิกแบบ SOAP ที่กระชับ ใช้ภาษาไทยคลินิก " +
  "ครอบคลุมเฉพาะสิ่งที่ผู้ป่วยพูดจริง ห้ามแต่งข้อมูล. " +
  'Output ONLY JSON: {"cc":"...","hpi":"...","impression":"...","plan":"..."}. ' +
  "cc = อาการสำคัญสั้น ๆ, hpi = ประวัติปัจจุบันเป็นย่อหน้าเดียว, impression = การวินิจฉัยเบื้องต้น, plan = แนวทางการดูแลเบื้องต้น.";

// A2UI task — turns the note into an interactive "proposed actions" panel.
const PROPOSED_TASK =
  "Generate a compact 'proposed clinical actions' UI for the doctor, based on the consultation note provided. " +
  "Use the `action-card` block for each recommended action — 2 to 4 cards covering, where clinically appropriate: " +
  "(1) นัดติดตามอาการ — caption ระบุช่วงเวลานัดที่แนะนำ; (2) สั่งยา — caption ระบุชื่อยา + ขนาด; " +
  "(3) ส่งตรวจแลป — caption ระบุรายการตรวจ. " +
  "Each action-card MUST be triggerable: include a button whose `action` is exactly one of " +
  "'order_followup', 'order_meds', or 'order_lab'. Title + caption in Thai with concrete details. " +
  "Use a leading section heading 'แผนการดูแลที่เสนอ'. Output ONLY the A2UIResponse JSON.";

interface NoteDraft {
  cc: string;
  hpi: string;
  impression: string;
  plan: string;
}

function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error("ไม่สามารถอ่านผลลัพธ์ AI ได้");
  }
}

/** Build the EHR summary the conversation Generated-Report tab reads from the
 *  doctor's actual patient record. */
function buildEhr(p: Patient): PatientEhr {
  return {
    history: [
      ...p.diagnoses.map((d) => `${d.name} (${d.code})`),
      ...p.allergies.map((a) => `แพ้ยา ${a.substance} (${a.reaction})`),
    ],
    meds: p.medications.map((m) => `${m.drug} ${m.dose} · ${m.frequency}`),
    visits: p.recentVisits.map(
      (v) => `${v.date} · ${v.clinic} · ${v.chiefComplaint} → ${v.diagnosis}`,
    ),
  };
}

type Phase = "consult" | "loading" | "result";

export default function DrNoteConsult({
  open,
  patient,
  onClose,
}: {
  open: boolean;
  patient: Patient;
  onClose: () => void;
}) {
  const toast = useToast();
  const { isRecording, startSession, stopSession, segments, asrInFlight } = useDictationContext();
  const { topics, inFlight: topicInFlight } = useSymptomTopicsFromLLM(segments, isRecording);
  const { hpi } = useHpiNarrativeFromLLM(segments, isRecording);
  const { meds: interviewMeds } = useMedsFromLLM(segments, isRecording);
  const ehr = useMemo(() => buildEhr(patient), [patient]);

  const [phase, setPhase] = useState<Phase>("consult");
  const [tab, setTab] = useState<CenterTab>("summary");
  const [note, setNote] = useState<NoteDraft | null>(null);
  const [proposed, setProposed] = useState<A2UIResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info(
      "ได้รับไฟล์เสียงแล้ว",
      `${file.name} (${Math.round(file.size / 1024)} KB) — กำลังส่งเข้า ASR…`,
    );
    e.target.value = "";
  };

  const close = () => {
    if (isRecording) void stopSession();
    onClose();
  };

  const handleFinish = async () => {
    if (isRecording) await stopSession();
    const text = segments.map((s) => s.text.trim()).filter(Boolean).join("\n");
    if (!text) {
      toast.info("ยังไม่มีบทสนทนา", "เริ่มบันทึกหรือพูดก่อนสรุป");
      return;
    }
    setPhase("loading");
    try {
      const noteRes = await chat(
        [
          { role: "system", content: NOTE_SYSTEM },
          { role: "user", content: text },
        ],
        { temperature: 0.2, maxTokens: 1500, responseFormat: "json_object" },
      );
      const draft = parseJson<NoteDraft>(noteRes.text);
      setNote(draft);

      const uiRes = await chat(
        [
          { role: "system", content: `${A2UI_CATALOG_SYSTEM}\n\n${PROPOSED_TASK}` },
          {
            role: "user",
            content: `บันทึกการตรวจ:\n${JSON.stringify(draft)}\n\nบทสนทนา:\n${text}`,
          },
        ],
        { temperature: 0.2, maxTokens: 2500, responseFormat: "json_object" },
      );
      setProposed(validateA2UIResponse(parseJson(uiRes.text)));
      setPhase("result");
    } catch (e) {
      toast.error("สรุปไม่สำเร็จ", e instanceof Error ? e.message : String(e));
      setPhase("consult");
    }
  };

  const handleProposedAction = (event: A2UIActionEvent) => {
    const labels: Record<string, string> = {
      order_followup: "เพิ่มนัดติดตามแล้ว",
      order_meds: "ส่งคำสั่งยาแล้ว",
      order_lab: "ส่งตรวจแลปแล้ว",
    };
    toast.success(labels[event.action] ?? "ดำเนินการแล้ว", "เพิ่มเข้าคำสั่งแพทย์");
  };

  const handleSaveNote = () => {
    if (!note) return;
    const body =
      `CC: ${note.cc}\nHPI: ${note.hpi}\nImpression: ${note.impression}\nPlan: ${note.plan}`;
    saveProfile(patient.hn, { note: body }, {});
    toast.success("บันทึก Dr. Note แล้ว", `HN ${patient.hn}`);
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="fixed inset-0 z-[120] flex flex-col bg-[#f4f4f4]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--theme-neutral)]/10 bg-white px-6 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--theme-primary-soft)]">
                <IconNotes className="h-5 w-5 text-[var(--theme-primary)]" stroke={1.75} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[15px] font-bold text-[var(--theme-neutral)]">
                  ซักประวัติ · Dr. Note
                </h2>
                <span className="text-[12px] text-[var(--theme-neutral)]/55">
                  {patient.prefix}
                  {patient.firstName} {patient.lastName} · HN {patient.hn}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {phase === "consult" && (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-110"
                >
                  <IconSparkles className="h-4 w-4" stroke={2} />
                  สรุป & เสนอแผนการดูแล
                </button>
              )}
              {phase === "result" && (
                <>
                  <button
                    type="button"
                    onClick={() => setPhase("consult")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--theme-neutral)]/15 bg-white px-3.5 py-2.5 text-[13px] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
                  >
                    <IconChevronLeft className="h-4 w-4" stroke={2} />
                    กลับไปแก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-110"
                  >
                    <IconCheck className="h-4 w-4" stroke={2.2} />
                    บันทึก Dr. Note
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="ปิด"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--theme-neutral)]/55 transition hover:bg-[var(--theme-neutral)]/8"
              >
                <IconX className="h-4 w-4" stroke={2} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1 flex-col p-4">
            {phase === "consult" && (
              <ConversationCard
                patientName={`${patient.prefix}${patient.firstName} ${patient.lastName}`}
                topics={topics}
                hpi={hpi}
                ehr={ehr}
                interviewMeds={interviewMeds}
                segments={segments}
                isRecording={isRecording}
                onToggleRecord={() => (isRecording ? void stopSession() : startSession("mic"))}
                onTabAudio={() => startSession("tab")}
                onAudioFile={() => fileInputRef.current?.click()}
                tab={tab}
                onTabChange={setTab}
                asrInFlight={asrInFlight}
                topicInFlight={topicInFlight}
              />
            )}

            {phase === "loading" && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[var(--theme-primary)]">
                <IconLoader2 className="h-7 w-7 animate-spin" stroke={2} />
                <p className="text-[14px] font-medium">กำลังสรุปและจัดทำแผนการดูแล…</p>
              </div>
            )}

            {phase === "result" && note && (
              <div className="mx-auto w-full max-w-[860px] flex-1 overflow-y-auto">
                <ResultView note={note} proposed={proposed} onAction={handleProposedAction} />
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="audio/*" hidden onChange={handleFile} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ResultView({
  note,
  proposed,
  onAction,
}: {
  note: NoteDraft;
  proposed: A2UIResponse | null;
  onAction: (e: A2UIActionEvent) => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "อาการสำคัญ (CC)", value: note.cc },
    { label: "ประวัติปัจจุบัน (HPI)", value: note.hpi },
    { label: "การวินิจฉัยเบื้องต้น", value: note.impression },
    { label: "แนวทางดูแล (Plan)", value: note.plan },
  ];
  return (
    <div className="flex flex-col gap-5 py-2">
      <section className="flex flex-col gap-3 rounded-2xl bg-white p-6">
        <h3 className="text-[15px] font-bold text-[var(--theme-neutral)]">สรุปการซักประวัติ</h3>
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5">
            <span className="text-[12px] font-semibold text-[var(--theme-neutral)]/55">{r.label}</span>
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-[var(--theme-neutral)]/85">
              {r.value || "—"}
            </p>
          </div>
        ))}
      </section>

      {proposed ? (
        <section className="rounded-2xl bg-white p-6">
          <A2UIRenderer response={proposed} onAction={onAction} theme="light" />
        </section>
      ) : (
        <p className="text-[13px] text-[var(--theme-neutral)]/45">ไม่มีแผนการดูแลที่เสนอ</p>
      )}
    </div>
  );
}
