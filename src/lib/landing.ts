import { POOL } from "@/lib/generation/pool-data";
import type { MediaReference, MotionPreset } from "@/lib/types";

/** A curated pool photo as a stable media reference, so the real MotionPlayer can animate it. */
export function poolReference(poolId: string): MediaReference & { url: string } {
  const image = POOL.find((p) => p.id === poolId);
  if (!image) throw new Error(`Unknown pool image ${poolId}`);
  return { source: "asset", id: poolId, url: image.src, width: image.width, height: image.height, color: image.color };
}

export interface ShowcaseScene {
  id: string;
  prompt: string;
  style: string;
  preset: MotionPreset;
  presetLabel: string;
  source: MediaReference & { url: string };
}

/** Hero scenes: each prompt is matched by a real photo from the local set and a real camera preset. */
export const SHOWCASE_SCENES: ShowcaseScene[] = [
  {
    id: "skyline",
    prompt: "A cinematic city skyline at blue hour, dramatic clouds",
    style: "Cinematic",
    preset: "push-in",
    presetLabel: "Push in",
    source: poolReference("p857"),
  },
  {
    id: "aurora",
    prompt: "Northern lights over a lone pine, long exposure",
    style: "Cinematic · Dreamy Glow",
    preset: "drift",
    presetLabel: "Drift",
    source: poolReference("p1022"),
  },
  {
    id: "lioness",
    prompt: "Close portrait of a lioness, intense gaze, dark mood",
    style: "Portrait",
    preset: "orbit",
    presetLabel: "Orbit",
    source: poolReference("p1074"),
  },
];
