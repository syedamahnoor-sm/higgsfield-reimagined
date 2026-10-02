import { aspectValue, centerCrop } from "@/lib/aspect";
import type { Intent } from "@/lib/types";
import type { GenerationEngine, GenerationRequest, GenerationResult } from "./engine";
import { pickImages, scorePool } from "./match";
import { POOL } from "./pool-data";

interface Profile {
  label: string;
  /** Simulated render time in ms. */
  duration: number;
  /** Long edge of the delivered image in px. */
  longEdge: number;
}

/** What each intent honestly means for the local engine: render time and output resolution. */
const PROFILES: Record<Intent, Profile> = {
  auto: { label: "Local preview · Balanced", duration: 4200, longEdge: 1600 },
  photoreal: { label: "Local preview · Full detail", duration: 6000, longEdge: 1600 },
  fast: { label: "Local preview · Draft", duration: 2200, longEdge: 1024 },
};

/** Testing hook: a prompt containing this token fails partway through. */
const FAILURE_TOKEN = "[fail]";

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

function preload(src: string) {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("A result image couldn't be loaded. Check your connection and try again."));
    img.src = src;
  });
}

export const localEngine: GenerationEngine = {
  id: "local",
  label: "Local preview",
  description:
    "Matches your prompt, aspect ratio and reference colour against a curated set of licensed photographs. No external AI service is called.",

  resolveModel: (intent) => PROFILES[intent].label,

  async generate({ settings, onProgress, signal }: GenerationRequest): Promise<GenerationResult> {
    const profile = PROFILES[settings.intent];
    const aspect = aspectValue(settings.aspect);

    // Queue.
    await wait(350 + Math.random() * 450, signal);
    onProgress?.(0);

    const { picks, matched } = pickImages(
      scorePool(POOL, settings.prompt, aspect, settings.reference?.color),
      settings.count,
    );
    const loading = Promise.all(picks.map((p) => preload(p.image.src)));
    // Avoid an unhandled rejection while the progress loop is still running.
    loading.catch(() => {});

    // Render: eased progress over the profile's duration.
    const shouldFail = settings.prompt.toLowerCase().includes(FAILURE_TOKEN);
    const steps = Math.round(profile.duration / 120);
    for (let i = 1; i <= steps; i++) {
      await wait(120, signal);
      const t = i / steps;
      onProgress?.(Math.min(0.97, 1 - (1 - t) ** 2.2));
      if (shouldFail && t > 0.6) throw new Error("The local engine stopped unexpectedly. Your prompt and settings are untouched.");
    }
    await loading;
    onProgress?.(1);

    return {
      resolvedModel: profile.label,
      note: matched ? undefined : "No close match in the local set, so these are the nearest photographs.",
      media: picks.map(({ image }) => {
        const crop = centerCrop(image.width, image.height, aspect);
        const scale = Math.min(1, profile.longEdge / Math.max(crop.sw, crop.sh));
        return {
          url: image.src,
          width: Math.round(crop.sw * scale),
          height: Math.round(crop.sh * scale),
          color: image.color,
          attribution: { name: image.credit, url: image.sourceUrl },
        };
      }),
    };
  },
};
