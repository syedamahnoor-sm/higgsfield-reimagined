import { averageColor } from "@/lib/color";
import { qualityOf } from "@/lib/creative";
import { saveLocalMedia } from "@/lib/media/uploads";
import { loadImage } from "@/lib/motion/presets";
import { resolveReferenceUrl } from "./local-motion-engine";
import type { GenSettings, MediaReference } from "@/lib/types";
import type { GeneratedMedia, GenerationEngine, GenerationRequest, GenerationResult } from "./engine";
import { localEngine } from "./local-engine";

/**
 * AI image generation. Calls our own /api/generate route (the provider key
 * stays on the server). If AI generation is unavailable for any reason, it
 * falls back to the local preview engine and says so on the result.
 */

const CLIENT_TIMEOUT_MS = 55_000;
export const AI_FALLBACK_NOTE = "AI generation unavailable, so this is a local preview instead.";
/** When the provider's usage limit is reached: the result is a labelled local preview, never presented as AI output. */
export const AI_LIMIT_NOTE = "AI generation is temporarily unavailable (usage limit reached), so this is a local preview, not an AI result. Try again later.";
/** The model requires input images smaller than 512x512. */
const INPUT_IMAGE_EDGE = 504;

interface ApiImage {
  data: string;
  contentType: string;
  width: number;
  height: number;
  seed?: number;
}

class AiUnavailable extends Error {
  /** True when the provider's usage or rate limit was reached. */
  constructor(readonly limited = false) {
    super("AI generation unavailable");
  }
}

/** Engine label; Direction and Look are shown separately next to it. */
export function aiLabel(settings: Partial<GenSettings>) {
  return settings.operation === "edit" ? "AI edit" : "AI generation";
}

/** Reference / edit source as a small JPEG within the model's input-size limit. */
async function inputImageFor(reference: MediaReference) {
  const src = await resolveReferenceUrl(reference);
  if (!src) throw new AiUnavailable();
  const img = await loadImage(src);
  const scale = Math.min(1, INPUT_IMAGE_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new AiUnavailable();
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  return { data: dataUrl.slice(dataUrl.indexOf(",") + 1), contentType: "image/jpeg" };
}

export class EditUnavailableError extends Error {
  constructor(limited = false) {
    super(
      limited
        ? "AI editing is temporarily unavailable. Your image is unchanged; try again later."
        : "Editing needs AI generation, which isn't available right now. Your image is unchanged.",
    );
  }
}

function base64ToBlob(data: string, type: string) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

async function colorOf(blob: Blob) {
  try {
    const bitmap = await createImageBitmap(blob);
    const color = averageColor(bitmap);
    bitmap.close();
    return color;
  } catch {
    return undefined;
  }
}

/** Cached once per page: whether the server has AI generation configured. */
let availability: Promise<boolean> | null = null;
export function checkAiAvailability() {
  availability ??= fetch("/api/generate", { method: "GET" })
    .then((r) => (r.ok ? r.json() : { available: false }))
    .then((j: { available?: boolean }) => Boolean(j.available))
    .catch(() => false);
  return availability;
}

export const aiImageEngine: GenerationEngine = {
  id: "ai",
  label: "AI generation",
  description:
    "Creates new images from your prompt with an AI image model. Prompts are sent to our generation service. If it's unavailable, Ember shows a local preview instead.",

  resolveModel: (settings) => aiLabel(settings),

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const { settings, onProgress, signal } = request;
    const editing = settings.operation === "edit";
    onProgress?.(0.04, editing ? "Preparing edit" : "Preparing prompt");

    // There is no streamed progress from the provider, so progress is an honest
    // estimate that eases toward 90% and never claims completion early.
    const started = performance.now();
    const ticker = setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      onProgress?.(
        Math.min(0.9, 0.08 + 0.82 * (1 - Math.exp(-elapsed / 4))),
        elapsed < 0.6 ? (editing ? "Preparing edit" : "Preparing prompt") : editing ? "Editing image" : "Creating image",
      );
    }, 200);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    signal?.addEventListener("abort", () => controller.abort());

    try {
      // The reference (or edit source) is genuinely sent to the model as an input image.
      const inputImage = settings.reference ? await inputImageFor(settings.reference) : undefined;
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: settings.prompt,
          operation: editing ? "edit" : "generate",
          direction: settings.direction ?? "auto",
          look: settings.look ?? "none",
          quality: qualityOf(settings),
          aspect: settings.aspect,
          count: editing ? 1 : settings.count,
          seed: settings.seed,
          inputImage,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new AiUnavailable(response.status === 429);
      const json = (await response.json()) as { images?: ApiImage[]; model?: string };
      if (!json.images?.length) throw new AiUnavailable();

      clearInterval(ticker);
      onProgress?.(0.94, "Finishing result");
      const media: GeneratedMedia[] = await Promise.all(
        json.images.map(async (img) => {
          const blob = base64ToBlob(img.data, img.contentType);
          return { url: await saveLocalMedia(blob), width: img.width, height: img.height, color: await colorOf(blob), seed: img.seed };
        }),
      );
      onProgress?.(1, "Finishing result");
      return {
        media,
        resolvedModel: aiLabel(settings),
        modelLabel: json.model,
        note: !editing && settings.reference ? "Guided by your reference image." : undefined,
      };
    } catch (error) {
      clearInterval(ticker);
      if (signal?.aborted) throw error;
      // An edit can't be faked with unrelated local photos: say so plainly instead.
      if (editing) throw new EditUnavailableError(error instanceof AiUnavailable && error.limited);
      // Any failure (not configured, provider error, timeout, storage) → keep the creator moving.
      if (!(error instanceof AiUnavailable) && process.env.NODE_ENV !== "production") {
        console.warn("[ai-engine] falling back to local preview:", error instanceof Error ? error.name : "unknown");
      }
      const fallback = await localEngine.generate({
        settings,
        signal,
        onProgress: (p) => onProgress?.(p, "Creating local preview"),
      });
      const limited = error instanceof AiUnavailable && error.limited;
      return { ...fallback, note: [limited ? AI_LIMIT_NOTE : AI_FALLBACK_NOTE, fallback.note].filter(Boolean).join(" ") };
    } finally {
      clearInterval(ticker);
      clearTimeout(timeout);
    }
  },
};
