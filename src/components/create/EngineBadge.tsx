"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { getEngine } from "@/lib/generation";
import { checkAiAvailability } from "@/lib/generation/ai-engine";
import { localEngine } from "@/lib/generation/local-engine";

/** Always-visible, honest indicator of what is producing results in the current mode. */
export function EngineBadge() {
  const pathname = usePathname();
  const video = pathname.startsWith("/create/video");
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void checkAiAvailability().then((ok) => {
      if (alive) setAiAvailable(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  // If AI generation isn't configured, Image results come from the local preview engine: say so.
  const engine = video ? getEngine("video") : aiAvailable === false ? localEngine : getEngine("image");
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
