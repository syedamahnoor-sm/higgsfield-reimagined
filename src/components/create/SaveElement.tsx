"use client";

import { Bookmark } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Popover } from "@/components/ui/Popover";
import { saveElement } from "@/lib/actions";
import { cn } from "@/lib/cn";
import type { ElementKind } from "@/lib/types";

const KINDS: { id: ElementKind; label: string }[] = [
  { id: "character", label: "Character" },
  { id: "product", label: "Product" },
  { id: "object", label: "Object" },
  { id: "reference", label: "Reference" },
];

export interface ElementSource {
  url: string;
  width: number;
  height: number;
  color?: string;
  defaultName: string;
  sourceAssetId?: string;
}

/** Name it, tag it, save it: an Element is a reusable reference image kept in this browser. */
export function SaveElementForm({ source, onDone }: { source: ElementSource; onDone: () => void }) {
  const [name, setName] = useState(source.defaultName);
  const [kind, setKind] = useState<ElementKind>("reference");
  return (
    <form
      className="flex flex-col gap-2.5 p-1"
      onSubmit={(e) => {
        e.preventDefault();
        saveElement({ name, kind, url: source.url, width: source.width, height: source.height, color: source.color, sourceAssetId: source.sourceAssetId });
        onDone();
      }}
    >
      <p className="px-0.5 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Save as Element</p>
      <label className="sr-only" htmlFor="element-name">
        Element name
      </label>
      <input
        id="element-name"
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        value={name}
        maxLength={48}
        onChange={(e) => setName(e.target.value)}
        className="h-9 rounded-chip border border-line bg-surface-1 px-2.5 text-[13px] text-fg focus:border-white/20 focus:outline-none"
      />
      <div role="radiogroup" aria-label="Element type" className="flex flex-wrap gap-1">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={kind === k.id}
            onClick={() => setKind(k.id)}
            className={cn(
              "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
              kind === k.id ? "border-line-strong bg-surface-3 text-fg" : "border-line text-fg-muted hover:text-fg",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>
      <p className="px-0.5 text-xs leading-snug text-fg-subtle">Reuse it any time from the Reference picker. It&apos;s a saved image, not a trained model.</p>
      <button type="submit" className="h-9 rounded-chip bg-accent text-[13px] font-semibold text-accent-fg hover:bg-accent-hover">
        Save Element
      </button>
    </form>
  );
}

/** Popover wrapper; `trigger` receives the popover trigger props. */
export function SaveElementPopover({
  source,
  side = "top",
  align = "end",
  trigger,
}: {
  source: ElementSource;
  side?: "top" | "bottom";
  align?: "start" | "end";
  trigger?: (props: Parameters<Parameters<typeof Popover>[0]["trigger"]>[0]) => ReactNode;
}) {
  return (
    <Popover
      label="Save as Element"
      width={280}
      side={side}
      align={align}
      trigger={
        trigger ??
        ((props) => (
          <button
            type="button"
            {...props}
            className="flex h-9 items-center gap-2 rounded-chip px-3 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
          >
            <Bookmark aria-hidden="true" className="size-4" /> Save as Element
          </button>
        ))
      }
    >
      {(close) => <SaveElementForm source={source} onDone={close} />}
    </Popover>
  );
}
