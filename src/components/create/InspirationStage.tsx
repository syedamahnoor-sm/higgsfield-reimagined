"use client";

import Image from "next/image";
import { ArrowUpRight, ImagePlus, LayoutTemplate, PenLine } from "lucide-react";
import type { ReactNode } from "react";
import { focusPrompt, loadImageDraft } from "@/lib/actions";
import { directionLabel, lookLabel } from "@/lib/creative";
import { TEMPLATES } from "@/lib/templates";
import { LookSwatch } from "./controls";
import { OPEN_REFERENCE_PICKER } from "./ReferencePicker";

function Cue({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  const className =
    "flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-line-strong hover:text-fg";
  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {icon}
      {label}
    </button>
  ) : (
    <span className={className}>
      {icon}
      {label}
    </span>
  );
}

/**
 * The empty Image canvas: start from a prompt, a template, or a reference.
 * Templates preconfigure prompt, direction, look and shape; nothing is generated
 * until the creator presses Generate.
 */
export function InspirationStage() {
  return (
    <div className="flex h-full overflow-y-auto">
      <div className="m-auto w-full max-w-[960px] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-5 sm:mb-6">
          <p className="font-mono text-2xs tracking-[0.14em] text-fg-subtle uppercase">Start here</p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-fg sm:text-xl">Start from a prompt, a template, or a reference.</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Cue icon={<PenLine aria-hidden="true" className="size-3.5" />} label="Describe it below" onClick={() => focusPrompt()} />
            <Cue icon={<LayoutTemplate aria-hidden="true" className="size-3.5" />} label="Pick a template" />
            <Cue
              icon={<ImagePlus aria-hidden="true" className="size-3.5" />}
              label="Add a reference"
              onClick={() => window.dispatchEvent(new Event(OPEN_REFERENCE_PICKER))}
            />
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
          {TEMPLATES.map((template, i) => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => loadImageDraft(template.settings, `“${template.title}” template loaded. Edit anything, then Generate.`)}
                aria-label={`Use template: ${template.title}. ${template.settings.prompt}`}
                className="group relative block aspect-[4/3] w-full overflow-hidden rounded-card border border-line bg-surface-2 text-left"
              >
                <Image
                  src={template.cover}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 310px, 50vw"
                  preload={i < 3}
                  className="object-cover opacity-80 transition-[opacity,transform] duration-500 ease-out-quint group-hover:scale-[1.03] group-hover:opacity-100 group-focus-visible:opacity-100"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-white sm:text-sm">{template.title}</span>
                      <span className="block truncate text-xs text-white/65">{template.description}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/12 px-2 py-0.5 text-2xs font-medium text-white backdrop-blur-md transition-colors duration-150 group-hover:bg-accent group-hover:text-accent-fg group-focus-visible:bg-accent group-focus-visible:text-accent-fg">
                      Use
                      <ArrowUpRight aria-hidden="true" className="size-3" />
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 font-mono text-2xs text-white/70">
                    <span>{directionLabel(template.settings.direction)}</span>
                    {template.settings.look && template.settings.look !== "none" && (
                      <span className="flex items-center gap-1">
                        · <LookSwatch look={template.settings.look} className="size-2.5" /> {lookLabel(template.settings.look)}
                      </span>
                    )}
                    <span>· {template.settings.aspect}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-fg-subtle">Template photos are curated examples of each idea. Your results are generated fresh.</p>
      </div>
    </div>
  );
}
