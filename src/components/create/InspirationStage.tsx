"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { loadImageDraft } from "@/lib/actions";
import { INTENTS } from "@/lib/constants";
import { IMAGE_EXAMPLES } from "@/lib/inspiration";

/**
 * The empty canvas: a restrained set of starting points. "Try this" loads an
 * example's prompt and settings into the composer — it never pretends to be
 * the user's own result.
 */
export function InspirationStage() {
  return (
    <div className="flex h-full overflow-y-auto">
      <div className="m-auto w-full max-w-[920px] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1 sm:mb-5">
          <div>
            <p className="font-mono text-2xs tracking-[0.14em] text-fg-subtle uppercase">Start from an example</p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-fg sm:text-xl">What do you want to make?</h2>
          </div>
          <p className="text-[13px] text-fg-muted">Pick a starting point, or describe your own idea below.</p>
        </div>

        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
          {IMAGE_EXAMPLES.map((example, i) => {
            const intent = INTENTS.find((x) => x.id === example.settings.intent)?.label;
            return (
              <li key={example.id}>
                <button
                  type="button"
                  onClick={() => loadImageDraft(example.settings, `“${example.title}” loaded. Edit the prompt or generate.`)}
                  aria-label={`Try this: ${example.title}. ${example.settings.prompt}`}
                  className="group relative block aspect-[4/3] w-full overflow-hidden rounded-card border border-line bg-surface-2 text-left"
                >
                  <Image
                    src={example.cover}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 300px, 50vw"
                    preload={i < 3}
                    className="object-cover opacity-85 transition-[opacity,transform] duration-500 ease-out-quint group-hover:scale-[1.03] group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-white sm:text-sm">{example.title}</span>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/12 px-2 py-0.5 text-2xs font-medium text-white backdrop-blur-md transition-colors duration-150 group-hover:bg-accent group-hover:text-accent-fg group-focus-visible:bg-accent group-focus-visible:text-accent-fg">
                        Try this
                        <ArrowUpRight aria-hidden="true" className="size-3" />
                      </span>
                    </span>
                    <span className="hidden text-xs leading-snug text-white/70 sm:line-clamp-2">
                      {example.settings.prompt}
                    </span>
                    <span className="font-mono text-2xs text-white/55">
                      {intent} · {example.settings.aspect} · ×{example.settings.count}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
