import { AI_CONFIG, aiFetch } from "./config";
import { blobToWav } from "./wav";

export interface TranscribeOptions {
  language?: string;
  prompt?: string;
  model?: string;
  signal?: AbortSignal;
}

export interface TranscribeResult {
  text: string;
  language?: string;
  duration?: number;
}

export async function transcribe(
  audio: Blob,
  opts: TranscribeOptions = {},
): Promise<TranscribeResult> {
  const wav = audio.type.includes("wav") ? audio : await blobToWav(audio);
  const form = new FormData();
  form.append("file", wav, "clip.wav");
  form.append("model", opts.model ?? "Qwen/Qwen3-ASR-1.7B");
  // Omit language to let Qwen3-ASR auto-detect — required for Thai/English
  // code-switching common in Thai clinical speech.
  if (opts.language) form.append("language", opts.language);
  if (opts.prompt) form.append("prompt", opts.prompt);
  form.append("response_format", "json");

  const res = await aiFetch("asr", `${AI_CONFIG.asrBase}/v1/audio/transcriptions`, {
    method: "POST",
    body: form,
    signal: opts.signal,
  });
  const data = (await res.json()) as TranscribeResult;
  return { ...data, text: cleanTranscript(data.text ?? "") };
}

// Qwen3-ASR sometimes prefixes output with language/special tokens
// such as `<Thai>`, `<English>`, `<|zh|>`, `language: Thai\n`, etc.
// Strip them so they don't leak into the UI or downstream LLM prompts.
const LANG_WORDS =
  "(?:thai|english|chinese|mandarin|cantonese|japanese|korean|vietnamese|burmese|lao|malay|indonesian|tagalog|spanish|french|german|russian|arabic|hindi|portuguese|italian|dutch|turkish|polish)";

function cleanTranscript(text: string): string {
  return (
    text
      // <Thai>, <English>, <|zh|>, <|th|>, etc. (single tag)
      .replace(/<\|?[A-Za-z_-]{1,24}\|?>/g, "")
      // "language: Thai" / "Language - English" / "language Thai" anywhere
      .replace(new RegExp(`(?:^|\\s)language\\s*[:：\\-]?\\s*${LANG_WORDS}\\b`, "gi"), " ")
      // bare language word at the very start (e.g. "Thai สวัสดีครับ")
      .replace(new RegExp(`^\\s*${LANG_WORDS}\\s*[:：\\-]?\\s+`, "i"), "")
      // bracketed "[Thai]" or "(English)"
      .replace(new RegExp(`[\\[\\(]\\s*${LANG_WORDS}\\s*[\\]\\)]`, "gi"), "")
      // collapse leftover whitespace / line breaks
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{2,}/g, "\n")
      .trim()
  );
}
