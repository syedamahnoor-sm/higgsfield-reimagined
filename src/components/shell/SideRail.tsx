"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";

export function SideRail() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-rail flex-col items-center border-r border-line bg-canvas py-4 md:flex">
      <Logo />

      <nav aria-label="Primary" className="mt-6 flex w-full flex-col items-center gap-1 px-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex w-full flex-col items-center gap-1 rounded-card py-2.5 outline-offset-0 transition-colors duration-150",
                active ? "text-fg" : "text-fg-subtle hover:text-fg-muted",
              )}
            >
              {active && (
                <motion.span
                  layoutId="rail-active"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-card bg-surface-2"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              {active && (
                <motion.span
                  layoutId="rail-active-bar"
                  aria-hidden="true"
                  className="absolute top-1/2 -left-2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <Icon
                aria-hidden="true"
                strokeWidth={1.75}
                className={cn(
                  "relative size-5 transition-transform duration-150 group-hover:scale-105",
                  active && "text-accent",
                )}
              />
              <span className="relative text-2xs font-medium tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
