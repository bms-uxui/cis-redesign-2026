/**
 * Pipeline data model — kept narrow on purpose. Triggers and step actions
 * are tagged unions so the builder can render the right form for each.
 */

export type TriggerType = "manual" | "schedule" | "event";

export type EventName =
  | "patient.registered"
  | "lab.result.received"
  | "appointment.cancelled"
  | "soap.saved";

export interface ManualTrigger {
  type: "manual";
}
export interface ScheduleTrigger {
  type: "schedule";
  /** Human-readable cadence shown in the builder. Cron string optional. */
  label: string;
  cron?: string;
}
export interface EventTrigger {
  type: "event";
  event: EventName;
}
export type Trigger = ManualTrigger | ScheduleTrigger | EventTrigger;

export type StepType =
  | "notify"
  | "create-appointment"
  | "draft-soap"
  | "ai-summarize";

export interface NotifyStep {
  id: string;
  type: "notify";
  channel: "in-app" | "line" | "email";
  message: string;
}
export interface AppointmentStep {
  id: string;
  type: "create-appointment";
  /** Days from now (or from the trigger event). */
  offsetDays: number;
  service: string;
}
export interface DraftSoapStep {
  id: string;
  type: "draft-soap";
  template: string;
}
export interface AiSummarizeStep {
  id: string;
  type: "ai-summarize";
  prompt: string;
}
export type Step =
  | NotifyStep
  | AppointmentStep
  | DraftSoapStep
  | AiSummarizeStep;

export interface PipelineRun {
  at: string;
  status: "success" | "error" | "running";
  message?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: Trigger;
  steps: Step[];
  lastRun?: PipelineRun;
  createdAt: string;
  updatedAt: string;
}

export const STEP_LABELS: Record<StepType, string> = {
  notify: "แจ้งเตือน",
  "create-appointment": "สร้างนัดติดตาม",
  "draft-soap": "ร่าง SOAP",
  "ai-summarize": "สรุปด้วย AI",
};

export const STEP_DESCRIPTIONS: Record<StepType, string> = {
  notify: "ส่งข้อความถึงผู้ใช้งานหรือทีม",
  "create-appointment": "เปิดนัดให้ผู้ป่วยอัตโนมัติ",
  "draft-soap": "ร่างบันทึก SOAP จาก template",
  "ai-summarize": "ใช้ LLM สรุปข้อมูลตาม prompt",
};

export const EVENT_LABELS: Record<EventName, string> = {
  "patient.registered": "ผู้ป่วยลงทะเบียน",
  "lab.result.received": "ผลแลปกลับมา",
  "appointment.cancelled": "นัดถูกยกเลิก",
  "soap.saved": "บันทึก SOAP",
};
