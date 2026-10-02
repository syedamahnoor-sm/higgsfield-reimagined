"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption<T extends string | number> {
  id: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  hint?: string;
}

/**
 * Compact popover select that opens upward (it lives in a bottom-docked
 * composer). Keyboard: arrows move, Enter/Space selects, Escape closes and
 * returns focus to the trigger.
 */
export function SelectMenu<T extends string | number>({
  label,
  value,
  options,
  onChange,
  icon,
  footer,
  columns = 1,
  hideLabelOnMobile = true,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  icon?: ReactNode;
  footer?: ReactNode;
  columns?: 1 | 2;
  hideLabelOnMobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();
  const selected = options.find((o) => o.id === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const index = Math.max(0, options.findIndex((o) => o.id === value));
    optionRefs.current[index]?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, options, value]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const current = optionRefs.current.findIndex((el) => el === document.activeElement);
    const move = (delta: number) => {
      e.preventDefault();
      const next = (current + delta + options.length) % options.length;
      optionRefs.current[next]?.focus();
    };
    if (e.key === "ArrowDown" || (columns === 2 && e.key === "ArrowRight")) move(1);
    else if (e.key === "ArrowUp" || (columns === 2 && e.key === "ArrowLeft")) move(-1);
    else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") close(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${selected.label}`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-chip border px-2.5 text-[13px] font-medium transition-colors duration-150",
          open
            ? "border-line-strong bg-surface-3 text-fg"
            : "border-transparent text-fg-muted hover:bg-surface-3 hover:text-fg",
        )}
      >
        {icon ?? selected.icon}
        <span className={cn(hideLabelOnMobile && "hidden sm:inline")}>{selected.label}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-3.5 text-fg-subtle transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute bottom-full left-0 z-50 mb-2 origin-bottom-left rounded-card border border-line-strong bg-surface-2 p-1.5 shadow-float",
              columns === 2 ? "w-[300px]" : "w-[280px]",
            )}
          >
            <p className="px-2 pt-1 pb-1.5 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">{label}</p>
            <div
              id={listId}
              role="listbox"
              aria-label={label}
              onKeyDown={onListKeyDown}
              className={cn(columns === 2 ? "grid grid-cols-2 gap-1" : "flex flex-col gap-0.5")}
            >
              {options.map((option, i) => {
                const active = option.id === value;
                return (
                  <button
                    key={option.id}
                    ref={(el) => {
                      optionRefs.current[i] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option.id);
                      close();
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-chip px-2.5 py-2 text-left outline-offset-[-2px] transition-colors duration-100",
                      active ? "bg-surface-3" : "hover:bg-surface-3/70 focus-visible:bg-surface-3/70",
                    )}
                  >
                    {option.icon && <span className="mt-0.5 shrink-0 text-fg-muted">{option.icon}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
                        {option.label}
                        {option.hint && <span className="font-mono text-2xs font-normal text-fg-subtle">{option.hint}</span>}
                      </span>
                      {option.description && (
                        <span className="mt-0.5 block text-xs leading-snug text-fg-muted">{option.description}</span>
                      )}
                    </span>
                    {active && <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />}
                  </button>
                );
              })}
            </div>
            {footer && <div className="mt-1.5 border-t border-line px-2.5 pt-2 pb-1">{footer}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
