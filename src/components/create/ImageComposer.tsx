"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { PROMPT_INPUT_ID } from "@/lib/actions";
import { closestAspect } from "@/lib/aspect";
import { cn } from "@/lib/cn";
import { startGeneration } from "@/lib/generation/run";
import { UploadError, importReferenceFile } from "@/lib/media/uploads";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";
import { AspectPicker, CountPicker, IntentPicker } from "./controls";
import { AddReferenceButton, ReferenceChip } from "./ReferenceControl";

const subscribeNoop = () => () => {};
function useIsMac() {
  return useSyncExternalStore(
    subscribeNoop,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => true,
  );
}

const MAX_PROMPT_HEIGHT = 200;

export function ImageComposer() {
  const draft = useStudio((s) => s.drafts.image);
  const updateDraft = useStudio((s) => s.updateDraft);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const isMac = useIsMac();

  // One image request at a time: real generation takes a while and costs money.
  const generating = useStudio((s) =>
    Object.values(s.jobs).some((j) => j.settings.mode === "image" && (j.status === "queued" || j.status === "running")),
  );
  const canGenerate = draft.prompt.trim().length > 0 && !busy && !generating;

  const generate = useCallback(() => {
    if (!canGenerate) return;
    void startGeneration(useStudio.getState().drafts.image);
  }, [canGenerate]);

  // Cmd/Ctrl+Enter generates from anywhere in the workspace.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.repeat) {
        e.preventDefault();
        generate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [generate]);

  // Grow the prompt with its content (also when Remix/Try this replaces it).
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_PROMPT_HEIGHT)}px`;
  }, [draft.prompt]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const reference = await importReferenceFile(file);
      const aspect = closestAspect(reference.width, reference.height);
      const changed = aspect !== useStudio.getState().drafts.image.aspect;
      updateDraft("image", { reference, aspect });
      if (changed) toast({ message: `Aspect ratio set to ${aspect} to match your reference` });
    } catch (error) {
      toast({
        tone: "error",
        message: error instanceof UploadError ? error.message : "That image couldn't be added. Try another file.",
      });
    } finally {
      setBusy(false);
    }
  };

  const openPicker = () => fileRef.current?.click();

  return (
    <form
      aria-label="Image composer"
      onSubmit={(e) => {
        e.preventDefault();
        generate();
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFile(e.dataTransfer.files[0]);
      }}
      className={cn(
        "pointer-events-auto relative mx-auto w-full max-w-[880px] rounded-composer border bg-surface-2/90 shadow-float backdrop-blur-xl transition-colors duration-150",
        dragging ? "border-accent" : "border-line-strong focus-within:border-white/20",
      )}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-composer bg-surface-2/90 text-sm font-medium text-fg">
          Drop to use as reference
        </div>
      )}

      {draft.reference && (
        <div className="px-3 pt-3">
          <ReferenceChip
            reference={draft.reference}
            busy={busy}
            onReplace={openPicker}
            onRemove={() => updateDraft("image", { reference: undefined })}
          />
        </div>
      )}

      <label htmlFor={PROMPT_INPUT_ID} className="sr-only">
        Describe the image you want to create
      </label>
      <textarea
        ref={textRef}
        id={PROMPT_INPUT_ID}
        rows={2}
        value={draft.prompt}
        onChange={(e) => updateDraft("image", { prompt: e.target.value })}
        placeholder="Describe the image you want to create…"
        spellCheck
        className="block w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none sm:px-5 sm:text-base"
      />

      <div className="flex flex-wrap items-center gap-1 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
        {!draft.reference && <AddReferenceButton onPick={openPicker} busy={busy} />}
        <IntentPicker value={draft.intent} onChange={(intent) => updateDraft("image", { intent })} />
        <AspectPicker value={draft.aspect} onChange={(aspect) => updateDraft("image", { aspect })} />
        <CountPicker value={draft.count} onChange={(count) => updateDraft("image", { count })} />

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-mono text-2xs text-fg-subtle md:inline" aria-hidden="true">
            {isMac ? "⌘" : "Ctrl"} ↵
          </span>
          <Tooltip label={generating ? "Generating… one request at a time" : canGenerate ? "Generate" : "Describe what you want to create first"}>
            <button
              type="submit"
              disabled={!canGenerate}
              aria-keyshortcuts={isMac ? "Meta+Enter" : "Control+Enter"}
              className="group flex h-10 items-center gap-2 rounded-card bg-accent pr-3 pl-4 text-sm font-semibold text-accent-fg transition-[background-color,transform,opacity] duration-150 hover:bg-accent-hover active:scale-[0.98] active:bg-accent-press disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-subtle sm:pl-4.5"
            >
              {generating ? "Generating" : "Generate"}
              <span className="grid size-6 place-items-center rounded-full bg-black/15 transition-transform duration-150 group-enabled:group-hover:-translate-y-px group-disabled:bg-white/5">
                {generating ? (
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <ArrowUp aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                )}
              </span>
            </button>
          </Tooltip>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </form>
  );
}
