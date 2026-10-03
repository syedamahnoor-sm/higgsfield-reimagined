import type { MotionPreset } from "@/lib/types";

/**
 * Browser motion: camera moves applied to a still image. Every preset is a
 * pure function of normalized time, so the on-screen player and the WebM
 * export draw exactly the same frames. Nothing here invents new pixels.
 */

export interface MotionFrame {
  /** Zoom relative to a cover fit (1 = exactly covers the frame). */
  scale: number;
  /** Offset as a fraction of frame width/height. */
  x: number;
  y: number;
  /** Degrees. */
  rotate: number;
}

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const TAU = Math.PI * 2;

/**
 * Camera state at progress `t` (0–1) of a clip lasting `duration` seconds.
 * Scales always leave enough margin that frame edges never show.
 */
export function motionAt(preset: MotionPreset, t: number, duration: number): MotionFrame {
  const p = Math.min(1, Math.max(0, t));
  const e = easeInOutSine(p);
  const sec = p * duration;
  switch (preset) {
    case "push-in":
      return { scale: 1 + 0.2 * e, x: 0, y: -0.01 * e, rotate: 0 };
    case "pull-out":
      return { scale: 1.24 - 0.24 * e, x: 0, y: -0.01 * (1 - e), rotate: 0 };
    case "pan":
      return { scale: 1.16, x: 0.065 - 0.13 * e, y: 0, rotate: 0 };
    case "orbit": {
      const arc = Math.PI * e;
      return { scale: 1.2 + 0.03 * Math.sin(arc), x: 0.05 * Math.cos(arc), y: -0.012 * Math.sin(arc), rotate: -1.4 * Math.cos(arc) };
    }
    case "drift":
      return {
        scale: 1.08 + 0.05 * e,
        x: 0.03 * (e - 0.5) * 2 + 0.004 * Math.sin(TAU * 0.25 * sec),
        y: -0.02 * (e - 0.5) * 2 + 0.003 * Math.sin(TAU * 0.18 * sec + 1),
        rotate: 0,
      };
    case "handheld":
      return {
        scale: 1.1,
        x: 0.006 * (Math.sin(TAU * 0.7 * sec) + 0.6 * Math.sin(TAU * 1.9 * sec + 1)),
        y: 0.005 * (Math.sin(TAU * 0.55 * sec + 2) + 0.5 * Math.sin(TAU * 1.6 * sec + 0.4)),
        rotate: 0.35 * (Math.sin(TAU * 0.5 * sec + 2) + 0.5 * Math.sin(TAU * 1.3 * sec)),
      };
  }
}

/** Draws one frame: the image cover-fitted to the canvas, then the camera transform applied. */
export function drawMotionFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | ImageBitmap,
  width: number,
  height: number,
  frame: MotionFrame,
) {
  const iw = "naturalWidth" in image ? image.naturalWidth : image.width;
  const ih = "naturalHeight" in image ? image.naturalHeight : image.height;
  const cover = Math.max(width / iw, height / ih);
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.translate(width / 2 + frame.x * width, height / 2 + frame.y * height);
  ctx.rotate((frame.rotate * Math.PI) / 180);
  ctx.scale(cover * frame.scale, cover * frame.scale);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, -iw / 2, -ih / 2);
  ctx.restore();
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The source image couldn't be loaded."));
    img.src = src;
  });
}
