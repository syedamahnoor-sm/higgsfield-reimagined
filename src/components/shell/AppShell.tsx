import type { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { Providers } from "./Providers";
import { SideRail } from "./SideRail";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <a
        href="#main"
        className="sr-only z-50 rounded-chip bg-accent px-3 py-2 text-sm font-medium text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SideRail />
      <main
        id="main"
        className="flex min-h-dvh flex-col pb-[calc(var(--spacing-mobile-nav)+env(safe-area-inset-bottom))] md:pb-0 md:pl-rail"
      >
        {children}
      </main>
      <MobileNav />
    </Providers>
  );
}
