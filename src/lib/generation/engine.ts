import type { GenSettings } from "@/lib/types";

/**
 * The single seam between the UI and whatever produces media.
 *
 * The UI only ever talks to a `GenerationEngine`. Stage 2 ships a local,
 * simulated engine; a real provider can later implement the same contract
 * without any UI changes.
 */

export interface GeneratedMedia {
  url: string;
  posterUrl?: string;
  width: number;
  height: number;
}

export interface GenerationResult {
  media: GeneratedMedia[];
  /** Human-readable model the engine resolved to (e.g. what "Auto" picked). */
  resolvedModel: string;
}

export interface GenerationRequest {
  settings: GenSettings;
  /** Reports progress in the 0–1 range. */
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface GenerationEngine {
  /** Stable identifier, e.g. "local". */
  id: string;
  /** Shown in the advanced model popover so the active engine is never hidden. */
  label: string;
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
