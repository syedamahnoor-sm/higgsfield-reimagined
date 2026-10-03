"use client";

import { ImageOff, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useReferenceUrl } from "@/lib/media/useReferenceUrl";
import { drawMotionFrame, loadImage, motionAt } from "@/lib/motion/presets";
import type { MediaReference, MotionPreset } from "@/lib/types";
import { useReducedMotion } from "@/lib/useReducedMotion";

type PlayMode =
  /** Plays once when mounted (or when `playKey` changes), then holds the last frame with a Replay control. */
  | "once"
  /** Loops while `active` is true; shows the first frame otherwise (cards on hover). */
  | "hover";

/**
 * Renders a browser-motion clip on a canvas: the source image with the
 * preset's camera move applied frame by frame. With reduced motion enabled
 * nothing plays automatically; the first frame is shown with a Play control.
 */
export function MotionPlayer({
  source,
  preset,
  duration,
  mode,
  active = true,
  playKey = 0,
  showControls = true,
  className,
}: {
  source: MediaReference | undefined;
  preset: MotionPreset;
  duration: number;
  mode: PlayMode;
  active?: boolean;
  /** Change to restart playback (Replay). */
  playKey?: number;
  showControls?: boolean;
  className?: string;
}) {
  const url = useReferenceUrl(source);
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [endedKey, setEndedKey] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState(0);
  const [userStarted, setUserStarted] = useState(false);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    loadImage(url).then(
      (img) => alive && setImage({ url, img }),
      () => alive && setFailed(url),
    );
    return () => {
      alive = false;
    };
  }, [url]);

  const img = image && image.url === url ? image.img : null;
  // Reduced motion: never autoplay; play only after an explicit request.
  const shouldPlay = mode === "hover" ? active && !reduced : !reduced || userStarted;
  // Identifies one playback; "ended" is derived so nothing has to be reset by hand.
  const runKey = `${preset}|${duration}|${playKey}|${manualKey}`;
  const ended = mode === "once" && endedKey === runKey;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let lastT = 0;
    const render = (t: number) => {
      lastT = t;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.min(2560, Math.round(rect.width * dpr)));
      const h = Math.max(1, Math.min(2560, Math.round(rect.height * dpr)));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      drawMotionFrame(ctx, img, w, h, motionAt(preset, t, duration));
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${t})`;
    };
    // Redraw the current frame whenever the player is resized (e.g. after playback ended).
    const observer = new ResizeObserver(() => render(lastT));
    observer.observe(canvas);

    if (!shouldPlay) {
      render(0);
      return () => observer.disconnect();
    }

    let start = 0;
    const loop = (now: number) => {
      if (!start) start = now;
      let t = (now - start) / (duration * 1000);
      if (t >= 1) {
        if (mode === "hover") {
          start = now;
          t = 0;
        } else {
          render(1);
          setEndedKey(runKey);
          return;
        }
      }
      render(t);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [img, preset, duration, mode, shouldPlay, runKey]);

  const replay = () => {
    setUserStarted(true);
    setManualKey((k) => k + 1);
  };

  const unavailable = url === null || failed === url;

  return (
    <div className={cn("relative size-full overflow-hidden bg-surface-2", className)}>
      {unavailable ? (
        <div className="grid size-full place-items-center text-fg-subtle">
          <span className="flex flex-col items-center gap-2 px-4 text-center text-xs">
            <ImageOff aria-hidden="true" className="size-5" />
            Source image no longer available on this device
          </span>
        </div>
      ) : (
        <>
          <canvas ref={canvasRef} className="block size-full" aria-hidden="true" />
          {!img && <span className="shimmer absolute inset-0" />}
        </>
      )}

      {mode === "once" && showControls && !unavailable && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
            <div ref={progressRef} className="h-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
          </div>
          {(ended || (reduced && !userStarted)) && (
            <button
              type="button"
              onClick={replay}
              aria-label={ended ? "Replay motion" : "Play motion"}
              className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 data-[force=true]:opacity-100"
              data-force={reduced && !userStarted}
            >
              <span className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
                {ended ? <RotateCcw aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
                {ended ? "Replay" : "Play"}
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
