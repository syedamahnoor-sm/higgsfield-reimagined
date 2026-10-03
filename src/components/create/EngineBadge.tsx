"use client";

import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/ui/Tooltip";
import { getEngine } from "@/lib/generation";

/** Always-visible, honest indicator of what is producing results in the current mode. */
export function EngineBadge() {
  const pathname = usePathname();
  const engine = getEngine(pathname.startsWith("/create/video") ? "video" : "image");
  return (
    <Tooltip label={engine.description} side="bottom" align="end">
      <span
        tabIndex={0}
        className="flex h-8 items-center gap-2 rounded-full border border-line px-3 font-mono text-2xs whitespace-nowrap text-fg-muted"
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-400/80" />
        <span className="hidden sm:inline">Engine:</span> {engine.label}
      </span>
    </Tooltip>
  );
}
