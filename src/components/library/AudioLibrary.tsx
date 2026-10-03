"use client";

import { useRouter } from "next/navigation";
import { Download, Heart, Loader2, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { AudioPlayer, SpeakerAvatar } from "@/components/audio/AudioPlayer";
import { FavoriteButton } from "@/components/create/ResultActions";
import { MediaCard } from "@/components/media/MediaCard";
import { MetaList, PromptBlock } from "@/components/media/MediaViewer";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { downloadWithFeedback, loadVoiceDraft } from "@/lib/actions";
import { regenerateVoice } from "@/lib/audio/voice";
import type { Asset } from "@/lib/types";
import { audioFormatLabel, formatDuration, languageLabel, speakerHue, speakerLabel } from "@/lib/voices";
import { useAudioSession } from "@/store/audio";
import { useStudio } from "@/store/studio";
import { AssetRelations } from "./AssetRelations";

function background(speaker: string) {
  const hue = speakerHue(speaker);
  return `radial-gradient(120% 90% at 0% 0%, hsl(${hue} 45% 20% / 0.9), transparent 60%), linear-gradient(160deg, hsl(${(hue + 40) % 360} 25% 12%), #111113)`;
}

/** Library card for a voice: speaker, a script excerpt and a compact player that plays in place. */
export function AudioCard({ asset, onOpen }: { asset: Asset; onOpen: () => void }) {
  const audio = asset.audio!;
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  return (
    <MediaCard
      src=""
      alt=""
      aspect={1}
      sizes="25vw"
      openLabel={`Open voice: ${speakerLabel(audio.speaker)}, “${audio.script.slice(0, 60)}”`}
      onOpen={onOpen}
      media={<span className="absolute inset-0" style={{ background: background(audio.speaker) }} />}
    >
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center gap-2">
        <SpeakerAvatar speaker={audio.speaker} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-white">{speakerLabel(audio.speaker)}</span>
          <span className="block font-mono text-2xs text-white/60">
            Voice · {formatDuration(audio.duration)}
          </span>
        </span>
        {asset.favorite && <Heart aria-label="Favorite" className="ml-auto size-3.5 shrink-0 fill-current text-accent" />}
      </div>
      <p className="pointer-events-none absolute inset-x-3 top-[3.4rem] line-clamp-2 text-[13px] leading-snug text-white/80 sm:line-clamp-4">
        {audio.script}
      </p>
      <div className="absolute inset-x-3 bottom-2.5">
        <AudioPlayer asset={asset} variant="compact" />
      </div>
      <div className="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden">
        <FavoriteButton asset={asset} onToggle={() => toggleFavorite(asset.id)} variant="glass" align="end" />
      </div>
    </MediaCard>
  );
}

/** The viewer's media area for a voice: identity and a full player. */
export function AudioViewerStage({ asset }: { asset: Asset }) {
  const audio = asset.audio!;
  return (
    <div className="flex size-full flex-col justify-between p-5 sm:p-8" style={{ background: background(audio.speaker) }}>
      <div className="flex items-center gap-3">
        <SpeakerAvatar speaker={audio.speaker} size="lg" />
        <div>
          <p className="text-lg font-semibold text-white">{speakerLabel(audio.speaker)}</p>
          <p className="font-mono text-xs text-white/60">
            {languageLabel(audio.language)} · {formatDuration(audio.duration)}
          </p>
        </div>
      </div>
      <p className="my-4 line-clamp-3 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">“{audio.script}”</p>
      <AudioPlayer asset={asset} variant="full" />
    </div>
  );
}

/** Library detail panel for a voice. */
export function AudioDetails({ asset }: { asset: Asset }) {
  const router = useRouter();
  const audio = asset.audio!;
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const [downloading, setDownloading] = useState(false);
  const created = new Date(asset.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  const secondary =
    "flex h-10 items-center justify-center gap-2 rounded-card border border-line-strong bg-surface-2 px-3 text-[13px] font-medium text-fg transition-colors duration-150 hover:border-white/20 hover:bg-surface-3 disabled:opacity-60";

  const openInAudio = () => {
    loadVoiceDraft(asset);
    useAudioSession.getState().setTab("voice");
    useAudioSession.getState().showTake(asset.id);
    router.push("/create/audio");
  };

  return (
    <div className="flex flex-col gap-6 p-5 sm:p-6">
      <p className="pr-10 font-mono text-2xs tracking-[0.14em] text-fg-subtle uppercase lg:pr-0">Voice · {created}</p>

      <PromptBlock prompt={audio.script} label="Script" />

      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" onClick={openInAudio} className="w-full">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Open in Audio
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={secondary}
            onClick={() => {
              useAudioSession.getState().setTab("voice");
              void regenerateVoice(asset);
              router.push("/create/audio");
            }}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Regenerate
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(asset.id)}
            aria-pressed={asset.favorite}
            className={cn(secondary, asset.favorite && "text-accent")}
          >
            <Heart aria-hidden="true" className={cn("size-4", asset.favorite && "fill-current")} />
            {asset.favorite ? "Favorited" : "Favorite"}
          </button>
          <button
            type="button"
            disabled={downloading}
            className={secondary}
            onClick={async () => {
              setDownloading(true);
              await downloadWithFeedback(asset);
              setDownloading(false);
            }}
          >
            {downloading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
            Download
          </button>
        </div>
      </div>

      <MetaList
        rows={[
          { label: "Method", value: "AI voice" },
          ...(asset.modelLabel ? [{ label: "Model", value: asset.modelLabel }] : []),
          { label: "Voice", value: speakerLabel(audio.speaker) },
          { label: "Language", value: languageLabel(audio.language) },
          { label: "Duration", value: formatDuration(audio.duration) },
          { label: "Format", value: audioFormatLabel(audio) },
          ...(audio.bytes ? [{ label: "File size", value: `${Math.max(1, Math.round(audio.bytes / 1024))} KB` }] : []),
        ]}
      />

      <AssetRelations asset={asset} />
    </div>
  );
}
