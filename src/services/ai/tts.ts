import { AI_CONFIG, aiFetch } from "./config";

export interface SpeakOptions {
  voice?: string;
  format?: "wav" | "mp3";
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
