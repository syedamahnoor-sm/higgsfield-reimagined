"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ImageIcon, Clapperboard } from "lucide-react";
import { MODES } from "@/lib/constants";
import { cn } from "@/lib/cn";

const ICONS = { image: ImageIcon, video: Clapperboard } as const;

/** Image / Video toggle. Both modes share one workspace layout, so this is a sibling switch, not navigation. */
export function ModeSwitch({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Create mode" className={cn("inline-flex rounded-card border border-line bg-surface-1 p-1", className)}>
      {MODES.map((mode) => {
        const active = pathname.startsWith(mode.href);
        const Icon = ICONS[mode.id];
        return (
          <Link
            key={mode.id}
            href={mode.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-8 items-center gap-2 rounded-chip px-3.5 text-[13px] font-medium transition-colors duration-150",
              active ? "text-fg" : "text-fg-subtle hover:text-fg-muted",
            )}
          >
            {active && (
              <motion.span
                layoutId="mode-switch-active"
                aria-hidden="true"
                className="absolute inset-0 rounded-chip border border-line-strong bg-surface-3"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <Icon aria-hidden="true" strokeWidth={1.75} className={cn("relative size-4", active && "text-accent")} />
            <span className="relative">{mode.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
