"use client";

import { Brush, Clapperboard, Dice5, Newspaper, Package, Settings2, Sparkles, UserRound } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { SelectMenu, type SelectOption } from "@/components/ui/SelectMenu";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { ASPECT_RATIOS, IMAGE_COUNTS } from "@/lib/constants";
import { DIRECTIONS, LOOKS, QUALITIES } from "@/lib/creative";
import type { AspectRatio, Direction, ImageCount, LookId, Quality } from "@/lib/types";

const DIRECTION_ICONS: Record<Direction, React.ReactNode> = {
  auto: <Sparkles aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  cinematic: <Clapperboard aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  editorial: <Newspaper aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  portrait: <UserRound aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  product: <Package aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  illustration: <Brush aria-hidden="true" className="size-4" strokeWidth={1.75} />,
};

/** Creative Direction: what kind of image to make. */
export function DirectionPicker({ value, onChange }: { value: Direction; onChange: (v: Direction) => void }) {
  const options: SelectOption<Direction>[] = DIRECTIONS.map((d) => ({
    id: d.id,
    label: d.label,
    description: d.description,
    icon: DIRECTION_ICONS[d.id],
  }));
  return (
    <SelectMenu
      label="Creative direction"
      value={value}
      options={options}
      onChange={onChange}
      footer={
        <p className="text-xs leading-snug text-fg-subtle">
          Direction shapes the kind of image. Ember adds it to the request; your prompt stays as you wrote it.
        </p>
      }
    />
  );
}

export function LookSwatch({ look, className }: { look: LookId; className?: string }) {
  const swatch = LOOKS.find((l) => l.id === look)?.swatch;
  return (
    <span
      aria-hidden="true"
      className={cn("block size-4 shrink-0 rounded-full ring-1 ring-white/15", look === "none" && "ring-dashed", className)}
      style={{ background: swatch }}
    />
  );
}

/** Look: the visual treatment, independent of direction. */
export function LookPicker({ value, onChange }: { value: LookId; onChange: (v: LookId) => void }) {
  const options: SelectOption<LookId>[] = LOOKS.map((l) => ({
    id: l.id,
    label: l.label,
    description: l.description,
    icon: <LookSwatch look={l.id} />,
  }));
  return (
    <SelectMenu
      label="Look"
      value={value}
      options={options}
      onChange={onChange}
      footer={<p className="text-xs leading-snug text-fg-subtle">A look is a visual treatment applied by the AI model when it creates the image, not a filter.</p>}
    />
  );
}

/** A small rectangle drawn at the ratio's proportions. */
export function AspectGlyph({ w, h, className }: { w: number; h: number; className?: string }) {
  const max = 14;
  const scale = max / Math.max(w, h);
  return (
    <span className={cn("grid size-4 place-items-center", className)} aria-hidden="true">
      <span
        className="block rounded-[2px] border-[1.5px] border-current"
        style={{ width: Math.max(6, w * scale), height: Math.max(6, h * scale) }}
      />
    </span>
  );
}

export function AspectPicker({ value, onChange }: { value: AspectRatio; onChange: (v: AspectRatio) => void }) {
  const options: SelectOption<AspectRatio>[] = ASPECT_RATIOS.map((r) => ({
    id: r.id,
    label: r.id,
    description: r.label,
    icon: <AspectGlyph w={r.w} h={r.h} />,
  }));
  return <SelectMenu label="Aspect ratio" value={value} options={options} onChange={onChange} columns={2} hideLabelOnMobile={false} />;
}

export function CountPicker({ value, onChange }: { value: ImageCount; onChange: (v: ImageCount) => void }) {
  return (
    <Tooltip label="How many images to generate at once">
      <div role="radiogroup" aria-label="Number of images" className="flex h-9 items-center rounded-chip p-0.5">
        {IMAGE_COUNTS.map((n) => {
          const active = n === value;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${n} ${n === 1 ? "image" : "images"}`}
              onClick={() => onChange(n)}
              className={cn(
                "h-8 min-w-8 rounded-[6px] px-2 font-mono text-xs transition-colors duration-150",
                active ? "bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg-muted",
              )}
            >
              ×{n}
            </button>
          );
        })}
      </div>
    </Tooltip>
  );
}

/**
 * Advanced: only parameters the image model really supports. Quality maps to
 * output size; Seed makes a result reproducible. (The model's step count is
 * fixed, and its guidance range isn't documented, so neither is exposed.)
 */
export function AdvancedPopover({
  quality,
  seed,
  onChange,
}: {
  quality: Quality;
  seed: number | undefined;
  onChange: (patch: { quality?: Quality; seed?: number | undefined }) => void;
}) {
  const fixed = seed !== undefined;
  return (
    <Popover
      label="Advanced settings"
      width={300}
      trigger={(props) => (
        <Tooltip label="Advanced: quality and seed">
          <button
            type="button"
            {...props}
            aria-label="Advanced settings"
            className={cn(
              "relative grid size-9 place-items-center rounded-chip text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg",
              props["aria-expanded"] && "bg-surface-3 text-fg",
            )}
          >
            <Settings2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
            {(quality !== "standard" || fixed) && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />}
          </button>
        </Tooltip>
      )}
    >
      <div className="flex flex-col gap-3 p-1">
        <div>
          <p className="px-1 pb-1.5 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Quality</p>
          <div role="radiogroup" aria-label="Quality" className="grid grid-cols-3 gap-1">
            {QUALITIES.map((q) => (
              <button
                key={q.id}
                type="button"
                role="radio"
                aria-checked={q.id === quality}
                onClick={() => onChange({ quality: q.id })}
                className={cn(
                  "rounded-chip border px-2 py-1.5 text-left transition-colors",
                  q.id === quality ? "border-line-strong bg-surface-3" : "border-transparent hover:bg-surface-3/60",
                )}
              >
                <span className="block text-[13px] font-medium text-fg">{q.label}</span>
                <span className="block font-mono text-[10px] text-fg-subtle">{q.description.split(",")[0]}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="px-1 pb-1.5 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Seed</p>
          <div className="flex items-center gap-1.5">
            <div role="radiogroup" aria-label="Seed mode" className="flex rounded-chip border border-line p-0.5">
              {[
                { id: "random", label: "Random" },
                { id: "fixed", label: "Fixed" },
              ].map((o) => {
                const active = (o.id === "fixed") === fixed;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ seed: o.id === "fixed" ? (seed ?? Math.floor(Math.random() * 999_999_999)) : undefined })}
                    className={cn("h-7 rounded-[6px] px-2.5 text-xs font-medium", active ? "bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg-muted")}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            {fixed && (
              <>
                <label htmlFor="seed-input" className="sr-only">
                  Seed value
                </label>
                <input
                  id="seed-input"
                  inputMode="numeric"
                  onFocus={(e) => e.currentTarget.select()}
                  value={seed}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, "").slice(0, 10));
                    onChange({ seed: Number.isFinite(n) ? Math.min(n, 2_147_483_000) : 0 });
                  }}
                  className="h-8 min-w-0 flex-1 rounded-chip border border-line bg-surface-1 px-2 font-mono text-xs text-fg focus:border-white/20 focus:outline-none"
                />
                <Tooltip label="New random seed" align="end">
                  <button
                    type="button"
                    aria-label="New random seed"
                    onClick={() => onChange({ seed: Math.floor(Math.random() * 999_999_999) })}
                    className="grid size-8 place-items-center rounded-chip text-fg-muted hover:bg-surface-3 hover:text-fg"
                  >
                    <Dice5 aria-hidden="true" className="size-4" />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
          <p className="mt-1.5 px-1 text-xs leading-snug text-fg-subtle">
            {fixed ? "Same seed and settings reproduce the same image." : "A new seed is chosen for every run."}
          </p>
        </div>
      </div>
    </Popover>
  );
}

