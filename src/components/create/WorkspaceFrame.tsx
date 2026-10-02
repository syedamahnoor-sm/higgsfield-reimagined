import type { ReactNode } from "react";
import { ModeSwitch } from "./ModeSwitch";

/**
 * Shared layout for the Image and Video workspaces: a slim toolbar with the
 * mode switch, and a canvas that takes all remaining space. Later stages fill
 * the canvas, dock the composer and add the session filmstrip.
 */
export function WorkspaceFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:h-dvh">
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
        <ModeSwitch />
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
