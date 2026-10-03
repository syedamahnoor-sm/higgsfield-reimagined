import { averageColor } from "@/lib/color";
import { INTENTS } from "@/lib/constants";
import { saveGeneratedImage } from "@/lib/media/uploads";
import type { Intent } from "@/lib/types";
import type { GeneratedMedia, GenerationEngine, GenerationRequest, GenerationResult } from "./engine";
import { localEngine } from "./local-engine";

/**
 * AI image generation. Calls our own /api/generate route (the provider key
 * stays on the server). If AI generation is unavailable for any reason, it
 * falls back to the local preview engine and says so on the result.
 */

const CLIENT_TIMEOUT_MS = 55_000;
export const AI_FALLBACK_NOTE = "AI generation unavailable, so this is a local preview instead.";
const REFERENCE_NOTE = "Reference images aren't used by AI generation yet.";

interface ApiImage {
  data: string;
  contentType: string;
  width: number;
  height: number;
}

class AiUnavailable extends Error {}

function intentLabel(intent: Intent) {
  return INTENTS.find((i) => i.id === intent)?.label ?? "Auto";
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

  resolveModel: ({ intent }) => `AI generation · ${intentLabel(intent)}`,

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const { settings, onProgress, signal } = request;
    onProgress?.(0.04, "Preparing prompt");

    // There is no streamed progress from the provider, so progress is an honest
    // estimate that eases toward 90% and never claims completion early.
    const started = performance.now();
    const ticker = setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      onProgress?.(Math.min(0.9, 0.08 + 0.82 * (1 - Math.exp(-elapsed / 4))), elapsed < 0.6 ? "Preparing prompt" : "Creating image");
    }, 200);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    signal?.addEventListener("abort", () => controller.abort());

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: settings.prompt,
          intent: settings.intent,
          aspect: settings.aspect,
          count: settings.count,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new AiUnavailable();
      const json = (await response.json()) as { images?: ApiImage[]; model?: string };
      if (!json.images?.length) throw new AiUnavailable();

      clearInterval(ticker);
      onProgress?.(0.94, "Finishing result");
      const media: GeneratedMedia[] = await Promise.all(
        json.images.map(async (img) => {
          const blob = base64ToBlob(img.data, img.contentType);
          return { url: await saveGeneratedImage(blob), width: img.width, height: img.height, color: await colorOf(blob) };
        }),
      );
      onProgress?.(1, "Finishing result");
      return {
        media,
        resolvedModel: `AI generation · ${intentLabel(settings.intent)}`,
        modelLabel: json.model,
        note: settings.reference ? REFERENCE_NOTE : undefined,
      };
    } catch (error) {
      clearInterval(ticker);
      if (signal?.aborted) throw error;
      // Any failure (not configured, provider error, timeout, storage) → keep the creator moving.
      if (!(error instanceof AiUnavailable) && process.env.NODE_ENV !== "production") {
        console.warn("[ai-engine] falling back to local preview:", error instanceof Error ? error.name : "unknown");
      }
      const fallback = await localEngine.generate({
        settings,
        signal,
        onProgress: (p) => onProgress?.(p, "Creating local preview"),
      });
      return { ...fallback, note: [AI_FALLBACK_NOTE, fallback.note].filter(Boolean).join(" ") };
    } finally {
      clearInterval(ticker);
      clearTimeout(timeout);
    }
  },
};
