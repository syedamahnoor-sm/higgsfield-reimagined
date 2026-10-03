import type { Mode } from "@/lib/types";
import { aiImageEngine } from "./ai-engine";
import type { GenerationEngine } from "./engine";
import { localMotionEngine } from "./local-motion-engine";

/**
 * The active engine per mode. Image uses AI generation (which falls back to
 * the local preview engine on its own); Video uses browser motion.
 */
export function getEngine(mode: Mode): GenerationEngine {
  return mode === "video" ? localMotionEngine : aiImageEngine;
}
