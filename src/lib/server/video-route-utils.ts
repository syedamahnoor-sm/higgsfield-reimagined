import "server-only";
import { eternalProvider } from "./eternal-provider";
import type { VideoProvider } from "./video-provider";

/** The active image-to-video provider. Swap here without touching the routes or UI. */
export const videoProvider: VideoProvider = eternalProvider;

/** Provider job ids are opaque; accept only a conservative character set. */
export function isValidJobId(id: string) {
  return /^[A-Za-z0-9_.:-]{4,200}$/.test(id);
}

// Best-effort abuse guards for the public demo (per server instance).
const buckets = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  return recent.length > max;
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export const unavailable = (reason: string, status = 503) => Response.json({ error: "unavailable", reason }, { status });
