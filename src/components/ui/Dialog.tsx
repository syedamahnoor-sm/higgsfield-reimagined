"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";

/**
 * Small modal dialog on the native <dialog>: top layer, focus trapped,
 * Escape closes, focus returns to the opener. Mark the field to focus first
 * with `data-autofocus`. Becomes a bottom sheet on small screens.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  hideHeader,
  position = "center",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Keep the title for screen readers only (e.g. the command palette). */
  hideHeader?: boolean;
  /** "top" suits search-style dialogs. */
  position?: "center" | "top";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      // showModal focuses the first focusable element; prefer the field marked data-autofocus.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
      returnFocus.current?.focus?.();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-0 max-h-none w-full max-w-none bg-transparent p-0 text-fg backdrop:bg-black/70 backdrop:backdrop-blur-sm open:flex",
        "h-dvh flex-col items-center px-3 pb-3 sm:px-6",
        position === "top" ? "justify-start pt-[12dvh]" : "justify-end sm:justify-center sm:pb-0",
      )}
    >
      {open && (
        <div
          className={cn(
            "relative flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-panel border border-line-strong bg-surface-1 shadow-float",
            className,
          )}
        >
          {!hideHeader && (
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-1">
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-[-0.01em] text-fg">{title}</h2>
                {description && <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{description}</p>}
              </div>
              <IconButton aria-label="Close" size="sm" onClick={onClose} className="-mt-1 -mr-2">
                <X aria-hidden="true" className="size-4" />
              </IconButton>
            </div>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}
