import type { Pipeline, Step } from "./types";

const KEY = "ehp-cis.pipelines.v1";

const SEED: Pipeline[] = [
  {
    id: "seed-hba1c",
    name: "ติดตาม HbA1c ผู้ป่วยเบาหวาน",
    description: "เมื่อผล HbA1c สูงกว่า 7% จะเปิดนัดอัตโนมัติและแจ้งหมอเจ้าของไข้",
    enabled: true,
    trigger: { type: "event", event: "lab.result.received" },
    steps: [
      {
        id: "s1",
        type: "notify",
        channel: "in-app",
        message: "ผล HbA1c สูง — โปรดติดตามผู้ป่วยภายใน 7 วัน",
      },
      {
        id: "s2",
        type: "create-appointment",
        offsetDays: 14,
        service: "DM Follow-up Clinic",
      },
    ],
    lastRun: { at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), status: "success" },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "seed-morning-brief",
    name: "สรุปคิวผู้ป่วยตอนเช้า",
    description: "ทุกวัน 08:30 สรุปคิว OPD ของวันส่งเข้า in-app",
    enabled: true,
    trigger: { type: "schedule", label: "ทุกวัน 08:30", cron: "30 8 * * *" },
    steps: [
      {
        id: "s1",
        type: "ai-summarize",
        prompt: "สรุปคิวผู้ป่วย OPD วันนี้ จัดเรียงตามความเร่งด่วน",
      },
      {
        id: "s2",
        type: "notify",
        channel: "in-app",
        message: "สรุปคิวเช้านี้พร้อมแล้ว",
      },
    ],
    lastRun: { at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), status: "success" },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

function read(): Pipeline[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      window.localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED;
  } catch {
    return SEED;
  }
}

function write(pipelines: Pipeline[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pipelines));
  } catch {
    /* ignore */
  }
}

export function listPipelines(): Pipeline[] {
  return read();
}

export function getPipeline(id: string): Pipeline | undefined {
  return read().find((p) => p.id === id);
}

export function savePipeline(pipeline: Pipeline) {
  const all = read();
  const idx = all.findIndex((p) => p.id === pipeline.id);
  const now = new Date().toISOString();
  const next: Pipeline = { ...pipeline, updatedAt: now };
  if (idx >= 0) all[idx] = next;
  else all.unshift({ ...next, createdAt: now });
  write(all);
}

export function deletePipeline(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function togglePipeline(id: string, enabled: boolean) {
  const all = read();
  const idx = all.findIndex((p) => p.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], enabled, updatedAt: new Date().toISOString() };
    write(all);
  }
}

export function recordRun(id: string, run: Pipeline["lastRun"]) {
  const all = read();
  const idx = all.findIndex((p) => p.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], lastRun: run };
    write(all);
  }
}

export function newPipeline(): Pipeline {
  const id = `pl-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  return {
    id,
    name: "Pipeline ใหม่",
    enabled: false,
    trigger: { type: "manual" },
    steps: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function newStep(type: Step["type"]): Step {
  const id = `step-${Math.random().toString(36).slice(2, 9)}`;
  switch (type) {
    case "notify":
      return { id, type, channel: "in-app", message: "" };
    case "create-appointment":
      return { id, type, offsetDays: 7, service: "OPD" };
    case "draft-soap":
      return { id, type, template: "" };
    case "ai-summarize":
      return { id, type, prompt: "" };
  }
}
