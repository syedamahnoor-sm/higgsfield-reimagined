"use client";

import { ArrowUp, Clock3, ImagePlus } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MotionGlyph } from "@/components/motion/MotionGlyph";
import { SelectMenu, type SelectOption } from "@/components/ui/SelectMenu";
import { Tooltip } from "@/components/ui/Tooltip";
import { setVideoSource } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { MOTION_PRESETS, VIDEO_DURATIONS } from "@/lib/constants";
import { getEngine } from "@/lib/generation";
import { startGeneration } from "@/lib/generation/run";
import { useVideoSourceUpload } from "@/lib/media/useVideoSourceUpload";
import type { MotionPreset, VideoDuration } from "@/lib/types";
import { useStudio } from "@/store/studio";
import { AspectPicker } from "../controls";
import { ReferenceChip } from "../ReferenceControl";

export const VIDEO_FILE_INPUT_ID = "video-source-input";

const subscribeNoop = () => () => {};
function useIsMac() {
  return useSyncExternalStore(subscribeNoop, () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent), () => true);
}

export function MotionPicker({ value, onChange }: { value: MotionPreset; onChange: (v: MotionPreset) => void }) {
  const engine = getEngine("video");
  const options: SelectOption<MotionPreset>[] = MOTION_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    icon: <MotionGlyph preset={p.id} />,
  }));
  return (
    <SelectMenu
      label="Camera motion"
      value={value}
      options={options}
      onChange={onChange}
      hideLabelOnMobile={false}
      footer={<p className="text-xs leading-snug text-fg-subtle">{engine.description}</p>}
    />
  );
}

export function DurationPicker({ value, onChange }: { value: VideoDuration; onChange: (v: VideoDuration) => void }) {
  return (
    <Tooltip label="Clip length">
      <div role="radiogroup" aria-label="Duration" className="flex h-9 items-center gap-0.5 rounded-chip p-0.5">
        <Clock3 aria-hidden="true" className="mx-1 size-4 text-fg-subtle" strokeWidth={1.75} />
        {VIDEO_DURATIONS.map((d) => {
          const active = d === value;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${d} seconds`}
              onClick={() => onChange(d)}
              className={cn(
                "h-8 min-w-9 rounded-[6px] px-2 font-mono text-xs transition-colors duration-150",
                active ? "bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg-muted",
              )}
            >
              {d}s
            </button>
          );
        })}
      </div>
    </Tooltip>
  );
}

/** Bottom-docked Video composer: source, optional shot note, motion, duration, aspect, Animate. */
export function VideoComposer() {
  const draft = useStudio((s) => s.drafts.video);
  const updateDraft = useStudio((s) => s.updateDraft);
  const { busy, upload } = useVideoSourceUpload();
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isMac = useIsMac();
  const motion = draft.motion ?? "push-in";
  const duration = draft.duration ?? 5;

  const canGenerate = !!draft.reference && !busy;
  const generate = useCallback(() => {
    if (!canGenerate) return;
    void startGeneration(useStudio.getState().drafts.video);
  }, [canGenerate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.repeat) {
        e.preventDefault();
        generate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [generate]);

  return (
    <form
      aria-label="Video composer"
      onSubmit={(e) => {
        e.preventDefault();
        generate();
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void upload(e.dataTransfer.files[0]);
      }}
      className={cn(
        "pointer-events-auto relative mx-auto w-full max-w-[880px] rounded-composer border bg-surface-2/90 shadow-float backdrop-blur-xl transition-colors duration-150",
        dragging ? "border-accent" : "border-line-strong focus-within:border-white/20",
      )}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-composer bg-surface-2/90 text-sm font-medium text-fg">
          Drop to use as the source image
        </div>
      )}

      {draft.reference && (
        <div className="px-3 pt-3">
          <ReferenceChip
            label="Source"
            reference={draft.reference}
            busy={busy}
            onReplace={() => fileRef.current?.click()}
            onRemove={() => setVideoSource(undefined)}
          />
        </div>
      )}

      <label htmlFor="video-note" className="sr-only">
        Shot note (optional)
      </label>
      <input
        id="video-note"
        type="text"
        value={draft.prompt}
        onChange={(e) => updateDraft("video", { prompt: e.target.value })}
        placeholder="Describe the shot (optional), saved with the clip"
        className="block w-full bg-transparent px-4 pt-3.5 pb-2 text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none sm:px-5"
      />

      <div className="flex flex-wrap items-center gap-1 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
        {!draft.reference && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-9 items-center gap-1.5 rounded-chip px-2.5 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg"
          >
            <ImagePlus aria-hidden="true" className="size-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Source image</span>
          </button>
        )}
        <MotionPicker value={motion} onChange={(m) => updateDraft("video", { motion: m })} />
        <DurationPicker value={duration} onChange={(d) => updateDraft("video", { duration: d })} />
        <AspectPicker value={draft.aspect} onChange={(aspect) => updateDraft("video", { aspect })} />

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-mono text-2xs text-fg-subtle md:inline" aria-hidden="true">
            {isMac ? "⌘" : "Ctrl"} ↵
          </span>
          <Tooltip label={canGenerate ? "Animate this image" : "Choose a source image first"} align="end">
            <button
              type="submit"
              disabled={!canGenerate}
              aria-keyshortcuts={isMac ? "Meta+Enter" : "Control+Enter"}
              className="group flex h-10 items-center gap-2 rounded-card bg-accent pr-3 pl-4 text-sm font-semibold text-accent-fg transition-[background-color,transform,opacity] duration-150 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-press disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-subtle"
            >
              Animate
              <span className="grid size-6 place-items-center rounded-full bg-black/15 transition-transform duration-150 group-enabled:group-hover:-translate-y-px group-disabled:bg-white/5">
                <ArrowUp aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
              </span>
            </button>
          </Tooltip>
        </div>
      </div>

      <input
        ref={fileRef}
        id={VIDEO_FILE_INPUT_ID}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </form>
  );
}
