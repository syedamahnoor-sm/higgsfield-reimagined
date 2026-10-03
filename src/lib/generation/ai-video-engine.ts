import { saveLocalMedia } from "@/lib/media/uploads";
import { loadImage } from "@/lib/motion/presets";
import type { GenerationEngine, GenerationRequest, GenerationResult } from "./engine";
import { resolveReferenceUrl } from "./local-motion-engine";

/**
 * AI image-to-video. The browser only talks to our own /api/video routes;
 * the server talks to the provider. The finished video is downloaded once
 * and kept locally (provider links expire), then played from this browser.
 *
 * The provider reports states but no percentage, so progress is reported as
 * indeterminate (-1) with honest stage names.
 */

export const INDETERMINATE = -1;
const POLL_MS = 3000;
const MAX_WAIT_MS = 8 * 60_000;
const MAX_IMAGE_EDGE = 1280;
const MAX_CONSECUTIVE_POLL_ERRORS = 4;

export type AiVideoFailure = "billing" | "rate_limited" | "timeout" | "not_configured" | "rejected" | "network" | "failed" | "auth";

const MESSAGES: Record<AiVideoFailure, string> = {
  billing: "AI video is out of credits right now.",
  rate_limited: "Too many AI video requests. Wait a few minutes and try again.",
  timeout: "AI video took too long to finish.",
  not_configured: "AI video isn't available right now.",
  auth: "AI video isn't available right now.",
  rejected: "The AI video service couldn't use this image or prompt. Try a different motion description.",
  network: "Couldn't reach the server. Check your connection and try again.",
  failed: "The AI video service ran into a problem.",
};

export class AiVideoError extends Error {
  constructor(readonly reason: AiVideoFailure) {
    super(MESSAGES[reason] ?? MESSAGES.failed);
  }
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

async function readReason(response: Response): Promise<AiVideoFailure> {
  try {
    const json = (await response.json()) as { reason?: string };
    return (json.reason as AiVideoFailure) in MESSAGES ? (json.reason as AiVideoFailure) : "failed";
  } catch {
    return "failed";
  }
}

/** Downscaled JPEG data URI of the source: within the provider's limits and quick to upload. */
async function sourceAsDataUri(src: string) {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new AiVideoError("failed");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

/** Reads real dimensions from the downloaded video. */
function probeVideo(blob: Blob) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const done = (size: { width: number; height: number }) => {
      URL.revokeObjectURL(url);
      resolve(size);
    };
    video.onloadedmetadata = () => done({ width: video.videoWidth || 854, height: video.videoHeight || 480 });
    video.onerror = () => done({ width: 854, height: 480 });
    video.src = url;
  });
}

async function api(input: string, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AiVideoError("network");
  }
}

/** Cached once per page: whether the server has AI video configured. */
let availability: Promise<boolean> | null = null;
export function checkAiVideoAvailability() {
  availability ??= fetch("/api/video", { method: "GET" })
    .then((r) => (r.ok ? r.json() : { available: false }))
    .then((j: { available?: boolean }) => Boolean(j.available))
    .catch(() => false);
  return availability;
}

export const aiVideoEngine: GenerationEngine = {
  id: "ai-video",
  label: "AI video",
  description:
    "AI video generates new motion from your image and your motion description with an AI video model. Your image and prompt are sent to our video service.",

  resolveModel: () => "AI video",

  async generate({ settings, onProgress, signal }: GenerationRequest): Promise<GenerationResult> {
    const reference = settings.reference;
    if (!reference) throw new Error("Choose a source image to animate.");
    const prompt = settings.prompt.trim();
    const camera = settings.camera ?? "none";
    if (!prompt && camera === "none") throw new Error("Describe the motion you want, or pick a camera move, then generate.");
    const resolution = settings.resolution ?? "480p";
    const duration = settings.duration && settings.duration <= 5 ? settings.duration : 5;

    onProgress?.(INDETERMINATE, "Preparing image");
    const src = await resolveReferenceUrl(reference);
    if (!src) throw new Error("The source image is no longer available on this device. Choose it again to animate.");
    const image = await sourceAsDataUri(src);

    onProgress?.(INDETERMINATE, "Starting AI video");
    const submit = await api("/api/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, prompt, camera, duration, resolution }),
      signal,
    });
    if (!submit.ok) throw new AiVideoError(await readReason(submit));
    const { id, model } = (await submit.json()) as { id: string; model?: string };

    // Poll until the provider finishes (documented: poll every 2–5 s). The stage
    // stays "Starting AI video" until the provider reports queued/processing.
    const started = Date.now();
    let errors = 0;
    for (;;) {
      if (Date.now() - started > MAX_WAIT_MS) throw new AiVideoError("timeout");
      await wait(POLL_MS, signal);
      let response: Response;
      try {
        response = await api(`/api/video/${encodeURIComponent(id)}`, { signal });
      } catch (error) {
        if (error instanceof AiVideoError && ++errors < MAX_CONSECUTIVE_POLL_ERRORS) continue;
        throw error;
      }
      if (!response.ok) {
        const reason = await readReason(response);
        if (reason !== "billing" && reason !== "auth" && ++errors < MAX_CONSECUTIVE_POLL_ERRORS) continue;
        throw new AiVideoError(reason);
      }
      errors = 0;
      const status = (await response.json()) as { state: string; reason?: AiVideoFailure };
      if (status.state === "failed") throw new AiVideoError(status.reason ?? "failed");
      if (status.state === "completed") break;
      onProgress?.(INDETERMINATE, status.state === "queued" ? "Waiting in queue" : "Generating motion");
    }

    onProgress?.(INDETERMINATE, "Finalizing");
    const file = await api(`/api/video/${encodeURIComponent(id)}/file`, { signal });
    if (!file.ok) throw new AiVideoError(await readReason(file));
    const blob = await file.blob();
    if (!blob.size) throw new AiVideoError("failed");
    const size = await probeVideo(blob);
    const url = await saveLocalMedia(blob);

    return {
      resolvedModel: `AI video · ${resolution}`,
      modelLabel: model,
      media: [{ url, width: size.width, height: size.height, color: reference.color, renderer: "file" }],
    };
  },
};
