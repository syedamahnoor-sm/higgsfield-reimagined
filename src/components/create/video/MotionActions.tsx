"use client";

import { useRouter, usePathname } from "next/navigation";
import { Download, Heart, Images, Loader2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { downloadWithFeedback, remixAsset } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { resolveReferenceUrl } from "@/lib/generation/local-motion-engine";
import { canExportMotion, exportMotion } from "@/lib/motion/export";
import type { Asset } from "@/lib/types";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";

const subscribeNoop = () => () => {};

/** Real export of a motion clip (WebM, or MP4 where that's what the browser records). Hidden when unsupported. */
export function useMotionExport(asset: Asset) {
  const supported = useSyncExternalStore(subscribeNoop, canExportMotion, () => false);
  const [progress, setProgress] = useState<number | null>(null);

  const run = async () => {
    const reference = asset.settings.reference;
    if (!reference || progress !== null) return;
    setProgress(0);
    try {
      const src = await resolveReferenceUrl(reference);
      if (!src) throw new Error("The source image is no longer available on this device.");
      const { blob, extension } = await exportMotion({
        src,
        preset: asset.settings.motion ?? "push-in",
        duration: asset.settings.duration ?? 5,
        aspect: asset.width / asset.height,
        onProgress: setProgress,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ember-motion-${asset.settings.motion ?? "clip"}-${asset.id.slice(-6)}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "Export failed." });
    } finally {
      setProgress(null);
    }
  };

  return { supported, exporting: progress !== null, progress: progress ?? 0, run };
}

/** Shared motion actions; Adjust motion is Remix for clips: it loads the settings back into the Video composer. */
export function useMotionActions(asset: Asset) {
  const router = useRouter();
  const pathname = usePathname();
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const exporter = useMotionExport(asset);
  return {
    adjust: () => {
      remixAsset(asset);
      if (pathname !== "/create/video") router.push("/create/video");
    },
    favorite: () => toggleFavorite(asset.id),
    exporter,
  };
}

export function ExportLabel({ exporting, progress, duration }: { exporting: boolean; progress: number; duration: number }) {
  if (!exporting) return <>Export video</>;
  return (
    <>
      Recording {Math.min(duration, Math.floor(progress * duration))}/{duration}s
    </>
  );
}

/** Persistent action bar beneath a finished motion clip. */
export function MotionActionBar({ asset, onReplay }: { asset: Asset; onReplay: () => void }) {
  const a = useMotionActions(asset);
  const duration = asset.settings.duration ?? 5;
  const button =
    "flex h-9 items-center gap-2 rounded-chip px-3 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg disabled:opacity-60";
  return (
    <div role="toolbar" aria-label="Motion actions" className="flex items-center justify-center gap-0.5">
      <Tooltip label="Play the motion again">
        <button type="button" onClick={onReplay} className={button}>
          <RotateCcw aria-hidden="true" className="size-4" /> Replay
        </button>
      </Tooltip>
      <Tooltip label="Load these motion settings into the composer to adjust them">
        <button type="button" onClick={a.adjust} aria-label="Adjust motion" className={button}>
          <SlidersHorizontal aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">Adjust motion</span>
        </button>
      </Tooltip>
      {a.exporter.supported && (
        <Tooltip label={`Record this motion as a ${duration}s video file (takes ${duration}s)`}>
          <button type="button" onClick={a.exporter.run} disabled={a.exporter.exporting} aria-label="Export video" className={button}>
            {a.exporter.exporting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
            <span className={a.exporter.exporting ? "font-mono text-xs" : "hidden sm:inline"}>
              <ExportLabel exporting={a.exporter.exporting} progress={a.exporter.progress} duration={duration} />
            </span>
          </button>
        </Tooltip>
      )}
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-line-strong" />
      <Tooltip label={asset.favorite ? "Remove from favorites" : "Add to favorites"} align="end">
        <IconButton
          aria-label="Favorite"
          aria-pressed={asset.favorite}
          size="sm"
          onClick={a.favorite}
          className={cn(asset.favorite && "text-accent! hover:text-accent!")}
        >
          <Heart aria-hidden="true" className={cn("size-4", asset.favorite && "fill-current")} />
        </IconButton>
      </Tooltip>
    </div>
  );
}

/** Actions for a real AI video: download the file, favorite, reuse settings, or open the Library. */
export function AiVideoActionBar({ asset }: { asset: Asset }) {
  const router = useRouter();
  const a = useMotionActions(asset);
  const [downloading, setDownloading] = useState(false);
  const button =
    "flex h-9 items-center gap-2 rounded-chip px-3 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg disabled:opacity-60";
  return (
    <div role="toolbar" aria-label="Video actions" className="flex items-center justify-center gap-0.5">
      <Tooltip label="Download this video">
        <button
          type="button"
          aria-label="Download"
          disabled={downloading}
          onClick={async () => {
            setDownloading(true);
            await downloadWithFeedback(asset);
            setDownloading(false);
          }}
          className={button}
        >
          {downloading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
          <span className="hidden sm:inline">Download</span>
        </button>
      </Tooltip>
      <Tooltip label="Load this prompt and settings into the composer">
        <button type="button" onClick={a.adjust} aria-label="Reuse settings" className={button}>
          <SlidersHorizontal aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">Reuse settings</span>
        </button>
      </Tooltip>
      <Tooltip label="See it with the rest of your work">
        <button type="button" onClick={() => router.push("/library")} aria-label="Open in Library" className={button}>
          <Images aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">Open in Library</span>
        </button>
      </Tooltip>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-line-strong" />
      <Tooltip label={asset.favorite ? "Remove from favorites" : "Add to favorites"} align="end">
        <IconButton
          aria-label="Favorite"
          aria-pressed={asset.favorite}
          size="sm"
          onClick={a.favorite}
          className={cn(asset.favorite && "text-accent! hover:text-accent!")}
        >
          <Heart aria-hidden="true" className={cn("size-4", asset.favorite && "fill-current")} />
        </IconButton>
      </Tooltip>
    </div>
  );
}
