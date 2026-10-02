"use client";

import Image from "next/image";
import { Clapperboard, X } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useReferenceUrl } from "@/lib/media/useReferenceUrl";
import { useHydrated } from "@/store/hydration";
import { useStudio } from "@/store/studio";

/**
 * Placeholder for the Video workspace. It already receives the Animate
 * handoff from Image so the connection can be verified; motion controls
 * arrive with the Video stage.
 */
export function VideoHandoff() {
  const hydrated = useHydrated();
  const draft = useStudio((s) => s.drafts.video);
  const updateDraft = useStudio((s) => s.updateDraft);
  const url = useReferenceUrl(draft.reference);

  if (!hydrated) return null;

  if (!draft.reference) {
    return (
      <EmptyState
        icon={Clapperboard}
        className="flex-1"
        title="Video workspace"
        description="Bring an image to life with a camera motion preset, duration and aspect ratio. Use Animate on any image result to start here."
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="relative">
        <div className="relative h-[min(46dvh,420px)] overflow-hidden rounded-card ring-1 ring-line-strong" style={{ aspectRatio: `${draft.reference.width} / ${draft.reference.height}` }}>
          {url && <Image src={url} alt="Image ready to animate" fill sizes="600px" unoptimized={url.startsWith("blob:")} className="object-cover" />}
        </div>
        <div className="absolute top-2 right-2">
          <Tooltip label="Clear this image" side="bottom">
            <IconButton aria-label="Clear image" variant="glass" size="sm" onClick={() => updateDraft("video", { reference: undefined })}>
              <X aria-hidden="true" className="size-4" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
      <div>
        <p className="font-mono text-2xs tracking-[0.14em] text-accent uppercase">Ready to animate</p>
        <p className="mt-2 max-w-md text-sm text-fg-muted">
          This image is the source for your next clip. Motion presets, duration and generation are the next step for this workspace.
        </p>
      </div>
    </div>
  );
}
