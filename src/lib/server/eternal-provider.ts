import "server-only";
import { ProviderError, type ProviderFailure } from "./image-provider";
import type { VideoJobStatus, VideoProvider, VideoSubmitRequest } from "./video-provider";

/**
 * Eternal AI image-to-video (eternalai.org/api).
 * Submit: POST /api/image-to-video { prompt, image_url (URL or base64 data URI),
 *         model_id, duration ("1"–"5"), resolution, negative_prompt? } → { result: { request_id } }
 * Status: GET /api/image-to-video/{request_id}/status
 *         → { result: { status: queued|processing|completed|failed, video_url, error } }
 * video_url expires after 24 hours, so callers must download the file.
 */
const HOST = "https://open.eternalai.org";
const MODEL_ID = "wan-ai/wan2.2-i2v-a14b-lightning";

interface EternalEnvelope<T> {
  status?: boolean;
  error?: string;
  result?: T | null;
}

function failureFromMessage(message: string | undefined, status?: number): ProviderFailure {
  const text = (message ?? "").toLowerCase();
  if (/credit|balance|insufficient|payment|billing/.test(text) || status === 402) return "billing";
  if (status === 401 || status === 403 || /unauthor|invalid (api )?key|forbidden/.test(text)) return "auth";
  if (status === 429 || /rate limit|too many/.test(text)) return "rate_limited";
  if (status === 408 || status === 504 || /timeout|timed out/.test(text)) return "timeout";
  if (status === 400 || status === 422 || /invalid|unsupported|too large/.test(text)) return "rejected";
  return "failed";
}

async function call<T>(path: string, init: RequestInit, signal: AbortSignal): Promise<T> {
  const key = process.env.ETERNAL_AI_API_KEY;
  if (!key) throw new ProviderError("not_configured");
  let response: Response;
  try {
    response = await fetch(`${HOST}${path}`, {
      ...init,
      // The key is read only here, on the server, and never leaves this module.
      headers: { ...init.headers, Authorization: `Bearer ${key}` },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new ProviderError("timeout");
    throw new ProviderError("failed");
  }
  let body: EternalEnvelope<T> | null = null;
  try {
    body = (await response.json()) as EternalEnvelope<T>;
  } catch {
    body = null;
  }
  if (!response.ok || !body || body.status === false || !body.result) {
    // Classify using the provider message, but never log or forward it.
    throw new ProviderError(failureFromMessage(body?.error, response.ok ? undefined : response.status), { status: response.status });
  }
  return body.result;
}

export const eternalProvider: VideoProvider = {
  id: "eternal",
  modelLabel: "Wan 2.2",

  isConfigured: () => Boolean(process.env.ETERNAL_AI_API_KEY),

  async submit({ imageDataUri, prompt, negativePrompt, duration, resolution, signal }: VideoSubmitRequest) {
    const result = await call<{ request_id?: string }>(
      "/api/image-to-video",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image_url: imageDataUri,
          model_id: MODEL_ID,
          duration: String(duration),
          resolution,
          ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
        }),
      },
      signal,
    );
    if (!result.request_id) throw new ProviderError("failed");
    return { jobId: result.request_id };
  },

  async status(jobId: string, signal: AbortSignal): Promise<VideoJobStatus> {
    const result = await call<{ status?: string; video_url?: string; error?: string }>(
      `/api/image-to-video/${encodeURIComponent(jobId)}/status`,
      { method: "GET" },
      signal,
    );
    switch (result.status) {
      case "queued":
      case "processing":
        return { state: result.status };
      case "completed":
        if (!result.video_url) return { state: "failed", reason: "failed" };
        return { state: "completed", videoUrl: result.video_url };
      case "failed":
        return { state: "failed", reason: failureFromMessage(result.error) };
      default:
        return { state: "processing" };
    }
  },
};
