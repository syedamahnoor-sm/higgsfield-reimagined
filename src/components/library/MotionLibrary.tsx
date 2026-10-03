"use client";

import { Download, Heart, Loader2, Play, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { ExportLabel, useMotionActions } from "@/components/create/video/MotionActions";
import { FavoriteButton } from "@/components/create/ResultActions";
import { HOVER_REVEAL, MediaCard } from "@/components/media/MediaCard";
import { MetaList, PromptBlock } from "@/components/media/MediaViewer";
import { ReferenceRow } from "@/components/media/ReferenceRow";
import { MotionPlayer } from "@/components/motion/MotionPlayer";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { MOTION_PRESETS } from "@/lib/constants";
import type { Asset } from "@/lib/types";
import { useStudio } from "@/store/studio";

function presetLabel(asset: Asset) {
  return MOTION_PRESETS.find((p) => p.id === asset.settings.motion)?.label ?? "Push in";
}

/** Library card for a motion clip: first frame at rest, plays its camera move on hover or focus. */
export function MotionCard({ asset, onOpen }: { asset: Asset; onOpen: () => void }) {
  const [active, setActive] = useState(false);
  const a = useMotionActions(asset);
  return (
    <div
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setActive(false);
      }}
    >
      <MediaCard
        src={asset.url}
        alt={asset.settings.prompt || "Motion clip"}
        aspect={asset.width / asset.height}
        sizes="25vw"
        openLabel={`Open motion clip: ${asset.settings.prompt || presetLabel(asset)}`}
        onOpen={onOpen}
        media={
          <MotionPlayer
            source={asset.settings.reference}
            preset={asset.settings.motion ?? "push-in"}
            duration={asset.settings.duration ?? 5}
            mode="hover"
            active={active}
          />
        }
      >
        {/* Always visible: this is a clip, not a still. */}
        <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 font-mono text-2xs text-white/90 backdrop-blur-md">
          <Play aria-hidden="true" className="size-3 fill-current" />
          {asset.settings.duration ?? 5}s · {presetLabel(asset)}
        </span>
        {asset.favorite && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-black/45 text-accent backdrop-blur-md transition-opacity duration-200 group-focus-within:opacity-0 group-hover:opacity-0 [@media(hover:none)]:hidden"
          >
            <Heart className="size-3.5 fill-current" />
          </span>
        )}
        <div className={cn("absolute top-2 right-2 flex gap-1", HOVER_REVEAL)}>
          <FavoriteButton asset={asset} onToggle={a.favorite} variant="glass" align="end" />
          <Tooltip label="Load these motion settings into the Video composer" side="bottom" align="end">
            <IconButton aria-label="Adjust motion" variant="glass" size="sm" onClick={a.adjust}>
              <SlidersHorizontal aria-hidden="true" className="size-4" />
            </IconButton>
          </Tooltip>
        </div>
      </MediaCard>
    </div>
  );
}

/** Library detail panel for a motion clip. */
export function MotionDetails({ asset, onReplay }: { asset: Asset; onReplay: () => void }) {
  const a = useMotionActions(asset);
  const created = new Date(asset.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  const parentAsset = useStudio((s) => (asset.parentId ? s.assets[asset.parentId] : undefined));
  const duration = asset.settings.duration ?? 5;
  const secondary =
    "flex h-10 items-center justify-center gap-2 rounded-card border border-line-strong bg-surface-2 px-3 text-[13px] font-medium text-fg transition-colors duration-150 hover:border-white/20 hover:bg-surface-3 disabled:opacity-60";

  return (
    <div className="flex flex-col gap-6 p-5 sm:p-6">
      <p className="pr-10 font-mono text-2xs tracking-[0.14em] text-fg-subtle uppercase lg:pr-0">Motion clip · {created}</p>

      {asset.settings.prompt && <PromptBlock prompt={asset.settings.prompt} />}

      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" onClick={a.adjust} className="w-full">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Adjust motion
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onReplay} className={secondary}>
            <RotateCcw aria-hidden="true" className="size-4" />
            Replay
          </button>
          <button type="button" onClick={a.favorite} aria-pressed={asset.favorite} className={cn(secondary, asset.favorite && "text-accent")}>
            <Heart aria-hidden="true" className={cn("size-4", asset.favorite && "fill-current")} />
            {asset.favorite ? "Favorited" : "Favorite"}
          </button>
          {a.exporter.supported && (
            <button type="button" onClick={a.exporter.run} disabled={a.exporter.exporting} className={cn(secondary, "col-span-2")}>
              {a.exporter.exporting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
              <ExportLabel exporting={a.exporter.exporting} progress={a.exporter.progress} duration={duration} />
            </button>
          )}
        </div>
      </div>

      <MetaList
        rows={[
          { label: "Engine", value: asset.resolvedModel },
          { label: "Camera motion", value: presetLabel(asset) },
          { label: "Duration", value: `${duration}s` },
          { label: "Aspect ratio", value: asset.settings.aspect },
          ...(parentAsset ? [{ label: "Based on", value: "Your image" }] : []),
        ]}
      />

      <ReferenceRow asset={asset} label="Source image" />

      <p className="text-xs leading-relaxed text-fg-subtle">
        Browser motion: a camera move over your source image, rendered on this device. It isn’t AI-generated video.
        {a.exporter.supported && " Export records exactly this motion to a video file."}
      </p>
    </div>
  );
}
