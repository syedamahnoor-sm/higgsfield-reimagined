import type { GenerationEngine } from "./engine";
import { localEngine } from "./local-engine";

/** The active engine. Swap this for a real provider without touching the UI. */
export function getEngine(): GenerationEngine {
  return localEngine;
}
