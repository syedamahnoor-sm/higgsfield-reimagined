import { cn } from "@/lib/cn";
import type { MotionPreset } from "@/lib/types";

const ANIMATIONS: Record<MotionPreset, string> = {
  "push-in": "animate-[glyph-push-in_2.4s_ease-in-out_infinite]",
  "pull-out": "animate-[glyph-pull-out_2.4s_ease-in-out_infinite]",
  pan: "animate-[glyph-pan_2.4s_ease-in-out_infinite]",
  orbit: "animate-[glyph-orbit_2.8s_ease-in-out_infinite]",
  drift: "animate-[glyph-drift_3.2s_ease-in-out_infinite]",
  handheld: "animate-[glyph-handheld_1.6s_ease-in-out_infinite]",
};

/** A tiny animated frame showing the direction of a camera-motion preset. Static under reduced motion. */
export function MotionGlyph({ preset, className }: { preset: MotionPreset; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("grid size-4 place-items-center overflow-hidden rounded-[3px] border-[1.5px] border-current", className)}>
      <span className={cn("block size-2 rounded-[1.5px] bg-current", ANIMATIONS[preset])} />
    </span>
  );
}
