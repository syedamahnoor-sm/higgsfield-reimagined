import { ProviderError } from "@/lib/server/image-provider";
import { clientIp, isValidJobId, rateLimited, unavailable, videoProvider } from "@/lib/server/video-route-utils";

/** Job status for polling. Returns only the state, never the provider's video URL. */
export async function GET(request: Request, ctx: RouteContext<"/api/video/[id]">) {
  const { id } = await ctx.params;
  if (!isValidJobId(id)) return Response.json({ error: "invalid_id" }, { status: 400 });
  if (rateLimited(`video-poll:${clientIp(request)}`, 60, 60_000)) return unavailable("rate_limited", 429);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const status = await videoProvider.status(id, controller.signal);
    if (status.state === "failed") return Response.json({ state: "failed", reason: status.reason });
    return Response.json({ state: status.state });
  } catch (error) {
    const failure = error instanceof ProviderError ? error : new ProviderError("failed");
    console.warn(`[video] status provider=${videoProvider.id} reason=${failure.reason} status=${failure.diagnostic.status ?? "-"}`);
    return unavailable(failure.reason, failure.reason === "rate_limited" ? 429 : 503);
  } finally {
    clearTimeout(timer);
  }
}
