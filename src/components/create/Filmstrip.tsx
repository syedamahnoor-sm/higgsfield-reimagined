"use client";

import { AlertTriangle } from "lucide-react";
import { AssetThumb } from "@/components/media/AssetThumb";
import { cn } from "@/lib/cn";
import type { Job, Mode } from "@/lib/types";
import { useSession } from "@/store/session";
import { useStudio } from "@/store/studio";

/**
 * Session history. Every generation from this session stays one click away;
 * selecting one restores it on the canvas without touching the others.
 */
export function Filmstrip({
  mode,
  orientation,
  className,
}: {
  mode: Mode;
  orientation: "vertical" | "horizontal";
  className?: string;
}) {
  const session = useSession((s) => s.sessions[mode]);
  const showJob = useSession((s) => s.showJob);
  const jobs = useStudio((s) => s.jobs);
  const items = session.jobIds.map((id) => jobs[id]).filter(Boolean);

  if (items.length === 0) return null;
  const vertical = orientation === "vertical";

  return (
    <nav
      aria-label="Session history"
      className={cn(
        "shrink-0",
        vertical ? "w-[84px] flex-col border-l border-line" : "border-b border-line",
        className,
      )}
    >
      <div className={cn(vertical ? "h-full overflow-y-auto px-3 py-3" : "overflow-x-auto px-3 py-2.5")}>
        {/* Generation sets: versions from Regenerate / Variations / Edit stay together, newest first. */}
        <ol className={cn("flex gap-3", vertical ? "flex-col items-center" : "flex-row")}>
          {groupBySet(items).map((set) => (
            <li key={set[0].setId ?? set[0].id}>
              <ol
                aria-label={set.length > 1 ? `Generation set, ${set.length} versions` : undefined}
                className={cn("flex gap-1.5", vertical ? "flex-col items-center" : "flex-row", set.length > 1 && "rounded-[14px] bg-surface-2/60 p-1 ring-1 ring-line")}
              >
                {set.map((job, i) => (
                  <li key={job.id} className="relative">
                    <FilmstripItem
                      job={job}
                      active={job.id === session.activeJobId}
                      compact={!vertical}
                      onSelect={() => showJob(mode, job.id)}
                    />
                    {set.length > 1 && (
                      <span className="pointer-events-none absolute bottom-1 left-1 rounded-[5px] bg-black/65 px-1 font-mono text-[10px] leading-4 text-white">
                        v{set.length - i}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

function FilmstripItem({ job, active, compact, onSelect }: { job: Job; active: boolean; compact: boolean; onSelect: () => void }) {
  const firstAsset = useStudio((s) => (job.assetIds[0] ? s.assets[job.assetIds[0]] : undefined));
  const pending = job.status === "queued" || job.status === "running";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      aria-label={`${pending ? "In progress" : job.status === "failed" ? "Failed" : "Generation"}: ${job.settings.prompt}`}
      title={job.settings.prompt}
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-card bg-surface-2 transition-[box-shadow,opacity] duration-150",
        compact ? "size-12" : "size-14",
        active
          ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-1"
          : "opacity-70 ring-1 ring-line hover:opacity-100",
      )}
    >
      {firstAsset && <AssetThumb asset={firstAsset} sizes="56px" />}
      {pending && (
        <>
          <span className="shimmer absolute inset-0" />
          <span className="absolute inset-x-1.5 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full bg-accent transition-[width] duration-300" style={{ width: `${Math.round(Math.max(0, job.progress) * 100)}%` }} />
          </span>
        </>
      )}
      {job.status === "failed" && (
        <span className="absolute inset-0 grid place-items-center bg-danger/10 text-danger">
          <AlertTriangle aria-hidden="true" className="size-4" />
        </span>
      )}
      {job.status === "done" && job.assetIds.length > 1 && (
        <span className="absolute top-1 right-1 rounded-[5px] bg-black/60 px-1 font-mono text-[10px] leading-4 text-white backdrop-blur">
          {job.assetIds.length}
        </span>
      )}
    </button>
  );
}

/** Groups session jobs (newest first) into generation sets, keeping each set's versions newest first. */
function groupBySet(jobs: Job[]) {
  const sets = new Map<string, Job[]>();
  for (const job of jobs) {
    const key = job.setId ?? job.id;
    if (!sets.has(key)) sets.set(key, []);
    sets.get(key)!.push(job);
  }
  return [...sets.values()];
}
