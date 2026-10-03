"use client";

import Image from "next/image";
import { ImageOff, Loader2, RefreshCw, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useReferenceUrl } from "@/lib/media/useReferenceUrl";
import type { MediaReference } from "@/lib/types";

/** Attached reference: thumbnail, source, dimensions, replace and remove. */
export function ReferenceChip({
  reference,
  onReplace,
  onRemove,
  busy,
  label = "Reference",
  actions,
}: {
  label?: string;
  /** Extra controls shown before Replace (e.g. Save as Element). */
  actions?: React.ReactNode;
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
          <Image src={url} alt={`${label} image`} fill sizes="44px" unoptimized={url.startsWith("blob:")} className="object-cover" />
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
          {url === null ? "No longer available in this browser" : `${label} · ${reference.width}×${reference.height}`}
        </p>
      </div>
      {actions}
      <Tooltip label={`Replace ${label.toLowerCase()}`}>
        <IconButton aria-label={`Replace ${label.toLowerCase()}`} size="sm" onClick={onReplace} disabled={busy}>
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="size-4" />}
        </IconButton>
      </Tooltip>
      <Tooltip label={`Remove ${label.toLowerCase()}`}>
        <IconButton aria-label={`Remove ${label.toLowerCase()}`} size="sm" onClick={onRemove}>
          <X aria-hidden="true" className="size-4" />
        </IconButton>
      </Tooltip>
    </div>
  );
}
