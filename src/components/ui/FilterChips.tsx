"use client";

import { cn } from "@/lib/cn";

/** Single-select filter row. Counts, when given, are real counts of the user's own data. */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150",
              active
                ? "border-line-strong bg-surface-3 text-fg"
                : "border-line text-fg-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("font-mono text-2xs", active ? "text-accent" : "text-fg-subtle")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
