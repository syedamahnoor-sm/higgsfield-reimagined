"use client";

import { useRef } from "react";
import { useElementSize } from "@/lib/useElementSize";
import { useHydrated } from "@/store/hydration";
import { Filmstrip } from "../Filmstrip";
import { VideoComposer } from "./VideoComposer";
import { VideoStage } from "./VideoStage";

/** Video workspace: same structure as Image (canvas, docked composer, session filmstrip). */
export function VideoWorkspace() {
  const hydrated = useHydrated();
  const composerRef = useRef<HTMLDivElement>(null);
  const composer = useElementSize(composerRef);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="relative flex min-w-0 flex-1 flex-col">
        {hydrated && <Filmstrip mode="video" orientation="horizontal" className="lg:hidden" />}

        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-x-0 top-0" style={{ bottom: composer.height + 12 }}>
            {hydrated && <VideoStage />}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-2 pb-2 sm:px-4 sm:pb-4">
          <div ref={composerRef}>
            <VideoComposer />
          </div>
        </div>
      </div>

      {hydrated && <Filmstrip mode="video" orientation="vertical" className="hidden lg:flex" />}
    </div>
  );
}
