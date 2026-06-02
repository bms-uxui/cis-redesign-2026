import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import {
  IconHome,
  IconPencil,
  IconCopy,
  IconRefresh,
  IconLayoutList,
  IconMicrophone,
  IconPlus,
  IconChevronRight,
  IconThumbUp,
  IconThumbDown,
  IconTrash,
  IconAdjustmentsHorizontal,
  IconSortDescending,
  IconCalendar,
} from "@tabler/icons-react";

const EASE_TV: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface SOAPSection {
  id: "cc" | "hpi" | "imp" | "plan";
  label: string;
  body: string;
  editable: boolean;
}

const SEED_SECTIONS: SOAPSection[] = [
  {
    id: "cc",
    label: "Chief complaint (CC)",
    body: "ไอแห้ง 3 วัน เจ็บคอ มีน้ำมูกใส ไม่มีไข้สูง",
    editable: true,
  },
  {
    id: "hpi",
    label: "History of present illness (PI)",
    body:
      "ผู้ป่วยชายไทย อายุ 38 ปี มีอาการไอแห้งร่วมกับเจ็บคอเป็นเวลา 3 วันก่อนมารพ. " +
      "เริ่มต้นจากน้ำมูกใส คัดจมูก ไอเริ่มถี่ขึ้นในตอนกลางคืน " +
      "ปฏิเสธไข้สูง ปฏิเสธหายใจหอบเหนื่อย ปฏิเสธประวัติสัมผัสผู้ป่วยติดเชื้อระบบทางเดินหายใจชัดเจน " +
      "ไม่มีโรคประจำตัว ไม่มีประวัติแพ้ยา",
    editable: true,
  },
  {
    id: "imp",
    label: "Impression (IMP)",
    body: "Acute viral upper respiratory tract infection (URI) — J06.9",
    editable: true,
  },
  {
    id: "plan",
    label: "Plan",
    body:
      "1. Symptomatic treatment: Paracetamol 500 mg prn fever/pain, Dextromethorphan 15 mg tid prn cough\n" +
      "2. Saline nasal spray prn nasal congestion\n" +
      "3. Advise rest, hydration, hand hygiene, mask wearing\n" +
      "4. F/U 3–5 days หากอาการแย่ลงหรือมีไข้สูง > 38.5°C นาน 48 ชม.",
    editable: true,
  },
];

interface CaseEntry {
  id: string;
  date: string;
  kind: "OPD" | "IPD";
  patient: string;
  time: string;
  active?: boolean;
}

const SEED_CASES: CaseEntry[] = [
  { id: "1", date: "29/05/2569", kind: "OPD", patient: "Patient 3", time: "08:44", active: true },
  { id: "2", date: "28/05/2569", kind: "OPD", patient: "Patient 2", time: "15:20" },
  { id: "3", date: "28/05/2569", kind: "OPD", patient: "Patient 1", time: "09:11" },
];

export default function SOAPSummary() {
  const navigate = useNavigate();
  const [sections, setSections] = useState(SEED_SECTIONS);

  const handleCopyAll = () => {
    const text = sections
      .map((s) => `${s.label}\n${s.body || "-"}`)
      .join("\n\n");
    void navigator.clipboard?.writeText(text);
  };

  const handleCopySection = (id: SOAPSection["id"]) => {
    const s = sections.find((x) => x.id === id);
    if (s) void navigator.clipboard?.writeText(s.body || "-");
  };

  const handleEdit = (id: SOAPSection["id"]) => {
    const current = sections.find((x) => x.id === id);
    const next = window.prompt(current?.label, current?.body ?? "");
    if (next === null) return;
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, body: next } : s)),
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8f9fc] pt-[60px]">
      {/* ── Left sidebar — recent cases ─────────────────────────────────── */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 p-4">
          <Button
            variant="bordered"
            startContent={<IconPlus className="h-4 w-4" stroke={2} />}
            className="w-full border-violet-200 bg-violet-50/40 font-medium text-violet-700"
            onPress={() => navigate("/ai")}
          >
            เริ่มเคสใหม่
          </Button>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[13px] font-medium text-neutral-600">
            เคสย้อนหลัง
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="กรอง"
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
            >
              <IconAdjustmentsHorizontal className="h-4 w-4" stroke={1.75} />
            </button>
            <button
              type="button"
              aria-label="เรียงลำดับ"
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
            >
              <IconSortDescending className="h-4 w-4" stroke={1.75} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {SEED_CASES.map((c, i, arr) => {
            const showDate = i === 0 || arr[i - 1].date !== c.date;
            return (
              <div key={c.id}>
                {showDate && (
                  <div className="mt-2 mb-1 flex items-center gap-1.5 px-2 text-[12px] text-neutral-500">
                    <IconCalendar className="h-3.5 w-3.5" stroke={1.75} />
                    {c.date}
                  </div>
                )}
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] transition ${
                    c.active
                      ? "bg-amber-50 ring-1 ring-amber-200"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                        c.kind === "OPD"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {c.kind}
                    </span>
                    <span className="font-medium text-neutral-800">
                      {c.patient}
                    </span>
                  </span>
                  <span className="text-[11px] text-neutral-500">{c.time}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-neutral-100 px-4 py-3 text-[11px] text-neutral-400">
          ระบบเก็บบันทึกเคสย้อนหลังไว้ 24 ชั่วโมงเท่านั้น
        </div>
      </aside>

      {/* ── Main panel ──────────────────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top toolbar */}
        <header className="flex items-center justify-between gap-4 border-b border-neutral-100 bg-white px-6 py-3">
          <nav className="flex items-center gap-2 text-[14px] text-neutral-600">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 hover:text-neutral-900"
            >
              <IconHome className="h-4 w-4" stroke={1.75} />
              <span>หน้าหลัก</span>
            </button>
            <IconChevronRight className="h-4 w-4 text-neutral-400" stroke={1.75} />
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[12px] font-semibold text-amber-700">
              OPD
            </span>
            <span className="font-medium text-neutral-900">Patient 3</span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="แก้ไขชื่อเคส"
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
            >
              <IconPencil className="h-4 w-4" stroke={1.75} />
            </button>
            <Button
              variant="bordered"
              startContent={<IconRefresh className="h-4 w-4" stroke={1.75} />}
              className="h-9 border-neutral-200 bg-white text-[13px] font-medium text-neutral-700"
            >
              สร้างสรุปใหม่
            </Button>
            <Button
              variant="bordered"
              startContent={<IconLayoutList className="h-4 w-4" stroke={1.75} />}
              className="h-9 border-neutral-200 bg-white text-[13px] font-medium text-neutral-700"
            >
              ปรับรูปแบบสรุป
            </Button>
            <Button
              variant="bordered"
              startContent={<IconMicrophone className="h-4 w-4" stroke={1.75} />}
              className="h-9 border-neutral-200 bg-white text-[13px] font-medium text-neutral-700"
            >
              บันทึกเสียงเพิ่ม
            </Button>
          </div>
        </header>

        {/* Summary card */}
        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_TV }}
            className="mx-auto flex w-full max-w-[1080px] flex-col rounded-2xl border border-neutral-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h1 className="text-[18px] font-semibold text-neutral-900">
                สรุปบันทึก
              </h1>
              <Button
                color="primary"
                className="h-9 bg-[#2563eb] text-[13px] font-medium text-white"
                startContent={<IconCopy className="h-4 w-4" stroke={1.75} />}
                onPress={handleCopyAll}
              >
                คัดลอกสรุปทั้งหมด
              </Button>
            </div>

            <div className="flex flex-col">
              {sections.map((s, i) => (
                <SectionRow
                  key={s.id}
                  section={s}
                  showDivider={i < sections.length - 1}
                  onCopy={() => handleCopySection(s.id)}
                  onEdit={() => handleEdit(s.id)}
                />
              ))}
            </div>
          </motion.section>
        </div>

        {/* Bottom action row */}
        <footer className="flex items-center justify-between border-t border-neutral-100 bg-white px-6 py-3 text-[13px]">
          <button
            type="button"
            className="flex items-center gap-1.5 text-neutral-600 hover:text-rose-600"
          >
            <IconTrash className="h-4 w-4" stroke={1.75} />
            <span className="underline-offset-4 hover:underline">
              ลบสรุปบันทึก
            </span>
          </button>
          <div className="flex items-center gap-3 text-neutral-500">
            <button
              type="button"
              aria-label="เห็นด้วย"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 hover:text-emerald-600"
            >
              <IconThumbUp className="h-4 w-4" stroke={1.75} />
            </button>
            <button
              type="button"
              aria-label="ไม่เห็นด้วย"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 hover:text-rose-600"
            >
              <IconThumbDown className="h-4 w-4" stroke={1.75} />
            </button>
            <button
              type="button"
              className="text-rose-600 underline-offset-4 hover:underline"
            >
              แจ้งสรุปมีปัญหา
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SectionRow({
  section,
  showDivider,
  onCopy,
  onEdit,
}: {
  section: SOAPSection;
  showDivider: boolean;
  onCopy: () => void;
  onEdit: () => void;
}) {
  return (
    <div className={showDivider ? "border-b border-neutral-100" : ""}>
      <div className="group flex items-start justify-between gap-4 px-6 py-5">
        <div className="flex-1">
          <div className="text-[13px] font-medium text-neutral-500">
            {section.label}
          </div>
          <div className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-neutral-900">
            {section.body || "-"}
          </div>
          {section.id === "imp" && (
            <button
              type="button"
              className="mt-3 flex items-center gap-1 text-[13px] font-medium text-[#2563eb] hover:underline"
              onClick={onEdit}
            >
              <IconPlus className="h-4 w-4" stroke={1.75} />
              <span>Add more diagnosis</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onCopy}
            aria-label="คัดลอก"
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
          >
            <IconCopy className="h-4 w-4" stroke={1.75} />
          </button>
          {section.editable && (
            <button
              type="button"
              onClick={onEdit}
              aria-label="แก้ไข"
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
            >
              <IconPencil className="h-4 w-4" stroke={1.75} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
