import { ProviderError } from "@/lib/server/image-provider";
import { isAudioConfigured, transcribeAudio } from "@/lib/server/audio-provider";
import { MAX_TRANSCRIBE_BYTES } from "@/lib/audio/transcribe-limits";

/**
 * Transcribe: speech-to-text with a Cloudflare-hosted Whisper model. The
 * browser posts the raw audio file; nothing is stored on the server.
 */

const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 6;
}

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("audio/") && !type.startsWith("video/webm") && type !== "application/octet-stream") {
    return Response.json({ error: "invalid_file" }, { status: 415 });
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_TRANSCRIBE_BYTES) return Response.json({ error: "too_large" }, { status: 413 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return Response.json({ error: "unavailable", reason: "rate_limited" }, { status: 429 });
  if (!isAudioConfigured()) return Response.json({ error: "unavailable", reason: "not_configured" }, { status: 503 });

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.byteLength) return Response.json({ error: "invalid_file" }, { status: 400 });
  if (bytes.byteLength > MAX_TRANSCRIBE_BYTES) return Response.json({ error: "too_large" }, { status: 413 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    return Response.json(await transcribeAudio(bytes, controller.signal));
  } catch (error) {
    const failure = error instanceof ProviderError ? error : new ProviderError("failed");
    console.warn(`[transcribe] reason=${failure.reason} status=${failure.diagnostic.status ?? "-"} code=${failure.diagnostic.code ?? "-"}`);
    return Response.json({ error: "unavailable", reason: failure.reason }, { status: failure.reason === "rate_limited" ? 429 : failure.reason === "rejected" ? 422 : 503 });
  } finally {
    clearTimeout(timer);
  }
}
