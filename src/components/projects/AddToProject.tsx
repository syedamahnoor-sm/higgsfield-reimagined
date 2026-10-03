"use client";

import Link from "next/link";
import { Check, FolderPlus, Plus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { Popover } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { addRefsToProject, createProjectWith } from "@/lib/projects";
import type { ProjectRef } from "@/lib/types";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";

/**
 * Choose which projects hold this media. Toggling adds or removes a
 * reference; the media itself stays in the Library either way.
 */
export function AddToProjectPanel({ refs, onDone }: { refs: ProjectRef[]; onDone?: () => void }) {
  const projects = useStudio(useShallow((s) => Object.values(s.projects)));
  const sorted = useMemo(() => [...projects].sort((a, b) => b.updatedAt - a.updatedAt), [projects]);
  const [creating, setCreating] = useState(projects.length === 0);
  const [name, setName] = useState("");
  const has = (projectId: string) => {
    const p = useStudio.getState().projects[projectId];
    return refs.every((r) => p?.items.some((i) => i.kind === r.kind && i.id === r.id));
  };

  return (
    <div className="flex flex-col gap-1 p-1">
      <p className="px-1.5 pt-0.5 pb-1 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Add to project</p>
      {sorted.length > 0 && (
        <ul className="flex max-h-56 flex-col overflow-y-auto" aria-label="Projects">
          {sorted.map((p) => {
            const inside = has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={inside}
                  onClick={() => {
                    if (inside) {
                      const before = useStudio.getState().projects[p.id];
                      for (const r of refs) useStudio.getState().removeFromProject(p.id, r);
                      toast({ message: `Removed from “${p.name}”`, action: { label: "Undo", onClick: () => useStudio.getState().restoreProject(before) } });
                    } else {
                      addRefsToProject(p.id, refs);
                    }
                  }}
                  className="flex w-full items-center gap-2.5 rounded-chip px-2.5 py-2 text-left text-[13px] text-fg outline-offset-[-2px] transition-colors hover:bg-surface-3 focus-visible:bg-surface-3"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors",
                      inside ? "border-accent bg-accent text-accent-fg" : "border-line-strong",
                    )}
                  >
                    {inside && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                  <span className="font-mono text-2xs text-fg-subtle">{p.items.length}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {creating ? (
        <form
          className="mt-1 flex gap-1.5 border-t border-line px-0.5 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createProjectWith(name, refs);
            setName("");
            setCreating(false);
            onDone?.();
          }}
        >
          <label htmlFor="new-project-name" className="sr-only">
            New project name
          </label>
          <input
            id="new-project-name"
            autoFocus
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name"
            className="h-9 min-w-0 flex-1 rounded-chip border border-line bg-surface-1 px-2.5 text-[13px] text-fg placeholder:text-fg-subtle focus:border-white/20 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="h-9 shrink-0 rounded-chip bg-accent px-3 text-[13px] font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-40"
          >
            Create
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-1 flex items-center gap-2.5 rounded-chip border-t border-line px-2.5 pt-2.5 pb-2 text-left text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <Plus aria-hidden="true" className="size-4" />
          New project…
        </button>
      )}
    </div>
  );
}

/** Popover wrapper around the panel, for buttons in details panels, result bars and cards. */
export function AddToProjectPopover({
  refs,
  side = "bottom",
  align = "start",
  trigger,
}: {
  refs: ProjectRef[];
  side?: "top" | "bottom";
  align?: "start" | "end";
  trigger?: Parameters<typeof Popover>[0]["trigger"];
}) {
  return (
    <Popover
      label="Add to project"
      side={side}
      align={align}
      width={280}
      trigger={
        trigger ??
        ((props) => (
          <button
            type="button"
            {...props}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-card border border-line-strong bg-surface-2 px-3 text-[13px] font-medium text-fg transition-colors duration-150 hover:border-white/20 hover:bg-surface-3"
          >
            <FolderPlus aria-hidden="true" className="size-4" />
            Add to project
          </button>
        ))
      }
    >
      {(close) => <AddToProjectPanel refs={refs} onDone={close} />}
    </Popover>
  );
}

/** Small "In: Winter Tea, Launch" line with links, for details panels. */
export function ProjectChips({ refItem, children }: { refItem: ProjectRef; children?: ReactNode }) {
  const projects = useStudio(
    useShallow((s) => Object.values(s.projects).filter((p) => p.items.some((i) => i.kind === refItem.kind && i.id === refItem.id))),
  );
  if (!projects.length) return <>{children}</>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[13px] text-fg-subtle">In</span>
      {projects.map((p) => (
        <Link
          key={p.id}
          href={`/projects/${p.id}`}
          className="inline-flex h-7 max-w-full items-center gap-1.5 truncate rounded-full border border-line-strong bg-surface-2 px-2.5 text-xs font-medium text-fg-muted transition-colors hover:border-white/20 hover:text-fg"
        >
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
          {p.name}
        </Link>
      ))}
      {children}
    </div>
  );
}
