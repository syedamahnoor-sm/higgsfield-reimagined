"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shuffle } from "lucide-react";
import { useRemixExample } from "@/components/explore/ExploreGallery";
import { aspectValue } from "@/lib/aspect";
import { EXPLORE_ITEMS } from "@/lib/explore";

/** A dozen curated examples: enough to feel alive, never the whole Explore gallery. */
const ITEMS = EXPLORE_ITEMS.slice(0, 12);

/**
 * A slow, endless strip of curated examples. Hovering or focusing pauses it;
 * clicking an example remixes it into Create (nothing is generated). With
 * reduced motion it becomes a static, horizontally scrollable row.
 */
export function InspirationMarquee() {
  const remix = useRemixExample();

  return (
    <section aria-labelledby="inspiration-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xs tracking-[0.16em] text-fg-subtle uppercase">Inspiration</p>
          <h2 id="inspiration-title" className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-[40px] sm:leading-[1.05]">
            Borrow a starting point.
          </h2>
          <p className="mt-3 max-w-md text-sm text-fg-muted">Pick any example to load its prompt and settings into Create, then make it yours.</p>
        </div>
        <Link href="/explore" className="group flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg">
          Explore more
          <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="group/marquee relative mt-8 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]">
        <ul className="flex w-max animate-[landing-marquee_90s_linear_infinite] gap-3 group-focus-within/marquee:[animation-play-state:paused] group-hover/marquee:[animation-play-state:paused] motion-reduce:animate-none">
          {[0, 1].map((copy) =>
            ITEMS.map((item) => (
              <li key={`${copy}-${item.id}`} aria-hidden={copy === 1 || undefined} className={copy === 1 ? "motion-reduce:hidden" : undefined}>
                <button
                  type="button"
                  tabIndex={copy === 1 ? -1 : undefined}
                  onClick={() => remix(item)}
                  aria-label={`Remix “${item.title}” in Create`}
                  className="group relative block h-56 overflow-hidden rounded-card bg-surface-2 ring-1 ring-line outline-offset-2 sm:h-72"
                  style={{ aspectRatio: aspectValue(item.settings.aspect) }}
                >
                  <Image
                    src={item.url}
                    alt=""
                    fill
                    sizes="420px"
                    className="object-cover transition-transform duration-700 ease-out-quint group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3 text-left opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
                    <span className="truncate text-[13px] font-semibold text-white">{item.title}</span>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-fg">
                      <Shuffle className="size-3" aria-hidden="true" />
                      Remix
                    </span>
                  </span>
                </button>
              </li>
            )),
          )}
        </ul>
      </div>
    </section>
  );
}
