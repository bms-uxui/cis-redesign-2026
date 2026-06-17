/** Shared accessor for the text-to-speech preferences edited on the Settings
 *  page and consumed by the global <SelectionTTS> player. Both sides read/write
 *  the same localStorage blob; Settings broadcasts PREFS_EVENT on save so the
 *  player can react live (and "storage" covers other tabs). */

export const PREFS_KEY = "ehp-cis.settings.prefs";
export const PREFS_EVENT = "ehp-cis:prefs-changed";

/** Programmatically read a chunk of text aloud (e.g. from a speaker button next
 *  to a section title). The global <SelectionTTS> dock listens and plays it. */
export const TTS_SPEAK_EVENT = "ehp-cis:tts-speak";
export function speakText(text: string) {
  const t = text.trim();
  if (!t || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TTS_SPEAK_EVENT, { detail: { text: t } }));
}

export interface TtsPrefs {
  enabled: boolean;
  voice: string;
  speed: number;
}

export const DEFAULT_TTS: TtsPrefs = { enabled: true, voice: "female", speed: 1 };

export function readTtsPrefs(): TtsPrefs {
  if (typeof window === "undefined") return DEFAULT_TTS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_TTS;
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      enabled: typeof p.ttsEnabled === "boolean" ? p.ttsEnabled : DEFAULT_TTS.enabled,
      voice: typeof p.ttsVoice === "string" ? p.ttsVoice : DEFAULT_TTS.voice,
      speed: typeof p.ttsSpeed === "number" ? p.ttsSpeed : DEFAULT_TTS.speed,
    };
  } catch {
    return DEFAULT_TTS;
  }
}
