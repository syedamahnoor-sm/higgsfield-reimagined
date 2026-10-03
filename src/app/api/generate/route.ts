import { ProviderError, type ImageProvider, type ProviderInputImage } from "@/lib/server/image-provider";
import { cloudflareProvider, imageInfo } from "@/lib/server/cloudflare-provider";
import { composeEditPrompt, composeImagePrompt } from "@/lib/server/image-prompt";
import type { AspectRatio, Direction, ImageCount, Intent, LookId, Operation, Quality } from "@/lib/types";

/**
 * Server-side image generation and editing. The browser calls this route;
 * only this route talks to the provider, so the API key never reaches the client.
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
const DIRECTIONS: Direction[] = ["auto", "cinematic", "editorial", "portrait", "product", "illustration"];
const LOOKS: LookId[] = ["none", "film-grain", "dreamy-glow", "vintage-film", "noir", "neon-night", "high-contrast"];
const QUALITIES: Quality[] = ["draft", "standard", "high"];
const LEGACY_QUALITY: Record<Intent, Quality> = { fast: "draft", auto: "standard", photoreal: "high" };
const COUNTS: ImageCount[] = [1, 2, 4];
const MAX_PROMPT = 1000;
const TIMEOUT_MS = 45_000;
/** The model requires input images smaller than 512x512. */
const MAX_INPUT_EDGE = 511;
const MAX_INPUT_BYTES = 1_500_000;

/** Quality is a real output-size choice (the model's step count is fixed). */
const LONG_EDGE: Record<Quality, number> = { draft: 768, standard: 1024, high: 1536 };

function dimensions(aspect: AspectRatio, quality: Quality) {
  const [w, h] = ASPECTS[aspect];
  const long = LONG_EDGE[quality];
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
const invalid = (error: string) => Response.json({ error }, { status: 400 });

/** Decodes and checks an input image sent by the browser (reference or edit source). */
function parseInputImage(value: unknown): ProviderInputImage | null | "invalid" {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return "invalid";
  const { data, contentType } = value as Record<string, unknown>;
  if (typeof data !== "string" || !/^image\/(jpeg|png|webp)$/.test(String(contentType))) return "invalid";
  if (data.length > (MAX_INPUT_BYTES * 4) / 3 + 8 || !/^[A-Za-z0-9+/=]+$/.test(data)) return "invalid";
  const bytes = Uint8Array.from(Buffer.from(data, "base64"));
  const info = imageInfo(bytes, { width: 0, height: 0 });
  // Verify the real pixel size, not just what the client claims.
  if (!info.width || !info.height || info.width > MAX_INPUT_EDGE || info.height > MAX_INPUT_EDGE) return "invalid";
  return { bytes, contentType: contentType as string };
}

/** Lets the UI show honestly whether AI generation is available. Exposes no configuration details. */
export async function GET() {
  return Response.json({ available: provider.isConfigured() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid("invalid_request");
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const operation: Operation = b.operation === "edit" ? "edit" : "generate";
  const prompt = b.prompt;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT) return invalid("invalid_prompt");

  const direction = (b.direction ?? "auto") as Direction;
  const look = (b.look ?? "none") as LookId;
  const quality = (b.quality ?? (b.intent ? LEGACY_QUALITY[b.intent as Intent] : "standard")) as Quality;
  const aspect = b.aspect as AspectRatio;
  const count = b.count as ImageCount;
  const seed = b.seed === undefined || b.seed === null ? undefined : Number(b.seed);
  if (
    !DIRECTIONS.includes(direction) ||
    !LOOKS.includes(look) ||
    !QUALITIES.includes(quality) ||
    !(typeof aspect === "string" && aspect in ASPECTS) ||
    !COUNTS.includes(count) ||
    (seed !== undefined && !(Number.isInteger(seed) && seed >= 0 && seed <= 2_147_483_000))
  ) {
    return invalid("invalid_settings");
  }
  const inputImage = parseInputImage(b.inputImage);
  if (inputImage === "invalid") return invalid("invalid_image");
  if (operation === "edit" && !inputImage) return invalid("invalid_image");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return unavailable("rate_limited", 429);
  if (!provider.isConfigured()) return unavailable("not_configured");

  const finalPrompt =
    operation === "edit"
      ? composeEditPrompt(prompt)
      : composeImagePrompt({ prompt, direction, look, hasReference: Boolean(inputImage) });
  const size = dimensions(aspect, quality);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  request.signal.addEventListener("abort", () => controller.abort());
  const started = Date.now();

  try {
    const result = await provider.generate({
      prompt: finalPrompt,
      ...size,
      count: operation === "edit" ? 1 : count,
      seed,
      inputImage: inputImage ?? undefined,
      signal: controller.signal,
    });
    return Response.json({
      images: result.images.map((img) => ({
        data: Buffer.from(img.bytes).toString("base64"),
        contentType: img.contentType,
        width: img.width,
        height: img.height,
        seed: img.seed,
      })),
      model: result.modelLabel,
      ms: Date.now() - started,
    });
  } catch (error) {
    const failure = error instanceof ProviderError ? error : new ProviderError("failed");
    // Safe diagnostics only: category, HTTP status, request id, duration. Never prompts, images, bodies or keys.
    console.warn(
      `[generate] provider=${provider.id} op=${operation} reason=${failure.reason} status=${failure.diagnostic.status ?? "-"} ms=${Date.now() - started}`,
    );
    return unavailable(failure.reason, failure.reason === "rate_limited" ? 429 : 503);
  } finally {
    clearTimeout(timer);
  }
}
