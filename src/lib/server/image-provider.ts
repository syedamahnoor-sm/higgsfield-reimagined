import "server-only";

/**
 * Server-side image provider contract. The /api/generate route only talks to
 * this interface, so the provider can be swapped in one place.
 */

export interface ProviderImage {
  bytes: Uint8Array;
  contentType: string;
  width: number;
  height: number;
}

export interface ProviderRequest {
  prompt: string;
  width: number;
  height: number;
  count: number;
  signal: AbortSignal;
}

export interface ProviderResult {
  images: ProviderImage[];
  /** Short, user-safe model name for subtle display (no internal ids). */
  modelLabel: string;
}

/** Safe, non-technical failure categories. Never carries provider messages or secrets. */
export type ProviderFailure = "not_configured" | "auth" | "billing" | "rate_limited" | "rejected" | "timeout" | "failed";

export class ProviderError extends Error {
  constructor(
    readonly reason: ProviderFailure,
    /** For server logs only: HTTP status and request id, never bodies or keys. */
    readonly diagnostic: { status?: number; requestId?: string } = {},
  ) {
    super(reason);
  }
}

export interface ImageProvider {
  id: string;
  isConfigured(): boolean;
  generate(request: ProviderRequest): Promise<ProviderResult>;
}
