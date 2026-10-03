"use client";

import { ImageOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { useMediaUrl } from "@/lib/media/useMediaUrl";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * Plays a real video file (AI video), stored locally. "controls" shows the
 * native player and autoplays muted unless reduced motion is requested;
 * "hover" is a silent preview that plays only while `active`.
 */
export function VideoFilePlayer({
  src,
  mode,
  active = false,
  className,
}: {
  src: string;
  mode: "controls" | "hover";
  active?: boolean;
  className?: string;
}) {
  const url = useMediaUrl(src);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || mode !== "hover") return;
    if (active && !reduced) void video.play().catch(() => {});
    else {
      video.pause();
      video.currentTime = 0;
    }
  }, [active, reduced, mode, url]);

  if (url === null) {
    return (
      <div className={cn("grid size-full place-items-center bg-surface-2 text-fg-subtle", className)}>
        <span className="flex flex-col items-center gap-2 px-4 text-center text-xs">
          <ImageOff aria-hidden="true" className="size-5" />
          Video no longer available on this device
        </span>
      </div>
    );
  }
  if (!url) return <span className={cn("shimmer block size-full", className)} />;

  return (
    <video
      ref={ref}
      src={url}
      className={cn("block size-full bg-black object-cover", mode === "controls" && "object-contain", className)}
      muted
      loop
      playsInline
      preload="metadata"
      controls={mode === "controls"}
      autoPlay={mode === "controls" && !reduced}
      aria-label="AI video"
    />
  );
}
