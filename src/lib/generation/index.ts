import type { Mode } from "@/lib/types";
import type { GenerationEngine } from "./engine";
import { localEngine } from "./local-engine";
import { localMotionEngine } from "./local-motion-engine";

/** The active engine per mode. Swap either for a real provider without touching the UI. */
export function getEngine(mode: Mode): GenerationEngine {
  return mode === "video" ? localMotionEngine : localEngine;
}
