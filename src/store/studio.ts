import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createId } from "@/lib/id";
import { DEFAULT_VOICE } from "@/lib/voices";
import type {
  Asset,
  BoardCard,
  CreateKind,
  CreativeElement,
  GenSettings,
  Job,
  Mode,
  Project,
  ProjectRef,
  UploadRecord,
  VoiceSettings,
} from "@/lib/types";

export const DEFAULT_DRAFTS: Record<Mode, GenSettings> = {
  image: { mode: "image", prompt: "", intent: "auto", aspect: "1:1", count: 2, direction: "auto", look: "none", quality: "standard" },
  video: {
    mode: "video",
    prompt: "",
    intent: "auto",
    aspect: "16:9",
    count: 1,
    motion: "push-in",
    duration: 5,
    videoEngine: "ai",
    resolution: "480p",
    camera: "push-in",
  },
};

interface StudioState {
  drafts: Record<Mode, GenSettings>;
  /** Where each draft was remixed or animated from, carried onto the next job. */
  draftParents: Partial<Record<Mode, string>>;
  jobs: Record<string, Job>;
  assets: Record<string, Asset>;
  /** Reusable saved references. */
  elements: Record<string, CreativeElement>;
  /** Reference images uploaded from the device, newest first. */
  uploads: UploadRecord[];

  updateDraft: (mode: Mode, patch: Partial<GenSettings>) => void;
  setDraft: (mode: Mode, settings: GenSettings, parentId?: string) => void;
  addJob: (job: Job) => void;
  patchJob: (id: string, patch: Partial<Job>) => void;
  completeJob: (id: string, patch: Partial<Job>, assets: Asset[]) => void;
  toggleFavorite: (assetId: string) => void;
  saveElement: (element: CreativeElement) => void;
  removeElement: (id: string) => void;
  addUpload: (upload: UploadRecord) => void;

  /** Voice draft: survives navigation and reloads like the image and video drafts. */
  voiceDraft: VoiceSettings;
  /** Asset the voiceover is for (e.g. a video), carried onto the generated audio. */
  voiceParent?: string;
  updateVoiceDraft: (patch: Partial<VoiceSettings>) => void;
  setVoiceParent: (assetId: string | undefined) => void;
  /** Adds finished media that wasn't produced by a Job (voice audio), optionally into a project. */
  addAsset: (asset: Asset, projectId?: string) => void;

  projects: Record<string, Project>;
  /** Project that new results from each Create workspace join (set by Quick Create and handoffs). */
  projectContext: Partial<Record<CreateKind, string>>;
  setProjectContext: (kind: CreateKind, projectId: string | undefined) => void;
  createProject: (input: { name: string; description?: string }) => Project;
  updateProject: (id: string, patch: Partial<Pick<Project, "name" | "description" | "coverAssetId">>) => void;
  /** Removes the project only; the media it references stays in the Library. */
  deleteProject: (id: string) => Project | undefined;
  restoreProject: (project: Project) => void;
  /** Adds references (never copies of media) and places them on the Board. */
  addToProject: (projectId: string, refs: ProjectRef[]) => void;
  removeFromProject: (projectId: string, ref: ProjectRef) => void;
  addBoardCard: (projectId: string, card: BoardCard) => void;
  updateBoardNote: (projectId: string, cardId: string, patch: { title?: string; text?: string }) => void;
  removeBoardCard: (projectId: string, cardId: string) => void;
  moveBoardCard: (projectId: string, cardId: string, toIndex: number) => void;
}

export const sameRef = (a: ProjectRef, b: ProjectRef) => a.kind === b.kind && a.id === b.id;

/** A project with these refs added (once each) and placed on its Board. */
function withRefs(project: Project, refs: ProjectRef[]): Project {
  const now = Date.now();
  const items = [...project.items];
  const board = [...project.board];
  for (const ref of refs) {
    if (!items.some((i) => sameRef(i, ref))) items.push({ kind: ref.kind, id: ref.id, addedAt: now });
    if (!board.some((c) => c.type === "ref" && sameRef(c.ref, ref))) {
      board.push({ id: createId("card"), type: "ref", ref: { kind: ref.kind, id: ref.id } });
    }
  }
  return { ...project, items, board, updatedAt: now };
}

/**
 * Durable studio data: drafts, jobs, generated assets, Elements and Projects.
 * Persisted to localStorage so the Library survives refreshes. Media bytes
 * (uploads and generated files) live in IndexedDB (see lib/media/uploads);
 * this store only keeps ids and stable media URLs, and Projects only keep
 * references, so nothing large is ever duplicated.
 */
export const useStudio = create<StudioState>()(
  persist(
    (set) => {
      /** Applies `fn` to one project, if it exists. */
      const updateProjectWith = (id: string, fn: (p: Project) => Project) =>
        set((s) => (s.projects[id] ? { projects: { ...s.projects, [id]: fn(s.projects[id]) } } : s));

      return {
        drafts: DEFAULT_DRAFTS,
        draftParents: {},
        jobs: {},
        assets: {},
        elements: {},
        uploads: [],
        voiceDraft: DEFAULT_VOICE,
        voiceParent: undefined,
        projects: {},
        projectContext: {},

        updateDraft: (mode, patch) =>
          set((s) => ({ drafts: { ...s.drafts, [mode]: { ...s.drafts[mode], ...patch, mode } } })),

        setDraft: (mode, settings, parentId) =>
          set((s) => ({
            drafts: { ...s.drafts, [mode]: { ...settings, mode } },
            draftParents: { ...s.draftParents, [mode]: parentId },
          })),

        addJob: (job) => set((s) => ({ jobs: { ...s.jobs, [job.id]: job } })),

        patchJob: (id, patch) =>
          set((s) => (s.jobs[id] ? { jobs: { ...s.jobs, [id]: { ...s.jobs[id], ...patch } } } : s)),

        completeJob: (id, patch, assets) =>
          set((s) => {
            const job = s.jobs[id];
            if (!job) return s;
            const nextAssets = { ...s.assets };
            for (const a of assets) nextAssets[a.id] = a;
            const project = job.projectId ? s.projects[job.projectId] : undefined;
            return {
              jobs: { ...s.jobs, [id]: { ...job, ...patch, assetIds: assets.map((a) => a.id) } },
              assets: nextAssets,
              ...(project && assets.length
                ? { projects: { ...s.projects, [project.id]: withRefs(project, assets.map((a) => ({ kind: "asset" as const, id: a.id }))) } }
                : {}),
            };
          }),

        saveElement: (element) => set((s) => ({ elements: { ...s.elements, [element.id]: element } })),
        removeElement: (id) =>
          set((s) => {
            const next = { ...s.elements };
            delete next[id];
            return { elements: next };
          }),
        addUpload: (upload) =>
          set((s) => ({ uploads: [upload, ...s.uploads.filter((u) => u.id !== upload.id)].slice(0, 24) })),

        toggleFavorite: (assetId) =>
          set((s) => {
            const asset = s.assets[assetId];
            if (!asset) return s;
            return { assets: { ...s.assets, [assetId]: { ...asset, favorite: !asset.favorite } } };
          }),

        updateVoiceDraft: (patch) => set((s) => ({ voiceDraft: { ...s.voiceDraft, ...patch } })),
        setVoiceParent: (assetId) => set({ voiceParent: assetId }),
        addAsset: (asset, projectId) =>
          set((s) => {
            const project = projectId ? s.projects[projectId] : undefined;
            return {
              assets: { ...s.assets, [asset.id]: asset },
              ...(project ? { projects: { ...s.projects, [project.id]: withRefs(project, [{ kind: "asset", id: asset.id }]) } } : {}),
            };
          }),

        setProjectContext: (kind, projectId) => set((s) => ({ projectContext: { ...s.projectContext, [kind]: projectId } })),

        createProject: ({ name, description }) => {
          const now = Date.now();
          const project: Project = {
            id: createId("proj"),
            name: name.trim().slice(0, 80) || "Untitled project",
            description: description?.trim().slice(0, 280) || undefined,
            items: [],
            board: [],
            createdAt: now,
            updatedAt: now,
          };
          set((s) => ({ projects: { ...s.projects, [project.id]: project } }));
          return project;
        },

        updateProject: (id, patch) =>
          updateProjectWith(id, (p) => ({
            ...p,
            ...patch,
            name: patch.name !== undefined ? patch.name.trim().slice(0, 80) || p.name : p.name,
            description: patch.description !== undefined ? patch.description.trim().slice(0, 280) || undefined : p.description,
            updatedAt: Date.now(),
          })),

        deleteProject: (id) => {
          let removed: Project | undefined;
          set((s) => {
            removed = s.projects[id];
            if (!removed) return s;
            const projects = { ...s.projects };
            delete projects[id];
            const projectContext = Object.fromEntries(Object.entries(s.projectContext).filter(([, v]) => v !== id));
            return { projects, projectContext };
          });
          return removed;
        },

        restoreProject: (project) => set((s) => ({ projects: { ...s.projects, [project.id]: project } })),

        addToProject: (projectId, refs) => updateProjectWith(projectId, (p) => withRefs(p, refs)),

        removeFromProject: (projectId, ref) =>
          updateProjectWith(projectId, (p) => ({
            ...p,
            items: p.items.filter((i) => !sameRef(i, ref)),
            board: p.board.filter((c) => !(c.type === "ref" && sameRef(c.ref, ref))),
            coverAssetId: ref.kind === "asset" && p.coverAssetId === ref.id ? undefined : p.coverAssetId,
            updatedAt: Date.now(),
          })),

        addBoardCard: (projectId, card) =>
          updateProjectWith(projectId, (p) =>
            card.type === "ref" ? withRefs(p, [card.ref]) : { ...p, board: [...p.board, card], updatedAt: Date.now() },
          ),

        updateBoardNote: (projectId, cardId, patch) =>
          updateProjectWith(projectId, (p) => ({
            ...p,
            board: p.board.map((c) => (c.id === cardId && c.type === "note" ? { ...c, ...patch } : c)),
            updatedAt: Date.now(),
          })),

        removeBoardCard: (projectId, cardId) =>
          updateProjectWith(projectId, (p) => ({ ...p, board: p.board.filter((c) => c.id !== cardId), updatedAt: Date.now() })),

        moveBoardCard: (projectId, cardId, toIndex) =>
          updateProjectWith(projectId, (p) => {
            const from = p.board.findIndex((c) => c.id === cardId);
            if (from < 0) return p;
            const board = [...p.board];
            const [card] = board.splice(from, 1);
            board.splice(Math.max(0, Math.min(board.length, toIndex)), 0, card);
            return { ...p, board, updatedAt: Date.now() };
          }),
      };
    },
    {
      name: "ember-studio",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Hydrated manually after mount (see StoreHydrator) to avoid SSR mismatches.
      skipHydration: true,
      partialize: (s) => ({
        drafts: s.drafts,
        draftParents: s.draftParents,
        jobs: s.jobs,
        assets: s.assets,
        elements: s.elements,
        uploads: s.uploads,
        voiceDraft: s.voiceDraft,
        voiceParent: s.voiceParent,
        projects: s.projects,
        projectContext: s.projectContext,
      }),
      // A job can't still be running after a reload: mark it as interrupted.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StudioState>;
        const jobs: Record<string, Job> = {};
        for (const [id, job] of Object.entries(p.jobs ?? {})) {
          jobs[id] =
            job.status === "queued" || job.status === "running"
              ? { ...job, status: "failed", error: "Interrupted because the page was reloaded before it finished." }
              : job;
        }
        return {
          ...current,
          ...p,
          drafts: { image: { ...DEFAULT_DRAFTS.image, ...p.drafts?.image }, video: { ...DEFAULT_DRAFTS.video, ...p.drafts?.video } },
          voiceDraft: { ...DEFAULT_VOICE, ...p.voiceDraft },
          jobs,
        };
      },
    },
  ),
);
