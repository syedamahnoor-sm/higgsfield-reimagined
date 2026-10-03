"use client";

import { ArrowUp, Bookmark, Loader2, RotateCcw, WandSparkles } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { PROMPT_INPUT_ID, elementNameFrom, referenceUrl, setImageReference } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { qualityOf } from "@/lib/creative";
import { startGeneration } from "@/lib/generation/run";
import { UploadError, importReferenceFile } from "@/lib/media/uploads";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";
import { AdvancedPopover, AspectPicker, CountPicker, DirectionPicker, LookPicker } from "./controls";
import { ReferenceChip } from "./ReferenceControl";
import { ReferencePicker } from "./ReferencePicker";
import { SaveElementPopover } from "./SaveElement";

const subscribeNoop = () => () => {};
function useIsMac() {
  return useSyncExternalStore(
    subscribeNoop,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => true,
  );
}

const MAX_PROMPT_HEIGHT = 200;
const MAX_ENHANCE_INPUT = 500;

export function ImageComposer() {
  const draft = useStudio((s) => s.drafts.image);
  const updateDraft = useStudio((s) => s.updateDraft);
  const addUpload = useStudio((s) => s.addUpload);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  // The prompt as it was before Enhance, so the creator can always go back.
  const [beforeEnhance, setBeforeEnhance] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const isMac = useIsMac();

  // One image request at a time: real generation takes a while and costs money.
  const generating = useStudio((s) =>
    Object.values(s.jobs).some((j) => j.settings.mode === "image" && (j.status === "queued" || j.status === "running")),
  );
  const canGenerate = draft.prompt.trim().length > 0 && !busy && !generating && !enhancing;

  const generate = useCallback(() => {
    if (!canGenerate) return;
    setBeforeEnhance(null);
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

  // Grow the prompt with its content (also when Remix/templates/Enhance replace it).
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
      if (reference.source === "upload") {
        addUpload({ id: reference.id, name: reference.name, width: reference.width, height: reference.height, color: reference.color, createdAt: Date.now() });
      }
      const changed = setImageReference(reference, { matchAspect: true });
      if (changed) toast({ message: `Aspect ratio set to ${changed} to match your reference` });
    } catch (error) {
      toast({
        tone: "error",
        message: error instanceof UploadError ? error.message : "That image couldn't be added. Try another file.",
      });
    } finally {
      setBusy(false);
    }
  };

  const openFilePicker = () => fileRef.current?.click();

  /** Prompt Enhance: an AI text model rewrites the idea; the result stays editable and revertible. */
  const enhance = async () => {
    const original = draft.prompt;
    if (!original.trim() || enhancing) return;
    setEnhancing(true);
    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: original.trim(), direction: draft.direction ?? "auto" }),
      });
      const json = (await response.json().catch(() => ({}))) as { prompt?: string; reason?: string };
      if (!response.ok || !json.prompt) {
        toast({
          tone: "error",
          message: json.reason === "rate_limited" ? "Enhance is busy. Try again in a minute; your prompt is unchanged." : "Couldn't enhance right now. Your prompt is unchanged.",
        });
        return;
      }
      setBeforeEnhance((prev) => prev ?? original);
      updateDraft("image", { prompt: json.prompt });
      textRef.current?.focus();
    } catch {
      toast({ tone: "error", message: "Couldn't reach Enhance. Your prompt is unchanged." });
    } finally {
      setEnhancing(false);
    }
  };

  const revertEnhance = () => {
    if (beforeEnhance === null) return;
    updateDraft("image", { prompt: beforeEnhance });
    setBeforeEnhance(null);
    textRef.current?.focus();
  };

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
        "pointer-events-auto relative mx-auto w-full max-w-[920px] rounded-composer border bg-surface-2/90 shadow-float backdrop-blur-xl transition-colors duration-150",
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
            onReplace={openFilePicker}
            onRemove={() => updateDraft("image", { reference: undefined })}
            actions={
              <SaveElementPopover
                source={{
                  url: referenceUrl(draft.reference),
                  width: draft.reference.width,
                  height: draft.reference.height,
                  color: draft.reference.color,
                  defaultName: draft.reference.source === "upload" ? elementNameFrom(draft.reference.name.replace(/\.[a-z0-9]+$/i, "")) : elementNameFrom(draft.prompt),
                }}
                trigger={(props) => (
                  <Tooltip label="Save as Element">
                    <IconButton {...props} aria-label="Save reference as Element" size="sm">
                      <Bookmark aria-hidden="true" className="size-4" />
                    </IconButton>
                  </Tooltip>
                )}
              />
            }
          />
        </div>
      )}

      <div className="relative">
        <label htmlFor={PROMPT_INPUT_ID} className="sr-only">
          Describe the image you want to create
        </label>
        <textarea
          ref={textRef}
          id={PROMPT_INPUT_ID}
          rows={2}
          value={draft.prompt}
          readOnly={enhancing}
          onChange={(e) => updateDraft("image", { prompt: e.target.value })}
          placeholder="Describe the image you want to create…"
          spellCheck
          className={cn(
            "block w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none sm:px-5 sm:text-base",
            enhancing && "opacity-50",
          )}
        />
        {enhancing && <span aria-hidden="true" className="shimmer pointer-events-none absolute inset-x-4 top-4 bottom-2 rounded-chip opacity-60 sm:inset-x-5" />}
      </div>

      {beforeEnhance !== null && !enhancing && (
        <div className="flex items-center gap-2 px-4 pb-1 text-xs text-fg-subtle sm:px-5" aria-live="polite">
          <WandSparkles aria-hidden="true" className="size-3.5 text-accent" />
          Enhanced with AI. Edit it freely.
          <button type="button" onClick={revertEnhance} className="flex items-center gap-1 rounded-chip px-1.5 py-0.5 font-medium text-fg-muted hover:bg-surface-3 hover:text-fg">
            <RotateCcw aria-hidden="true" className="size-3" />
            Revert
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
        {!draft.reference && <ReferencePicker busy={busy} onUpload={openFilePicker} onSelect={(ref, match) => {
          const changed = setImageReference(ref, { matchAspect: match });
          if (changed) toast({ message: `Aspect ratio set to ${changed} to match your reference` });
        }} />}
        <DirectionPicker value={draft.direction ?? "auto"} onChange={(direction) => updateDraft("image", { direction })} />
        <LookPicker value={draft.look ?? "none"} onChange={(look) => updateDraft("image", { look })} />
        <AspectPicker value={draft.aspect} onChange={(aspect) => updateDraft("image", { aspect })} />
        <CountPicker value={draft.count} onChange={(count) => updateDraft("image", { count })} />
        <AdvancedPopover quality={qualityOf(draft)} seed={draft.seed} onChange={(patch) => updateDraft("image", patch)} />

        <div className="ml-auto flex items-center gap-2">
          <Tooltip label={draft.prompt.length > MAX_ENHANCE_INPUT ? "Prompt is already detailed" : "Rewrite your idea into a richer prompt with AI"}>
            <button
              type="button"
              onClick={enhance}
              disabled={!draft.prompt.trim() || enhancing || draft.prompt.length > MAX_ENHANCE_INPUT}
              className="flex h-9 items-center gap-1.5 rounded-chip px-2.5 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg disabled:opacity-40"
            >
              {enhancing ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <WandSparkles aria-hidden="true" className="size-4" strokeWidth={1.75} />}
              <span className="hidden sm:inline">{enhancing ? "Enhancing…" : "Enhance"}</span>
            </button>
          </Tooltip>
          <span className="hidden font-mono text-2xs text-fg-subtle lg:inline" aria-hidden="true">
            {isMac ? "⌘" : "Ctrl"} ↵
          </span>
          <Tooltip label={generating ? "Generating… one request at a time" : canGenerate ? "Generate" : "Describe what you want to create first"} align="end">
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
