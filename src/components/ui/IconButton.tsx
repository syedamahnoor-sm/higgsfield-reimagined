import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "ghost" | "glass" | "subtle";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  ghost: "text-fg-muted hover:bg-surface-3 hover:text-fg",
  subtle: "border border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg",
  // For use on top of media.
  glass: "bg-black/45 text-white/90 backdrop-blur-md hover:bg-black/65 hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "size-8 rounded-chip",
  md: "size-9 rounded-card",
};

export const IconButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & { "aria-label": string; variant?: Variant; size?: Size }
>(function IconButton({ variant = "ghost", size = "md", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-[background-color,color,border-color,transform] duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
