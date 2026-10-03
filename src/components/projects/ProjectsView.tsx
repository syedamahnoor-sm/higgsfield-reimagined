"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AudioLines, Clapperboard, FolderOpen, ImageIcon, MoreHorizontal, PencilLine, Plus, StickyNote, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { MediaImage } from "@/components/media/MediaImage";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem, Popover } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { projectCovers, projectSummary, summaryLabel } from "@/lib/projects";
import type { Project } from "@/lib/types";
import { useHydrated } from "@/store/hydration";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";
import { DeleteProjectDialog, ProjectFormDialog, timeAgo } from "./ProjectDialogs";

/** All projects, newest activity first, with a clear way to start one. */
export function ProjectsView() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const projects = useStudio(useShallow((s) => Object.values(s.projects)));
  const createProject = useStudio((s) => s.createProject);
  const sorted = useMemo(() => [...projects].sort((a, b) => b.updatedAt - a.updatedAt), [projects]);
  // /projects?new=1 (from the command palette) opens the New project dialog.
  const [creating, setCreating] = useState(params.get("new") === "1");

  const create = (values: { name: string; description: string }) => {
    const project = createProject(values);
    setCreating(false);
    router.push(`/projects/${project.id}`);
  };

  if (!hydrated) return <div className="min-h-[50dvh]" aria-busy="true" />;

  return (
    <>
      {sorted.length === 0 ? (
        <ProjectsEmpty onCreate={() => setCreating(true)} />
      ) : (
        <>
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">
              {sorted.length} {sorted.length === 1 ? "project" : "projects"}
            </p>
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" className="size-4" />
              New project
            </Button>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {sorted.map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        </>
      )}
      <ProjectFormDialog
        open={creating}
        onClose={() => {
          setCreating(false);
          if (params.get("new")) router.replace("/projects");
        }}
        onSubmit={create}
      />
    </>
  );
}

function ProjectsEmpty({ onCreate }: { onCreate: () => void }) {
  const steps = [
    { icon: ImageIcon, label: "Generate or add images and Elements" },
    { icon: Clapperboard, label: "Animate them into video" },
    { icon: AudioLines, label: "Give the work a voice" },
    { icon: StickyNote, label: "Arrange it all on a Board" },
  ];
  return (
    <div className="flex min-h-[55dvh] flex-1 flex-col items-center justify-center rounded-panel border border-dashed border-line px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-panel border border-line bg-surface-2 text-fg-muted">
        <FolderOpen aria-hidden="true" strokeWidth={1.5} className="size-5" />
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-fg">Keep each idea together</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-fg-muted">
        A project holds one creative direction, like a campaign or a story. Your media stays in the Library; the project just gathers it.
      </p>
      <ol className="mt-7 grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.label} className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface-1 px-3 py-4 text-center">
            <s.icon aria-hidden="true" className="size-4 text-accent" />
            <span className="text-xs leading-snug text-fg-muted">
              <span className="font-mono text-fg-subtle">{i + 1}.</span> {s.label}
            </span>
          </li>
        ))}
      </ol>
      <Button variant="primary" className="mt-7" onClick={onCreate}>
        <Plus aria-hidden="true" className="size-4" />
        New project
      </Button>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const assets = useStudio((s) => s.assets);
  const elements = useStudio((s) => s.elements);
  const updateProject = useStudio((s) => s.updateProject);
  const deleteProject = useStudio((s) => s.deleteProject);
  const restoreProject = useStudio((s) => s.restoreProject);
  const covers = projectCovers(project, { assets, elements });
  const summary = projectSummary(project, { assets, elements });
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const notes = project.board.filter((c) => c.type === "note").length;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-panel border border-line bg-surface-1 transition-colors hover:border-line-strong">
      <div className="relative grid aspect-[16/10] grid-cols-3 grid-rows-2 gap-0.5 bg-surface-2">
        {covers.length === 0 ? (
          <div className="col-span-3 row-span-2 grid place-items-center text-fg-subtle">
            <FolderOpen aria-hidden="true" strokeWidth={1.5} className="size-6" />
          </div>
        ) : (
          covers.map((c, i) => (
            <div
              key={c.key}
              className={cn(
                "relative overflow-hidden bg-surface-3",
                covers.length === 1 ? "col-span-3 row-span-2" : i === 0 ? "col-span-2 row-span-2" : covers.length === 2 ? "row-span-2" : "",
              )}
            >
              {c.url && <MediaImage src={c.url} alt="" sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.02]" />}
            </div>
          ))
        )}
      </div>
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-fg">
            <Link href={`/projects/${project.id}`} className="outline-offset-4 after:absolute after:inset-0 after:rounded-panel">
              {project.name}
            </Link>
          </h2>
          <p className="mt-0.5 truncate text-[13px] text-fg-muted">
            {summaryLabel(summary)}
            {notes > 0 && ` · ${notes} ${notes === 1 ? "note" : "notes"}`}
          </p>
          <p className="mt-1 font-mono text-2xs text-fg-subtle">Updated {timeAgo(project.updatedAt)}</p>
        </div>
        <div className="relative z-10">
          <Popover
            label={`${project.name} options`}
            side="bottom"
            align="end"
            width={200}
            trigger={(props) => (
              <IconButton {...props} aria-label={`Options for ${project.name}`} size="sm">
                <MoreHorizontal aria-hidden="true" className="size-4" />
              </IconButton>
            )}
          >
            {(close) => (
              <div className="flex flex-col">
                <MenuItem
                  icon={<PencilLine className="size-4" />}
                  label="Rename…"
                  onSelect={() => {
                    close();
                    setRenaming(true);
                  }}
                />
                <MenuItem
                  icon={<Trash2 className="size-4" />}
                  label="Delete…"
                  hint="Media stays in your Library"
                  onSelect={() => {
                    close();
                    setDeleting(true);
                  }}
                />
              </div>
            )}
          </Popover>
        </div>
      </div>
      <ProjectFormDialog
        open={renaming}
        project={project}
        onClose={() => setRenaming(false)}
        onSubmit={(v) => {
          updateProject(project.id, v);
          setRenaming(false);
        }}
      />
      <DeleteProjectDialog
        project={project}
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          setDeleting(false);
          const removed = deleteProject(project.id);
          if (removed) toast({ message: `Deleted “${removed.name}”`, action: { label: "Undo", onClick: () => restoreProject(removed) } });
        }}
      />
    </article>
  );
}
