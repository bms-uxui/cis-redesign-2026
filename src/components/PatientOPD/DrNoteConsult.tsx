import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  IconSparkles,
  IconLoader2,
  IconCheck,
  IconChevronLeft,
  IconCalendarPlus,
  IconPill,
  IconFlask,
} from "@tabler/icons-react";
import { useDictationContext } from "../../contexts/DictationContext";
import { useToast } from "../../contexts/ToastContext";
import { useUser } from "../../contexts/UserContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { chat } from "../../services/ai/llm";
import { saveProfile } from "../../data/patientStore";
import type { Patient } from "../../data/mock/patients";
import {
  ConversationCard,
  RecordingPanel,
  useSymptomTopicsFromLLM,
  useHpiNarrativeFromLLM,
  useMedsFromLLM,
  type PatientEhr,
} from "../NewPatientByVoice";
import {
  AboutPanel,
  ModelPanel,
  conditionFor,
  resolvePatient,
  useTranscriptFindings,
  useTranscriptBodyRegions,
  useSymptomPlot,
} from "./index";

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

/** Doctor consultation (`/opd/:hn/consult`). Mirrors the PatientOPD page shell —
 *  persistent sidebar/tab-bar chrome, AboutPanel on the left, body model on the
 *  right — but keeps its own record → summarise → result phase flow. */
export default function DrNoteConsult() {
  const params = useParams();
  const patient = useMemo<Patient | undefined>(() => resolvePatient(params.hn), [params.hn]);

  if (!patient) {
    return (
      <div className="min-h-screen w-full bg-[var(--theme-base)] p-8">
        <p className="text-[var(--theme-neutral)]/55">ไม่พบผู้ป่วยรายนี้</p>
      </div>
    );
  }
  return <ConsultPage patient={patient} />;
}

function ConsultPage({ patient }: { patient: Patient }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useUser();
  const { railHidden } = useSidebar();
  const { isRecording, startSession, stopSession, segments, asrInFlight } = useDictationContext();
  const { topics, inFlight: topicInFlight } = useSymptomTopicsFromLLM(segments, isRecording);
  const { hpi } = useHpiNarrativeFromLLM(segments, isRecording);
  const { meds: interviewMeds } = useMedsFromLLM(segments, isRecording);
  const ehr = useMemo(() => buildEhr(patient), [patient]);

  // Live transcript-driven body-model mapping — same hooks PatientOPD feeds the
  // model with, so the consult body model behaves identically.
  const transcriptText = useMemo(() => segments.map((s) => s.text).join(" "), [segments]);
  const liveFindings = useTranscriptFindings(transcriptText, isRecording);
  const liveRegions = useTranscriptBodyRegions(transcriptText, isRecording);
  const symptomPlot = useSymptomPlot(transcriptText, isRecording);
  const info = useMemo(() => conditionFor(patient), [patient]);

  const [phase, setPhase] = useState<Phase>("consult");
  const [tab, setTab] = useState<CenterTab>("summary");
  const [note, setNote] = useState<NoteDraft | null>(null);
  const [proposed, setProposed] = useState<ProposedAction[] | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Patient identity for the conversation card's collapsible header,
  // derived from the doctor's actual patient record.
  const patientInfo = useMemo(
    () => ({
      fullName: `${patient.prefix}${patient.firstName} ${patient.lastName}`,
      prefix: patient.prefix,
      cid: `HN ${patient.hn}`,
      gender: patient.gender === "M" ? "ชาย" : patient.gender === "F" ? "หญิง" : "—",
      age: `${patient.age} ปี`,
      bloodPressure: patient.vitals
        ? `${patient.vitals.systolic}/${patient.vitals.diastolic} mmHg`
        : "—",
      pulse: patient.vitals?.heartRate ? `${patient.vitals.heartRate} ครั้ง/นาที` : "—",
      temperature: patient.vitals?.temperature ? `${patient.vitals.temperature} °C` : "—",
      respiratoryRate: "—",
      spo2: "—",
      weight: patient.vitals?.weight ? `${patient.vitals.weight} กก.` : "—",
      height: patient.vitals?.height ? `${patient.vitals.height} ซม.` : "—",
    }),
    [patient],
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info(
      "ได้รับไฟล์เสียงแล้ว",
      `${file.name} (${Math.round(file.size / 1024)} KB) — กำลังส่งเข้า ASR…`,
    );
    e.target.value = "";
  };

  const leave = () => {
    if (isRecording) void stopSession();
    navigate("/schedule");
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
    leave();
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f4f4f4]">
      <div className="h-16 shrink-0" aria-hidden />
      <div
        className={[
          "flex h-[calc(100vh-6rem)] flex-col mr-4 mt-4 mb-4 gap-4 overflow-hidden transition-[margin] duration-300 ease-out",
          railHidden ? "ml-4" : "ml-4 lg:ml-[296px]",
        ].join(" ")}
      >
        {/* ── Top bar — back · title · phase actions ───────────────────── */}
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl bg-white px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={leave}
              className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-[var(--theme-neutral)]/60 transition hover:bg-black/[0.04] hover:text-[var(--theme-neutral)]"
            >
              <IconChevronLeft className="h-4 w-4" stroke={2} />
              ตารางแพทย์
            </button>
            <span className="h-5 w-px shrink-0 bg-black/10" />
            <div className="flex min-w-0 flex-col">
              <h2 className="truncate text-[14px] font-bold text-[var(--theme-neutral)]">
                ซักประวัติ · ปรึกษา
              </h2>
              <span className="truncate text-[12px] text-[var(--theme-neutral)]/55">
                {patient.prefix}
                {patient.firstName} {patient.lastName} · HN {patient.hn}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {phase === "consult" && (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--theme-primary)] px-4 py-2 text-[12px] font-semibold text-white transition hover:brightness-110"
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-neutral)]/15 bg-white px-3.5 py-2 text-[12px] font-medium text-[var(--theme-neutral)] transition hover:bg-[var(--theme-primary-soft)]"
                >
                  <IconChevronLeft className="h-4 w-4" stroke={2} />
                  กลับไปแก้ไข
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--theme-primary)] px-4 py-2 text-[12px] font-semibold text-white transition hover:brightness-110"
                >
                  <IconCheck className="h-4 w-4" stroke={2.2} />
                  บันทึก Dr. Note
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Body: patient · consult workspace · body model ───────────── */}
        <div className="flex min-h-0 flex-1">
          {/* LEFT — about patient */}
          <div className="relative hidden w-[400px] shrink-0 overflow-hidden xl:mr-4 xl:block">
            <AboutPanel patient={patient} />
          </div>

          {/* CENTER — record + conversation (consult) / loading / result */}
          <div className="hidden min-w-[340px] flex-1 md:block">
            {phase === "consult" && (
              <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
                <RecordingPanel
                  isRecording={isRecording}
                  started={segments.length > 0}
                  asrInFlight={asrInFlight}
                  topicInFlight={topicInFlight}
                  onToggleRecord={() => (isRecording ? void stopSession() : startSession("mic"))}
                  onTabAudio={() => startSession("tab")}
                  onAudioFile={() => fileInputRef.current?.click()}
                />
                <ConversationCard
                  patientName={`${patient.prefix}${patient.firstName} ${patient.lastName}`}
                  patientInfo={patientInfo}
                  infoOpen={infoOpen}
                  onToggleInfo={() => setInfoOpen((v) => !v)}
                  topics={topics}
                  hpi={hpi}
                  ehr={ehr}
                  interviewMeds={interviewMeds}
                  segments={segments}
                  isRecording={isRecording}
                  tab={tab}
                  onTabChange={setTab}
                />
              </div>
            )}

            {phase === "loading" && (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-white text-[var(--theme-primary)]">
                <IconLoader2 className="h-7 w-7 animate-spin" stroke={2} />
                <p className="text-[14px] font-medium">กำลังสรุปและจัดทำแผนการดูแล…</p>
              </div>
            )}

            {phase === "result" && note && (
              <div className="h-full overflow-y-auto">
                <div className="mx-auto w-full max-w-[860px]">
                  <ResultView
                    note={note}
                    proposed={proposed}
                    doctorName={user.name}
                    doctorAvatar={user.avatarUrl}
                    onAction={handleProposedAction}
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — body model, mirroring the OPD page */}
          <div className="ml-4 hidden h-full w-[380px] shrink-0 lg:block">
            <ModelPanel
              patient={patient}
              info={info}
              liveFindings={liveFindings}
              liveRegions={liveRegions}
              liveHpi={hpi}
              recording={isRecording}
              symptomPlot={symptomPlot}
            />
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="audio/*" hidden onChange={handleFile} />
    </div>
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
