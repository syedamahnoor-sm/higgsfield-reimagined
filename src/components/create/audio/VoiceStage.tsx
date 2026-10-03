"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, Check, Download, FolderPlus, Images, Loader2, Mic, RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AudioPlayer, SpeakerAvatar } from "@/components/audio/AudioPlayer";
import { FavoriteButton } from "@/components/create/ResultActions";
import { AddToProjectPopover } from "@/components/projects/AddToProject";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { downloadWithFeedback } from "@/lib/actions";
import { generateVoice, regenerateVoice } from "@/lib/audio/voice";
import { cn } from "@/lib/cn";
import { kindLabel } from "@/lib/lineage";
import type { Asset } from "@/lib/types";
import { audioFormatLabel, formatDuration, languageLabel, speakerLabel } from "@/lib/voices";
import { useAudioSession, type VoiceRun } from "@/store/audio";
import { useStudio } from "@/store/studio";
import { SCRIPT_INPUT_ID, SourceThumb } from "./VoiceComposer";

const STAGES = ["Preparing script", "Generating voice", "Processing audio", "Ready"] as const;

export function VoiceStage() {
  const run = useAudioSession((s) => s.run);
  const activeId = useAudioSession((s) => s.activeAssetId);
  const active = useStudio((s) => (activeId ? s.assets[activeId] : undefined));
  const rootRef = useRef<HTMLDivElement>(null);
  const shownId = active?.id;

  // On small screens the stage sits below the composer: bring a new result into view.
  useEffect(() => {
    if (!shownId || window.matchMedia("(min-width: 1024px)").matches) return;
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [shownId]);

  return (
    <div ref={rootRef} className="flex min-h-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {run ? <RunState run={run} /> : active?.audio ? <VoiceResult asset={active} /> : <VoiceEmpty />}
      <Takes />
    </div>
  );
}

function RunState({ run }: { run: VoiceRun }) {
  const setRun = useAudioSession((s) => s.setRun);
  if (run.status === "failed") {
    return (
      <div role="alert" className="mx-auto flex w-full max-w-2xl flex-col items-center rounded-panel border border-line bg-surface-2/60 px-6 py-12 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertCircle aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-4 text-base font-medium text-fg">{run.limited ? "AI generation is temporarily unavailable" : "The voice couldn’t be generated"}</h2>
        <p className="mt-1.5 max-w-sm text-sm text-fg-muted">
          {run.limited ? "Your script and settings have been preserved — try again later. Nothing was generated." : run.error}
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => void generateVoice(run.settings, { parentId: run.parentId, projectId: run.projectId })}
            className="flex h-10 items-center gap-2 rounded-card bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            <RotateCcw aria-hidden="true" className="size-4" /> Retry
          </button>
          <button
            type="button"
            onClick={() => setRun(null)}
            className="flex h-10 items-center gap-2 rounded-card border border-line-strong bg-surface-2 px-4 text-sm font-medium text-fg hover:bg-surface-3"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }
  const current = STAGES.indexOf(run.stage as (typeof STAGES)[number]);
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-panel border border-line bg-surface-2/60 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <SpeakerAvatar speaker={run.settings.speaker} size="lg" className="animate-pulse motion-reduce:animate-none" />
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-fg">{speakerLabel(run.settings.speaker)}</p>
          <p className="text-[13px] text-fg-muted">{languageLabel(run.settings.language)}</p>
        </div>
      </div>
      {/* An honest stage list; the model reports no percentage, so none is shown. */}
      <ol className="flex flex-col gap-2.5" aria-label="Progress">
        {STAGES.map((stage, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={stage} className={cn("flex items-center gap-2.5 text-sm", done ? "text-fg-muted" : now ? "text-fg" : "text-fg-subtle")} aria-current={now ? "step" : undefined}>
              <span className="grid size-5 place-items-center">
                {done ? (
                  <Check aria-hidden="true" className="size-4 text-accent" />
                ) : now ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin text-accent" />
                ) : (
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-fg-subtle" />
                )}
              </span>
              {stage}
            </li>
          );
        })}
      </ol>
      <p className="line-clamp-3 border-t border-line pt-4 text-sm leading-relaxed text-fg-muted">“{run.settings.script}”</p>
    </div>
  );
}

function VoiceEmpty() {
  const hasParent = useStudio((s) => Boolean(s.voiceParent));
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-2 py-10 text-center">
      <div aria-hidden="true" className="flex h-16 items-center gap-[3px]">
        {[0.3, 0.55, 0.8, 0.45, 1, 0.65, 0.4, 0.75, 0.5, 0.3, 0.6, 0.35].map((h, i) => (
          <span key={i} className="w-1.5 rounded-full bg-white/12" style={{ height: `${h * 100}%` }} />
        ))}
      </div>
      <h2 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-fg">{hasParent ? "Write the voiceover" : "Give your work a voice"}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
        {hasParent
          ? "Write the words for your clip, pick a voice and generate. The audio is linked to the video and joins its project."
          : "Write a script, choose a voice and generate natural speech: voiceovers, narration or a product line. Every take is saved to your Library."}
      </p>
      <button
        type="button"
        onClick={() => document.getElementById(SCRIPT_INPUT_ID)?.focus()}
        className="mt-6 flex h-10 items-center gap-2 rounded-card border border-line-strong bg-surface-2 px-4 text-sm font-medium text-fg hover:bg-surface-3 lg:hidden"
      >
        <Mic aria-hidden="true" className="size-4" /> Write a script
      </button>
    </div>
  );
}

function VoiceResult({ asset }: { asset: Asset }) {
  const router = useRouter();
  const audio = asset.audio!;
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const parent = useStudio((s) => (asset.parentId ? s.assets[asset.parentId] : undefined));
  const [downloading, setDownloading] = useState(false);
  const button =
    "flex h-9 items-center gap-2 rounded-chip px-3 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg disabled:opacity-60";

  return (
    <article aria-label="Voice result" className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="rounded-panel border border-line bg-surface-2/60 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <SpeakerAvatar speaker={audio.speaker} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-fg">{speakerLabel(audio.speaker)}</p>
            <p className="font-mono text-2xs text-fg-subtle">
              {languageLabel(audio.language)} · {formatDuration(audio.duration)} · {audioFormatLabel(audio)}
            </p>
          </div>
        </div>
        <AudioPlayer asset={asset} variant="full" />
      </div>

      <div role="toolbar" aria-label="Voice actions" className="flex flex-wrap items-center justify-center gap-0.5">
        <Tooltip label="Generate the same script and voice again as a new take">
          <button
            type="button"
            onClick={() => void regenerateVoice(asset)}
            className="mr-1 flex h-9 items-center gap-2 rounded-chip bg-accent-soft px-3.5 text-[13px] font-semibold text-accent transition-colors duration-150 hover:bg-accent hover:text-accent-fg"
          >
            <RefreshCw aria-hidden="true" className="size-4" /> Regenerate
          </button>
        </Tooltip>
        <AddToProjectPopover
          refs={[{ kind: "asset", id: asset.id }]}
          side="top"
          trigger={(props) => (
            <Tooltip label="Add this voice to a project">
              <button type="button" {...props} aria-label="Add to project" className={button}>
                <FolderPlus aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">Add to project</span>
              </button>
            </Tooltip>
          )}
        />
        <Tooltip label="See it with the rest of your work">
          <button type="button" onClick={() => router.push(`/library?open=${asset.id}`)} aria-label="Open in Library" className={button}>
            <Images aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">Open in Library</span>
          </button>
        </Tooltip>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-line-strong" />
        <FavoriteButton asset={asset} onToggle={() => toggleFavorite(asset.id)} variant="ghost" />
        <Tooltip label="Download this audio" align="end">
          <IconButton
            aria-label="Download"
            size="sm"
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              await downloadWithFeedback(asset);
              setDownloading(false);
            }}
          >
            {downloading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
          </IconButton>
        </Tooltip>
      </div>

      <div>
        <p className="font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Script</p>
        <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-fg">{audio.script}</p>
      </div>

      {parent && (
        <div className="flex items-center gap-3 rounded-card border border-line p-2">
          <SourceThumb asset={parent} />
          <div className="min-w-0 text-[13px]">
            <p className="text-fg-muted">Voiceover for your {kindLabel(parent).toLowerCase()}</p>
            <p className="truncate font-mono text-2xs text-fg-subtle">{parent.settings.prompt || "Untitled"}</p>
          </div>
        </div>
      )}
    </article>
  );
}

/** Takes from this session: every generation is kept, so changing voice and regenerating never replaces earlier audio. */
function Takes() {
  const takes = useAudioSession((s) => s.takes);
  const activeId = useAudioSession((s) => s.activeAssetId);
  const running = useAudioSession((s) => s.run?.status === "running");
  const showTake = useAudioSession((s) => s.showTake);
  const setRun = useAudioSession((s) => s.setRun);
  const assets = useStudio(useShallow((s) => takes.map((id) => s.assets[id]).filter((a): a is Asset => Boolean(a?.audio))));
  if (assets.length < 2 && !(assets.length === 1 && activeId !== assets[0].id)) return null;
  return (
    <section aria-label="Takes this session" className="mx-auto mt-auto w-full max-w-2xl">
      <h3 className="mb-2 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Takes this session</h3>
      <ul className="flex flex-col gap-1">
        {assets.map((a, i) => {
          const active = a.id === activeId;
          return (
            <li key={a.id}>
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                disabled={running}
                onClick={() => {
                  setRun(null);
                  showTake(a.id);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-card border px-2.5 py-2 text-left transition-colors",
                  active ? "border-line-strong bg-surface-3" : "border-transparent hover:bg-surface-2",
                )}
              >
                <SpeakerAvatar speaker={a.audio!.speaker} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-fg">{a.audio!.script}</span>
                  <span className="font-mono text-2xs text-fg-subtle">
                    Take {assets.length - i} · {speakerLabel(a.audio!.speaker)} · {formatDuration(a.audio!.duration)}
                  </span>
                </span>
                {a.favorite && <span className="sr-only">Favorite</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
