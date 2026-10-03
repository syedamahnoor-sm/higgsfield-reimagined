"use client";

import { AlertCircle, Check, Copy, Download, FileAudio, FolderPlus, Loader2, RotateCcw, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Popover } from "@/components/ui/Popover";
import { downloadTranscript, timestamp } from "@/lib/audio/transcribe";
import { MAX_TRANSCRIBE_BYTES, TRANSCRIBE_ACCEPT, TRANSCRIBE_FORMATS_LABEL } from "@/lib/audio/transcribe-limits";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/id";
import { formatDuration } from "@/lib/voices";
import type { TranscriptResult } from "@/store/audio";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";

export const TRANSCRIBE_INPUT_ID = "transcribe-file";

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export interface PickedFile {
  file: File;
  duration?: number;
}

/** Left column: choose a file and start transcribing. */
export function TranscribeInput({
  picked,
  onPick,
  onClear,
  onTranscribe,
  busy,
  error,
}: {
  picked: PickedFile | null;
  onPick: (file: File) => void;
  onClear: () => void;
  onTranscribe: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[13px] font-medium text-fg">Audio file</p>
        <p className="mt-1 text-xs text-fg-subtle">
          {TRANSCRIBE_FORMATS_LABEL}, up to {Math.round(MAX_TRANSCRIBE_BYTES / 1024 / 1024)} MB. Speech in any common language.
        </p>
      </div>

      {picked ? (
        <div className="flex items-center gap-3 rounded-card border border-line-strong bg-surface-2 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-chip bg-surface-3 text-fg-muted">
            <FileAudio aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-fg">{picked.file.name}</p>
            <p className="font-mono text-2xs text-fg-subtle">
              {formatBytes(picked.file.size)}
              {picked.duration !== undefined && ` · ${formatDuration(picked.duration)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            aria-label="Remove file"
            className="grid size-8 shrink-0 place-items-center rounded-chip text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg disabled:opacity-40"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={TRANSCRIBE_INPUT_ID}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) onPick(file);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed px-4 py-10 text-center transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-accent",
            dragging ? "border-accent bg-accent-soft" : "border-line-strong hover:border-white/25 hover:bg-surface-2",
          )}
        >
          <Upload aria-hidden="true" className="size-5 text-fg-muted" />
          <span className="text-sm font-medium text-fg">Drop an audio file, or choose one</span>
          <span className="text-xs text-fg-subtle">Voice memos, interviews, voiceovers</span>
          <input
            id={TRANSCRIBE_INPUT_ID}
            type="file"
            accept={TRANSCRIBE_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPick(file);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 text-xs text-danger">
          <AlertCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={onTranscribe}
        disabled={!picked || busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-card bg-accent text-[15px] font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-40"
      >
        {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <FileAudio aria-hidden="true" className="size-4" />}
        {busy ? "Transcribing…" : error && picked ? "Retry" : "Transcribe"}
      </button>
      <p className="text-xs leading-relaxed text-fg-subtle">The file is sent to a speech-to-text model for this transcript only. It isn&apos;t stored on our server.</p>
    </div>
  );
}

/** Right column: progress, the transcript, and its actions. */
export function TranscriptStage({ result, busy, fileName, onStartOver }: { result: TranscriptResult | null; busy: boolean; fileName?: string; onStartOver: () => void }) {
  if (busy) {
    return (
      <div aria-busy="true" className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <Loader2 aria-hidden="true" className="size-6 animate-spin text-accent" />
        <p className="mt-4 text-[15px] font-medium text-fg">Transcribing</p>
        <p className="mt-1 max-w-xs truncate text-sm text-fg-muted">{fileName}</p>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-panel border border-line bg-surface-2 text-fg-muted">
          <FileAudio aria-hidden="true" strokeWidth={1.5} className="size-5" />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-fg">Turn speech into text</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
          Add an audio file to get a transcript with timestamps. Copy it, download it as text, or keep it as a note on a project Board.
        </p>
      </div>
    );
  }
  return <TranscriptResultView result={result} onStartOver={onStartOver} />;
}

function TranscriptResultView({ result, onStartOver }: { result: TranscriptResult; onStartOver: () => void }) {
  const [showTimes, setShowTimes] = useState(true);
  const [copied, setCopied] = useState(false);
  const hasSegments = result.segments.length > 0;
  const button =
    "flex h-9 items-center gap-2 rounded-chip px-3 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg";

  return (
    <article aria-label="Transcript" className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Transcript</p>
          <h2 className="mt-1 truncate text-lg font-semibold tracking-[-0.01em] text-fg">{result.fileName}</h2>
          <p className="mt-0.5 font-mono text-2xs text-fg-subtle">
            {[
              result.duration !== undefined ? formatDuration(result.duration) : null,
              result.wordCount !== undefined ? `${result.wordCount} words` : null,
              result.language ? `Language: ${result.language.toUpperCase()}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {hasSegments && (
          <label className="flex items-center gap-2 text-[13px] text-fg-muted">
            <input type="checkbox" checked={showTimes} onChange={(e) => setShowTimes(e.target.checked)} className="size-4 accent-[#ff6a3d]" />
            Timestamps
          </label>
        )}
      </header>

      <div role="toolbar" aria-label="Transcript actions" className="flex flex-wrap items-center gap-0.5 border-y border-line py-1.5">
        <button
          type="button"
          className={button}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(result.text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              toast({ tone: "error", message: "Couldn't copy in this browser." });
            }
          }}
        >
          {copied ? <Check aria-hidden="true" className="size-4 text-accent" /> : <Copy aria-hidden="true" className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className={button} onClick={() => downloadTranscript(result)}>
          <Download aria-hidden="true" className="size-4" /> Download .txt
        </button>
        <SaveTranscriptToProject result={result} className={button} />
        <button type="button" className={cn(button, "ml-auto")} onClick={onStartOver}>
          <RotateCcw aria-hidden="true" className="size-4" /> Start over
        </button>
      </div>

      {!result.text ? (
        <p className="text-sm text-fg-muted">No speech was detected in this file.</p>
      ) : hasSegments && showTimes ? (
        <ol className="flex flex-col gap-3">
          {result.segments.map((s, i) => (
            <li key={i} className="grid grid-cols-[3.25rem_1fr] gap-3">
              <span className="pt-0.5 font-mono text-xs text-fg-subtle tabular-nums">{timestamp(s.start)}</span>
              <span className="text-[15px] leading-relaxed text-fg">{s.text}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[15px] leading-relaxed whitespace-pre-line text-fg">{result.text}</p>
      )}
    </article>
  );
}

/** Keeps the transcript as a note card on a project's Board (transcripts aren't media assets). */
function SaveTranscriptToProject({ result, className }: { result: TranscriptResult; className: string }) {
  const projects = useStudio(useShallow((s) => Object.values(s.projects)));
  const sorted = useMemo(() => [...projects].sort((a, b) => b.updatedAt - a.updatedAt), [projects]);
  const save = (projectId: string, name: string) => {
    useStudio.getState().addBoardCard(projectId, {
      id: createId("card"),
      type: "note",
      title: `Transcript · ${result.fileName}`,
      text: result.text.slice(0, 4000),
    });
    toast({ message: `Transcript added to “${name}” as a note` });
  };
  return (
    <Popover
      label="Save transcript to a project"
      side="bottom"
      width={260}
      trigger={(props) => (
        <button type="button" {...props} className={className} disabled={!result.text}>
          <FolderPlus aria-hidden="true" className="size-4" /> Save to project
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col p-1">
          <p className="px-1.5 pt-0.5 pb-1 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Add as a Board note</p>
          {sorted.length === 0 ? (
            <p className="px-1.5 py-2 text-xs leading-relaxed text-fg-muted">Create a project first (from Projects), then save transcripts to its Board.</p>
          ) : (
            sorted.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  save(p.id, p.name);
                  close();
                }}
                className="truncate rounded-chip px-2.5 py-2 text-left text-[13px] font-medium text-fg transition-colors hover:bg-surface-3 focus-visible:bg-surface-3"
              >
                {p.name}
              </button>
            ))
          )}
        </div>
      )}
    </Popover>
  );
}

