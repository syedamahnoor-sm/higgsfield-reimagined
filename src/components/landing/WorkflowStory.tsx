"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ArrowUp, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MotionGlyph } from "@/components/motion/MotionGlyph";
import { MotionPlayer } from "@/components/motion/MotionPlayer";
import { cn } from "@/lib/cn";
import { MOTION_PRESETS } from "@/lib/constants";
import { poolReference } from "@/lib/landing";
import { useReducedMotion } from "@/lib/useReducedMotion";

const PROMPT = "Misty autumn forest path, soft fog, red leaves";
const RESULTS = [poolReference("p923"), poolReference("p925")];

/**
 * Describe → Create → Animate, told with miniature versions of the real UI
 * and one image travelling through all three steps.
 */
export function WorkflowStory() {
  return (
    <section aria-labelledby="workflow-title" className="relative">
      <div className="max-w-xl">
        <p className="font-mono text-2xs tracking-[0.16em] text-fg-subtle uppercase">How it works</p>
        <h2 id="workflow-title" className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-[40px] sm:leading-[1.05]">
          From a sentence to a moving shot.
        </h2>
      </div>

      <ol className="relative mt-10 grid gap-10 md:mt-14 md:grid-cols-3 md:gap-5">
        {/* The thread that connects the steps on desktop. */}
        <span aria-hidden="true" className="absolute top-[18px] right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-line-strong via-accent/40 to-line-strong md:block" />
        <Step index={0} title="Describe" copy="Say what you want to see. Pick a style if you like; Auto handles the rest.">
          <ComposerMock />
        </Step>
        <Step index={1} title="Create" copy="Results land on a large canvas, ready to refine, remix or keep.">
          <ResultsMock />
        </Step>
        <Step index={2} title="Animate" copy="Give any image a cinematic camera move: push in, pan, orbit and more.">
          <MotionMock />
        </Step>
      </ol>
    </section>
  );
}

function Step({ index, title, copy, children }: { index: number; title: string; copy: string; children: ReactNode }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col"
    >
      {/* The canvas background masks the connecting line behind the step title. */}
      <div className="relative flex w-fit items-center gap-3 bg-canvas pr-4">
        <span className="relative grid size-9 place-items-center rounded-full border border-line-strong bg-canvas font-mono text-xs text-fg">
          0{index + 1}
        </span>
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-fg">{title}</h3>
      </div>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-muted md:min-h-[44px]">{copy}</p>
      <div className="mt-5 aspect-[4/3] overflow-hidden md:aspect-[4/3.4] rounded-panel border border-line bg-surface-1 p-3">{children}</div>
    </motion.li>
  );
}

/** A non-interactive miniature of the Image composer. */
function ComposerMock() {
  return (
    <div aria-hidden="true" className="flex h-full flex-col justify-end">
      <div className="mb-auto grid flex-1 place-items-center">
        <span className="font-mono text-2xs tracking-[0.14em] text-fg-subtle uppercase">Canvas</span>
      </div>
      <div className="rounded-[16px] border border-line-strong bg-surface-2 p-3">
        <p className="text-[13px] leading-relaxed text-fg">{PROMPT}</p>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-muted">
          <span className="flex items-center gap-1 rounded-[6px] bg-surface-3 px-1.5 py-1">
            <Sparkles className="size-3" /> Auto
          </span>
          <span className="rounded-[6px] bg-surface-3 px-1.5 py-1 font-mono">4:5</span>
          <span className="rounded-[6px] bg-surface-3 px-1.5 py-1 font-mono">×2</span>
          <span className="ml-auto flex items-center gap-1.5 rounded-[8px] bg-accent py-1 pr-1 pl-2.5 text-[11px] font-semibold text-accent-fg">
            Generate
            <span className="grid size-4 place-items-center rounded-full bg-black/15">
              <ArrowUp className="size-2.5" strokeWidth={3} />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function ResultsMock() {
  return (
    <div aria-hidden="true" className="flex h-full flex-col">
      <p className="truncate text-[11px] text-fg-muted">{PROMPT}</p>
      <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">Auto · 4:5 · ×2</p>
      <div className="mt-2.5 grid min-h-0 flex-1 grid-cols-2 gap-2">
        {RESULTS.map((r, i) => (
          <div key={r.id} className={cn("relative overflow-hidden rounded-card ring-1 ring-line", i === 0 && "ring-accent/60")}>
            <Image src={r.url} alt="" fill sizes="(min-width: 768px) 180px, 45vw" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The first result, now moving. Plays only while visible. */
function MotionMock() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-card ring-1 ring-line">
        <MotionPlayer source={RESULTS[0]} preset="drift" duration={6} mode="hover" active={inView && !reduced} />
        <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-md">
          Motion · Drift · 6s
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        {MOTION_PRESETS.map((p) => (
          <span
            key={p.id}
            className={cn(
              "flex items-center gap-1 rounded-[6px] px-1.5 py-1 text-[10px]",
              p.id === "drift" ? "bg-accent-soft text-accent" : "text-fg-subtle",
            )}
          >
            <MotionGlyph preset={p.id} className="size-3" />
            {p.id === "drift" && <span>{p.label}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
