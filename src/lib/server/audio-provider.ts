import "server-only";
import { cloudflareFailure } from "./cloudflare-errors";
import { ProviderError } from "./image-provider";
import type { VoiceSettings } from "@/lib/types";

/**
 * Cloudflare Workers AI audio, via the REST API with the account's existing
 * Workers AI token. Both models are Cloudflare-hosted.
 *
 * Voice: Deepgram Aura-2 (@cf/deepgram/aura-2-en, @cf/deepgram/aura-2-es)
 *   JSON { text, speaker, encoding, container?, sample_rate?, bit_rate? } → audio bytes
 * Transcription: OpenAI Whisper Large v3 Turbo (@cf/openai/whisper-large-v3-turbo)
 *   JSON { audio: base64, task: "transcribe" } → { text, segments[{start,end,text}], transcription_info }
 *
 * Credentials are read only here and never leave the server.
 */

const VOICE_MODELS = { en: "@cf/deepgram/aura-2-en", es: "@cf/deepgram/aura-2-es" } as const;
const TRANSCRIBE_MODEL = "@cf/openai/whisper-large-v3-turbo";

function credentials() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;
  if (!accountId || !token) throw new ProviderError("not_configured");
  return { accountId, token };
}

export function isAudioConfigured() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN);
}

async function run(model: string, body: unknown, signal: AbortSignal) {
  const { accountId, token } = credentials();
  let response: Response;
  try {
    response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new ProviderError("timeout");
    throw new ProviderError("failed");
  }
  if (!response.ok) throw await cloudflareFailure(response);
  return response;
}

/** Output options, using only documented encoding/container/rate combinations. */
function outputOptions(settings: VoiceSettings) {
  if (settings.format === "wav") {
    return { body: { encoding: "linear16", container: "wav", sample_rate: settings.sampleRate ?? 24000 }, contentType: "audio/wav" };
  }
  return { body: { encoding: "mp3", bit_rate: settings.bitRate ?? 48000 }, contentType: "audio/mpeg" };
}

export async function synthesizeVoice(settings: VoiceSettings, signal: AbortSignal) {
  const output = outputOptions(settings);
  const response = await run(VOICE_MODELS[settings.language], { text: settings.script, speaker: settings.speaker, ...output.body }, signal);

  // The model returns the audio bytes. A JSON envelope with base64 audio is handled too.
  const type = response.headers.get("content-type") ?? "";
  let bytes: Uint8Array;
  if (type.includes("application/json")) {
    const json = (await response.json()) as { success?: boolean; result?: { audio?: string }; audio?: string };
    const base64 = json.result?.audio ?? json.audio;
    if (!base64 || json.success === false) throw new ProviderError("failed", { status: response.status });
    bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  } else {
    bytes = new Uint8Array(await response.arrayBuffer());
  }
  if (bytes.byteLength < 64) throw new ProviderError("failed", { status: response.status });
  return { bytes, contentType: output.contentType, modelLabel: "Aura-2" };
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export async function transcribeAudio(bytes: Uint8Array, signal: AbortSignal) {
  const response = await run(TRANSCRIBE_MODEL, { audio: Buffer.from(bytes).toString("base64"), task: "transcribe" }, signal);
  const json = (await response.json()) as {
    success?: boolean;
    result?: {
      text?: string;
      word_count?: number;
      segments?: { start?: number; end?: number; text?: string }[];
      transcription_info?: { language?: string; duration?: number };
    };
  };
  const result = json.result;
  if (!result || typeof result.text !== "string" || json.success === false) throw new ProviderError("failed", { status: response.status });
  const segments: TranscriptSegment[] = (result.segments ?? [])
    .filter((s) => typeof s.start === "number" && typeof s.end === "number" && typeof s.text === "string" && s.text.trim())
    .map((s) => ({ start: s.start!, end: s.end!, text: s.text!.trim() }));
  return {
    text: result.text.trim(),
    segments,
    language: result.transcription_info?.language,
    duration: result.transcription_info?.duration,
    wordCount: result.word_count,
    modelLabel: "Whisper Large v3 Turbo",
  };
}
