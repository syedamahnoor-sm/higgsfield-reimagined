import { aspectValue, centerCrop } from "@/lib/aspect";
import { MOTION_PRESETS } from "@/lib/constants";
import { getUploadUrl } from "@/lib/media/uploads";
import { loadImage } from "@/lib/motion/presets";
import type { MediaReference, MotionPreset } from "@/lib/types";
import type { GenerationEngine, GenerationRequest, GenerationResult } from "./engine";

const FAILURE_TOKEN = "[fail]";
const MAX_EDGE = 1920;

function presetLabel(preset: MotionPreset | undefined) {
  return MOTION_PRESETS.find((p) => p.id === preset)?.label ?? "Push in";
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

export async function resolveReferenceUrl(reference: MediaReference) {
  return reference.source === "asset" ? reference.url : await getUploadUrl(reference.id);
}

/**
 * Browser motion engine. It doesn't synthesize video: it validates and
 * prepares the source image, then returns a "motion" asset — a recipe of
 * source + camera preset + duration that the player renders (and can export)
 * in the browser. A real video provider would return a file instead.
 */
export const localMotionEngine: GenerationEngine = {
  id: "local-motion",
  label: "Local motion",
  description:
    "Animates your source image in the browser with a camera-motion preset. It moves the camera over the image; it doesn't generate new video frames with AI.",

  resolveModel: ({ motion }) => `Local motion · ${presetLabel(motion)}`,

  async generate({ settings, onProgress, signal }: GenerationRequest): Promise<GenerationResult> {
    const reference = settings.reference;
    if (!reference) throw new Error("Choose a source image to animate.");

    // Queue.
    await wait(250 + Math.random() * 250, signal);
    onProgress?.(0.05);

    // Prepare: resolve and fully decode the source.
    const url = await resolveReferenceUrl(reference);
    if (!url) throw new Error("The source image is no longer available on this device. Choose it again to animate.");
    const image = await loadImage(url);
    await image.decode().catch(() => {});

    // Short, honest preparation phase (frames are rendered live by the player).
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await wait(90, signal);
      onProgress?.(0.1 + (0.85 * i) / steps);
      if (settings.prompt.toLowerCase().includes(FAILURE_TOKEN) && i > 6) {
        throw new Error("The motion couldn't be prepared. Your source and settings are untouched.");
      }
    }
    onProgress?.(1);

    const crop = centerCrop(image.naturalWidth, image.naturalHeight, aspectValue(settings.aspect));
    const scale = Math.min(1, MAX_EDGE / Math.max(crop.sw, crop.sh));
    return {
      resolvedModel: `Local motion · ${presetLabel(settings.motion)}`,
      media: [
        {
          // Uploads have no stable URL; the player resolves them from IndexedDB via settings.reference.
          url: reference.source === "asset" ? reference.url : "",
          width: Math.round(crop.sw * scale),
          height: Math.round(crop.sh * scale),
          color: reference.color,
          renderer: "motion",
        },
      ],
    };
  },
};
