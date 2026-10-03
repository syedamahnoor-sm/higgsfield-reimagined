"use client";

import { AudioLines, Play } from "lucide-react";
import { LOCAL_MEDIA_PREFIX } from "@/lib/media/uploads";
import type { Asset } from "@/lib/types";
import { speakerHue } from "@/lib/voices";
import { MediaImage } from "./MediaImage";

/**
 * Static thumbnail for any asset. Video assets (motion clips without a URL of
 * their own, and AI video files) use their source image as the still; voice
 * audio shows its measured waveform on the speaker's color.
 */
export function AssetThumb({ asset, sizes, badge = false }: { asset: Asset; sizes: string; badge?: boolean }) {
  if (asset.kind === "audio") return <AudioThumb asset={asset} />;
  const reference = asset.settings.reference;
  const src =
    (asset.renderer !== "file" && asset.url) ||
    (reference ? (reference.source === "asset" ? reference.url : `${LOCAL_MEDIA_PREFIX}${reference.id}`) : "");
  if (!src) return <span className="shimmer block size-full" />;
  return (
    <>
      <MediaImage src={src} alt="" sizes={sizes} className="object-cover" />
      {badge && asset.kind === "video" && (
        <span aria-hidden="true" className="absolute bottom-1 left-1 grid size-5 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm">
          <Play className="size-2.5 translate-x-px fill-current" />
        </span>
      )}
    </>
  );
}

function AudioThumb({ asset }: { asset: Asset }) {
  const hue = speakerHue(asset.audio?.speaker ?? "voice");
  const peaks = asset.audio?.peaks?.filter((_, i) => i % 6 === 0);
  return (
    <span
      className="absolute inset-0 flex items-center justify-center gap-[2px] px-[14%]"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 22%), hsl(${(hue + 40) % 360} 35% 12%))` }}
    >
      {peaks && peaks.length ? (
        peaks.map((p, i) => <span key={i} aria-hidden="true" className="w-full max-w-1 rounded-full bg-white/70" style={{ height: `${Math.max(10, p * 60)}%` }} />)
      ) : (
        <AudioLines aria-hidden="true" className="size-1/3 text-white/70" />
      )}
    </span>
  );
}
