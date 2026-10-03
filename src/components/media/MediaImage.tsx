"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useMediaUrl } from "@/lib/media/useMediaUrl";

/**
 * next/image for any asset URL: stable paths are optimized as usual; local
 * media (generated images stored in this browser) is resolved and shown
 * unoptimized. Shows a shimmer while resolving and a placeholder if missing.
 */
export function MediaImage({
  src,
  alt,
  sizes,
  className,
  preload,
  quality,
  onError,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  preload?: boolean;
  quality?: number;
  onError?: () => void;
}) {
  const url = useMediaUrl(src);
  if (url === null) {
    return (
      <span className="grid size-full place-items-center text-fg-subtle">
        <span className="flex flex-col items-center gap-2 px-3 text-center text-xs">
          <ImageOff aria-hidden="true" className="size-5" />
          Media unavailable on this device
        </span>
      </span>
    );
  }
  if (!url) return <span className="shimmer absolute inset-0" />;
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      quality={quality}
      unoptimized={url.startsWith("blob:")}
      onError={onError}
      className={className}
    />
  );
}
