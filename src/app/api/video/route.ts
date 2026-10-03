import { ProviderError } from "@/lib/server/image-provider";
import { clientIp, rateLimited, unavailable, videoProvider } from "@/lib/server/video-route-utils";
import type { VideoResolution } from "@/lib/server/video-provider";
import { DEFAULT_NEGATIVE_PROMPT, composeVideoPrompt } from "@/lib/server/video-prompt";
import type { AiCameraPreset } from "@/lib/types";

/**
 * Starts an AI image-to-video job. The browser sends the source image as a
 * base64 data URI (the provider accepts that directly); only the server talks
 * to the provider, so the API key never reaches the client.
 */

export const maxDuration = 60;

const RESOLUTIONS: VideoResolution[] = ["480p", "580p", "720p"];
const DURATIONS = [1, 2, 3, 4, 5];
const CAMERAS: AiCameraPreset[] = ["none", "push-in", "pull-back", "pan-left", "pan-right", "static", "orbit"];
const MAX_PROMPT = 800;
// Well under the provider's 15 MB limit; the client downsizes before sending.
const MAX_IMAGE_CHARS = 6_000_000;
const DATA_URI = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/** Lets the UI show honestly whether AI video is available. Exposes no configuration details. */
export async function GET() {
  return Response.json({ available: videoProvider.isConfigured() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { image, prompt, duration, resolution, camera = "none" } = (body ?? {}) as Record<string, unknown>;
  if (!CAMERAS.includes(camera as AiCameraPreset)) return Response.json({ error: "invalid_settings" }, { status: 400 });
  // A description is required unless a camera preset supplies the motion.
  if (typeof prompt !== "string" || prompt.length > MAX_PROMPT || (!prompt.trim() && camera === "none")) {
    return Response.json({ error: "invalid_prompt" }, { status: 400 });
  }
  if (typeof image !== "string" || image.length > MAX_IMAGE_CHARS || !DATA_URI.test(image)) {
    return Response.json({ error: "invalid_image" }, { status: 400 });
  }
  if (!DURATIONS.includes(duration as number) || !RESOLUTIONS.includes(resolution as VideoResolution)) {
    return Response.json({ error: "invalid_settings" }, { status: 400 });
  }

  // Video costs real credits: keep the public demo to a few jobs per visitor.
  if (rateLimited(`video:${clientIp(request)}`, 3, 10 * 60_000)) return unavailable("rate_limited", 429);
  if (!videoProvider.isConfigured()) return unavailable("not_configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  const started = Date.now();
  try {
    const { jobId } = await videoProvider.submit({
      imageDataUri: image,
      prompt: composeVideoPrompt(camera as AiCameraPreset, prompt),
      negativePrompt: DEFAULT_NEGATIVE_PROMPT,
      duration: duration as number,
      resolution: resolution as VideoResolution,
      signal: controller.signal,
    });
    return Response.json({ id: jobId, model: videoProvider.modelLabel });
  } catch (error) {
    const failure = error instanceof ProviderError ? error : new ProviderError("failed");
    // Safe diagnostics only: never prompts, images, provider messages or keys.
    console.warn(`[video] submit provider=${videoProvider.id} reason=${failure.reason} status=${failure.diagnostic.status ?? "-"} ms=${Date.now() - started}`);
    return unavailable(failure.reason, failure.reason === "rate_limited" ? 429 : 503);
  } finally {
    clearTimeout(timer);
  }
}
