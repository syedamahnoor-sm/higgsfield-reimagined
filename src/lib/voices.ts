import type { AudioFormat, VoiceLanguage, VoiceSettings } from "@/lib/types";

/**
 * Voice catalog for Cloudflare Workers AI text-to-speech (Deepgram Aura-2,
 * hosted by Cloudflare). There is one model per language, and each model has
 * its own documented speaker list. Speaker names are the model's; Ember adds
 * no claims about how each voice sounds.
 */

export const VOICE_LANGUAGES: { id: VoiceLanguage; label: string; native: string }[] = [
  { id: "en", label: "English", native: "English" },
  { id: "es", label: "Spanish", native: "Español" },
];

/** Speakers exactly as listed in each model's input schema. */
export const SPEAKERS: Record<VoiceLanguage, readonly string[]> = {
  en: [
    "amalthea", "andromeda", "apollo", "arcas", "aries", "asteria", "athena", "atlas", "aurora", "callista",
    "cora", "cordelia", "delia", "draco", "electra", "harmonia", "helena", "hera", "hermes", "hyperion",
    "iris", "janus", "juno", "jupiter", "luna", "mars", "minerva", "neptune", "odysseus", "ophelia",
    "orion", "orpheus", "pandora", "phoebe", "pluto", "saturn", "thalia", "theia", "vesta", "zeus",
  ],
  es: ["sirio", "nestor", "carina", "celeste", "alvaro", "diana", "aquila", "selena", "estrella", "javier"],
};

/** Each model's documented default speaker. */
export const DEFAULT_SPEAKER: Record<VoiceLanguage, string> = { en: "luna", es: "aquila" };

/** Long scripts cost more and take longer; this keeps a take to roughly a minute of speech. */
export const MAX_SCRIPT_CHARS = 1000;

/** Documented Aura-2 output combinations that Ember offers (mp3 has a fixed 22.05 kHz sample rate). */
export const MP3_BIT_RATES = [
  { value: 48000, label: "48 kbps", description: "Default, clearer" },
  { value: 32000, label: "32 kbps", description: "Smaller file" },
] as const;

export const WAV_SAMPLE_RATES = [
  { value: 24000, label: "24 kHz", description: "Default" },
  { value: 48000, label: "48 kHz", description: "Studio rate, larger file" },
  { value: 16000, label: "16 kHz", description: "Smallest file" },
] as const;

export const AUDIO_FORMATS: { id: AudioFormat; label: string; description: string }[] = [
  { id: "mp3", label: "MP3", description: "Compressed, plays everywhere" },
  { id: "wav", label: "WAV", description: "Uncompressed, for editing" },
];

export const DEFAULT_VOICE: VoiceSettings = { script: "", language: "en", speaker: "luna", format: "mp3", bitRate: 48000 };

export function speakerLabel(speaker: string) {
  return speaker.charAt(0).toUpperCase() + speaker.slice(1);
}

export function languageLabel(language: VoiceLanguage | undefined) {
  return VOICE_LANGUAGES.find((l) => l.id === (language ?? "en"))?.label ?? "English";
}

export function isValidSpeaker(language: VoiceLanguage, speaker: string) {
  return SPEAKERS[language].includes(speaker);
}

/** "MP3 · 48 kbps" or "WAV · 24 kHz". */
export function audioFormatLabel(settings: Pick<VoiceSettings, "format" | "bitRate" | "sampleRate">) {
  if (settings.format === "wav") return `WAV · ${Math.round((settings.sampleRate ?? 24000) / 1000)} kHz`;
  return `MP3 · ${Math.round((settings.bitRate ?? 48000) / 1000)} kbps`;
}

/** Deterministic avatar colors for a speaker: identity only, says nothing about the voice. */
export function speakerHue(speaker: string) {
  let h = 0;
  for (const c of speaker) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function formatDuration(seconds: number | undefined) {
  if (seconds === undefined || !Number.isFinite(seconds)) return "–:––";
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
