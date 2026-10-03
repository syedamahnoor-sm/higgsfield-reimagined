import { createId } from "@/lib/id";
import type { Asset, GenSettings, Job, Mode } from "@/lib/types";
import { useSession } from "@/store/session";
import { useStudio } from "@/store/studio";
import { getEngine } from "./index";

/**
 * Starts a generation job. Jobs live in the global store, not in components,
 * so they keep running and land in the session/Library even if the user
 * navigates away mid-generation.
 */
export interface StartOptions {
  /** Lineage override (e.g. the image being edited); defaults to the draft's parent. */
  parentId?: string;
  /** Join an existing generation set (Regenerate / Variations / Edit). */
  setId?: string;
  origin?: Job["origin"];
  /** Project the results join; defaults to the workspace's current project context. */
  projectId?: string;
}

export async function startGeneration(input: GenSettings, options: StartOptions = {}) {
  const mode: Mode = input.mode === "video" ? "video" : "image";
  const engine = getEngine(mode, input);
  const studio = useStudio.getState();
  const settings: GenSettings = structuredClone({ ...input, mode, prompt: input.prompt.trim() });
  const projectId = options.projectId ?? studio.projectContext[mode];
  const job: Job = {
    id: createId("job"),
    settings,
    status: "queued",
    progress: 0,
    assetIds: [],
    engineId: engine.id,
    parentId: options.parentId ?? studio.draftParents[mode],
    setId: options.setId,
    origin: options.origin ?? "generate",
    projectId: projectId && studio.projects[projectId] ? projectId : undefined,
    createdAt: Date.now(),
  };
  if (!job.setId) job.setId = job.id;
  studio.addJob(job);
  useSession.getState().addJob(mode, job.id);

  try {
    const result = await engine.generate({
      settings,
      onProgress: (progress, stage) => useStudio.getState().patchJob(job.id, { status: "running", progress, stage }),
    });
    const now = Date.now();
    const assets: Asset[] = result.media.map((m, i) => ({
      id: createId("asset"),
      kind: mode,
      url: m.url,
      posterUrl: m.posterUrl,
      width: m.width,
      height: m.height,
      settings,
      resolvedModel: result.resolvedModel,
      parentId: job.parentId,
      favorite: false,
      createdAt: now + i,
      jobId: job.id,
      color: m.color,
      attribution: m.attribution,
      renderer: m.renderer,
      modelLabel: result.modelLabel,
      seed: m.seed,
    }));
    useStudio.getState().completeJob(
      job.id,
      { status: "done", progress: 1, stage: undefined, resolvedModel: result.resolvedModel, note: result.note, finishedAt: now },
      assets,
    );
  } catch (error) {
    useStudio.getState().patchJob(job.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Something went wrong while generating.",
      finishedAt: Date.now(),
    });
  }
  return job.id;
}

/** Retries a failed job with identical settings, replacing it in the session. */
export function retryJob(jobId: string) {
  const job = useStudio.getState().jobs[jobId];
  if (!job) return;
  useSession.getState().removeJob(job.settings.mode === "video" ? "video" : "image", jobId);
  void startGeneration(job.settings, {
    parentId: job.parentId,
    setId: job.setId === job.id ? undefined : job.setId,
    origin: job.origin,
    projectId: job.projectId,
  });
}
