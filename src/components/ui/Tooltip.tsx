"use client";

import { cloneElement, isValidElement, useId, type ReactElement } from "react";
import { cn } from "@/lib/cn";

type Side = "top" | "bottom" | "left";

type Align = "center" | "start" | "end";

const sides: Record<Side, string> = {
  top: "bottom-full mb-2",
  bottom: "top-full mt-2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
};

/** Horizontal alignment for top/bottom tooltips; use start/end for triggers near an edge. */
const aligns: Record<Align, string> = {
  center: "left-1/2 -translate-x-1/2",
  start: "left-0",
  end: "right-0",
};

/**
 * Lightweight CSS tooltip: appears after a short hover delay, or immediately
 * on keyboard focus. The label is linked to the trigger via aria-describedby.
 *
 * Use it from client components: children passed in from a server component
 * arrive as lazy references in development and can't be cloned.
 */
export function Tooltip({
  label,
  side = "top",
  align = "center",
  children,
  className,
}: {
  label: string;
  side?: Side;
  align?: Align;
  children: ReactElement<{ "aria-describedby"?: string }>;
  className?: string;
}) {
  const id = useId();
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {isValidElement(children) ? cloneElement(children, { "aria-describedby": id }) : children}
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute z-50 w-max max-w-60 rounded-chip border border-line-strong bg-surface-3 px-2.5 py-1.5 text-xs leading-snug text-fg opacity-0 shadow-float transition-opacity duration-150",
          "group-hover/tt:opacity-100 group-hover/tt:delay-500 group-has-[:focus-visible]/tt:opacity-100 group-has-[:focus-visible]/tt:delay-0",
          sides[side],
          side !== "left" && aligns[align],
        )}
      >
        {label}
      </span>
    </span>
  );
}
