"use client";

import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { HOVER_REVEAL, MediaCard } from "@/components/media/MediaCard";
import { MediaViewer, MetaList, PromptBlock } from "@/components/media/MediaViewer";
import { Button } from "@/components/ui/Button";
import { FilterChips } from "@/components/ui/FilterChips";
import { Tooltip } from "@/components/ui/Tooltip";
import { loadImageDraft } from "@/lib/actions";
import { aspectValue } from "@/lib/aspect";
import { cn } from "@/lib/cn";
import { ASPECT_RATIOS, INTENTS } from "@/lib/constants";
import { EXPLORE_CATEGORIES, EXPLORE_ITEMS, type ExploreCategory } from "@/lib/explore";

type Item = (typeof EXPLORE_ITEMS)[number];

const GRID_SIZES = "(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw";

function intentLabel(item: Item) {
  return INTENTS.find((i) => i.id === item.settings.intent)?.label ?? item.settings.intent;
}

/** Loads an example into the Image draft and opens Create. Never generates by itself. */
export function useRemixExample() {
  const router = useRouter();
  return useCallback(
    (item: Item) => {
      loadImageDraft(item.settings, `“${item.title}” loaded into the composer. Edit it or press Generate.`, item.id);
      router.push("/create/image");
    },
    [router],
  );
}

export function ExploreGallery() {
  const [category, setCategory] = useState<ExploreCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const remix = useRemixExample();

  const items = useMemo(
    () => (category === "all" ? EXPLORE_ITEMS : EXPLORE_ITEMS.filter((i) => i.category === category)),
    [category],
  );
  const openIndex = items.findIndex((i) => i.id === openId);
  const open = openIndex >= 0 ? items[openIndex] : null;
  const step = (delta: number) => setOpenId(items[(openIndex + delta + items.length) % items.length].id);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterChips label="Category" options={EXPLORE_CATEGORIES} value={category} onChange={setCategory} />
        <p className="text-xs text-fg-subtle">Curated examples · photos via Unsplash</p>
      </div>

      <ul className="columns-2 gap-3 md:columns-3 xl:columns-4 2xl:columns-5 [&>li]:mb-3">
        {items.map((item, i) => (
          <li key={item.id} className="break-inside-avoid">
            <ExploreCard item={item} preload={i < 4} onOpen={() => setOpenId(item.id)} onRemix={() => remix(item)} />
          </li>
        ))}
      </ul>

      <MediaViewer
        label={open ? `Example: ${open.title}` : "Example"}
        media={open && { key: open.id, src: open.url, alt: open.settings.prompt, aspect: aspectValue(open.settings.aspect) }}
        onClose={() => setOpenId(null)}
        onPrev={items.length > 1 ? () => step(-1) : undefined}
        onNext={items.length > 1 ? () => step(1) : undefined}
        details={open && <ExploreDetails item={open} onRemix={() => remix(open)} />}
      />
    </>
  );
}

function ExploreCard({ item, preload, onOpen, onRemix }: { item: Item; preload: boolean; onOpen: () => void; onRemix: () => void }) {
  return (
    <MediaCard
      src={item.url}
      alt={item.settings.prompt}
      aspect={aspectValue(item.settings.aspect)}
      sizes={GRID_SIZES}
      preload={preload}
      openLabel={`Open example: ${item.title}`}
      onOpen={onOpen}
      scrim={
        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent", HOVER_REVEAL)} />
      }
    >
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3", HOVER_REVEAL)}>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>
          <p className="mt-0.5 font-mono text-2xs text-white/60">
            {intentLabel(item)} · {item.settings.aspect}
          </p>
        </div>
        <Tooltip label="Load this prompt and settings into Create" align="end">
          <button
            type="button"
            onClick={onRemix}
            className="pointer-events-auto flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold text-white backdrop-blur-md transition-colors duration-150 hover:bg-accent hover:text-accent-fg focus-visible:bg-accent focus-visible:text-accent-fg"
          >
            <Shuffle aria-hidden="true" className="size-3.5" />
            Remix
          </button>
        </Tooltip>
      </div>
    </MediaCard>
  );
}

function ExploreDetails({ item, onRemix }: { item: Item; onRemix: () => void }) {
  const aspect = ASPECT_RATIOS.find((r) => r.id === item.settings.aspect);
  return (
    <div className="flex flex-col gap-6 p-5 sm:p-6">
      <div className="pr-10 lg:pr-0">
        <p className="font-mono text-2xs tracking-[0.14em] text-fg-subtle uppercase">Curated example</p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-fg">{item.title}</h2>
      </div>
      <PromptBlock prompt={item.settings.prompt} />
      <MetaList
        rows={[
          { label: "Style", value: intentLabel(item) },
          { label: "Aspect ratio", value: `${item.settings.aspect}${aspect ? ` · ${aspect.label}` : ""}` },
          { label: "Images", value: `×${item.settings.count}` },
        ]}
      />
      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" onClick={onRemix} className="w-full">
          <Shuffle aria-hidden="true" className="size-4" />
          Remix in Create
        </Button>
        <p className="text-xs leading-relaxed text-fg-subtle">
          Loads this prompt and settings into the Image composer. Nothing is generated until you press Generate.
        </p>
      </div>
      <p className="text-xs text-fg-subtle">
        Photo by{" "}
        <a href={item.creditUrl} target="_blank" rel="noreferrer" className="text-fg-muted underline-offset-2 hover:text-fg hover:underline">
          {item.credit}
        </a>{" "}
        on Unsplash
      </p>
    </div>
  );
}
