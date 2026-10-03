"use client";

import { Clapperboard, Compass, Download, Heart, ImageUp, Images, Loader2, Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ACTION_COPY, TileActions, useAssetActions } from "@/components/create/ResultActions";
import { HOVER_REVEAL, MediaCard } from "@/components/media/MediaCard";
import { MediaViewer, MetaList, PromptBlock } from "@/components/media/MediaViewer";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { cn } from "@/lib/cn";
import { INTENTS } from "@/lib/constants";
import { findExploreItem } from "@/lib/explore";
import { AiVideoCard, AiVideoDetails, MotionCard, MotionDetails } from "./MotionLibrary";
import { VideoFilePlayer } from "@/components/motion/VideoFilePlayer";
import { ReferenceRow } from "@/components/media/ReferenceRow";
import { MotionPlayer } from "@/components/motion/MotionPlayer";
import type { Asset, LibraryFilter } from "@/lib/types";
import { useHydrated } from "@/store/hydration";
import { useStudio } from "@/store/studio";

const GRID_SIZES = "(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw";

function matches(asset: Asset, filter: LibraryFilter) {
  if (filter === "images") return asset.kind === "image";
  if (filter === "videos") return asset.kind === "video";
  if (filter === "favorites") return asset.favorite;
  return true;
}

export function LibraryView() {
  const hydrated = useHydrated();
  const assets = useStudio(useShallow((s) => Object.values(s.assets)));
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(() => [...assets].sort((a, b) => b.createdAt - a.createdAt), [assets]);
  const visible = useMemo(() => sorted.filter((a) => matches(a, filter)), [sorted, filter]);
  const counts = useMemo(
    () => ({
      all: sorted.length,
      images: sorted.filter((a) => a.kind === "image").length,
      videos: sorted.filter((a) => a.kind === "video").length,
      favorites: sorted.filter((a) => a.favorite).length,
    }),
    [sorted],
  );

  if (!hydrated) return <div className="min-h-[50dvh]" aria-busy="true" />;

  if (sorted.length === 0) {
    return (
      <EmptyPanel>
        <EmptyState
          icon={Images}
          title="No generations yet"
          description="Everything you create is saved here on this device, ready to view, favorite, remix or download."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/create/image" variant="primary">
                <Sparkles aria-hidden="true" className="size-4" />
                Start creating
              </ButtonLink>
              <ButtonLink href="/explore" variant="secondary">
                <Compass aria-hidden="true" className="size-4" />
                Browse Explore
              </ButtonLink>
            </div>
          }
        />
      </EmptyPanel>
    );
  }

  return (
    <>
      <div className="mb-5">
        <FilterChips
          label="Filter library"
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All", count: counts.all },
            { id: "images", label: "Images", count: counts.images },
            { id: "videos", label: "Videos", count: counts.videos },
            { id: "favorites", label: "Favorites", count: counts.favorites },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <FilteredEmpty filter={filter} />
      ) : (
        <ul className="columns-2 gap-3 md:columns-3 xl:columns-4 2xl:columns-5 [&>li]:mb-3">
          {visible.map((asset, i) => (
            <li key={asset.id} className="break-inside-avoid">
              <LibraryCard asset={asset} preload={i < 4} onOpen={() => setOpenId(asset.id)} />
            </li>
          ))}
        </ul>
      )}

      <AssetViewer assets={visible} openId={openId} onOpenChange={setOpenId} />
    </>
  );
}

/**
 * The focused view for the user's own assets (images and motion clips), shared
 * by the Library grid. `assets` is the list that previous/next steps through.
 */
export function AssetViewer({
  assets,
  openId,
  onOpenChange,
}: {
  assets: Asset[];
  openId: string | null;
  onOpenChange: (id: string | null) => void;
}) {
  const [replayKey, setReplayKey] = useState(0);
  // Follows the asset by id from the store, so unfavoriting inside Favorites doesn't yank it away.
  const open = useStudio((s) => (openId ? (s.assets[openId] ?? null) : null));
  const openIndex = open ? assets.findIndex((a) => a.id === open.id) : -1;
  const step = (delta: number) => {
    if (openIndex < 0 || assets.length < 2) return;
    onOpenChange(assets[(openIndex + delta + assets.length) % assets.length].id);
  };

  return (
    <MediaViewer
      label={open ? (open.renderer === "motion" ? "Motion Preview" : open.renderer === "file" ? "AI video" : "Library item") : "Library"}
      media={
        open && {
          key: open.id,
          src: open.url,
          alt: open.settings.prompt,
          aspect: open.width / open.height,
          node:
            open.renderer === "file" ? (
              <VideoFilePlayer src={open.url} mode="controls" />
            ) : open.renderer === "motion" ? (
              <MotionPlayer
                source={open.settings.reference}
                preset={open.settings.motion ?? "push-in"}
                duration={open.settings.duration ?? 5}
                mode="once"
                playKey={replayKey}
              />
            ) : undefined,
        }
      }
      onClose={() => onOpenChange(null)}
      onPrev={openIndex >= 0 && assets.length > 1 ? () => step(-1) : undefined}
      onNext={openIndex >= 0 && assets.length > 1 ? () => step(1) : undefined}
      details={
        open &&
        (open.renderer === "file" ? (
          <AiVideoDetails asset={open} />
        ) : open.renderer === "motion" ? (
          <MotionDetails asset={open} onReplay={() => setReplayKey((k) => k + 1)} />
        ) : (
          <AssetDetails asset={open} />
        ))
      }
    />
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[50dvh] flex-1 rounded-panel border border-dashed border-line">{children}</div>;
}

function FilteredEmpty({ filter }: { filter: LibraryFilter }) {
  if (filter === "videos") {
    return (
      <EmptyPanel>
        <EmptyState
          icon={Clapperboard}
          className="flex-1"
          title="No videos yet"
          description="Clips you make in the Video workspace will appear here. Use Animate on any image to start one."
          action={
            <ButtonLink href="/create/video" variant="secondary">
              <Clapperboard aria-hidden="true" className="size-4" />
              Open Video
            </ButtonLink>
          }
        />
      </EmptyPanel>
    );
  }
  if (filter === "favorites") {
    return (
      <EmptyPanel>
        <EmptyState
          icon={Heart}
          className="flex-1"
          title="No favorites yet"
          description="Tap the heart on any result, in Create or here, and it will be collected in this view."
        />
      </EmptyPanel>
    );
  }
  return (
    <EmptyPanel>
      <EmptyState icon={Images} className="flex-1" title="Nothing here yet" description="Images you generate will appear here." />
    </EmptyPanel>
  );
}

function LibraryCard({ asset, preload, onOpen }: { asset: Asset; preload: boolean; onOpen: () => void }) {
  if (asset.renderer === "motion") return <MotionCard asset={asset} onOpen={onOpen} />;
  if (asset.renderer === "file") return <AiVideoCard asset={asset} onOpen={onOpen} />;
  return (
    <MediaCard
      src={asset.url}
      alt={asset.settings.prompt}
      aspect={asset.width / asset.height}
      sizes={GRID_SIZES}
      preload={preload}
      openLabel={`Open: ${asset.settings.prompt}`}
      onOpen={onOpen}
      scrim={
        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45", HOVER_REVEAL)} />
      }
    >
      {asset.favorite && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-black/45 text-accent backdrop-blur-md transition-opacity duration-200 group-focus-within:opacity-0 group-hover:opacity-0 [@media(hover:none)]:hidden"
        >
          <Heart className="size-3.5 fill-current" />
        </span>
      )}
      <div className={HOVER_REVEAL}>
        <TileActions asset={asset} />
      </div>
    </MediaCard>
  );
}

function AssetDetails({ asset }: { asset: Asset }) {
  const a = useAssetActions(asset);
  const intent = INTENTS.find((i) => i.id === asset.settings.intent)?.label ?? asset.settings.intent;
  const created = new Date(asset.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  const parentExample = findExploreItem(asset.parentId);
  const parentAsset = useStudio((s) => (asset.parentId ? s.assets[asset.parentId] : undefined));
  const lineage = parentExample ? `Explore · ${parentExample.title}` : parentAsset ? "Your earlier result" : null;

  const secondary =
    "flex h-10 items-center justify-center gap-2 rounded-card border border-line-strong bg-surface-2 px-3 text-[13px] font-medium text-fg transition-colors duration-150 hover:border-white/20 hover:bg-surface-3";

  return (
    <div className="flex flex-col gap-6 p-5 sm:p-6">
      <div className="pr-10 lg:pr-0">
        <p className="font-mono text-2xs tracking-[0.14em] text-fg-subtle uppercase">{asset.kind === "video" ? "Video" : "Image"} · {created}</p>
      </div>

      <PromptBlock prompt={asset.settings.prompt} />

      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" onClick={a.remix} className="w-full">
          <Shuffle aria-hidden="true" className="size-4" />
          {ACTION_COPY.remix.label}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={a.reference} className={secondary}>
            <ImageUp aria-hidden="true" className="size-4" />
            Use as reference
          </button>
          {asset.kind === "image" && (
            <button type="button" onClick={a.animate} className={secondary}>
              <Clapperboard aria-hidden="true" className="size-4" />
              {ACTION_COPY.animate.label}
            </button>
          )}
          <button
            type="button"
            onClick={a.favorite}
            aria-pressed={asset.favorite}
            className={cn(secondary, asset.favorite && "text-accent")}
          >
            <Heart aria-hidden="true" className={cn("size-4", asset.favorite && "fill-current")} />
            {asset.favorite ? "Favorited" : "Favorite"}
          </button>
          <button type="button" onClick={a.download} disabled={a.downloading} className={cn(secondary, "disabled:opacity-60")}>
            {a.downloading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
            {ACTION_COPY.download.label}
          </button>
        </div>
      </div>

      <MetaList
        rows={[
          { label: "Engine", value: asset.resolvedModel },
          ...(asset.modelLabel ? [{ label: "Model", value: asset.modelLabel }] : []),
          { label: "Style", value: intent },
          { label: "Aspect ratio", value: asset.settings.aspect },
          { label: "Size", value: `${asset.width}×${asset.height}` },
          ...(lineage ? [{ label: "Based on", value: lineage }] : []),
        ]}
      />

      {asset.settings.reference && <ReferenceRow asset={asset} />}

      {asset.attribution && (
        <p className="text-xs text-fg-subtle">
          Local preview result: photo by{" "}
          <a href={asset.attribution.url} target="_blank" rel="noreferrer" className="text-fg-muted underline-offset-2 hover:text-fg hover:underline">
            {asset.attribution.name}
          </a>{" "}
          on Unsplash
        </p>
      )}
    </div>
  );
}
