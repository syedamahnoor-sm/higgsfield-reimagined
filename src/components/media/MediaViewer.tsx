"use client";

import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { MediaImage } from "./MediaImage";
import { Tooltip } from "@/components/ui/Tooltip";
import { fitGrid } from "@/lib/aspect";
import { useElementSize } from "@/lib/useElementSize";

export interface ViewerMedia {
  key: string;
  src: string;
  alt: string;
  /** width / height of the displayed crop */
  aspect: number;
  /** Replaces the default image, e.g. with a motion player. */
  node?: ReactNode;
}

/**
 * Focused view for a single piece of media: large media on the left, details
 * on the right (stacked on small screens). Built on the native <dialog>, so it
 * renders in the top layer (nothing can clip it), traps focus, closes on
 * Escape and restores focus to the opener.
 */
export function MediaViewer({
  media,
  label,
  details,
  onClose,
  onPrev,
  onNext,
}: {
  media: ViewerMedia | null;
  label: string;
  details: ReactNode;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stage = useElementSize(stageRef);
  const open = media !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onPrev, onNext]);

  const fit = media ? fitGrid(stage.width, stage.height, 1, media.aspect, 0) : null;

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop area (the dialog itself, not its content) closes.
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-fg backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      {/* The layout stays mounted (the closed dialog is hidden) so the stage can be measured on open. */}
      <div className="flex h-full flex-col lg:flex-row">
        <div
          className="relative flex min-h-0 flex-1 p-4 pt-16 sm:p-6 sm:pt-16 lg:p-10"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div ref={stageRef} className="pointer-events-none relative flex min-h-0 flex-1 items-center justify-center">
            {media && fit && fit.width > 0 && (
              <motion.div
                key={media.key}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto relative overflow-hidden rounded-card bg-surface-2 ring-1 ring-line-strong"
                style={{ width: fit.width, height: fit.height }}
              >
                {media.node ?? <MediaImage src={media.src} alt={media.alt} sizes={`${Math.ceil(fit.width)}px`} className="object-cover" />}
              </motion.div>
            )}
          </div>

          {onPrev && (
            <div className="absolute top-1/2 left-2 -translate-y-1/2 sm:left-4">
              <IconButton aria-label="Previous" variant="glass" onClick={onPrev}>
                <ChevronLeft aria-hidden="true" className="size-5" />
              </IconButton>
            </div>
          )}
          {onNext && (
            <div className="absolute top-1/2 right-2 -translate-y-1/2 sm:right-4">
              <IconButton aria-label="Next" variant="glass" onClick={onNext}>
                <ChevronRight aria-hidden="true" className="size-5" />
              </IconButton>
            </div>
          )}
        </div>

        <aside className="relative max-h-[45dvh] shrink-0 overflow-y-auto border-t border-line bg-surface-1 lg:max-h-none lg:w-[380px] lg:border-t-0 lg:border-l">
          {media && details}
        </aside>

        <div className="absolute top-3 right-3 lg:right-[392px]">
          <Tooltip label="Close (Esc)" side="bottom" align="end">
            <IconButton aria-label="Close" variant="glass" onClick={onClose}>
              <X aria-hidden="true" className="size-5" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </dialog>
  );
}

/** Label/value rows for prompt settings and metadata. */
export function MetaList({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line rounded-card border border-line">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 px-3 py-2.5 text-[13px]">
          <dt className="text-fg-subtle">{row.label}</dt>
          <dd className="min-w-0 truncate text-right font-mono text-xs text-fg-muted">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Prompt block shared by Explore and Library details. */
export function PromptBlock({ prompt }: { prompt: string }) {
  return (
    <div>
      <p className="font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Prompt</p>
      <p className="mt-2 text-[15px] leading-relaxed text-fg">{prompt}</p>
    </div>
  );
}
