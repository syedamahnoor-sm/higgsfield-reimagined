"use client";

import { useSearchParams } from "next/navigation";
import { ArrowDownUp, AudioLines, Bookmark, Clapperboard, Compass, Download, Heart, ImageUp, Images, Loader2, Search, SearchX, Shuffle, Sparkles, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ACTION_COPY, TileActions, useAssetActions } from "@/components/create/ResultActions";
import { HOVER_REVEAL, MediaCard } from "@/components/media/MediaCard";
import { MediaViewer, MetaList, PromptBlock } from "@/components/media/MediaViewer";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { cn } from "@/lib/cn";
import { directionLabel, lookLabel, qualityLabel, qualityOf } from "@/lib/creative";
import { SaveElementPopover } from "@/components/create/SaveElement";
import { ElementsGrid } from "./ElementsGrid";
import { elementNameFrom } from "@/lib/actions";
import { findExploreItem } from "@/lib/explore";
import { AiVideoCard, AiVideoDetails, MotionCard, MotionDetails } from "./MotionLibrary";
import { VideoFilePlayer } from "@/components/motion/VideoFilePlayer";
import { ReferenceRow } from "@/components/media/ReferenceRow";
import { MotionPlayer } from "@/components/motion/MotionPlayer";
import type { Asset, LibraryFilter } from "@/lib/types";
import { assetSearchText, elementSearchText, matchesQuery, projectNamesById } from "@/lib/search";
import { OpenAssetContext } from "@/components/lineage/Lineage";
import { AudioCard, AudioDetails, AudioViewerStage } from "./AudioLibrary";
import { AssetRelations } from "./AssetRelations";
import { useHydrated } from "@/store/hydration";
import { useStudio } from "@/store/studio";

const GRID_SIZES = "(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw";

const FILTERS: LibraryFilter[] = ["all", "images", "videos", "audio", "favorites", "elements"];

function matches(asset: Asset, filter: LibraryFilter) {
  if (filter === "images") return asset.kind === "image";
  if (filter === "videos") return asset.kind === "video";
  if (filter === "audio") return asset.kind === "audio";
  if (filter === "favorites") return asset.favorite;
  return true;
}

export function LibraryView() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const assets = useStudio(useShallow((s) => Object.values(s.assets)));
  const elements = useStudio(useShallow((s) => Object.values(s.elements)));
  const projects = useStudio((s) => s.projects);
  const initialFilter = params.get("filter") as LibraryFilter | null;
  const [filter, setFilter] = useState<LibraryFilter>(initialFilter && FILTERS.includes(initialFilter) ? initialFilter : "all");
  // Deep link: /library?open=<asset id> opens that asset (from lineage, Audio, the command palette).
  const [openId, setOpenId] = useState<string | null>(params.get("open"));
  const openParam = params.get("open");
  const [seenParam, setSeenParam] = useState(openParam);
  if (openParam !== seenParam) {
    // A new deep link while already on the Library (adjusting state during render, not in an effect).
    setSeenParam(openParam);
    if (openParam) setOpenId(openParam);
  }
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");

  const names = useMemo(() => projectNamesById(projects), [projects]);
  const sorted = useMemo(
    () => [...assets].sort((a, b) => (order === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt)),
    [assets, order],
  );
  const searched = useMemo(
    () => (query.trim() ? sorted.filter((a) => matchesQuery(assetSearchText(a, names.get(a.id)), query)) : sorted),
    [sorted, query, names],
  );
  const matchingElements = useMemo(
    () => (query.trim() ? elements.filter((e) => matchesQuery(elementSearchText(e, names.get(e.id)), query)) : elements),
    [elements, query, names],
  );
  const visible = useMemo(() => searched.filter((a) => matches(a, filter)), [searched, filter]);
  const counts = useMemo(
    () => ({
      all: searched.length,
      images: searched.filter((a) => a.kind === "image").length,
      videos: searched.filter((a) => a.kind === "video").length,
      audio: searched.filter((a) => a.kind === "audio").length,
      favorites: searched.filter((a) => a.favorite).length,
      elements: matchingElements.length,
    }),
    [searched, matchingElements],
  );
  const elementCount = elements.length;

  if (!hydrated) return <div className="min-h-[50dvh]" aria-busy="true" />;

  if (sorted.length === 0 && elementCount === 0) {
    return (
      <EmptyPanel>
        <EmptyState
          icon={Images}
          className="flex-1"
          title="No generations yet"
          description="Every image, video and voice you create is saved here on this device, ready to search, favorite, reuse or add to a project."
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

  const searching = query.trim().length > 0;

  return (
    <>
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <LibrarySearch value={query} onChange={setQuery} />
          <button
            type="button"
            onClick={() => setOrder((o) => (o === "newest" ? "oldest" : "newest"))}
            aria-label={`Sort: ${order === "newest" ? "newest first" : "oldest first"}. Change order`}
            className="flex h-10 shrink-0 items-center gap-2 rounded-card border border-line px-3 text-[13px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <ArrowDownUp aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">{order === "newest" ? "Newest" : "Oldest"}</span>
          </button>
        </div>
        <FilterChips
          label="Filter library"
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All", count: counts.all },
            { id: "images", label: "Images", count: counts.images },
            { id: "videos", label: "Videos", count: counts.videos },
            { id: "audio", label: "Audio", count: counts.audio },
            { id: "favorites", label: "Favorites", count: counts.favorites },
            { id: "elements", label: "Elements", count: counts.elements },
          ]}
        />
        {searching && filter !== "elements" && matchingElements.length > 0 && (
          <p className="text-[13px] text-fg-muted">
            {matchingElements.length === 1 ? "1 Element also matches." : `${matchingElements.length} Elements also match.`}{" "}
            <button type="button" onClick={() => setFilter("elements")} className="font-medium text-accent hover:underline">
              Show Elements
            </button>
          </p>
        )}
      </div>

      {filter === "elements" ? (
        searching && matchingElements.length === 0 && elementCount > 0 ? (
          <SearchEmpty query={query} onClear={() => setQuery("")} />
        ) : (
          <ElementsGrid ids={searching ? matchingElements.map((e) => e.id) : undefined} />
        )
      ) : visible.length === 0 ? (
        searching ? <SearchEmpty query={query} onClear={() => setQuery("")} /> : <FilteredEmpty filter={filter} />
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
    <OpenAssetContext.Provider value={onOpenChange}>
    <MediaViewer
      label={
        open
          ? open.kind === "audio"
            ? "Voice"
            : open.renderer === "motion"
              ? "Motion Preview"
              : open.renderer === "file"
                ? "AI video"
                : "Library item"
          : "Library"
      }
      media={
        open && {
          key: open.id,
          src: open.url,
          alt: open.settings.prompt,
          aspect: open.kind === "audio" ? 16 / 10 : open.width / open.height,
          node:
            open.kind === "audio" ? (
              <AudioViewerStage asset={open} />
            ) : open.renderer === "file" ? (
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
        (open.kind === "audio" ? (
          <AudioDetails asset={open} />
        ) : open.renderer === "file" ? (
          <AiVideoDetails asset={open} />
        ) : open.renderer === "motion" ? (
          <MotionDetails asset={open} onReplay={() => setReplayKey((k) => k + 1)} />
        ) : (
          <AssetDetails asset={open} />
        ))
      }
    />
    </OpenAssetContext.Provider>
  );
}

function LibrarySearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-md">
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
      <label htmlFor="library-search" className="sr-only">
        Search your Library
      </label>
      <input
        ref={ref}
        id="library-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder="Search prompts, scripts, Elements, projects…"
        autoComplete="off"
        className="h-10 w-full rounded-card border border-line bg-surface-1 pr-9 pl-9 text-sm text-fg placeholder:text-fg-subtle focus:border-white/20 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
          className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-chip text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}

function SearchEmpty({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyPanel>
      <EmptyState
        icon={SearchX}
        className="flex-1"
        title={`Nothing matches “${query.trim()}”`}
        description="Search looks through prompts, edit instructions, voice scripts, Element names, project names, directions and looks. Try fewer or different words."
        action={
          <Button variant="secondary" onClick={onClear}>
            Clear search
          </Button>
        }
      />
    </EmptyPanel>
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
  if (filter === "audio") {
    return (
      <EmptyPanel>
        <EmptyState
          icon={AudioLines}
          className="flex-1"
          title="No audio yet"
          description="Voices you generate in Create → Audio are saved here, ready to play, download or add to a project. Try a voiceover for one of your videos."
          action={
            <ButtonLink href="/create/audio" variant="secondary">
              <AudioLines aria-hidden="true" className="size-4" />
              Open Audio
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
  if (asset.kind === "audio" && asset.audio) return <AudioCard asset={asset} onOpen={onOpen} />;
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
  const editing = asset.settings.operation === "edit";
  const method = asset.attribution ? "Local preview" : editing ? "AI edit" : "AI generation";
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

      <PromptBlock prompt={asset.settings.prompt} label={editing ? "Edit instruction" : "Prompt"} />

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
          {asset.kind === "image" && (
            <SaveElementPopover
              side="bottom"
              align="start"
              source={{ url: asset.url, width: asset.width, height: asset.height, color: asset.color, defaultName: elementNameFrom(asset.settings.prompt), sourceAssetId: asset.id }}
              trigger={(props) => (
                <button type="button" {...props} className={cn(secondary, "w-full")}>
                  <Bookmark aria-hidden="true" className="size-4" />
                  Save as Element
                </button>
              )}
            />
          )}
        </div>
      </div>

      <MetaList
        rows={[
          { label: "Method", value: method },
          ...(asset.modelLabel ? [{ label: "Model", value: asset.modelLabel }] : []),
          ...(!editing
            ? [
                { label: "Direction", value: directionLabel(asset.settings.direction) },
                { label: "Look", value: lookLabel(asset.settings.look) },
              ]
            : []),
          { label: "Quality", value: qualityLabel(qualityOf(asset.settings)) },
          { label: "Aspect ratio", value: asset.settings.aspect },
          ...(asset.seed !== undefined ? [{ label: "Seed", value: String(asset.seed) }] : []),
          { label: "Size", value: `${asset.width}×${asset.height}` },
          ...(lineage ? [{ label: editing ? "Edited from" : "Based on", value: lineage }] : []),
        ]}
      />

      {asset.settings.reference && <ReferenceRow asset={asset} label={editing ? "Source image (edited)" : "Generated with a reference"} />}

      <AssetRelations asset={asset} />

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
