import type { Metadata } from "next";
import { ArrowRight, Compass } from "lucide-react";
import { HeroShowcase } from "@/components/landing/HeroShowcase";
import { InspirationMarquee } from "@/components/landing/InspirationMarquee";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { WorkflowStory } from "@/components/landing/WorkflowStory";
import { LogoMark } from "@/components/shell/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { APP_NAME } from "@/lib/constants";

// The layout's "%s · Ember Studio" template doesn't apply to the root page itself.
export const metadata: Metadata = {
  title: { absolute: `${APP_NAME}: imagine it, create it, bring it to life` },
};

const container = "mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10";

/** The landing experience. Standalone: no application rail or bottom navigation. */
export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <LandingHeader />

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className={`${container} grid items-center gap-10 pt-8 pb-12 sm:pt-12 sm:pb-16 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-10`}>
          <div className="max-w-xl">
            <h1 className="text-[44px] leading-[0.98] font-semibold tracking-[-0.04em] text-fg sm:text-6xl lg:text-[68px]">
              Imagine it.
              <br />
              Create it.
              <br />
              <span className="text-accent">Bring it to life.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-fg-muted sm:text-[17px]">
              Generate visual ideas and turn still images into cinematic motion, without choosing between dozens of AI models.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/create/image" variant="primary" size="lg" className="justify-center">
                Start creating
                <ArrowRight aria-hidden="true" className="size-4" />
              </ButtonLink>
              <ButtonLink href="/explore" variant="secondary" size="lg" className="justify-center">
                <Compass aria-hidden="true" className="size-4" />
                Explore ideas
              </ButtonLink>
            </div>
            <p className="mt-5 text-xs text-fg-subtle">No sign-up. Prompts go to our AI image service; your library stays in this browser.</p>
          </div>
          <HeroShowcase />
        </section>

        <div className={`${container} py-14 sm:py-28`}>
          <WorkflowStory />
        </div>

        <div className={`${container} pb-20 sm:pb-28`}>
          <InspirationMarquee />
        </div>

        {/* Final invitation */}
        <section aria-labelledby="final-cta" className="border-t border-line">
          <div className={`${container} flex flex-col items-center py-20 text-center sm:py-28`}>
            <LogoMark className="size-8 text-accent" />
            <h2 id="final-cta" className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-5xl">
              Start with an idea.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-fg-muted sm:text-base">
              Turn an idea into images, motion and voice, then keep the whole direction together in a project. One studio, no model menus.
            </p>
            <ButtonLink href="/create/image" variant="primary" size="lg" className="mt-8">
              Start creating
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className={`${container} flex flex-col gap-2 py-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between`}>
          <span className="flex items-center gap-2">
            <LogoMark className="size-4 text-fg-muted" />
            {APP_NAME}
          </span>
          <span>Images are made with AI, with a local preview as a fallback. Example photography via Unsplash.</span>
        </div>
      </footer>
    </div>
  );
}
