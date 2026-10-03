import { ProviderError } from "@/lib/server/image-provider";
import { isAudioConfigured, synthesizeVoice } from "@/lib/server/audio-provider";
import { MAX_SCRIPT_CHARS, MP3_BIT_RATES, WAV_SAMPLE_RATES, isValidSpeaker } from "@/lib/voices";
import type { VoiceLanguage, VoiceSettings } from "@/lib/types";

/**
 * Voice: turns a script into speech with a Cloudflare-hosted text-to-speech
 * model. Server-only; returns the audio bytes or a safe failure category.
 */

const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
}

export function GET() {
  return Response.json({ available: isAudioConfigured() });
}

function parse(body: Record<string, unknown>): VoiceSettings | null {
  const { script, language, speaker, format, bitRate, sampleRate } = body;
  if (typeof script !== "string" || !script.trim() || script.length > MAX_SCRIPT_CHARS) return null;
  if (language !== "en" && language !== "es") return null;
  if (typeof speaker !== "string" || !isValidSpeaker(language as VoiceLanguage, speaker)) return null;
  if (format === "wav") {
    const rate = sampleRate ?? 24000;
    if (!WAV_SAMPLE_RATES.some((r) => r.value === rate)) return null;
    return { script: script.trim(), language, speaker, format: "wav", sampleRate: rate as number };
  }
  if (format !== "mp3") return null;
  const rate = bitRate ?? 48000;
  if (!MP3_BIT_RATES.some((r) => r.value === rate)) return null;
  return { script: script.trim(), language, speaker, format: "mp3", bitRate: rate as number };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const settings = parse(body);
  if (!settings) return Response.json({ error: "invalid_settings" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return Response.json({ error: "unavailable", reason: "rate_limited" }, { status: 429 });
  if (!isAudioConfigured()) return Response.json({ error: "unavailable", reason: "not_configured" }, { status: 503 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const audio = await synthesizeVoice(settings, controller.signal);
    return new Response(new Uint8Array(audio.bytes), {
      headers: { "Content-Type": audio.contentType, "Cache-Control": "no-store", "X-Ember-Model": audio.modelLabel },
    });
  } catch (error) {
    const failure = error instanceof ProviderError ? error : new ProviderError("failed");
    console.warn(`[audio] reason=${failure.reason} status=${failure.diagnostic.status ?? "-"} code=${failure.diagnostic.code ?? "-"}`);
    return Response.json({ error: "unavailable", reason: failure.reason }, { status: failure.reason === "rate_limited" ? 429 : failure.reason === "rejected" ? 422 : 503 });
  } finally {
    clearTimeout(timer);
  }
}
