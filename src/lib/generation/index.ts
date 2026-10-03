import type { GenSettings, Mode } from "@/lib/types";
import { aiImageEngine } from "./ai-engine";
import { aiVideoEngine } from "./ai-video-engine";
import type { GenerationEngine } from "./engine";
import { localMotionEngine } from "./local-motion-engine";

/**
 * The engine for a mode (and, for video, the chosen kind). Image uses AI
 * generation, which falls back to the local preview engine on its own. Video
 * uses AI video, or Motion Preview (browser camera moves) when chosen.
 */
export function getEngine(mode: Mode, settings?: Pick<GenSettings, "videoEngine">): GenerationEngine {
  if (mode === "image") return aiImageEngine;
  return settings?.videoEngine === "ai" ? aiVideoEngine : localMotionEngine;
}
