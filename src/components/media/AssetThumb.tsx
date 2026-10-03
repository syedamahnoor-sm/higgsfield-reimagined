"use client";

import { LOCAL_MEDIA_PREFIX } from "@/lib/media/uploads";
import type { Asset } from "@/lib/types";
import { MediaImage } from "./MediaImage";

/**
 * Static thumbnail for any asset. Motion clips made from an upload have no
 * media URL of their own, so their source image is used.
 */
export function AssetThumb({ asset, sizes }: { asset: Asset; sizes: string }) {
  const reference = asset.settings.reference;
  const src =
    asset.url ||
    (reference ? (reference.source === "asset" ? reference.url : `${LOCAL_MEDIA_PREFIX}${reference.id}`) : "");
  if (!src) return <span className="shimmer block size-full" />;
  return <MediaImage src={src} alt="" sizes={sizes} className="object-cover" />;
}
