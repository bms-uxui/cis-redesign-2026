import { AI_CONFIG, aiFetch } from "./config";
import { chat } from "./llm";

const TTS_NORMALIZE_SYSTEM =
  "คุณคือตัวช่วยเตรียมข้อความสำหรับระบบอ่านออกเสียงภาษาไทย (TTS) " +
  "เขียนข้อความใหม่ให้โมเดลเสียงภาษาไทยอ่านได้ถูกต้องและชัดเจน โดย: " +
  "1) แปลงคำภาษาอังกฤษ ชื่อยา และศัพท์แพทย์ ให้เป็นคำอ่านภาษาไทย (ทับศัพท์) เช่น penicillin → เพนิซิลลิน, paracetamol → พาราเซตามอล, metformin → เมทฟอร์มิน, amlodipine → แอมโลดิพีน " +
  "2) แปลงตัวย่อเป็นคำอ่านทีละตัวอักษรเป็นไทย เช่น HPI → เอช-พี-ไอ, BMI → บี-เอ็ม-ไอ, BP → บี-พี, HN → เอช-เอ็น, mg → มิลลิกรัม, ml → มิลลิลิตร " +
  "3) แปลงตัวเลข สัญลักษณ์ และหน่วย เป็นคำอ่านไทย เช่น 7/10 → เจ็ดจากสิบ, 24.5 → ยี่สิบสี่จุดห้า, % → เปอร์เซ็นต์, °C → องศาเซลเซียส " +
  "ตัวอย่างข้างต้นเป็นเพียงตัวอย่างให้เห็นรูปแบบ ให้ใช้กฎเดียวกันกับ 'ทุก' คำ/ตัวย่อ/ตัวเลขในประเภทนั้น ไม่จำกัดเฉพาะคำที่ยกตัวอย่าง " +
  "ห้ามเพิ่มหรือตัดเนื้อหา ห้ามอธิบายหรือใส่หัวข้อ ตอบกลับเฉพาะข้อความที่เขียนใหม่เท่านั้น";

/** Rewrite text so the Thai TTS model pronounces English words, drug names,
 *  abbreviations and numbers correctly. Falls back to the original on failure. */
export async function normalizeForSpeech(input: string, signal?: AbortSignal): Promise<string> {
  try {
    const { text } = await chat(
      [
        { role: "system", content: TTS_NORMALIZE_SYSTEM },
        { role: "user", content: input },
      ],
      { temperature: 0, maxTokens: 1200, fast: true, signal },
    );
    return text.trim() || input;
  } catch {
    return input;
  }
}

export interface SpeakOptions {
  voice?: string;
  format?: "wav" | "mp3";
  speed?: number;
  signal?: AbortSignal;
}

export async function speak(input: string, opts: SpeakOptions = {}): Promise<Blob> {
  const res = await aiFetch("tts", `${AI_CONFIG.ttsBase}/v1/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input,
      voice: opts.voice ?? "default",
      response_format: opts.format ?? "mp3",
      ...(opts.speed ? { speed: opts.speed } : {}),
    }),
    signal: opts.signal,
  });
  return res.blob();
}

export async function listVoices(): Promise<string[]> {
  const res = await aiFetch("tts", `${AI_CONFIG.ttsBase}/v1/voices`);
  const data = await res.json();
  return data?.voices ?? data ?? [];
}

export async function playSpeech(input: string, opts?: SpeakOptions) {
  const blob = await speak(input, opts);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url));
  await audio.play();
  return audio;
}
