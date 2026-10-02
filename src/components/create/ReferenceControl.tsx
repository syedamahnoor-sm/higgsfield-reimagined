"use client";

import Image from "next/image";
import { ImageOff, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useReferenceUrl } from "@/lib/media/useReferenceUrl";
import type { MediaReference } from "@/lib/types";

/** Button that opens the file picker when no reference is attached. */
export function AddReferenceButton({ onPick, busy }: { onPick: () => void; busy: boolean }) {
  return (
    <Tooltip label="Add a reference image from your device. It stays in your browser.">
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        aria-label="Add reference image"
        className="flex h-9 items-center gap-1.5 rounded-chip px-2.5 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg disabled:opacity-60"
      >
        {busy ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <ImagePlus aria-hidden="true" className="size-4" strokeWidth={1.75} />
        )}
        <span className="hidden sm:inline">Reference</span>
      </button>
    </Tooltip>
  );
}

/** Attached reference: thumbnail, source, dimensions, replace and remove. */
export function ReferenceChip({
  reference,
  onReplace,
  onRemove,
  busy,
}: {
  reference: MediaReference;
  onReplace: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const url = useReferenceUrl(reference);
  const name = reference.source === "upload" ? reference.name : "From your results";

  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface-1/70 p-1.5 pr-1">
      <div className="relative size-11 shrink-0 overflow-hidden rounded-chip bg-surface-3">
        {url ? (
          <Image src={url} alt="Reference image" fill sizes="44px" unoptimized={url.startsWith("blob:")} className="object-cover" />
        ) : url === null ? (
          <span className="grid size-full place-items-center text-fg-subtle">
            <ImageOff aria-hidden="true" className="size-4" />
          </span>
        ) : (
          <span className="shimmer block size-full" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-fg">{name}</p>
        <p className="font-mono text-2xs text-fg-subtle">
          {url === null ? "No longer available in this browser" : `Reference · ${reference.width}×${reference.height}`}
        </p>
      </div>
      <Tooltip label="Replace reference">
        <IconButton aria-label="Replace reference" size="sm" onClick={onReplace} disabled={busy}>
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="size-4" />}
        </IconButton>
      </Tooltip>
      <Tooltip label="Remove reference">
        <IconButton aria-label="Remove reference" size="sm" onClick={onRemove}>
          <X aria-hidden="true" className="size-4" />
        </IconButton>
      </Tooltip>
    </div>
  );
}
