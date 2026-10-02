import type { AspectRatio, ImageCount, Intent, Mode, MotionPreset, VideoDuration } from "@/lib/types";

export const APP_NAME = "Ember Studio";

export const MODES: { id: Mode; label: string; href: string }[] = [
  { id: "image", label: "Image", href: "/create/image" },
  { id: "video", label: "Video", href: "/create/video" },
];

/** Only intents the local engine can honestly deliver. "Design & Text" is intentionally absent. */
export const INTENTS: { id: Intent; label: string; description: string }[] = [
  { id: "auto", label: "Auto", description: "Recommended balance of quality and speed" },
  { id: "photoreal", label: "Photoreal", description: "Natural light, real textures, camera realism" },
  { id: "fast", label: "Fast", description: "Quick drafts for exploring ideas" },
];

export const ASPECT_RATIOS: { id: AspectRatio; label: string; w: number; h: number }[] = [
  { id: "1:1", label: "Square", w: 1, h: 1 },
  { id: "4:5", label: "Portrait", w: 4, h: 5 },
  { id: "3:4", label: "Classic", w: 3, h: 4 },
  { id: "16:9", label: "Wide", w: 16, h: 9 },
  { id: "9:16", label: "Vertical", w: 9, h: 16 },
];

export const IMAGE_COUNTS: ImageCount[] = [1, 2, 4];

export const MOTION_PRESETS: { id: MotionPreset; label: string; description: string }[] = [
  { id: "push-in", label: "Push in", description: "Slow dolly toward the subject" },
  { id: "pull-out", label: "Pull out", description: "Reveal the scene by easing back" },
  { id: "pan", label: "Pan", description: "Lateral camera sweep" },
  { id: "orbit", label: "Orbit", description: "Parallax arc around the subject" },
  { id: "drift", label: "Drift", description: "Gentle floating movement" },
  { id: "handheld", label: "Handheld", description: "Subtle organic camera shake" },
];

export const VIDEO_DURATIONS: VideoDuration[] = [5, 10];
