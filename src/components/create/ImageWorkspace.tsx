"use client";

import { useRef } from "react";
import { useElementSize } from "@/lib/useElementSize";
import { useHydrated } from "@/store/hydration";
import { useSession } from "@/store/session";
import { useStudio } from "@/store/studio";
import { Filmstrip } from "./Filmstrip";
import { ImageComposer } from "./ImageComposer";
import { InspirationStage } from "./InspirationStage";
import { ResultStage } from "./ResultStage";

/**
 * Image workspace: the canvas (examples before the first generation, the
 * result afterwards), a docked composer that floats over it, and the session
 * filmstrip. The canvas reserves room for the composer so media is never
 * hidden behind it.
 */
export function ImageWorkspace() {
  const hydrated = useHydrated();
  const activeJobId = useSession((s) => s.sessions.image.activeJobId);
  const activeJob = useStudio((s) => (activeJobId ? s.jobs[activeJobId] : undefined));
  const composerRef = useRef<HTMLDivElement>(null);
  const composer = useElementSize(composerRef);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="relative flex min-w-0 flex-1 flex-col">
        {hydrated && <Filmstrip orientation="horizontal" className="lg:hidden" />}

        {/* Out of flow so media size can never push the layout; inset above the composer. */}
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-x-0 top-0" style={{ bottom: composer.height + 12 }}>
            {hydrated && (activeJob ? <ResultStage key={activeJob.id} job={activeJob} /> : <InspirationStage />)}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-2 pb-2 sm:px-4 sm:pb-4">
          <div ref={composerRef}>
            <ImageComposer />
          </div>
        </div>
      </div>

      {hydrated && <Filmstrip orientation="vertical" className="hidden lg:flex" />}
    </div>
  );
}
