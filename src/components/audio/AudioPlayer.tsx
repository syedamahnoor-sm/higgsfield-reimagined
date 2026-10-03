"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useMediaUrl } from "@/lib/media/useMediaUrl";
import type { Asset } from "@/lib/types";
import { formatDuration, speakerHue, speakerLabel } from "@/lib/voices";

/** Only one clip plays at a time across the app. */
let current: HTMLAudioElement | null = null;

/**
 * Player for a voice asset. The waveform is drawn from peak levels measured
 * from the decoded file when it was generated; when those aren't available a
 * plain progress track is shown instead, so nothing pretends to be a waveform.
 */
export function AudioPlayer({
  asset,
  variant = "full",
  className,
}: {
  asset: Asset;
  /** full: result stage and viewer. compact: cards and Board tiles. */
  variant?: "full" | "compact";
  className?: string;
}) {
  const src = useMediaUrl(asset.url);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | undefined>(undefined);
  const duration = loadedDuration ?? asset.audio?.duration;
  const peaks = asset.audio?.peaks;
  // Fewer, wider bars read better and always fit: 48 in the full player, 32 in compact ones.
  const bars = peaks?.filter((_, i) => i % (variant === "compact" ? 3 : 2) === 0);
  const progress = duration ? Math.min(1, time / duration) : 0;
  const unavailable = src === null;

  // Smooth progress while playing.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      if (audioRef.current) setTime(audioRef.current.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(
    () => () => {
      if (current === audioRef.current) current = null;
    },
    [],
  );

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (audio.paused) {
      if (current && current !== audio) current.pause();
      current = audio;
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setTime(value);
  };

  const full = variant === "full";
  const label = asset.audio ? `${speakerLabel(asset.audio.speaker)} voice` : "Audio";

  return (
    <div className={cn("flex items-center", full ? "gap-4" : "gap-2.5", className)}>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setTime(0);
          }}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d)) setLoadedDuration(d);
          }}
        />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        disabled={!src}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        aria-pressed={playing}
        className={cn(
          "grid shrink-0 place-items-center rounded-full transition-[background-color,transform] duration-150 active:scale-95 disabled:opacity-40",
          full ? "size-12 bg-accent text-accent-fg hover:bg-accent-hover" : "size-8 bg-white/10 text-fg hover:bg-white/20",
        )}
      >
        {playing ? (
          <Pause aria-hidden="true" className={cn("fill-current", full ? "size-5" : "size-3.5")} />
        ) : (
          <Play aria-hidden="true" className={cn("translate-x-px fill-current", full ? "size-5" : "size-3.5")} />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "relative rounded-chip has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent",
            full ? "h-14" : "h-8",
          )}
        >
          {bars && bars.length ? (
            <div aria-hidden="true" className="flex h-full items-center gap-px overflow-hidden sm:gap-[2px]">
              {bars.map((peak, i) => {
                const played = (i + 0.5) / bars.length <= progress;
                return (
                  <span
                    key={i}
                    className={cn("min-w-0 flex-1 rounded-full transition-colors duration-100", played ? "bg-accent" : "bg-white/20")}
                    style={{ height: `${Math.max(8, peak * 100)}%` }}
                  />
                );
              })}
            </div>
          ) : (
            <div aria-hidden="true" className="flex h-full items-center">
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
          <input
            type="range"
            min={0}
            max={duration ?? 0}
            step={0.01}
            value={Math.min(time, duration ?? 0)}
            disabled={!src || !duration}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label={`Seek ${label}`}
            aria-valuetext={`${formatDuration(time)} of ${formatDuration(duration)}`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
          />
        </div>
        <div className={cn("flex justify-between font-mono text-fg-subtle tabular-nums", full ? "mt-1.5 text-xs" : "mt-0.5 text-2xs")}>
          <span>{formatDuration(time)}</span>
          <span>{unavailable ? "Not on this device" : formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
}

/** Speaker identity: initial on a color derived from the name. Decorative, not a description of the voice. */
export function SpeakerAvatar({ speaker, size = "md", className }: { speaker: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const hue = speakerHue(speaker);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white/95 ring-1 ring-white/10",
        size === "sm" ? "size-7 text-xs" : size === "lg" ? "size-12 text-lg" : "size-9 text-sm",
        className,
      )}
      style={{ background: `radial-gradient(circle at 30% 25%, hsl(${hue} 70% 62%), hsl(${(hue + 40) % 360} 55% 28%))` }}
    >
      {speaker.charAt(0).toUpperCase()}
    </span>
  );
}
