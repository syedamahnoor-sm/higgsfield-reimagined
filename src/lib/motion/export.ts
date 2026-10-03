import type { MotionPreset } from "@/lib/types";
import { drawMotionFrame, loadImage, motionAt } from "./presets";

/**
 * Real export of the browser motion: the same frames the player shows are
 * drawn to a canvas and recorded with MediaRecorder in real time. The result
 * is a genuine, playable video file of exactly what's on screen.
 */

const FPS = 30;
const MAX_EDGE = 1280;

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

export function canExportMotion() {
  return (
    typeof document !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    "captureStream" in HTMLCanvasElement.prototype &&
    pickMimeType() !== null
  );
}

export async function exportMotion({
  src,
  preset,
  duration,
  aspect,
  onProgress,
}: {
  src: string;
  preset: MotionPreset;
  duration: number;
  /** width / height */
  aspect: number;
  onProgress?: (progress: number) => void;
}) {
  const mimeType = pickMimeType();
  if (!mimeType) throw new Error("This browser can't record video. Try a recent Chrome, Edge or Firefox.");
  const image = await loadImage(src);

  // Even dimensions keep encoders happy.
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const width = even(aspect >= 1 ? MAX_EDGE : MAX_EDGE * aspect);
  const height = even(aspect >= 1 ? MAX_EDGE / aspect : MAX_EDGE);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser couldn't prepare the export.");
  drawMotionFrame(ctx, image, width, height, motionAt(preset, 0, duration));

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(250);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    // setTimeout rather than rAF so the export keeps going in a background tab.
    const tick = () => {
      const t = (performance.now() - start) / (duration * 1000);
      drawMotionFrame(ctx, image, width, height, motionAt(preset, t, duration));
      onProgress?.(Math.min(1, t));
      if (t >= 1) resolve();
      else setTimeout(tick, 1000 / FPS);
    };
    tick();
  });
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  const type = mimeType.split(";")[0];
  return { blob: new Blob(chunks, { type }), extension: type === "video/mp4" ? "mp4" : "webm" };
}
