import type { AiCameraPreset, AspectRatio, CreateKind, ImageCount, MotionPreset, VideoDuration, VideoResolution } from "@/lib/types";

export const APP_NAME = "Ember Studio";

export const MODES: { id: CreateKind; label: string; href: string }[] = [
  { id: "image", label: "Image", href: "/create/image" },
  { id: "video", label: "Video", href: "/create/video" },
  { id: "audio", label: "Audio", href: "/create/audio" },
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
  { id: "pan", label: "Pan", description: "Slow sideways sweep across the scene" },
  { id: "orbit", label: "Orbit", description: "Curved camera arc with a gentle tilt" },
  { id: "drift", label: "Drift", description: "Gentle floating move with a slow zoom" },
  { id: "handheld", label: "Handheld", description: "Restrained, organic camera sway" },
];

/** Motion Preview clip lengths. */
export const VIDEO_DURATIONS: VideoDuration[] = [5, 10];

/** AI video lengths offered (the provider supports 1–5 s). */
export const AI_VIDEO_DURATIONS: VideoDuration[] = [3, 5];

/** AI video resolutions offered (a subset of what the provider supports). */
export const AI_VIDEO_RESOLUTIONS: { id: VideoResolution; label: string; description: string }[] = [
  { id: "480p", label: "480p", description: "Draft quality, fastest and lowest cost" },
  { id: "720p", label: "720p", description: "HD quality" },
];

/** AI video camera presets shown to creators. The exact provider wording lives on the server. */
export const AI_CAMERA_PRESETS: { id: AiCameraPreset; label: string; description: string }[] = [
  { id: "push-in", label: "Cinematic Push In", description: "The camera glides slowly toward the subject" },
  { id: "pull-back", label: "Pull Back", description: "The camera eases away to reveal more of the scene" },
  { id: "pan-left", label: "Pan Left", description: "The camera sweeps slowly to the left" },
  { id: "pan-right", label: "Pan Right", description: "The camera sweeps slowly to the right" },
  { id: "static", label: "Static Camera", description: "The frame holds still; only the scene moves" },
  { id: "orbit", label: "Gentle Orbit", description: "The camera arcs slowly around the subject" },
  { id: "none", label: "Prompt only", description: "No camera guidance, just your description" },
];
