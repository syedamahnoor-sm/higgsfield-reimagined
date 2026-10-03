import { ProviderError } from "@/lib/server/image-provider";
import { enhancePrompt, isEnhancerConfigured } from "@/lib/server/prompt-enhancer";

/**
 * Prompt Enhance: rewrites a short idea into a richer image prompt with an AI
 * text model. Server-only; returns just the enhanced text or a safe category.
 */

const DIRECTIONS = ["auto", "cinematic", "editorial", "portrait", "product", "illustration"];
const MAX_PROMPT = 500;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 12;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { prompt, direction } = body;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT) {
    return Response.json({ error: "invalid_prompt" }, { status: 400 });
  }
  if (direction !== undefined && !DIRECTIONS.includes(direction as string)) {
    return Response.json({ error: "invalid_settings" }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return Response.json({ error: "unavailable", reason: "rate_limited" }, { status: 429 });
  if (!isEnhancerConfigured()) return Response.json({ error: "unavailable", reason: "not_configured" }, { status: 503 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const enhanced = await enhancePrompt({ prompt: prompt.trim(), direction: direction as string | undefined, signal: controller.signal });
    return Response.json({ prompt: enhanced });
  } catch (error) {
    const failure = error instanceof ProviderError ? error : new ProviderError("failed");
    console.warn(`[enhance] reason=${failure.reason} status=${failure.diagnostic.status ?? "-"}`);
    return Response.json({ error: "unavailable", reason: failure.reason }, { status: failure.reason === "rate_limited" ? 429 : 503 });
  } finally {
    clearTimeout(timer);
  }
}
