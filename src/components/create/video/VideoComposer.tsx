"use client";

import { ArrowLeft, ArrowRight, ArrowUp, Clock3, Film, Focus, ImagePlus, Loader2, Maximize2, Orbit, PenLine, Sparkles, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { MotionGlyph } from "@/components/motion/MotionGlyph";
import { SelectMenu, type SelectOption } from "@/components/ui/SelectMenu";
import { Tooltip } from "@/components/ui/Tooltip";
import { setVideoSource } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { AI_CAMERA_PRESETS, AI_VIDEO_DURATIONS, AI_VIDEO_RESOLUTIONS, MOTION_PRESETS, VIDEO_DURATIONS } from "@/lib/constants";
import { checkAiVideoAvailability } from "@/lib/generation/ai-video-engine";
import { localMotionEngine } from "@/lib/generation/local-motion-engine";
import { startGeneration } from "@/lib/generation/run";
import { useVideoSourceUpload } from "@/lib/media/useVideoSourceUpload";
import type { AiCameraPreset, GenSettings, MotionPreset, VideoDuration, VideoEngineKind, VideoResolution } from "@/lib/types";
import { useStudio } from "@/store/studio";
import { AspectPicker } from "../controls";
import { ReferenceChip } from "../ReferenceControl";

export const VIDEO_FILE_INPUT_ID = "video-source-input";

const subscribeNoop = () => () => {};
function useIsMac() {
  return useSyncExternalStore(subscribeNoop, () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent), () => true);
}

/** Whether the server has AI video configured; null while unknown. */
export function useAiVideoAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void checkAiVideoAvailability().then((ok) => {
      if (alive) setAvailable(ok);
    });
    return () => {
      alive = false;
    };
  }, []);
  return available;
}

/** The engine a video draft will actually use (AI video falls back to Motion Preview when unavailable). */
export function effectiveVideoEngine(draft: GenSettings, aiAvailable: boolean | null): VideoEngineKind {
  return draft.videoEngine === "ai" && aiAvailable !== false ? "ai" : "motion";
}

/** Keeps the duration valid for the chosen engine. */
export function durationFor(engine: VideoEngineKind, duration: VideoDuration | undefined): VideoDuration {
  const options = engine === "ai" ? AI_VIDEO_DURATIONS : VIDEO_DURATIONS;
  return duration && options.includes(duration) ? duration : 5;
}

export function MotionPicker({ value, onChange }: { value: MotionPreset; onChange: (v: MotionPreset) => void }) {
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
      footer={<p className="text-xs leading-snug text-fg-subtle">{localMotionEngine.description}</p>}
    />
  );
}

const CAMERA_ICONS: Record<AiCameraPreset, ReactNode> = {
  "push-in": <Focus aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  "pull-back": <Maximize2 aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  "pan-left": <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  "pan-right": <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  static: <Video aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  orbit: <Orbit aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  none: <PenLine aria-hidden="true" className="size-4" strokeWidth={1.75} />,
};

/** AI video camera move: added to the request as explicit camera direction. */
export function CameraPicker({ value, onChange }: { value: AiCameraPreset; onChange: (v: AiCameraPreset) => void }) {
  const options: SelectOption<AiCameraPreset>[] = AI_CAMERA_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    icon: CAMERA_ICONS[p.id],
  }));
  return (
    <SelectMenu
      label="Camera"
      value={value}
      options={options}
      onChange={onChange}
      footer={
        <p className="text-xs leading-snug text-fg-subtle">
          Ember adds clear camera direction to your description, so the camera moves rather than objects in the scene.
        </p>
      }
    />
  );
}

function Segmented<T extends string | number>({
  label,
  hint,
  icon,
  options,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  icon?: ReactNode;
  options: { id: T; label: string; ariaLabel?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <Tooltip label={hint}>
      <div role="radiogroup" aria-label={label} className="flex h-9 items-center gap-0.5 rounded-chip p-0.5">
        {icon}
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={o.ariaLabel ?? o.label}
              onClick={() => onChange(o.id)}
              className={cn(
                "h-8 min-w-9 rounded-[6px] px-2 font-mono text-xs transition-colors duration-150",
                active ? "bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg-muted",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </Tooltip>
  );
}

export function DurationPicker({
  value,
  onChange,
  options = VIDEO_DURATIONS,
}: {
  value: VideoDuration;
  onChange: (v: VideoDuration) => void;
  options?: VideoDuration[];
}) {
  return (
    <Segmented
      label="Duration"
      hint="Clip length"
      icon={<Clock3 aria-hidden="true" className="mx-1 size-4 text-fg-subtle" strokeWidth={1.75} />}
      options={options.map((d) => ({ id: d, label: `${d}s`, ariaLabel: `${d} seconds` }))}
      value={value}
      onChange={onChange}
    />
  );
}

/** AI Video vs Motion Preview: two honest, clearly different ways to make a clip. */
function EngineSwitch({ value, aiAvailable, onChange }: { value: VideoEngineKind; aiAvailable: boolean | null; onChange: (v: VideoEngineKind) => void }) {
  const items: { id: VideoEngineKind; label: string; icon: ReactNode; hint: string; disabled?: boolean }[] = [
    {
      id: "ai",
      label: "AI Video",
      icon: <Sparkles aria-hidden="true" className="size-3.5" strokeWidth={2} />,
      hint: aiAvailable === false ? "AI video isn't available right now" : "Real AI image-to-video: new motion generated from your image and prompt",
      disabled: aiAvailable === false,
    },
    {
      id: "motion",
      label: "Motion Preview",
      icon: <Film aria-hidden="true" className="size-3.5" strokeWidth={2} />,
      hint: "A camera move over your image, rendered in the browser. Not AI-generated video.",
    },
  ];
  return (
    <div role="radiogroup" aria-label="Video type" className="flex rounded-[10px] border border-line bg-surface-1 p-0.5">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <Tooltip key={item.id} label={item.hint}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              disabled={item.disabled}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
                active ? "bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg-muted",
              )}
            >
              <span className={cn(active && "text-accent")}>{item.icon}</span>
              {item.label}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** Bottom-docked Video composer: source, engine, prompt, and only the controls that engine supports. */
export function VideoComposer() {
  const draft = useStudio((s) => s.drafts.video);
  const updateDraft = useStudio((s) => s.updateDraft);
  const videoJobActive = useStudio((s) =>
    Object.values(s.jobs).some((j) => j.settings.mode === "video" && (j.status === "queued" || j.status === "running")),
  );
  const aiAvailable = useAiVideoAvailable();
  const { busy, upload } = useVideoSourceUpload();
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isMac = useIsMac();

  const engine = effectiveVideoEngine(draft, aiAvailable);
  const ai = engine === "ai";
  const motion = draft.motion ?? "push-in";
  const duration = durationFor(engine, draft.duration);
  const resolution = draft.resolution ?? "480p";
  const camera = draft.camera ?? "push-in";

  const missing = !draft.reference
    ? "Choose a source image first"
    : ai && camera === "none" && !draft.prompt.trim()
      ? "Describe the motion or pick a camera move"
      : null;
  const canGenerate = !missing && !busy && !videoJobActive;

  const generate = useCallback(() => {
    if (!canGenerate) return;
    const current = useStudio.getState().drafts.video;
    void startGeneration({ ...current, videoEngine: engine, duration: durationFor(engine, current.duration) });
  }, [canGenerate, engine]);

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

  const setEngine = (kind: VideoEngineKind) => updateDraft("video", { videoEngine: kind, duration: durationFor(kind, draft.duration) });
  const buttonHint = videoJobActive ? "A video is already being made" : missing ?? (ai ? "Generate a real AI video" : "Create a Motion Preview in your browser");

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
        {ai ? "Describe what moves in the scene" : "Shot note (optional)"}
      </label>
      <input
        id="video-note"
        type="text"
        value={draft.prompt}
        onChange={(e) => updateDraft("video", { prompt: e.target.value })}
        placeholder={
          ai
            ? camera === "none"
              ? "Describe the motion… e.g. the camera slowly moves in as snow falls"
              : "Describe what moves in the scene (optional)… e.g. steam rises, snow drifts down"
            : "Describe the shot (optional), saved with the clip"
        }
        className="block w-full bg-transparent px-4 pt-3.5 pb-2 text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none sm:px-5"
      />

      <div className="flex flex-wrap items-center gap-1 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
        <EngineSwitch value={engine} aiAvailable={aiAvailable} onChange={setEngine} />
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
        {ai ? (
          <>
            <CameraPicker value={camera} onChange={(c) => updateDraft("video", { camera: c })} />
            <DurationPicker value={duration} options={AI_VIDEO_DURATIONS} onChange={(d) => updateDraft("video", { duration: d })} />
            <Segmented<VideoResolution>
              label="Resolution"
              hint="Output resolution. The video keeps your image's shape."
              options={AI_VIDEO_RESOLUTIONS.map((r) => ({ id: r.id, label: r.label, ariaLabel: `${r.label}: ${r.description}` }))}
              value={resolution}
              onChange={(r) => updateDraft("video", { resolution: r })}
            />
          </>
        ) : (
          <>
            <MotionPicker value={motion} onChange={(m) => updateDraft("video", { motion: m })} />
            <DurationPicker value={duration} onChange={(d) => updateDraft("video", { duration: d })} />
            <AspectPicker value={draft.aspect} onChange={(aspect) => updateDraft("video", { aspect })} />
          </>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-mono text-2xs text-fg-subtle md:inline" aria-hidden="true">
            {isMac ? "⌘" : "Ctrl"} ↵
          </span>
          <Tooltip label={buttonHint} align="end">
            <button
              type="submit"
              disabled={!canGenerate}
              aria-keyshortcuts={isMac ? "Meta+Enter" : "Control+Enter"}
              className="group flex h-10 items-center gap-2 rounded-card bg-accent pr-3 pl-4 text-sm font-semibold text-accent-fg transition-[background-color,transform,opacity] duration-150 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-press disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-subtle"
            >
              {videoJobActive ? "Working" : ai ? "Generate AI Video" : "Create preview"}
              <span className="grid size-6 place-items-center rounded-full bg-black/15 transition-transform duration-150 group-enabled:group-hover:-translate-y-px group-disabled:bg-white/5">
                {videoJobActive ? (
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <ArrowUp aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                )}
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
