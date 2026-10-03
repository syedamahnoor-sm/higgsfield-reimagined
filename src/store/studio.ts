import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Asset, GenSettings, Job, Mode } from "@/lib/types";

export const DEFAULT_DRAFTS: Record<Mode, GenSettings> = {
  image: { mode: "image", prompt: "", intent: "auto", aspect: "1:1", count: 2 },
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

  updateDraft: (mode: Mode, patch: Partial<GenSettings>) => void;
  setDraft: (mode: Mode, settings: GenSettings, parentId?: string) => void;
  addJob: (job: Job) => void;
  patchJob: (id: string, patch: Partial<Job>) => void;
  completeJob: (id: string, patch: Partial<Job>, assets: Asset[]) => void;
  toggleFavorite: (assetId: string) => void;
}

/**
 * Durable studio data: drafts, jobs and generated assets. Persisted to
 * localStorage so the Library survives refreshes. Uploaded reference images
 * are stored separately in IndexedDB (see lib/media/uploads) and only their
 * ids are kept here.
 */
export const useStudio = create<StudioState>()(
  persist(
    (set) => ({
      drafts: DEFAULT_DRAFTS,
      draftParents: {},
      jobs: {},
      assets: {},

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
          return {
            jobs: { ...s.jobs, [id]: { ...job, ...patch, assetIds: assets.map((a) => a.id) } },
            assets: nextAssets,
          };
        }),

      toggleFavorite: (assetId) =>
        set((s) => {
          const asset = s.assets[assetId];
          if (!asset) return s;
          return { assets: { ...s.assets, [assetId]: { ...asset, favorite: !asset.favorite } } };
        }),
    }),
    {
      name: "ember-studio",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Hydrated manually after mount (see StoreHydrator) to avoid SSR mismatches.
      skipHydration: true,
      partialize: (s) => ({ drafts: s.drafts, draftParents: s.draftParents, jobs: s.jobs, assets: s.assets }),
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
          jobs,
        };
      },
    },
  ),
);
