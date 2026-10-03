"use client";

import { Loader2, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SpeakerAvatar } from "@/components/audio/AudioPlayer";
import { MediaImage } from "@/components/media/MediaImage";
import { Popover } from "@/components/ui/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import { generateVoice } from "@/lib/audio/voice";
import { cn } from "@/lib/cn";
import { kindLabel } from "@/lib/lineage";
import { useReferenceUrl } from "@/lib/media/useReferenceUrl";
import type { Asset, VoiceLanguage } from "@/lib/types";
import {
  AUDIO_FORMATS,
  DEFAULT_SPEAKER,
  MAX_SCRIPT_CHARS,
  MP3_BIT_RATES,
  SPEAKERS,
  VOICE_LANGUAGES,
  WAV_SAMPLE_RATES,
  audioFormatLabel,
  languageLabel,
  speakerLabel,
} from "@/lib/voices";
import { useAudioSession } from "@/store/audio";
import { useStudio } from "@/store/studio";

export const SCRIPT_INPUT_ID = "voice-script";

const EXAMPLES: Record<VoiceLanguage, { label: string; text: string }[]> = {
  en: [
    { label: "Product intro", text: "Meet Ember Tea. Small-batch leaves, slow-steeped warmth, and a ritual worth slowing down for." },
    { label: "Story opening", text: "The snow had been falling since dawn, and the little cabin at the edge of the forest was finally quiet." },
    { label: "Video voiceover", text: "Every great idea starts small. Watch it take shape, one frame at a time." },
  ],
  es: [
    { label: "Presentación", text: "Descubre Ember Tea: hojas seleccionadas, infusión lenta y un ritual que invita a hacer una pausa." },
    { label: "Historia", text: "La nieve caía desde el amanecer, y la pequeña cabaña al borde del bosque por fin estaba en silencio." },
  ],
};

export function VoiceComposer({ available }: { available: boolean | null }) {
  const draft = useStudio((s) => s.voiceDraft);
  const update = useStudio((s) => s.updateVoiceDraft);
  const parentId = useStudio((s) => s.voiceParent);
  const running = useAudioSession((s) => s.run?.status === "running");
  const failure = useAudioSession((s) => (s.run?.status === "failed" ? s.run.error : undefined));
  const length = draft.script.length;
  const over = length > MAX_SCRIPT_CHARS;
  const canGenerate = draft.script.trim().length > 0 && !over && !running && available !== false;

  const generate = () => {
    if (!canGenerate) return;
    const { voiceParent, projectContext } = useStudio.getState();
    void generateVoice(draft, { parentId: voiceParent, projectId: projectContext.audio });
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        generate();
      }}
    >
      {parentId && <VoiceoverSource assetId={parentId} />}

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor={SCRIPT_INPUT_ID} className="text-[13px] font-medium text-fg">
            Script
          </label>
          <span className={cn("font-mono text-2xs tabular-nums", over ? "text-danger" : "text-fg-subtle")} aria-live="polite">
            {length.toLocaleString()} / {MAX_SCRIPT_CHARS.toLocaleString()}
          </span>
        </div>
        <textarea
          id={SCRIPT_INPUT_ID}
          rows={7}
          value={draft.script}
          onChange={(e) => update({ script: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              generate();
            }
          }}
          aria-invalid={over || undefined}
          aria-describedby="voice-script-hint"
          placeholder={
            parentId
              ? "Write what the voiceover should say. Ember speaks exactly what you write."
              : "Write what you want to hear, exactly as it should be spoken…"
          }
          className="w-full resize-none rounded-card border border-line bg-surface-2 px-3.5 py-3 text-[15px] leading-relaxed text-fg placeholder:text-fg-subtle focus:border-white/20 focus:outline-none"
        />
        <p id="voice-script-hint" className="mt-1.5 text-xs text-fg-subtle">
          {over ? `Shorten the script by ${(length - MAX_SCRIPT_CHARS).toLocaleString()} characters.` : "Punctuation shapes the pacing. Ctrl+Enter generates."}
        </p>
        {!draft.script.trim() && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Example scripts">
            {EXAMPLES[draft.language].map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => update({ script: ex.text })}
                className="h-7 rounded-full border border-line px-3 text-xs text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                {ex.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-fg">Language</legend>
        <div className="inline-flex rounded-card border border-line bg-surface-2 p-1" role="radiogroup" aria-label="Language">
          {VOICE_LANGUAGES.map((l) => {
            const active = draft.language === l.id;
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  if (active) return;
                  update({ language: l.id, speaker: DEFAULT_SPEAKER[l.id] });
                }}
                className={cn(
                  "h-8 rounded-chip px-3.5 text-[13px] font-medium transition-colors",
                  active ? "border border-line-strong bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg-muted",
                )}
              >
                {l.native}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-fg-subtle">Each language has its own voice model and voices. Write the script in the language you pick.</p>
      </fieldset>

      {/* Keyed by language so a search typed for one language's voices never hides the other's. */}
      <SpeakerPicker key={draft.language} language={draft.language} value={draft.speaker} onChange={(speaker) => update({ speaker })} />

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={!canGenerate}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-card bg-accent text-[15px] font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          {running ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Sparkles aria-hidden="true" className="size-4" />}
          {running ? "Generating voice…" : "Generate voice"}
        </button>
        <div className="flex items-center justify-between gap-2">
          <AdvancedAudio />
          <span className="truncate text-xs text-fg-subtle">
            {speakerLabel(draft.speaker)} · {languageLabel(draft.language)}
          </span>
        </div>
        {available === false && <p className="text-xs text-danger">Voice isn&apos;t available right now.</p>}
        {failure && (
          <p role="status" className="text-xs leading-relaxed text-danger lg:hidden">
            {failure}
          </p>
        )}
      </div>
    </form>
  );
}

/** The video or image this voiceover is for, shown so the link is obvious and removable. */
function VoiceoverSource({ assetId }: { assetId: string }) {
  const asset = useStudio((s) => s.assets[assetId]);
  const setParent = useStudio((s) => s.setVoiceParent);
  if (!asset) return null;
  return (
    <div className="flex items-center gap-3 rounded-card border border-accent/25 bg-accent-soft p-2 pr-1.5">
      <SourceThumb asset={asset} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-fg">Voiceover for your {kindLabel(asset).toLowerCase()}</p>
        <p className="truncate text-xs text-fg-muted">{asset.settings.prompt || "Untitled"}</p>
      </div>
      <Tooltip label="Make standalone audio instead" align="end">
        <button
          type="button"
          aria-label="Remove voiceover source"
          onClick={() => setParent(undefined)}
          className="grid size-8 shrink-0 place-items-center rounded-chip text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </Tooltip>
    </div>
  );
}

/** Still for a visual asset: images show themselves; videos show their source image. */
export function SourceThumb({ asset, className }: { asset: Asset; className?: string }) {
  const refUrl = useReferenceUrl(asset.kind === "video" ? asset.settings.reference : undefined);
  const src = asset.kind === "video" ? refUrl : asset.kind === "image" ? asset.url : undefined;
  return (
    <div className={cn("relative size-11 shrink-0 overflow-hidden rounded-chip bg-surface-3", className)}>
      {src && <MediaImage src={src} alt="" sizes="48px" className="object-cover" />}
    </div>
  );
}

/** Browse the model's voices. Names are the model's; no claims are made about how each sounds. */
function SpeakerPicker({ language, value, onChange }: { language: VoiceLanguage; value: string; onChange: (speaker: string) => void }) {
  const [query, setQuery] = useState("");
  const speakers = SPEAKERS[language];
  const visible = useMemo(() => speakers.filter((s) => s.includes(query.trim().toLowerCase())), [speakers, query]);
  // Keep the selected voice in view when the list scrolls.
  useEffect(() => {
    document.getElementById(`speaker-${value}`)?.scrollIntoView({ block: "nearest" });
  }, [value, language]);

  return (
    <fieldset>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <legend className="text-[13px] font-medium text-fg">Voice</legend>
        <span className="font-mono text-2xs text-fg-subtle">{speakers.length} voices</span>
      </div>
      {speakers.length > 12 && (
        <div className="relative mb-2">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
          <label htmlFor="speaker-search" className="sr-only">
            Find a voice
          </label>
          <input
            id="speaker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a voice by name"
            className="h-8 w-full rounded-chip border border-line bg-surface-2 pr-2.5 pl-8 text-[13px] text-fg placeholder:text-fg-subtle focus:border-white/20 focus:outline-none"
          />
        </div>
      )}
      <div role="radiogroup" aria-label="Voice" className="grid max-h-[212px] grid-cols-2 gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {visible.map((speaker) => {
          const active = speaker === value;
          return (
            <button
              key={speaker}
              id={`speaker-${speaker}`}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(speaker)}
              className={cn(
                "flex h-11 items-center gap-2 rounded-card border px-2 text-left text-[13px] font-medium outline-offset-[-2px] transition-colors",
                active ? "border-accent/60 bg-accent-soft text-fg" : "border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg",
              )}
            >
              <SpeakerAvatar speaker={speaker} size="sm" />
              <span className="truncate">{speakerLabel(speaker)}</span>
            </button>
          );
        })}
        {visible.length === 0 && <p className="col-span-full py-3 text-center text-xs text-fg-subtle">No voice named “{query}”.</p>}
      </div>
      <p className="mt-1.5 text-xs text-fg-subtle">Voice names come from the model. Generate a short line to hear one.</p>
    </fieldset>
  );
}

/** Output format for people who need it; the default (MP3, 48 kbps) suits most work. */
function AdvancedAudio() {
  const draft = useStudio((s) => s.voiceDraft);
  const update = useStudio((s) => s.updateVoiceDraft);
  const option = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-start rounded-chip border px-2.5 py-2 text-left transition-colors",
      active ? "border-accent/60 bg-accent-soft" : "border-line hover:border-line-strong",
    );
  return (
    <Popover
      label="Audio output"
      side="top"
      width={300}
      trigger={(props) => (
        <button
          type="button"
          {...props}
          className="flex h-8 items-center gap-1.5 rounded-chip px-2 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <SlidersHorizontal aria-hidden="true" className="size-3.5" />
          Advanced · <span className="font-mono">{audioFormatLabel(draft)}</span>
        </button>
      )}
    >
      <div className="flex flex-col gap-3 p-1.5">
        <div>
          <p className="mb-1.5 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">File format</p>
          <div className="flex gap-1.5" role="radiogroup" aria-label="File format">
            {AUDIO_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={draft.format === f.id}
                onClick={() =>
                  update(f.id === "wav" ? { format: "wav", sampleRate: draft.sampleRate ?? 24000 } : { format: "mp3", bitRate: draft.bitRate ?? 48000 })
                }
                className={option(draft.format === f.id)}
              >
                <span className="text-[13px] font-medium text-fg">{f.label}</span>
                <span className="text-2xs text-fg-muted">{f.description}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">{draft.format === "wav" ? "Sample rate" : "Bit rate"}</p>
          <div className="flex gap-1.5" role="radiogroup" aria-label={draft.format === "wav" ? "Sample rate" : "Bit rate"}>
            {(draft.format === "wav" ? WAV_SAMPLE_RATES : MP3_BIT_RATES).map((r) => {
              const active = draft.format === "wav" ? (draft.sampleRate ?? 24000) === r.value : (draft.bitRate ?? 48000) === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update(draft.format === "wav" ? { sampleRate: r.value } : { bitRate: r.value })}
                  className={option(active)}
                >
                  <span className="font-mono text-xs text-fg">{r.label}</span>
                  <span className="text-2xs text-fg-muted">{r.description}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="px-0.5 text-xs leading-snug text-fg-subtle">These are the model&apos;s own output settings. MP3 is always 22.05 kHz.</p>
      </div>
    </Popover>
  );
}
