import "server-only";
import type { ProviderFailure } from "./image-provider";

/**
 * Server-side image-to-video provider contract. The /api/video routes only
 * talk to this interface, so the provider can be swapped in one place.
 */

export type VideoResolution = "480p" | "580p" | "720p";

export interface VideoSubmitRequest {
  /** Source image as a base64 data URI (jpg/png/webp). */
  imageDataUri: string;
  prompt: string;
  /** Things to avoid (documented provider field). */
  negativePrompt?: string;
  /** Whole seconds. */
  duration: number;
  resolution: VideoResolution;
  signal: AbortSignal;
}

export type VideoJobStatus =
  | { state: "queued" | "processing" }
  | { state: "completed"; videoUrl: string }
  | { state: "failed"; reason: ProviderFailure };

export interface VideoProvider {
  id: string;
  /** Short, user-safe model name for subtle display. */
  modelLabel: string;
  isConfigured(): boolean;
  submit(request: VideoSubmitRequest): Promise<{ jobId: string }>;
  status(jobId: string, signal: AbortSignal): Promise<VideoJobStatus>;
}
