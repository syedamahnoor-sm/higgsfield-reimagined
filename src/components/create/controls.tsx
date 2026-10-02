"use client";

import { Gauge, Sparkles, SunMedium, Zap } from "lucide-react";
import { SelectMenu, type SelectOption } from "@/components/ui/SelectMenu";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { ASPECT_RATIOS, IMAGE_COUNTS, INTENTS } from "@/lib/constants";
import { getEngine } from "@/lib/generation";
import type { AspectRatio, ImageCount, Intent } from "@/lib/types";

const INTENT_ICONS: Record<Intent, React.ReactNode> = {
  auto: <Sparkles aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  photoreal: <SunMedium aria-hidden="true" className="size-4" strokeWidth={1.75} />,
  fast: <Zap aria-hidden="true" className="size-4" strokeWidth={1.75} />,
};

export function IntentPicker({ value, onChange }: { value: Intent; onChange: (v: Intent) => void }) {
  const engine = getEngine();
  const options: SelectOption<Intent>[] = INTENTS.map((i) => ({
    id: i.id,
    label: i.id === "auto" ? "Auto" : i.label,
    hint: i.id === "auto" ? "Recommended" : undefined,
    description: i.description,
    icon: INTENT_ICONS[i.id],
  }));
  return (
    <SelectMenu
      label="Style"
      value={value}
      options={options}
      onChange={onChange}
      footer={
        <div className="flex items-start gap-2 text-xs leading-snug text-fg-subtle">
          <Gauge aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          <span>
            Runs on <span className="text-fg-muted">{engine.resolveModel(value)}</span>. {engine.description}
          </span>
        </div>
      }
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
