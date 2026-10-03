import { ProviderError, type ImageProvider } from "@/lib/server/image-provider";
import { cloudflareProvider } from "@/lib/server/cloudflare-provider";
import type { AspectRatio, ImageCount, Intent } from "@/lib/types";

/**
 * Server-side image generation. The browser calls this route; only this route
 * talks to the provider, so the API key never reaches the client.
 */

export const maxDuration = 60;

const provider: ImageProvider = cloudflareProvider;

const ASPECTS: Record<AspectRatio, [number, number]> = {
  "1:1": [1, 1],
  "4:5": [4, 5],
  "3:4": [3, 4],
  "16:9": [16, 9],
  "9:16": [9, 16],
};
const INTENTS: Intent[] = ["auto", "photoreal", "fast"];
const COUNTS: ImageCount[] = [1, 2, 4];
const MAX_PROMPT = 1000;
const TIMEOUT_MS = 45_000;

/**
 * What each Ember style honestly changes on this model (its step count is fixed):
 * - Fast: smaller output (quicker, cheaper drafts).
 * - Photoreal: larger output plus a realism-oriented prompt treatment.
 * - Auto: the prompt as written at a balanced size.
 */
const LONG_EDGE: Record<Intent, number> = { fast: 768, auto: 1024, photoreal: 1280 };
const PHOTOREAL_SUFFIX = ". Photorealistic photograph, natural lighting, realistic textures and detail.";

function dimensions(aspect: AspectRatio, intent: Intent) {
  const [w, h] = ASPECTS[aspect];
  const long = LONG_EDGE[intent];
  const snap = (n: number) => Math.max(256, Math.round(n / 16) * 16);
  return w >= h ? { width: snap(long), height: snap((long * h) / w) } : { width: snap((long * w) / h), height: snap(long) };
}

// Best-effort abuse guard for the public demo (per server instance).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

const unavailable = (reason: string, status = 503) => Response.json({ error: "unavailable", reason }, { status });

/** Lets the UI show honestly whether AI generation is available. Exposes no configuration details. */
export async function GET() {
  return Response.json({ available: provider.isConfigured() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { prompt, intent, aspect, count } = (body ?? {}) as Record<string, unknown>;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT) {
    return Response.json({ error: "invalid_prompt" }, { status: 400 });
  }
  if (!INTENTS.includes(intent as Intent) || !(typeof aspect === "string" && aspect in ASPECTS) || !COUNTS.includes(count as ImageCount)) {
    return Response.json({ error: "invalid_settings" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return unavailable("rate_limited", 429);
  if (!provider.isConfigured()) return unavailable("not_configured");

  const style = intent as Intent;
  const size = dimensions(aspect as AspectRatio, style);
  const finalPrompt = style === "photoreal" ? `${prompt.trim()}${PHOTOREAL_SUFFIX}` : prompt.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  request.signal.addEventListener("abort", () => controller.abort());
  const started = Date.now();

  try {
    const result = await provider.generate({ prompt: finalPrompt, ...size, count: count as number, signal: controller.signal });
    return Response.json({
      images: result.images.map((img) => ({
        data: Buffer.from(img.bytes).toString("base64"),
        contentType: img.contentType,
        width: img.width,
        height: img.height,
      })),
      model: result.modelLabel,
      ms: Date.now() - started,
    });
  } catch (error) {
    const failure = error instanceof ProviderError ? error : new ProviderError("failed");
    // Safe diagnostics only: category, HTTP status, request id, duration. Never prompts, bodies or keys.
    console.warn(
      `[generate] provider=${provider.id} reason=${failure.reason} status=${failure.diagnostic.status ?? "-"} request=${failure.diagnostic.requestId ?? "-"} ms=${Date.now() - started}`,
    );
    return unavailable(failure.reason, failure.reason === "rate_limited" ? 429 : 503);
  } finally {
    clearTimeout(timer);
  }
}
