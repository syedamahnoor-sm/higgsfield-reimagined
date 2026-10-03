import "server-only";
import { ProviderError } from "./image-provider";

/**
 * Prompt Enhance via Cloudflare Workers AI text generation (REST):
 * POST /accounts/{id}/ai/run/@cf/meta/llama-3.1-8b-instruct-fp8
 *   { messages, max_tokens, temperature } → { result: { response } }
 * Credentials are read only here, on the server.
 */
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const MAX_WORDS = 70;

const SYSTEM = [
  "You rewrite short image ideas into one concise, production-ready prompt for an AI image generator.",
  "Keep the creator's subject, setting and intent exactly; never change who or what the image is about, and never add text, logos or extra people.",
  "Add only helpful visual detail: composition and framing, setting and atmosphere, lighting, color, and camera or art-direction cues.",
  `Write one paragraph of plain descriptive phrases, at most ${MAX_WORDS} words.`,
  "Reply with the prompt only: no quotes, no title, no explanation, no lists.",
].join(" ");

export function isEnhancerConfigured() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN);
}

/** Cleans model output into a single short prompt; returns null if unusable. */
export function tidyEnhanced(raw: string) {
  let text = raw.trim();
  text = text.replace(/^(here('| i)s|sure|prompt)[^:\n]*:\s*/i, "");
  text = text.replace(/^["'“”]+|["'“”]+$/g, "");
  text = text.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  const words = text.split(" ");
  if (words.length > MAX_WORDS + 10) text = words.slice(0, MAX_WORDS + 10).join(" ").replace(/[,;:]$/, "") + ".";
  return text.length >= 8 ? text.slice(0, 700) : null;
}

export async function enhancePrompt({ prompt, direction, signal }: { prompt: string; direction?: string; signal: AbortSignal }) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;
  if (!accountId || !token) throw new ProviderError("not_configured");

  const user = direction && direction !== "auto" ? `Creative direction: ${direction}.\nIdea: ${prompt}` : `Idea: ${prompt}`;
  let response: Response;
  try {
    response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
        max_tokens: 160,
        temperature: 0.5,
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new ProviderError("timeout");
    throw new ProviderError("failed");
  }
  if (!response.ok) {
    const status = response.status;
    throw new ProviderError(status === 401 || status === 403 ? "auth" : status === 429 ? "rate_limited" : "failed", { status });
  }
  const json = (await response.json()) as { success?: boolean; result?: { response?: string } };
  const text = json.result?.response ? tidyEnhanced(json.result.response) : null;
  if (!text || json.success === false) throw new ProviderError("failed", { status: response.status });
  return text;
}
