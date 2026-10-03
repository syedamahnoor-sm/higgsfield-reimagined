import { ProviderError } from "@/lib/server/image-provider";
import { clientIp, isValidJobId, rateLimited, unavailable, videoProvider } from "@/lib/server/video-route-utils";

export const maxDuration = 60;

/**
 * Streams a completed video through our server. The provider's URL expires
 * after 24 hours and isn't exposed to the browser; the client downloads the
 * bytes once and keeps them locally.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/video/[id]/file">) {
  const { id } = await ctx.params;
  if (!isValidJobId(id)) return Response.json({ error: "invalid_id" }, { status: 400 });
  if (rateLimited(`video-file:${clientIp(request)}`, 10, 60_000)) return unavailable("rate_limited", 429);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const status = await videoProvider.status(id, controller.signal);
    if (status.state !== "completed") return Response.json({ error: "not_ready", state: status.state }, { status: 409 });
    const upstream = await fetch(status.videoUrl, { signal: controller.signal });
    if (!upstream.ok || !upstream.body) throw new ProviderError("failed", { status: upstream.status });
    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const failure = error instanceof ProviderError ? error : new ProviderError("failed");
    console.warn(`[video] file provider=${videoProvider.id} reason=${failure.reason} status=${failure.diagnostic.status ?? "-"}`);
    return unavailable(failure.reason);
  } finally {
    clearTimeout(timer);
  }
}
