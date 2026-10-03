"use client";

import Image from "next/image";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Job } from "@/lib/types";
import { useSession } from "@/store/session";
import { useStudio } from "@/store/studio";

/**
 * Session history. Every generation from this session stays one click away;
 * selecting one restores it on the canvas without touching the others.
 */
export function Filmstrip({ orientation, className }: { orientation: "vertical" | "horizontal"; className?: string }) {
  const session = useSession((s) => s.sessions.image);
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
        <ol className={cn("flex gap-2", vertical ? "flex-col items-center" : "flex-row")}>
          {items.map((job) => (
            <li key={job.id}>
              <FilmstripItem
                job={job}
                active={job.id === session.activeJobId}
                compact={!vertical}
                onSelect={() => showJob("image", job.id)}
              />
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
      {firstAsset && (
        <Image src={firstAsset.url} alt="" fill sizes="56px" className="object-cover" />
      )}
      {pending && (
        <>
          <span className="shimmer absolute inset-0" />
          <span className="absolute inset-x-1.5 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full bg-accent transition-[width] duration-300" style={{ width: `${Math.round(job.progress * 100)}%` }} />
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
