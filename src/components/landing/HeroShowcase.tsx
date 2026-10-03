"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Play } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { MotionPlayer } from "@/components/motion/MotionPlayer";
import { cn } from "@/lib/cn";
import { SHOWCASE_SCENES } from "@/lib/landing";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Phase = "typing" | "generating" | "image" | "motion";

const TYPE_MS = 34;
const PHASE_MS: Record<Exclude<Phase, "typing">, number> = { generating: 1000, image: 1300, motion: 5000 };

const STEPS: { phase: Phase[]; label: string }[] = [
  { phase: ["typing"], label: "Describe" },
  { phase: ["generating", "image"], label: "Create" },
  { phase: ["motion"], label: "Animate" },
];

/**
 * The hero's product demonstration: a prompt is typed, an image "appears",
 * then it receives a real camera move from the browser-motion engine. It
 * cycles through three scenes while on screen and holds still under reduced
 * motion. Pointer parallax is a light, transform-only effect on fine pointers.
 */
export function HeroShowcase() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState(0);

  const current = SHOWCASE_SCENES[scene];
  const back = SHOWCASE_SCENES[(scene + 1) % SHOWCASE_SCENES.length];
  const front = SHOWCASE_SCENES[(scene + 2) % SHOWCASE_SCENES.length];
  const running = visible && !reduced;
  // Under reduced motion, show a finished, still frame of the first scene.
  const shownPhase: Phase = reduced ? "image" : phase;
  const shownTyped = reduced ? current.prompt.length : typed;

  // Pause everything while the hero is off screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scene timeline: typing → generating → image → motion → next scene.
  useEffect(() => {
    if (!running) return;
    if (phase === "typing") {
      if (typed >= current.prompt.length) {
        const t = setTimeout(() => setPhase("generating"), 450);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (phase === "generating") setPhase("image");
      else if (phase === "image") setPhase("motion");
      else {
        setScene((s) => (s + 1) % SHOWCASE_SCENES.length);
        setTyped(0);
        setPhase("typing");
      }
    }, PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [running, phase, typed, current.prompt.length]);

  // Pointer parallax via CSS variables (no re-renders).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || reduced || !window.matchMedia("(pointer: fine)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        el.style.setProperty("--py", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
      });
    };
    const onLeave = () => {
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    };
    window.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  const revealed = shownPhase === "image" || shownPhase === "motion";
  const status =
    shownPhase === "typing"
      ? "Describing…"
      : shownPhase === "generating"
        ? "Generating…"
        : shownPhase === "image"
          ? `Image · ${current.style}`
          : `Motion · ${current.presetLabel}`;

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label="Ember Studio turning a written prompt into an image, then animating it with a camera move."
      className="relative mx-auto aspect-[1/1.02] w-full max-w-[600px] select-none sm:aspect-[1.08/1]"
    >
      {/* Soft ember light behind the composition: the only glow on the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[12%] rounded-full bg-[radial-gradient(closest-side,rgb(255_106_61/0.14),transparent)] blur-2xl"
      />

      {/* Back card: a finished still. */}
      <Layer depth={6} rotate={-7} className="top-[9%] left-0 hidden w-[42%] sm:block">
        <Floating delay="0s">
          <Card aspect="3 / 4" label="Image" dim>
            <SceneImage src={back.source.url} sizes="260px" />
          </Card>
        </Floating>
      </Layer>

      {/* Front card: a motion clip looping. */}
      <Layer depth={18} rotate={5} className="right-0 bottom-[11%] hidden w-[44%] sm:block">
        <Floating delay="-4s">
          <Card aspect="16 / 10" labelAt="top-right" label={`Motion · ${front.presetLabel}`} icon={<Play aria-hidden="true" className="size-2.5 fill-current" />}>
            <MotionPlayer source={front.source} preset={front.preset} duration={6} mode="hover" active={running} />
          </Card>
        </Floating>
      </Layer>

      {/* Main card: the current scene moving through Describe → Create → Animate. */}
      <Layer depth={11} className="top-[4%] left-[11%] z-10 w-[78%] sm:left-[23%] sm:w-[54%]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-panel bg-surface-2 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] ring-1 ring-line-strong">
          <AnimatePresence initial={false}>
            <motion.div
              key={current.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: revealed ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <MotionPlayer source={current.source} preset={current.preset} duration={5} mode="hover" active={running && shownPhase === "motion"} />
            </motion.div>
          </AnimatePresence>

          {/* Generation placeholder while describing / generating. */}
          <div className={cn("shimmer absolute inset-0 transition-opacity duration-500", revealed ? "opacity-0" : "opacity-100")} />
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
            <div
              className="h-full bg-accent ease-linear"
              style={{
                width: shownPhase === "generating" ? "100%" : "0%",
                transition: shownPhase === "generating" ? `width ${PHASE_MS.generating}ms linear` : "none",
              }}
            />
          </div>

          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 font-mono text-2xs text-white/90 backdrop-blur-md">
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full", shownPhase === "motion" ? "bg-accent" : revealed ? "bg-white/70" : "animate-pulse bg-white/50")}
            />
            {status}
          </span>
        </div>
      </Layer>

      {/* The prompt, typed into a composer like the real one. */}
      <Layer depth={22} className="bottom-[3%] left-0 z-20 w-[92%] sm:bottom-[6%] sm:left-[4%] sm:w-[68%]">
        <div className="flex items-center gap-3 rounded-[16px] border border-line-strong bg-surface-2/95 py-2.5 pr-2.5 pl-4 shadow-float backdrop-blur-xl">
          <p className="min-w-0 flex-1 truncate text-[13px] text-fg sm:text-sm">
            {current.prompt.slice(0, shownTyped)}
            {shownPhase === "typing" && (
              <span aria-hidden="true" className="ml-px inline-block h-[1.05em] w-px translate-y-[2px] animate-[caret-blink_1s_steps(1)_infinite] bg-accent" />
            )}
          </p>
          <span
            aria-hidden="true"
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-[10px] transition-[background-color,transform] duration-200",
              shownPhase === "typing" ? "bg-surface-3 text-fg-subtle" : "bg-accent text-accent-fg",
              shownPhase === "generating" && "scale-90",
            )}
          >
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </span>
        </div>
      </Layer>

      {/* Where we are in the workflow. */}
      <Layer depth={14} className="top-0 right-0 z-20 sm:top-[1%]">
        <ol className="flex items-center gap-1 rounded-full border border-line bg-surface-1/90 p-1 font-mono text-2xs backdrop-blur-md">
          {STEPS.map((step, i) => {
            const active = step.phase.includes(shownPhase);
            return (
              <li key={step.label} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true" className="text-fg-subtle">→</span>}
                <span className={cn("rounded-full px-2 py-0.5 transition-colors duration-300", active ? "bg-accent-soft text-accent" : "text-fg-subtle")}>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </Layer>
    </div>
  );
}

/** Positioned layer with pointer-parallax depth (px at the edge) and an optional resting tilt. */
function Layer({ depth, rotate = 0, className, children }: { depth: number; rotate?: number; className?: string; children: ReactNode }) {
  const style: CSSProperties = {
    transform: `translate3d(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth * 0.7}px), 0) rotate(${rotate}deg)`,
    transition: "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
  };
  return (
    <div className={cn("absolute will-change-transform", className)} style={style}>
      {children}
    </div>
  );
}

function Floating({ delay, children }: { delay: string; children: ReactNode }) {
  return (
    <div className="animate-[landing-float_9s_ease-in-out_infinite]" style={{ animationDelay: delay }}>
      {children}
    </div>
  );
}

function Card({
  aspect,
  label,
  labelAt = "bottom-left",
  icon,
  dim,
  children,
}: {
  aspect: string;
  label: string;
  /** Keep labels on the visible corner of cards that other layers overlap. */
  labelAt?: "top-right" | "bottom-left";
  icon?: ReactNode;
  dim?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-card bg-surface-2 shadow-[0_24px_60px_-18px_rgb(0_0_0/0.85)] ring-1 ring-line-strong", dim && "brightness-[0.8]")}
      style={{ aspectRatio: aspect }}
    >
      <AnimatePresence initial={false}>{children}</AnimatePresence>
      <span className={cn("absolute flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[10px] text-white/85 backdrop-blur-md", labelAt === "top-right" ? "top-2 right-2" : "bottom-2 left-2")}>
        {icon}
        {label}
      </span>
    </div>
  );
}

function SceneImage({ src, sizes }: { src: string; sizes: string }) {
  return (
    <motion.div key={src} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
    </motion.div>
  );
}
