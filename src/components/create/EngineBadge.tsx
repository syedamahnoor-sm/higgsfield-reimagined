"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { getEngine } from "@/lib/generation";
import { checkAiAvailability } from "@/lib/generation/ai-engine";
import { localEngine } from "@/lib/generation/local-engine";
import { effectiveVideoEngine, useAiVideoAvailable } from "./video/VideoComposer";
import { useStudio } from "@/store/studio";

const AUDIO_ENGINE = {
  label: "AI voice",
  description:
    "Voice and Transcribe use speech models hosted by Cloudflare Workers AI. Your script or audio file is sent to our audio service.",
};

/** Always-visible, honest indicator of what is producing results in the current mode. */
export function EngineBadge() {
  const pathname = usePathname();
  const video = pathname.startsWith("/create/video");
  const audio = pathname.startsWith("/create/audio");
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
  const videoDraft = useStudio((s) => s.drafts.video);
  const aiVideoAvailable = useAiVideoAvailable();
  // Video: the engine the current draft will really use (AI video, or Motion Preview).
  const engine = audio
    ? AUDIO_ENGINE
    : video
    ? getEngine("video", { videoEngine: effectiveVideoEngine(videoDraft, aiVideoAvailable) })
    : aiAvailable === false
      ? localEngine
      : getEngine("image");
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
