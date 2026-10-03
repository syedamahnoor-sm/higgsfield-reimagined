"use client";

import { ImageOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { MediaImage } from "./MediaImage";

/** Reveal-on-hover/focus for card actions; always visible on touch devices. */
export const HOVER_REVEAL =
  "opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";

/**
 * Media card used by Explore and Library. Two layers:
 * - a clipping layer (media + scrim) rounded to the card's corners, and
 * - an unclipped action layer (`children`), so tooltips can extend past the card.
 * The whole card opens via a full-size button, which keeps it keyboard accessible.
 */
export function MediaCard({
  src,
  alt,
  aspect,
  sizes,
  openLabel,
  onOpen,
  scrim,
  preload,
  media,
  children,
  className,
}: {
  src: string;
  alt: string;
  /** width / height of the displayed crop */
  aspect: number;
  sizes: string;
  openLabel: string;
  onOpen: () => void;
  /** Extra content inside the clipping layer, e.g. a gradient and caption. */
  scrim?: ReactNode;
  preload?: boolean;
  /** Replaces the default image, e.g. with a motion player. */
  media?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <div
      className={cn("group relative rounded-card hover:z-10 focus-within:z-10", className)}
      style={{ aspectRatio: aspect }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-card bg-surface-2 ring-1 ring-line">
        {media ? (
          media
        ) : broken ? (
          <div className="grid size-full place-items-center text-fg-subtle">
            <span className="flex flex-col items-center gap-2 text-xs">
              <ImageOff aria-hidden="true" className="size-5" />
              Media unavailable
            </span>
          </div>
        ) : (
          <MediaImage
            src={src}
            alt={alt}
            sizes={sizes}
            preload={preload}
            onError={() => setBroken(true)}
            className="object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.015]"
          />
        )}
        {scrim}
      </div>

      <button
        type="button"
        onClick={onOpen}
        aria-label={openLabel}
        className="absolute inset-0 cursor-zoom-in rounded-card outline-offset-2"
      />

      {children}
    </div>
  );
}
