import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconX,
  IconSparkles,
  IconLoader2,
  IconCheck,
  IconNotes,
  IconChevronLeft,
  IconCalendarPlus,
  IconPill,
  IconFlask,
} from "@tabler/icons-react";
import { useDictationContext } from "../../contexts/DictationContext";
import { useToast } from "../../contexts/ToastContext";
import { useUser } from "../../contexts/UserContext";
import { chat } from "../../services/ai/llm";
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

// Proposed clinical actions distilled from the note (rendered as a button
// list, not freeform UI). Each action is a short, concrete order the doctor
// taps to execute.
const PROPOSED_SYSTEM =
  "คุณคือ AI ผู้ช่วยแพทย์ในระบบ CIS เสนอ 'การดำเนินการ' ที่แพทย์ควรทำต่อจากการตรวจ 2-4 อย่าง ตามความเหมาะสมทางคลินิก จากบันทึกที่ให้. " +
  "ครอบคลุมเมื่อเหมาะสม: นัดติดตาม (followup), สั่งยา (meds), ส่งตรวจแลป (lab). " +
  "เรียงให้การดำเนินการที่สำคัญที่สุดอยู่บนสุด. " +
  'Output ONLY JSON: {"actions":[{"label":"...","type":"followup|meds|lab"}]}. ' +
  "label = ข้อความสั้นกระชับเป็นคำสั่งพร้อมรายละเอียดจริง เช่น 'นัดติดตาม 7 วัน', 'สั่งยา Metformin 500 mg', 'ส่งตรวจ HbA1c' — ห้ามแต่งข้อมูลที่ไม่มีในบันทึก.";

interface NoteDraft {
  cc: string;
  hpi: string;
  impression: string;
  plan: string;
}

type ActionType = "followup" | "meds" | "lab";
interface ProposedAction {
  label: string;
  type: ActionType;
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
  const { user } = useUser();
  const { isRecording, startSession, stopSession, segments, asrInFlight } = useDictationContext();
  const { topics, inFlight: topicInFlight } = useSymptomTopicsFromLLM(segments, isRecording);
  const { hpi } = useHpiNarrativeFromLLM(segments, isRecording);
  const { meds: interviewMeds } = useMedsFromLLM(segments, isRecording);
  const ehr = useMemo(() => buildEhr(patient), [patient]);

  const [phase, setPhase] = useState<Phase>("consult");
  const [tab, setTab] = useState<CenterTab>("summary");
  const [note, setNote] = useState<NoteDraft | null>(null);
  const [proposed, setProposed] = useState<ProposedAction[] | null>(null);
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

      const actRes = await chat(
        [
          { role: "system", content: PROPOSED_SYSTEM },
          {
            role: "user",
            content: `บันทึกการตรวจ:\n${JSON.stringify(draft)}\n\nบทสนทนา:\n${text}`,
          },
        ],
        { temperature: 0.2, maxTokens: 600, responseFormat: "json_object" },
      );
      const parsed = parseJson<{ actions?: ProposedAction[] }>(actRes.text);
      const actions = Array.isArray(parsed?.actions)
        ? parsed.actions.filter((a) => a && typeof a.label === "string" && a.label.trim())
        : [];
      setProposed(actions);
      setPhase("result");
    } catch (e) {
      toast.error("สรุปไม่สำเร็จ", e instanceof Error ? e.message : String(e));
      setPhase("consult");
    }
  };

  const handleProposedAction = (action: ProposedAction) => {
    const labels: Record<ActionType, string> = {
      followup: "เพิ่มนัดติดตามแล้ว",
      meds: "ส่งคำสั่งยาแล้ว",
      lab: "ส่งตรวจแลปแล้ว",
    };
    toast.success(labels[action.type] ?? "ดำเนินการแล้ว", action.label);
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
                <ResultView
                  note={note}
                  proposed={proposed}
                  doctorName={user.name}
                  doctorAvatar={user.avatarUrl}
                  onAction={handleProposedAction}
                />
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
  doctorName,
  doctorAvatar,
  onAction,
}: {
  note: NoteDraft;
  proposed: ProposedAction[] | null;
  doctorName: string;
  doctorAvatar?: string;
  onAction: (a: ProposedAction) => void;
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

      <ProposedActions
        actions={proposed ?? []}
        doctorName={doctorName}
        doctorAvatar={doctorAvatar}
        onAction={onAction}
      />
    </div>
  );
}

const ACTION_ICON: Record<ActionType, typeof IconCalendarPlus> = {
  followup: IconCalendarPlus,
  meds: IconPill,
  lab: IconFlask,
};

function ProposedActions({
  actions,
  doctorName,
  doctorAvatar,
  onAction,
}: {
  actions: ProposedAction[];
  doctorName: string;
  doctorAvatar?: string;
  onAction: (a: ProposedAction) => void;
}) {
  if (actions.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-6">
        <p className="text-[13px] text-[var(--theme-neutral)]/45">ไม่มีแผนการดูแลที่เสนอ</p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl bg-white p-6">
      <h3 className="text-[19px] font-bold leading-snug text-[var(--theme-neutral)]">
        แผนการดูแลที่เสนอ
      </h3>

      {/* Signed-by row */}
      <div className="mt-3 flex items-center gap-2.5">
        {doctorAvatar ? (
          <img src={doctorAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--theme-primary-soft)] text-[12px] font-semibold text-[var(--theme-primary)]">
            {doctorName.replace(/^(นพ\.|พญ\.|พว\.)\s*/, "").slice(0, 2)}
          </span>
        )}
        <span className="text-[14px] text-[var(--theme-neutral)]/65">
          บันทึกโดย {doctorName}
        </span>
      </div>

      {/* Action buttons — first is primary/filled, the rest outlined. */}
      <div className="mt-5 flex flex-col gap-3">
        {actions.map((a, i) => {
          const Icon = ACTION_ICON[a.type] ?? IconCalendarPlus;
          const primary = i === 0;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onAction(a)}
              className={[
                "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] font-medium transition",
                primary
                  ? "bg-[var(--theme-primary)] text-white hover:brightness-110"
                  : "border border-[var(--theme-primary)]/30 bg-white text-[var(--theme-neutral)] hover:bg-[var(--theme-primary-soft)]",
              ].join(" ")}
            >
              <Icon
                className={`h-4 w-4 ${primary ? "text-white/85" : "text-[var(--theme-primary)]"}`}
                stroke={1.75}
              />
              {a.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
