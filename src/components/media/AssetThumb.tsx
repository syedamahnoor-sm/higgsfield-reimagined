"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useReferenceUrl } from "@/lib/media/useReferenceUrl";
import type { Asset } from "@/lib/types";

/**
 * Static thumbnail for any asset. Motion clips whose source is an upload have
 * no stable URL, so their source is resolved from IndexedDB.
 */
export function AssetThumb({ asset, sizes }: { asset: Asset; sizes: string }) {
  const needsSource = !asset.url && asset.settings.reference;
  const sourceUrl = useReferenceUrl(needsSource ? asset.settings.reference : undefined);
  const url = asset.url || sourceUrl;

  if (url === null) {
    return (
      <span className="grid size-full place-items-center text-fg-subtle">
        <ImageOff aria-hidden="true" className="size-4" />
      </span>
    );
  }
  if (!url) return <span className="shimmer block size-full" />;
  return <Image src={url} alt="" fill sizes={sizes} unoptimized={url.startsWith("blob:")} className="object-cover" />;
}
