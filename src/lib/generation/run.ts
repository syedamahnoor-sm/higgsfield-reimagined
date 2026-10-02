import { createId } from "@/lib/id";
import type { Asset, GenSettings, Job } from "@/lib/types";
import { useSession } from "@/store/session";
import { useStudio } from "@/store/studio";
import { getEngine } from "./index";

/**
 * Starts a generation job. Jobs live in the global store, not in components,
 * so they keep running and land in the session/Library even if the user
 * navigates away mid-generation.
 */
export async function startGeneration(input: GenSettings) {
  const engine = getEngine();
  const studio = useStudio.getState();
  const settings: GenSettings = structuredClone({ ...input, prompt: input.prompt.trim() });
  const job: Job = {
    id: createId("job"),
    settings,
    status: "queued",
    progress: 0,
    assetIds: [],
    engineId: engine.id,
    parentId: studio.draftParents[settings.mode],
    createdAt: Date.now(),
  };
  studio.addJob(job);
  useSession.getState().addJob(settings.mode, job.id);

  try {
    const result = await engine.generate({
      settings,
      onProgress: (progress) => useStudio.getState().patchJob(job.id, { status: "running", progress }),
    });
    const now = Date.now();
    const assets: Asset[] = result.media.map((m, i) => ({
      id: createId("asset"),
      kind: settings.mode,
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
    }));
    useStudio.getState().completeJob(
      job.id,
      { status: "done", progress: 1, resolvedModel: result.resolvedModel, note: result.note, finishedAt: now },
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
  useSession.getState().removeJob(job.settings.mode, jobId);
  void startGeneration(job.settings);
}
