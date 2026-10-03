"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useReferenceUrl } from "@/lib/media/useReferenceUrl";
import type { Asset } from "@/lib/types";

/** Shows the reference used for a generation, degrading gracefully if an upload is gone. */
export function ReferenceRow({ asset, label = "Generated with a reference" }: { asset: Asset; label?: string }) {
  const reference = asset.settings.reference!;
  const url = useReferenceUrl(reference);
  return (
    <div className="flex items-center gap-3 rounded-card border border-line p-2">
      <div className="relative size-11 shrink-0 overflow-hidden rounded-chip bg-surface-3">
        {url ? (
          <Image src={url} alt="Reference used" fill sizes="44px" unoptimized={url.startsWith("blob:")} className="object-cover" />
        ) : url === null ? (
          <span className="grid size-full place-items-center text-fg-subtle">
            <ImageOff aria-hidden="true" className="size-4" />
          </span>
        ) : (
          <span className="shimmer block size-full" />
        )}
      </div>
      <div className="min-w-0 text-[13px]">
        <p className="text-fg-muted">{label}</p>
        <p className="truncate font-mono text-2xs text-fg-subtle">
          {url === null ? "Reference no longer available on this device" : reference.source === "upload" ? reference.name : "From your results"}
        </p>
      </div>
    </div>
  );
}
