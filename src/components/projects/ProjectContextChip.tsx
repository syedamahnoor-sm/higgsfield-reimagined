"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import type { CreateKind } from "@/lib/types";
import { useHydrated } from "@/store/hydration";
import { useStudio } from "@/store/studio";

function kindFor(pathname: string): CreateKind {
  if (pathname.startsWith("/create/video")) return "video";
  if (pathname.startsWith("/create/audio")) return "audio";
  return "image";
}

/**
 * Shows which project new results in this workspace join, with a way out.
 * Set by Quick Create in a project, or by handoffs (Animate, Create voiceover)
 * from media that belongs to a project.
 */
export function ProjectContextChip() {
  const hydrated = useHydrated();
  const kind = kindFor(usePathname());
  const project = useStudio((s) => {
    const id = s.projectContext[kind];
    return id ? s.projects[id] : undefined;
  });
  const clear = useStudio((s) => s.setProjectContext);
  if (!hydrated || !project) return null;
  return (
    <div className="flex h-8 min-w-0 items-center rounded-full border border-accent/30 bg-accent-soft pr-1 pl-3 text-[13px]">
      <Tooltip label="New results here are added to this project" side="bottom">
        <Link href={`/projects/${project.id}`} className="flex min-w-0 items-center gap-1.5 font-medium text-fg">
          <FolderOpen aria-hidden="true" className="size-3.5 shrink-0 text-accent" />
          <span className="hidden text-fg-muted sm:inline">Project:</span>
          <span className="max-w-[9rem] truncate sm:max-w-[14rem]">{project.name}</span>
        </Link>
      </Tooltip>
      <Tooltip label="Stop adding new results to this project" side="bottom" align="end">
        <button
          type="button"
          aria-label={`Stop adding results to ${project.name}`}
          onClick={() => clear(kind, undefined)}
          className="ml-1 grid size-6 place-items-center rounded-full text-fg-muted transition-colors hover:bg-white/10 hover:text-fg"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </Tooltip>
    </div>
  );
}
