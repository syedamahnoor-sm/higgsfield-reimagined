"use client";

import Image from "next/image";
import { ImagePlus, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ButtonLink } from "@/components/ui/Button";
import { assetAsReference, setVideoSource } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { useVideoSourceUpload } from "@/lib/media/useVideoSourceUpload";
import { useStudio } from "@/store/studio";
import { VIDEO_FILE_INPUT_ID } from "./VideoComposer";

/**
 * Video canvas before a source is chosen: upload from the device, or pick one
 * of your own generated images. No need to go through Image first.
 */
export function SourcePicker() {
  const images = useStudio(useShallow((s) => Object.values(s.assets).filter((a) => a.kind === "image")));
  const recent = useMemo(() => [...images].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8), [images]);
  const { busy, upload } = useVideoSourceUpload();
  const [dragging, setDragging] = useState(false);

  return (
    <div className="flex h-full overflow-y-auto">
      <div className="m-auto w-full max-w-[760px] px-4 py-6 sm:px-8">
        <p className="font-mono text-2xs tracking-[0.14em] text-fg-subtle uppercase">Image to motion</p>
        <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-fg sm:text-xl">Choose an image to animate</h2>
        <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-fg-muted">
          Pick a camera move and Ember animates your image right here in the browser. It moves the camera over your image; it
          doesn’t invent new frames.
        </p>

        <div
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void upload(e.dataTransfer.files[0]);
          }}
          className={cn(
            "mt-5 flex flex-col items-center gap-3 rounded-panel border border-dashed px-6 py-8 text-center transition-colors duration-150",
            dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2/40",
          )}
        >
          <span className="grid size-11 place-items-center rounded-card border border-line bg-surface-2 text-fg-muted">
            {busy ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <ImagePlus aria-hidden="true" className="size-5" strokeWidth={1.5} />}
          </span>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() => document.getElementById(VIDEO_FILE_INPUT_ID)?.click()}
              className="text-sm font-semibold text-accent underline-offset-4 hover:underline disabled:opacity-60"
            >
              Upload an image
            </button>
            <span className="text-sm text-fg-muted"> or drop it here</span>
          </div>
          <p className="text-xs text-fg-subtle">JPG, PNG or WebP. It stays on this device.</p>
        </div>

        <div className="mt-6">
          <p className="text-[13px] font-medium text-fg">From your Library</p>
          {recent.length > 0 ? (
            <ul className="mt-2.5 grid grid-cols-4 gap-2 sm:grid-cols-8">
              {recent.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => setVideoSource(assetAsReference(asset), asset.id)}
                    aria-label={`Use as source: ${asset.settings.prompt}`}
                    title={asset.settings.prompt}
                    className="relative block aspect-square w-full overflow-hidden rounded-chip bg-surface-2 ring-1 ring-line transition-[box-shadow,transform] duration-150 hover:ring-line-strong active:scale-[0.97]"
                  >
                    <Image src={asset.url} alt="" fill sizes="96px" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line px-4 py-3">
              <p className="text-[13px] text-fg-muted">Images you generate will be available here.</p>
              <ButtonLink href="/create/image" variant="secondary" size="sm">
                <Sparkles aria-hidden="true" className="size-3.5" />
                Create an image
              </ButtonLink>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
