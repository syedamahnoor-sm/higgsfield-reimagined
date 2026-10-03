"use client";

import { motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Cpu, Info, Layers, PenLine, RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { MediaImage } from "@/components/media/MediaImage";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { focusPrompt, regenerateJob, variationsOf } from "@/lib/actions";
import { directionLabel, engineDisplay, lookLabel, qualityLabel, qualityOf } from "@/lib/creative";
import { aspectValue, fitGrid } from "@/lib/aspect";
import { cn } from "@/lib/cn";
import { retryJob } from "@/lib/generation/run";
import type { Asset, Job } from "@/lib/types";
import { useElementSize } from "@/lib/useElementSize";
import { useSession } from "@/store/session";
import { useStudio } from "@/store/studio";
import { ResultActionBar, TileActions } from "./ResultActions";

const GAP = 12;
const ACTION_BAR_HEIGHT = 52;

export function ResultStage({ job }: { job: Job }) {
  const focusedId = useSession((s) => s.sessions.image.focusedAssetId);
  const focusAsset = useSession((s) => s.focusAsset);
  const assets = useStudio(useShallow((s) => job.assetIds.map((id) => s.assets[id]).filter(Boolean)));
  const boxRef = useRef<HTMLDivElement>(null);
  const box = useElementSize(boxRef);

  const focused = assets.find((a) => a.id === focusedId);
  const done = job.status === "done" && assets.length > 0;
  const single = done && (assets.length === 1 || !!focused);
  const shown: (Asset | null)[] = done ? (focused ? [focused] : assets) : Array.from({ length: job.settings.count }, () => null);
  const grid = fitGrid(box.width, box.height - (single ? ACTION_BAR_HEIGHT : 0), shown.length, aspectValue(job.settings.aspect), GAP);

  // In the expanded view: Escape returns to the grid, arrows step through the set.
  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("textarea, input, [role=listbox]")) return;
      if (e.key === "Escape") focusAsset("image", null);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const i = assets.findIndex((a) => a.id === focused.id);
        const next = assets[(i + (e.key === "ArrowRight" ? 1 : -1) + assets.length) % assets.length];
        focusAsset("image", next.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, assets, focusAsset]);

  return (
    <div className="flex h-full flex-col">
      <ResultHeader job={job} focusedIndex={focused ? assets.indexOf(focused) : -1} total={assets.length} onBack={() => focusAsset("image", null)} />

      <div ref={boxRef} className="relative min-h-0 flex-1 px-3 pb-3 sm:px-6 sm:pb-4">
        {job.status === "failed" ? (
          <FailedState job={job} />
        ) : (
          grid.width > 0 && (
            <div className="flex h-full flex-col items-center justify-center">
              <div
                className="grid"
                style={{ gap: GAP, gridTemplateColumns: `repeat(${grid.cols}, ${grid.width}px)` }}
              >
                {shown.map((asset, i) =>
                  asset ? (
                    <ResultTile
                      key={asset.id}
                      asset={asset}
                      index={i}
                      width={grid.width}
                      height={grid.height}
                      expanded={single}
                      setId={job.setId ?? job.id}
                      onExpand={() => focusAsset("image", asset.id)}
                    />
                  ) : (
                    <PendingTile key={i} job={job} width={grid.width} height={grid.height} index={i} />
                  ),
                )}
              </div>
              {single && (
                <div className="flex h-[52px] items-end">
                  <ResultActionBar asset={focused ?? assets[0]} setId={job.setId ?? job.id} />
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ResultHeader({ job, focusedIndex, total, onBack }: { job: Job; focusedIndex: number; total: number; onBack: () => void }) {
  const time = new Date(job.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const editing = job.settings.operation === "edit";
  const meta: string[] = [];
  if (!editing) {
    meta.push(directionLabel(job.settings.direction));
    if (job.settings.look && job.settings.look !== "none") meta.push(lookLabel(job.settings.look));
  }
  meta.push(job.settings.aspect, `×${editing ? 1 : job.settings.count}`, qualityLabel(qualityOf(job.settings)));

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 pb-3 sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 max-w-3xl text-[13px] leading-relaxed text-fg sm:text-sm">
          {editing && <span className="mr-1.5 rounded-[5px] bg-accent-soft px-1.5 py-0.5 font-mono text-2xs text-accent">Edit</span>}
          {job.settings.prompt}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-2xs text-fg-subtle">
          <JobStatusLabel job={job} />
          {meta.map((m) => (
            <span key={m} className="flex items-center gap-2.5">
              <span aria-hidden="true">·</span>
              {m}
            </span>
          ))}
          {job.settings.reference && !editing && (
            <>
              <span aria-hidden="true">·</span>
              <span>with reference</span>
            </>
          )}
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="hidden sm:inline">{time}</span>
        </div>
        {job.note && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-fg-subtle">
            <Info aria-hidden="true" className="size-3.5 shrink-0" />
            {job.note}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {focusedIndex >= 0 && total > 1 && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-chip border border-line px-2.5 text-xs font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            All {total}
            <span className="font-mono text-fg-subtle">
              {focusedIndex + 1}/{total}
            </span>
          </button>
        )}
        <SetControls job={job} />
      </div>
    </div>
  );
}

/**
 * Generation set controls: move between versions, and make more. Regenerate
 * reruns the same settings with a new seed; Variations makes two more takes
 * from the same prompt and settings (independent generations, not image-based).
 */
function SetControls({ job }: { job: Job }) {
  const setId = job.setId ?? job.id;
  const versions = useStudio(
    useShallow((s) =>
      Object.values(s.jobs)
        .filter((j) => (j.setId ?? j.id) === setId && j.settings.mode === "image")
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((j) => j.id),
    ),
  );
  const busy = useStudio((s) => Object.values(s.jobs).some((j) => j.settings.mode === "image" && (j.status === "queued" || j.status === "running")));
  const showJob = useSession((s) => s.showJob);
  const index = versions.indexOf(job.id);
  const canMake = job.status === "done" || job.status === "failed";
  const pill =
    "flex h-8 items-center gap-1.5 rounded-chip border border-line px-2.5 text-xs font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40 disabled:hover:border-line disabled:hover:text-fg-muted";

  return (
    <>
      {versions.length > 1 && (
        <div className="flex h-8 items-center rounded-chip border border-line" role="group" aria-label="Versions">
          <IconButton aria-label="Previous version" size="sm" disabled={index <= 0} onClick={() => showJob("image", versions[index - 1])}>
            <ChevronLeft aria-hidden="true" className="size-4" />
          </IconButton>
          <span className="px-1 font-mono text-2xs text-fg-muted" aria-live="polite">
            v{index + 1} / {versions.length}
          </span>
          <IconButton aria-label="Next version" size="sm" disabled={index >= versions.length - 1} onClick={() => showJob("image", versions[index + 1])}>
            <ChevronRight aria-hidden="true" className="size-4" />
          </IconButton>
        </div>
      )}
      {job.settings.operation !== "edit" && (
        <>
          <Tooltip label="Run the same settings again with a new seed" align="end">
            <button type="button" className={pill} disabled={!canMake || busy} onClick={() => void regenerateJob(job)}>
              <RefreshCw aria-hidden="true" className="size-3.5" />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
          </Tooltip>
          <Tooltip label="Two more takes from the same prompt and settings" align="end">
            <button type="button" className={pill} disabled={!canMake || busy} onClick={() => void variationsOf(job)}>
              <Layers aria-hidden="true" className="size-3.5" />
              <span className="hidden sm:inline">Variations</span>
            </button>
          </Tooltip>
        </>
      )}
    </>
  );
}

function JobStatusLabel({ job }: { job: Job }) {
  if (job.status === "queued") {
    return <span className="text-fg-muted">Queued…</span>;
  }
  if (job.status === "running") {
    return (
      <span className="flex items-center gap-1.5 text-fg-muted">
        <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
        {job.stage ?? "Rendering"} · {Math.round(job.progress * 100)}%
      </span>
    );
  }
  if (job.status === "failed") return <span className="text-danger">Failed</span>;
  return (
    <span className="flex items-center gap-1.5 text-fg-muted">
      <Cpu aria-hidden="true" className="size-3" />
      {engineDisplay(job.resolvedModel, job.settings.operation)}
    </span>
  );
}

function PendingTile({ job, width, height, index }: { job: Job; width: number; height: number; index: number }) {
  return (
    <div
      role="status"
      aria-label={index === 0 ? (job.status === "queued" ? "Queued" : `Rendering, ${Math.round(job.progress * 100)}%`) : undefined}
      className="shimmer relative overflow-hidden rounded-card border border-line"
      style={{ width, height, animationDelay: `${index * 120}ms` }}
    >
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
        <div
          className="h-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${Math.round(job.progress * 100)}%` }}
        />
      </div>
    </div>
  );
}

function ResultTile({
  asset,
  index,
  width,
  height,
  expanded,
  setId,
  onExpand,
}: {
  asset: Asset;
  index: number;
  width: number;
  height: number;
  expanded: boolean;
  setId: string;
  onExpand: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985, filter: "blur(6px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.45, delay: expanded ? 0 : index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      // No overflow clipping here: tooltips must be able to extend past the tile.
      // The hovered/focused tile is raised so its tooltips paint above neighbouring tiles.
      className="group relative rounded-card hover:z-10 focus-within:z-10"
      style={{ width, height }}
    >
      {/* Clipping layer: only the media and its scrim are clipped to the rounded corners. */}
      <div className="absolute inset-0 overflow-hidden rounded-card bg-surface-2 ring-1 ring-line">
        <MediaImage src={asset.url} alt={asset.settings.prompt} sizes={`${Math.ceil(width)}px`} quality={75} className="object-cover" />
        {!expanded && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100" />
        )}
      </div>

      {!expanded && (
        <button
          type="button"
          onClick={onExpand}
          aria-label={`View image ${index + 1} larger`}
          className="absolute inset-0 cursor-zoom-in rounded-card outline-offset-[-3px]"
        />
      )}

      {/* Action layer: unclipped, so tooltips render fully outside the image. */}
      <div
        className={cn(
          "transition-opacity duration-200",
          expanded
            ? "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
            : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
        )}
      >
        {!expanded && <TileActions asset={asset} setId={setId} />}
        {asset.attribution && (expanded || width >= 300) && (
          <a
            href={asset.attribution.url}
            target="_blank"
            rel="noreferrer"
            className="absolute right-2 bottom-2 max-w-[60%] truncate rounded-full bg-black/45 px-2 py-1 text-2xs text-white/80 backdrop-blur-md hover:text-white"
          >
            Photo · {asset.attribution.name}
          </a>
        )}
      </div>
    </motion.div>
  );
}

function FailedState({ job }: { job: Job }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center" role="alert">
      <div className="grid size-12 place-items-center rounded-panel border border-danger/25 bg-danger/10 text-danger">
        <AlertTriangle aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </div>
      <h2 className="mt-4 text-base font-medium text-fg">Generation didn’t finish</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">{job.error}</p>
      <div className="mt-5 flex gap-2">
        <Button variant="primary" onClick={() => retryJob(job.id)}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Try again
        </Button>
        <Button variant="secondary" onClick={() => focusPrompt()}>
          <PenLine aria-hidden="true" className="size-4" />
          Edit prompt
        </Button>
      </div>
    </div>
  );
}
