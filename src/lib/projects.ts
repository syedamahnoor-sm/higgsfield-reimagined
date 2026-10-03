import type { Asset, CreateKind, CreativeElement, Project, ProjectRef } from "@/lib/types";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";

/**
 * Projects group existing media by reference. These helpers read the studio
 * store; nothing here copies media.
 */

type StudioData = { assets: Record<string, Asset>; elements: Record<string, CreativeElement>; projects: Record<string, Project> };

export type ResolvedRef = { kind: "asset"; asset: Asset } | { kind: "element"; element: CreativeElement };

export function resolveRef(state: Pick<StudioData, "assets" | "elements">, ref: ProjectRef): ResolvedRef | null {
  if (ref.kind === "asset") {
    const asset = state.assets[ref.id];
    return asset ? { kind: "asset", asset } : null;
  }
  const element = state.elements[ref.id];
  return element ? { kind: "element", element } : null;
}

/** Projects that hold this asset or Element, most recently updated first. */
export function projectsContaining(projects: Record<string, Project>, ref: ProjectRef) {
  return Object.values(projects)
    .filter((p) => p.items.some((i) => i.kind === ref.kind && i.id === ref.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** The project a follow-up of this asset (edit, animation, voiceover) should join, if any. */
export function projectForAsset(assetId: string) {
  return projectsContaining(useStudio.getState().projects, { kind: "asset", id: assetId })[0]?.id;
}

export interface ProjectSummary {
  images: number;
  videos: number;
  audio: number;
  elements: number;
  total: number;
}

export function projectSummary(project: Project, state: Pick<StudioData, "assets" | "elements">): ProjectSummary {
  const summary: ProjectSummary = { images: 0, videos: 0, audio: 0, elements: 0, total: 0 };
  for (const item of project.items) {
    const resolved = resolveRef(state, item);
    if (!resolved) continue;
    summary.total++;
    if (resolved.kind === "element") summary.elements++;
    else if (resolved.asset.kind === "video") summary.videos++;
    else if (resolved.asset.kind === "audio") summary.audio++;
    else summary.images++;
  }
  return summary;
}

/** "3 images · 1 video · 1 voice". */
export function summaryLabel(summary: ProjectSummary) {
  const parts: string[] = [];
  const add = (n: number, one: string, many: string) => n > 0 && parts.push(`${n} ${n === 1 ? one : many}`);
  add(summary.images, "image", "images");
  add(summary.videos, "video", "videos");
  add(summary.audio, "voice", "voices");
  add(summary.elements, "Element", "Elements");
  return parts.join(" · ") || "Empty";
}

/** Visuals for a project's cover: the chosen cover first, then the newest visual media. */
export function projectCovers(project: Project, state: Pick<StudioData, "assets" | "elements">, max = 3) {
  const visuals: { key: string; url: string; video: boolean }[] = [];
  const chosen = project.coverAssetId ? state.assets[project.coverAssetId] : undefined;
  if (chosen && chosen.kind !== "audio") visuals.push(coverOf(chosen));
  const newest = [...project.items].sort((a, b) => b.addedAt - a.addedAt);
  for (const item of newest) {
    if (visuals.length >= max) break;
    const resolved = resolveRef(state, item);
    if (!resolved) continue;
    if (resolved.kind === "element") {
      if (!visuals.some((v) => v.key === resolved.element.id)) visuals.push({ key: resolved.element.id, url: resolved.element.url, video: false });
    } else if (resolved.asset.kind !== "audio" && !visuals.some((v) => v.key === resolved.asset.id)) {
      visuals.push(coverOf(resolved.asset));
    }
  }
  return visuals;
}

function coverOf(asset: Asset) {
  // Motion clips store their still in `url`; AI videos are files, shown via their source image when available.
  if (asset.renderer === "file") {
    const ref = asset.settings.reference;
    return { key: asset.id, url: ref?.source === "asset" ? ref.url : (asset.posterUrl ?? ""), video: true };
  }
  return { key: asset.id, url: asset.url, video: asset.kind === "video" };
}

/** Adds media to a project with a confirming toast (and Undo). */
export function addRefsToProject(projectId: string, refs: ProjectRef[]) {
  const { projects, addToProject, restoreProject } = useStudio.getState();
  const before = projects[projectId];
  if (!before) return;
  addToProject(projectId, refs);
  toast({
    message: `Added to “${before.name}”`,
    action: { label: "Undo", onClick: () => restoreProject(before) },
  });
}

/** Creates a project from an assignment flow and adds the media to it. */
export function createProjectWith(name: string, refs: ProjectRef[]) {
  const project = useStudio.getState().createProject({ name });
  if (refs.length) useStudio.getState().addToProject(project.id, refs);
  toast({ message: refs.length ? `Created “${project.name}” and added this to it` : `Created “${project.name}”` });
  return project;
}

/** Quick Create from a project: new results in that workspace join the project. */
export function createInProject(kind: CreateKind, projectId: string) {
  useStudio.getState().setProjectContext(kind, projectId);
}

export const CREATE_HREF: Record<CreateKind, string> = { image: "/create/image", video: "/create/video", audio: "/create/audio" };
