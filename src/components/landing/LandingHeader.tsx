import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/shell/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { APP_NAME } from "@/lib/constants";

/** Minimal header for the landing page only; the application keeps its own rail / bottom nav. */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/0 bg-canvas/75 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/60">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5 rounded-chip" aria-label={`${APP_NAME} home`}>
          <LogoMark className="size-6 text-accent" />
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{APP_NAME}</span>
        </Link>
        <nav aria-label="Landing" className="flex items-center gap-1 sm:gap-2">
          <Link href="/explore" className="rounded-chip px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg">
            Explore
          </Link>
          <ButtonLink href="/create/image" variant="primary" size="sm" className="h-9 px-3.5">
            Start creating
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
