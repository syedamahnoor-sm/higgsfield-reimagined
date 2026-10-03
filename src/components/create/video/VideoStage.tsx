"use client";

import Image from "next/image";
import { AlertTriangle, Clapperboard, Film, ImageOff, RotateCcw, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { MotionPlayer } from "@/components/motion/MotionPlayer";
import { VideoFilePlayer } from "@/components/motion/VideoFilePlayer";
import { Button } from "@/components/ui/Button";
import { aspectValue, fitGrid } from "@/lib/aspect";
import { AI_CAMERA_PRESETS, MOTION_PRESETS } from "@/lib/constants";
import { retryJob, startGeneration } from "@/lib/generation/run";
import { useReferenceUrl } from "@/lib/media/useReferenceUrl";
import type { GenSettings, Job, MediaReference } from "@/lib/types";
import { useElementSize } from "@/lib/useElementSize";
import { useSession } from "@/store/session";
import { useStudio } from "@/store/studio";
import { AiVideoActionBar, MotionActionBar } from "./MotionActions";
import { SourcePicker } from "./SourcePicker";
import { durationFor, effectiveVideoEngine, useAiVideoAvailable } from "./VideoComposer";

const ACTION_BAR_HEIGHT = 52;

function presetLabel(settings: GenSettings) {
  return MOTION_PRESETS.find((p) => p.id === settings.motion)?.label ?? "Push in";
}

function cameraLabel(settings: GenSettings) {
  return AI_CAMERA_PRESETS.find((p) => p.id === (settings.camera ?? "none"))?.label ?? "Prompt only";
}

/** The Video canvas: source picker → source preview → working → playing result. */
export function VideoStage() {
  const activeJobId = useSession((s) => s.sessions.video.activeJobId);
  const job = useStudio((s) => (activeJobId ? s.jobs[activeJobId] : undefined));
  const draft = useStudio((s) => s.drafts.video);

  if (job) return <JobStage key={job.id} job={job} />;
  if (draft.reference) return <SourcePreview settings={draft} />;
  return <SourcePicker />;
}

function useFit(aspect: number, reserve = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const box = useElementSize(ref);
  return { ref, fit: fitGrid(box.width, box.height - reserve, 1, aspect, 0) };
}

function Header({ title, meta }: { title: string; meta: React.ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-3 sm:px-6">
      <p className="line-clamp-2 max-w-3xl text-[13px] leading-relaxed text-fg sm:text-sm">{title}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-2xs text-fg-subtle">{meta}</div>
    </div>
  );
}

const Dot = () => <span aria-hidden="true">·</span>;

function referenceAspect(reference: MediaReference | undefined) {
  return reference ? reference.width / reference.height : 16 / 9;
}

/**
 * The chosen source before generating. AI video keeps the image's own shape;
 * Motion Preview shows the crop for the selected aspect ratio.
 */
function SourcePreview({ settings }: { settings: GenSettings }) {
  const aiAvailable = useAiVideoAvailable();
  const ai = effectiveVideoEngine(settings, aiAvailable) === "ai";
  const { ref, fit } = useFit(ai ? referenceAspect(settings.reference) : aspectValue(settings.aspect));
  return (
    <div className="flex h-full flex-col">
      <Header
        title={settings.prompt || "Source image"}
        meta={
          ai ? (
            <>
              <span className="flex items-center gap-1.5 text-fg-muted">
                <Sparkles aria-hidden="true" className="size-3" />
                Ready for AI video
              </span>
              <Dot />
              <span>{cameraLabel(settings)}</span>
              <Dot />
              <span>{durationFor("ai", settings.duration)}s</span>
              <Dot />
              <span>{settings.resolution ?? "480p"}</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-fg-muted">
                <Film aria-hidden="true" className="size-3" />
                Ready for Motion Preview
              </span>
              <Dot />
              <span>{presetLabel(settings)}</span>
              <Dot />
              <span>{durationFor("motion", settings.duration)}s</span>
              <Dot />
              <span>{settings.aspect}</span>
            </>
          )
        }
      />
      <div ref={ref} className="relative min-h-0 flex-1 px-3 pb-3 sm:px-6 sm:pb-4">
        {fit.width > 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="relative overflow-hidden rounded-card ring-1 ring-line" style={{ width: fit.width, height: fit.height }}>
              <SourceImage reference={settings.reference!} sizes={`${fit.width}px`} />
              <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2.5 py-1 font-mono text-2xs text-white/85 backdrop-blur-md">
                Source
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SourceImage({ reference, sizes, dim }: { reference: MediaReference; sizes: string; dim?: boolean }) {
  const url = useReferenceUrl(reference);
  if (url === null)
    return (
      <div className="grid size-full place-items-center bg-surface-2 text-fg-subtle">
        <span className="flex flex-col items-center gap-2 text-xs">
          <ImageOff aria-hidden="true" className="size-5" />
          Source image no longer available
        </span>
      </div>
    );
  if (!url) return <span className="shimmer block size-full" />;
  return (
    <Image
      src={url}
      alt="Source image"
      fill
      sizes={sizes}
      unoptimized={url.startsWith("blob:")}
      className={dim ? "object-cover opacity-40 transition-opacity" : "object-cover"}
    />
  );
}

function JobStage({ job }: { job: Job }) {
  const asset = useStudio((s) => (job.assetIds[0] ? s.assets[job.assetIds[0]] : undefined));
  const ai = job.settings.videoEngine === "ai";
  const done = job.status === "done" && !!asset;
  const aspect = done && asset ? asset.width / asset.height : ai ? referenceAspect(job.settings.reference) : aspectValue(job.settings.aspect);
  const { ref, fit } = useFit(aspect, done ? ACTION_BAR_HEIGHT : 0);
  const [playKey, setPlayKey] = useState(0);
  const time = new Date(job.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  // AI video has no real percentage from the provider: show the stage only.
  const indeterminate = job.progress < 0;
  const stage = job.stage ?? (ai ? "Starting AI video" : "Preparing motion");

  return (
    <div className="flex h-full flex-col">
      <Header
        title={job.settings.prompt || "Untitled clip"}
        meta={
          <>
            {job.status === "queued" && <span className="text-fg-muted">Queued…</span>}
            {job.status === "running" && (
              <span className="flex items-center gap-1.5 text-fg-muted" aria-live="polite">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                {indeterminate ? stage : `${stage} · ${Math.round(job.progress * 100)}%`}
              </span>
            )}
            {job.status === "failed" && <span className="text-danger">{ai ? "AI video failed" : "Failed"}</span>}
            {job.status === "done" && (
              <span className="flex items-center gap-1.5 text-fg-muted">
                {ai ? <Sparkles aria-hidden="true" className="size-3" /> : <Clapperboard aria-hidden="true" className="size-3" />}
                {job.resolvedModel}
              </span>
            )}
            {ai && (
              <>
                <Dot />
                <span>{cameraLabel(job.settings)}</span>
              </>
            )}
            <Dot />
            <span>{job.settings.duration ?? 5}s</span>
            <Dot />
            <span>{ai ? (job.settings.resolution ?? "480p") : job.settings.aspect}</span>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <span className="hidden sm:inline">{time}</span>
          </>
        }
      />
      <div ref={ref} className="relative min-h-0 flex-1 px-3 pb-3 sm:px-6 sm:pb-4">
        {job.status === "failed" ? (
          <FailedState job={job} />
        ) : (
          fit.width > 0 && (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="relative overflow-hidden rounded-card ring-1 ring-line" style={{ width: fit.width, height: fit.height }}>
                {done && asset ? (
                  asset.renderer === "file" ? (
                    <VideoFilePlayer src={asset.url} mode="controls" />
                  ) : (
                    <MotionPlayer
                      source={asset.settings.reference}
                      preset={asset.settings.motion ?? "push-in"}
                      duration={asset.settings.duration ?? 5}
                      mode="once"
                      playKey={playKey}
                    />
                  )
                ) : (
                  <>
                    {job.settings.reference && <SourceImage reference={job.settings.reference} sizes={`${fit.width}px`} dim />}
                    <span className="shimmer absolute inset-0 opacity-60" />
                    {ai && (
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="flex items-center gap-2 rounded-full bg-black/60 px-3.5 py-1.5 text-[13px] font-medium text-white backdrop-blur-md">
                          <Sparkles aria-hidden="true" className="size-3.5 animate-pulse text-accent" />
                          {stage}
                        </span>
                      </div>
                    )}
                    <div role="status" aria-label={indeterminate ? stage : `${stage}, ${Math.round(job.progress * 100)}%`} className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/5">
                      {indeterminate ? (
                        <div className="h-full w-1/3 animate-[indeterminate_1.6s_ease-in-out_infinite] bg-accent" />
                      ) : (
                        <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${Math.round(job.progress * 100)}%` }} />
                      )}
                    </div>
                  </>
                )}
              </div>
              {done && asset && (
                <div className="flex h-[52px] items-end">
                  {asset.renderer === "file" ? (
                    <AiVideoActionBar asset={asset} />
                  ) : (
                    <MotionActionBar asset={asset} onReplay={() => setPlayKey((k) => k + 1)} />
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>
      {job.status === "running" && ai && (
        <p className="px-4 pb-3 text-center text-xs text-fg-subtle sm:px-6">AI video usually takes a minute or two. You can keep this tab open while it works.</p>
      )}
    </div>
  );
}

/** Failure: say what happened plainly; for AI video, offer Motion Preview as an honest alternative. */
function FailedState({ job }: { job: Job }) {
  const ai = job.settings.videoEngine === "ai";
  const updateDraft = useStudio((s) => s.updateDraft);
  const startMotionPreview = () => {
    const settings = { ...job.settings, videoEngine: "motion" as const, duration: durationFor("motion", job.settings.duration) };
    updateDraft("video", { videoEngine: "motion", duration: settings.duration });
    void startGeneration(settings);
  };
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="grid size-12 place-items-center rounded-panel border border-danger/25 bg-danger/10 text-danger">
        <AlertTriangle aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </div>
      <h2 className="mt-4 text-base font-medium text-fg">{ai ? "AI video didn’t finish" : "Motion didn’t finish"}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">{job.error}</p>
      {ai && (
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-fg-subtle">
          Motion Preview can animate this image right now with a camera move in your browser. It isn’t AI-generated video.
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {ai && (
          <Button variant="primary" onClick={startMotionPreview}>
            <Film aria-hidden="true" className="size-4" />
            Use Motion Preview instead
          </Button>
        )}
        <Button variant={ai ? "secondary" : "primary"} onClick={() => retryJob(job.id)}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
