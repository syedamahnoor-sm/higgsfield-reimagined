"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Small anchored popover (no portal): closes on outside click or Escape and
 * returns focus to the trigger. Opens above by default, since most triggers
 * live in the bottom-docked composer or on media.
 */
export function Popover({
  trigger,
  children,
  label,
  side = "top",
  align = "start",
  width = 300,
  open: controlledOpen,
  onOpenChange,
  className,
}: {
  /** Render prop for the trigger; spread the props onto a button. */
  trigger: (props: { id: string; onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "dialog"; "aria-controls"?: string }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  label: string;
  side?: "top" | "bottom";
  align?: "start" | "end";
  width?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setUncontrolled(v));
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const triggerId = useId();
  // Focus is restored by id (not a ref) so `close` can be handed to children during render.
  const focusTrigger = () => document.getElementById(triggerId)?.focus();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) (onOpenChange ?? setUncontrolled)(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        (onOpenChange ?? setUncontrolled)(false);
        document.getElementById(triggerId)?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange, triggerId]);

  const close = () => {
    setOpen(false);
    focusTrigger();
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {trigger({ id: triggerId, onClick: () => setOpen(!open), "aria-expanded": open, "aria-haspopup": "dialog", "aria-controls": open ? panelId : undefined })}
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label={label}
            initial={{ opacity: 0, y: side === "top" ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === "top" ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: `min(${width}px, calc(100vw - 24px))` }}
            className={cn(
              "absolute z-50 rounded-card border border-line-strong bg-surface-2 p-2 shadow-float",
              side === "top" ? "bottom-full mb-2" : "top-full mt-2",
              align === "start" ? "left-0 origin-bottom-left" : "right-0 origin-bottom-right",
            )}
          >
            {typeof children === "function" ? children(close) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A menu row used inside a Popover. */
export function MenuItem({ icon, label, hint, onSelect }: { icon?: ReactNode; label: string; hint?: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-start gap-2.5 rounded-chip px-2.5 py-2 text-left text-[13px] text-fg outline-offset-[-2px] transition-colors hover:bg-surface-3 focus-visible:bg-surface-3"
    >
      {icon && <span className="mt-0.5 shrink-0 text-fg-muted">{icon}</span>}
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-fg-muted">{hint}</span>}
      </span>
    </button>
  );
}
