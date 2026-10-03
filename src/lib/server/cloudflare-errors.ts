import "server-only";
import { ProviderError } from "./image-provider";

/**
 * Turns a failed Cloudflare Workers AI response into a safe ProviderError.
 * Only the HTTP status and Cloudflare's numeric error code are kept (for
 * server logs); the response body and messages are never passed on.
 */

/** Cloudflare's error code when the account's daily Workers AI allocation is used up. */
const DAILY_ALLOCATION_USED = 4006;

async function errorCode(response: Response) {
  try {
    const json = (await response.json()) as { errors?: { code?: unknown }[] };
    const code = json.errors?.[0]?.code;
    return typeof code === "number" ? code : undefined;
  } catch {
    return undefined;
  }
}

export async function cloudflareFailure(response: Response): Promise<ProviderError> {
  const status = response.status;
  const code = await errorCode(response);
  // Quota and rate limits are the same thing to a creator: temporarily unavailable, try later.
  if (status === 429 || code === DAILY_ALLOCATION_USED) return new ProviderError("rate_limited", { status, code });
  if (status === 401 || status === 403) return new ProviderError("auth", { status, code });
  if (status === 408 || status === 504) return new ProviderError("timeout", { status, code });
  if (status === 400 || status === 413 || status === 422) return new ProviderError("rejected", { status, code });
  return new ProviderError("failed", { status, code });
}
