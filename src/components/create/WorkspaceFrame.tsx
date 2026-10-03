import type { ReactNode } from "react";
import { ProjectContextChip } from "@/components/projects/ProjectContextChip";
import { EngineBadge } from "./EngineBadge";
import { ModeSwitch } from "./ModeSwitch";

/**
 * Shared layout for the Image, Video and Audio workspaces: a slim toolbar
 * with the mode switch (and the active project, when there is one), and a
 * canvas that takes all remaining space.
 */
export function WorkspaceFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:h-dvh">
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6 md:py-0">
        <ModeSwitch />
        <div className="flex min-w-0 items-center gap-2">
          <ProjectContextChip />
          <EngineBadge />
        </div>
      </div>
      <div className="flex min-h-[60dvh] flex-1 px-2 pb-2 sm:px-3 sm:pb-3 md:min-h-0">
        <section
          aria-label="Canvas"
          className="relative flex flex-1 overflow-hidden rounded-panel border border-line bg-surface-1"
        >
          {children}
        </section>
      </div>
    </div>
  );
}
