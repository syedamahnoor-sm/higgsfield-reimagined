"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, AudioLines, Clapperboard, FolderOpen, GitBranch, ImageIcon, LayoutGrid, MoreHorizontal, PencilLine, Plus, Star, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AssetThumb } from "@/components/media/AssetThumb";
import { MediaImage } from "@/components/media/MediaImage";
import { NodeTile, OpenAssetContext } from "@/components/lineage/Lineage";
import { AssetViewer } from "@/components/library/LibraryView";
import { ButtonLink } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem, Popover } from "@/components/ui/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { chainsFor, kindLabel, relationLabel } from "@/lib/lineage";
import { CREATE_HREF, createInProject, projectSummary, resolveRef, summaryLabel } from "@/lib/projects";
import type { Asset, CreateKind, Project } from "@/lib/types";
import { useHydrated } from "@/store/hydration";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";
import { AddExistingDialog } from "./AddExistingDialog";
import { Board } from "./Board";
import { DeleteProjectDialog, ProjectFormDialog, timeAgo } from "./ProjectDialogs";

type View = "board" | "media";

/** One project as a workspace: quick create, the Board, all media, and how the pieces connect. */
export function ProjectDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const project = useStudio((s) => s.projects[id]);
  if (!hydrated) return <div className="min-h-[60dvh]" aria-busy="true" />;
  if (!project) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <FolderOpen aria-hidden="true" strokeWidth={1.5} className="size-6 text-fg-subtle" />
        <h1 className="mt-4 text-lg font-semibold text-fg">This project isn&apos;t here</h1>
        <p className="mt-1.5 max-w-sm text-sm text-fg-muted">It may have been deleted, or it was made in another browser. Projects are saved on the device they were created on.</p>
        <ButtonLink href="/projects" variant="secondary" className="mt-6">
          <ArrowLeft aria-hidden="true" className="size-4" /> All projects
        </ButtonLink>
      </div>
    );
  }
  return <Workspace project={project} />;
}

function Workspace({ project }: { project: Project }) {
  const router = useRouter();
  const assets = useStudio((s) => s.assets);
  const elements = useStudio((s) => s.elements);
  const updateProject = useStudio((s) => s.updateProject);
  const deleteProject = useStudio((s) => s.deleteProject);
  const restoreProject = useStudio((s) => s.restoreProject);
  const [view, setView] = useState<View>("board");
  const [openId, setOpenId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);

  const summary = projectSummary(project, { assets, elements });
  const projectAssets = useMemo(
    () =>
      project.items
        .map((i) => (i.kind === "asset" ? assets[i.id] : undefined))
        .filter((a): a is Asset => Boolean(a))
        .sort((a, b) => b.createdAt - a.createdAt),
    [project.items, assets],
  );
  const chains = useMemo(() => chainsFor(projectAssets.map((a) => a.id), assets), [projectAssets, assets]);

  const quickCreate = (kind: CreateKind) => {
    createInProject(kind, project.id);
    router.push(CREATE_HREF[kind]);
  };
  const created = new Date(project.createdAt).toLocaleDateString([], { dateStyle: "medium" });

  return (
    <OpenAssetContext.Provider value={setOpenId}>
      <div className="pt-5 pb-10 md:pt-8">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-[13px] text-fg-subtle transition-colors hover:text-fg">
          <ArrowLeft aria-hidden="true" className="size-3.5" /> Projects
        </Link>

        <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] break-words text-fg md:text-[28px]">{project.name}</h1>
            {project.description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-fg-muted">{project.description}</p>}
            <p className="mt-2 font-mono text-2xs text-fg-subtle">
              {summaryLabel(summary)} · Created {created} · Updated {timeAgo(project.updatedAt)}
            </p>
          </div>
          <Popover
            label="Project options"
            side="bottom"
            align="end"
            width={220}
            trigger={(props) => (
              <IconButton {...props} aria-label="Project options" variant="subtle">
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
                  label="Delete project…"
                  hint="Media stays in your Library"
                  onSelect={() => {
                    close();
                    setDeleting(true);
                  }}
                />
              </div>
            )}
          </Popover>
        </header>

        <nav aria-label="Create in this project" className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <QuickCreate icon={ImageIcon} label="Create image" onClick={() => quickCreate("image")} primary />
          <QuickCreate icon={Clapperboard} label="Create video" onClick={() => quickCreate("video")} />
          <QuickCreate icon={AudioLines} label="Create audio" onClick={() => quickCreate("audio")} />
          <QuickCreate icon={Plus} label="Add existing" onClick={() => setAdding(true)} />
        </nav>
        <p className="mt-2 text-xs text-fg-subtle">Anything you create from here is added to this project automatically.</p>

        <div className="mt-8 mb-4 flex items-center justify-between gap-3 border-b border-line">
          <div role="tablist" aria-label="Project view" className="-mb-px flex gap-5">
            {(
              [
                { id: "board", label: "Board", icon: LayoutGrid, count: project.board.length },
                { id: "media", label: "Media", icon: ImageIcon, count: summary.total },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={view === t.id}
                onClick={() => setView(t.id)}
                className={cn(
                  "flex h-10 items-center gap-2 border-b-2 text-sm font-medium transition-colors",
                  view === t.id ? "border-accent text-fg" : "border-transparent text-fg-subtle hover:text-fg-muted",
                )}
              >
                <t.icon aria-hidden="true" className="size-4" />
                {t.label}
                <span className="font-mono text-2xs text-fg-subtle">{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div role="tabpanel">
          {view === "board" ? (
            <Board project={project} onInspect={setOpenId} onAddExisting={() => setAdding(true)} />
          ) : (
            <MediaGrid project={project} onOpen={setOpenId} onAddExisting={() => setAdding(true)} />
          )}
        </div>

        {chains.length > 0 && (
          <section aria-labelledby="lineage-title" className="mt-12">
            <h2 id="lineage-title" className="flex items-center gap-2 text-base font-semibold text-fg">
              <GitBranch aria-hidden="true" className="size-4 text-accent" /> How it came together
            </h2>
            <p className="mt-1 text-[13px] text-fg-muted">Each row follows one piece of work back to where it started. Select any step to open it.</p>
            <ul className="mt-4 flex flex-col gap-3">
              {chains.map(({ path, leaves }) => (
                <li key={leaves[0].id} className="overflow-x-auto rounded-card border border-line bg-surface-1 p-3">
                  <ol className="flex w-max items-center gap-1.5">
                    {path.map((a, i) => (
                      <li key={a.id} className="flex items-center gap-1.5">
                        {i > 0 && <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-fg-subtle" />}
                        <NodeTile node={{ type: "asset", asset: a }} caption={i === 0 ? "Original" : relationLabel(a)} />
                      </li>
                    ))}
                    <li className="flex items-center gap-1.5">
                      <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-fg-subtle" />
                      {/* Several results from the same step (e.g. voice takes) sit side by side. */}
                      <ul className="flex gap-1.5" aria-label={leaves.length > 1 ? `${leaves.length} results from this step` : undefined}>
                        {leaves.map((a) => (
                          <li key={a.id}>
                            <NodeTile node={{ type: "asset", asset: a }} caption={relationLabel(a)} />
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ol>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <AssetViewer assets={projectAssets} openId={openId} onOpenChange={setOpenId} />
      <AddExistingDialog project={project} open={adding} onClose={() => setAdding(false)} />
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
          router.push("/projects");
          const removed = deleteProject(project.id);
          if (removed) toast({ message: `Deleted “${removed.name}”`, action: { label: "Undo", onClick: () => restoreProject(removed) } });
        }}
      />
    </OpenAssetContext.Provider>
  );
}

function QuickCreate({ icon: Icon, label, onClick, primary }: { icon: typeof ImageIcon; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-card px-4 text-[13px] font-medium transition-colors",
        primary ? "bg-accent font-semibold text-accent-fg hover:bg-accent-hover" : "border border-line-strong bg-surface-2 text-fg hover:border-white/20 hover:bg-surface-3",
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}

/** Every item in the project, newest first, with project-level actions (cover, Board, remove). */
function MediaGrid({ project, onOpen, onAddExisting }: { project: Project; onOpen: (id: string) => void; onAddExisting: () => void }) {
  const assets = useStudio((s) => s.assets);
  const elements = useStudio((s) => s.elements);
  const updateProject = useStudio((s) => s.updateProject);
  const removeFromProject = useStudio((s) => s.removeFromProject);
  const addBoardCard = useStudio((s) => s.addBoardCard);
  const items = [...project.items].sort((a, b) => b.addedAt - a.addedAt).map((i) => ({ item: i, resolved: resolveRef({ assets, elements }, i) }));
  const present = items.filter((x) => x.resolved);

  if (present.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-panel border border-dashed border-line px-6 py-14 text-center">
        <ImageIcon aria-hidden="true" strokeWidth={1.5} className="size-6 text-fg-subtle" />
        <h3 className="mt-4 text-base font-medium text-fg">No media in this project yet</h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">Create an image, video or voice from the buttons above, or bring in work you already made.</p>
        <button type="button" onClick={onAddExisting} className="mt-5 flex h-9 items-center gap-2 rounded-card border border-line-strong bg-surface-2 px-4 text-[13px] font-medium text-fg hover:bg-surface-3">
          <Plus aria-hidden="true" className="size-4" /> Add existing media
        </button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {present.map(({ item, resolved }) => {
        const onBoard = project.board.some((c) => c.type === "ref" && c.ref.kind === item.kind && c.ref.id === item.id);
        const asset = resolved!.kind === "asset" ? resolved!.asset : null;
        const element = resolved!.kind === "element" ? resolved!.element : null;
        const isCover = asset && project.coverAssetId === asset.id;
        const label = asset ? kindLabel(asset) : "Element";
        const title = asset ? asset.settings.prompt || "Untitled" : element!.name;
        return (
          <li key={`${item.kind}-${item.id}`} className="group relative">
            <div className="relative aspect-square overflow-hidden rounded-card bg-surface-2 ring-1 ring-line">
              {asset ? <AssetThumb asset={asset} sizes="(min-width: 1024px) 20vw, 45vw" badge /> : <MediaImage src={element!.url} alt="" sizes="(min-width: 1024px) 20vw, 45vw" className="object-cover" />}
              {asset ? (
                <button type="button" onClick={() => onOpen(asset.id)} aria-label={`Open ${label}: ${title}`} className="absolute inset-0 cursor-zoom-in" />
              ) : (
                <span className="sr-only">Element: {title}</span>
              )}
              {isCover && (
                <span className="pointer-events-none absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-2xs font-medium text-white backdrop-blur-md">
                  <Star aria-hidden="true" className="size-3 fill-current text-accent" /> Cover
                </span>
              )}
              <div className="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                <Popover
                  label="Item options"
                  side="bottom"
                  align="end"
                  width={220}
                  trigger={(props) => (
                    <IconButton {...props} aria-label={`Options for ${title}`} variant="glass" size="sm">
                      <MoreHorizontal aria-hidden="true" className="size-4" />
                    </IconButton>
                  )}
                >
                  {(close) => (
                    <div className="flex flex-col" onClick={close}>
                      {!onBoard && <MenuItem icon={<LayoutGrid className="size-4" />} label="Add to Board" onSelect={() => addBoardCard(project.id, { id: `card-${item.id}`, type: "ref", ref: { kind: item.kind, id: item.id } })} />}
                      {asset && asset.kind !== "audio" && !isCover && (
                        <MenuItem icon={<Star className="size-4" />} label="Use as project cover" onSelect={() => updateProject(project.id, { coverAssetId: asset.id })} />
                      )}
                      <MenuItem
                        icon={<X className="size-4" />}
                        label="Remove from project"
                        hint="Stays in your Library"
                        onSelect={() => {
                          const before = useStudio.getState().projects[project.id];
                          removeFromProject(project.id, { kind: item.kind, id: item.id });
                          toast({ message: "Removed from this project", action: before ? { label: "Undo", onClick: () => useStudio.getState().restoreProject(before) } : undefined });
                        }}
                      />
                    </div>
                  )}
                </Popover>
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5">
              <p className="min-w-0 truncate text-[13px] text-fg-muted">{title}</p>
              {!onBoard && (
                <Tooltip label="Not on the Board" align="end">
                  <span tabIndex={0} className="shrink-0 font-mono text-2xs text-fg-subtle">
                    off board
                  </span>
                </Tooltip>
              )}
            </div>
            <p className="px-0.5 font-mono text-2xs text-fg-subtle">{label}</p>
          </li>
        );
      })}
    </ul>
  );
}
