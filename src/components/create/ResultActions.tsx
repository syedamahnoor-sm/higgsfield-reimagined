"use client";

import { usePathname, useRouter } from "next/navigation";
import { Clapperboard, Download, Heart, ImageUp, Loader2, Shuffle } from "lucide-react";
import { useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { downloadWithFeedback, prepareAnimate, remixAsset, setAssetAsReference } from "@/lib/actions";
import { cn } from "@/lib/cn";
import type { Asset } from "@/lib/types";
import { useStudio } from "@/store/studio";

export const ACTION_COPY = {
  remix: { label: "Remix", hint: "Load this prompt and settings into the composer" },
  reference: { label: "Use as reference", hint: "Use this image as the reference for your next generation" },
  animate: { label: "Animate", hint: "Bring this image into the Video workspace" },
  download: { label: "Download", hint: "Download this image" },
} as const;

/**
 * The single implementation of every asset action, shared by Create, Library
 * and the viewer. Remix and Use as reference land in the Image workspace, so
 * from any other page they navigate there.
 */
export function useAssetActions(asset: Asset) {
  const router = useRouter();
  const pathname = usePathname();
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const [downloading, setDownloading] = useState(false);
  const goTo = (path: string) => {
    if (pathname !== path) router.push(path);
  };
  const toImage = () => goTo("/create/image");
  return {
    remix: () => {
      remixAsset(asset);
      goTo(asset.kind === "video" ? "/create/video" : "/create/image");
    },
    reference: () => {
      setAssetAsReference(asset);
      toImage();
    },
    animate: () => {
      prepareAnimate(asset);
      router.push("/create/video");
    },
    favorite: () => toggleFavorite(asset.id),
    downloading,
    download: async () => {
      setDownloading(true);
      await downloadWithFeedback(asset);
      setDownloading(false);
    },
  };
}

export function FavoriteButton({
  asset,
  onToggle,
  variant,
  align,
}: {
  asset: Asset;
  onToggle: () => void;
  variant: "glass" | "ghost";
  align?: "center" | "end";
}) {
  return (
    <Tooltip label={asset.favorite ? "Remove from favorites" : "Add to favorites"} align={align}>
      <IconButton
        aria-label="Favorite"
        aria-pressed={asset.favorite}
        variant={variant}
        size="sm"
        onClick={onToggle}
        className={cn(asset.favorite && "text-accent! hover:text-accent!")}
      >
        <Heart
          aria-hidden="true"
          className={cn("size-4 transition-transform duration-200", asset.favorite && "scale-110 fill-current")}
        />
      </IconButton>
    </Tooltip>
  );
}

/** Persistent, labeled action bar shown beneath a single, focused result. */
export function ResultActionBar({ asset }: { asset: Asset }) {
  const a = useAssetActions(asset);
  const button =
    "flex h-9 items-center gap-2 rounded-chip px-3 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg";
  return (
    <div role="toolbar" aria-label="Result actions" className="flex flex-wrap items-center justify-center gap-0.5">
      <Tooltip label={ACTION_COPY.remix.hint}>
        <button type="button" onClick={a.remix} className={button}>
          <Shuffle aria-hidden="true" className="size-4" /> {ACTION_COPY.remix.label}
        </button>
      </Tooltip>
      <Tooltip label={ACTION_COPY.reference.hint}>
        <button type="button" onClick={a.reference} className={button}>
          <ImageUp aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">Use as reference</span>
          <span className="sm:hidden">Reference</span>
        </button>
      </Tooltip>
      <Tooltip label={ACTION_COPY.animate.hint}>
        <button type="button" onClick={a.animate} className={button}>
          <Clapperboard aria-hidden="true" className="size-4" /> {ACTION_COPY.animate.label}
        </button>
      </Tooltip>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-line-strong" />
      <FavoriteButton asset={asset} onToggle={a.favorite} variant="ghost" />
      <Tooltip label={ACTION_COPY.download.hint}>
        <IconButton aria-label="Download" size="sm" onClick={a.download} disabled={a.downloading}>
          {a.downloading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
        </IconButton>
      </Tooltip>
    </div>
  );
}

/** Compact overlay actions for a tile in a multi-image grid; shown on hover or keyboard focus. */
export function TileActions({ asset }: { asset: Asset }) {
  const a = useAssetActions(asset);
  return (
    <>
      <div className="absolute top-2 right-2 flex gap-1">
        <FavoriteButton asset={asset} onToggle={a.favorite} variant="glass" align="end" />
        <Tooltip label={ACTION_COPY.download.hint} side="bottom" align="end">
          <IconButton aria-label="Download" variant="glass" size="sm" onClick={a.download} disabled={a.downloading}>
            {a.downloading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
          </IconButton>
        </Tooltip>
      </div>
      <div role="toolbar" aria-label="Result actions" className="absolute bottom-2 left-2 flex gap-1">
        <Tooltip label={ACTION_COPY.remix.hint} align="start">
          <IconButton aria-label={ACTION_COPY.remix.label} variant="glass" size="sm" onClick={a.remix}>
            <Shuffle aria-hidden="true" className="size-4" />
          </IconButton>
        </Tooltip>
        <Tooltip label={ACTION_COPY.reference.hint} align="start">
          <IconButton aria-label={ACTION_COPY.reference.label} variant="glass" size="sm" onClick={a.reference}>
            <ImageUp aria-hidden="true" className="size-4" />
          </IconButton>
        </Tooltip>
        <Tooltip label={ACTION_COPY.animate.hint} align="start">
          <IconButton aria-label={ACTION_COPY.animate.label} variant="glass" size="sm" onClick={a.animate}>
            <Clapperboard aria-hidden="true" className="size-4" />
          </IconButton>
        </Tooltip>
      </div>
    </>
  );
}
