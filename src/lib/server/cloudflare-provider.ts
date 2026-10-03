import "server-only";
import { ProviderError, type ImageProvider, type ProviderImage, type ProviderRequest } from "./image-provider";

/**
 * Cloudflare Workers AI, FLUX.2 [klein] 9B text-to-image via the REST API.
 * Request: multipart/form-data (prompt, width, height; steps are fixed at 4).
 * Response: a base64 image (wrapped in Cloudflare's { result } envelope).
 * One image per call, so multiple images are requested in parallel.
 */
const MODEL = "@cf/black-forest-labs/flux-2-klein-9b";
const MIN_EDGE = 256;
const MAX_EDGE = 1920;

/** Reads the real pixel size from PNG / JPEG / WebP headers so metadata is accurate. */
function imageInfo(bytes: Uint8Array, fallback: { width: number; height: number }) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // PNG: IHDR width/height at 16/20
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return { contentType: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
  }
  // JPEG: walk segments to a SOF marker
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) break;
      const marker = bytes[i + 1];
      const length = view.getUint16(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { contentType: "image/jpeg", width: view.getUint16(i + 7), height: view.getUint16(i + 5) };
      }
      i += 2 + length;
    }
    return { contentType: "image/jpeg", ...fallback };
  }
  // WebP (RIFF....WEBP)
  if (bytes[0] === 0x52 && bytes[8] === 0x57) return { contentType: "image/webp", ...fallback };
  return { contentType: "image/png", ...fallback };
}

function failureFor(status: number): ProviderError {
  if (status === 401 || status === 403) return new ProviderError("auth", { status });
  if (status === 429) return new ProviderError("rate_limited", { status });
  if (status === 408 || status === 504) return new ProviderError("timeout", { status });
  if (status === 400 || status === 422) return new ProviderError("rejected", { status });
  return new ProviderError("failed", { status });
}

async function generateOne(
  { accountId, token }: { accountId: string; token: string },
  { prompt, width, height, signal }: ProviderRequest,
): Promise<ProviderImage> {
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", String(width));
  form.append("height", String(height));

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${MODEL}`, {
    method: "POST",
    // fetch sets the multipart Content-Type (with boundary) from the FormData body.
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal,
  });
  if (!response.ok) throw failureFor(response.status);

  const json = (await response.json()) as { success?: boolean; result?: { image?: string }; image?: string };
  const base64 = json.result?.image ?? json.image;
  if (!base64 || json.success === false) throw new ProviderError("failed", { status: response.status });

  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  return { bytes, ...imageInfo(bytes, { width, height }) };
}

export const cloudflareProvider: ImageProvider = {
  id: "cloudflare",

  // Credentials are read only here, on the server, and never leave this module.
  isConfigured: () => Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN),

  async generate(request: ProviderRequest) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_AI_TOKEN;
    if (!accountId || !token) throw new ProviderError("not_configured");

    const clamp = (n: number) => Math.min(MAX_EDGE, Math.max(MIN_EDGE, n));
    const sized = { ...request, width: clamp(request.width), height: clamp(request.height) };
    try {
      const images = await Promise.all(Array.from({ length: request.count }, () => generateOne({ accountId, token }, sized)));
      return { images, modelLabel: "FLUX.2 Klein" };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") throw new ProviderError("timeout");
      throw new ProviderError("failed");
    }
  },
};
