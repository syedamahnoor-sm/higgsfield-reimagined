import "server-only";
import type { AiCameraPreset } from "@/lib/types";

/**
 * Prompt treatment for AI video, kept on the server next to the provider.
 *
 * Camera presets are written in explicit cinematography terms so the model
 * moves the camera instead of animating something inside the scene (e.g. a
 * "push in" must be a dolly, never a hand pushing the subject).
 */
export const CAMERA_GUIDANCE: Record<Exclude<AiCameraPreset, "none">, string> = {
  "push-in":
    "Camera movement: slow cinematic dolly-in, the camera itself moves forward smoothly toward the main subject. The subject stays in place; nothing in the scene is pushed or touched.",
  "pull-back":
    "Camera movement: slow cinematic dolly-out, the camera itself moves backward smoothly away from the main subject, gradually revealing more of the scene. The subject stays in place.",
  "pan-left":
    "Camera movement: slow, steady horizontal pan to the left from a fixed position. The subject and scene stay in place.",
  "pan-right":
    "Camera movement: slow, steady horizontal pan to the right from a fixed position. The subject and scene stay in place.",
  static:
    "Camera movement: none. Locked-off static tripod shot; the frame does not move, zoom or pan. Only subtle natural motion within the scene.",
  orbit:
    "Camera movement: slow, gentle orbit, the camera itself travels in a smooth arc around the main subject. The subject stays in place and keeps its shape.",
};

/**
 * Restrained, generic default negative prompt: discourages common unwanted
 * additions and deformations without describing any particular subject.
 */
export const DEFAULT_NEGATIVE_PROMPT =
  "hands, fingers, arms, people or animals entering the frame, extra objects appearing, duplicated subjects, warped geometry, bent or melting shapes, severe deformation, morphing, distorted perspective, flicker, text, watermark, low quality, blurry";

/** Camera guidance first (when chosen), then the creator's own description of the scene. */
export function composeVideoPrompt(camera: AiCameraPreset, prompt: string) {
  const scene = prompt.trim();
  if (camera === "none") return scene;
  const guidance = CAMERA_GUIDANCE[camera];
  return scene ? `${guidance} Scene: ${scene}` : guidance;
}
