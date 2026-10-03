import type { AssetRenderer, Attribution, GenSettings } from "@/lib/types";

/**
 * The single seam between the UI and whatever produces media.
 *
 * The UI only ever talks to a `GenerationEngine`. The local engine ships
 * first; a real provider can later implement the same contract without any
 * UI changes.
 */

export interface GeneratedMedia {
  url: string;
  posterUrl?: string;
  /** Output dimensions, already matching the requested aspect ratio. */
  width: number;
  height: number;
  color?: string;
  attribution?: Attribution;
  /** Defaults to "image". */
  renderer?: AssetRenderer;
}

export interface GenerationResult {
  media: GeneratedMedia[];
  /** Human-readable model the engine resolved to (e.g. what "Auto" picked). */
  resolvedModel: string;
  /** Optional honest note about the result, shown with its metadata. */
  note?: string;
}

export interface GenerationRequest {
  settings: GenSettings;
  /**
   * Reports progress in the 0–1 range. The first call marks the job as
   * running; until then it is considered queued.
   */
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface GenerationEngine {
  /** Stable identifier, e.g. "local". */
  id: string;
  /** Shown in the UI so the active engine is never hidden. */
  label: string;
  /** One-sentence plain-language explanation of what this engine actually does. */
  description: string;
  /** What the engine resolves to for these settings, so the UI can show it before generating. */
  resolveModel(settings: Pick<GenSettings, "intent" | "motion">): string;
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
