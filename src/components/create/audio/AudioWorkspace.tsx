"use client";

import { FileAudio, Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { checkTranscribeFile, probeDuration, TranscribeError, transcribeFile } from "@/lib/audio/transcribe";
import { checkVoiceAvailability } from "@/lib/audio/voice";
import { cn } from "@/lib/cn";
import { useAudioSession, type AudioTab } from "@/store/audio";
import { useHydrated } from "@/store/hydration";
import { TranscribeInput, TranscriptStage, type PickedFile } from "./Transcribe";
import { VoiceComposer } from "./VoiceComposer";
import { VoiceStage } from "./VoiceStage";

const TABS: { id: AudioTab; label: string; icon: typeof Mic }[] = [
  { id: "voice", label: "Voice", icon: Mic },
  { id: "transcribe", label: "Transcribe", icon: FileAudio },
];

/**
 * Audio workspace: Voice (text-to-speech) and Transcribe (speech-to-text).
 * Controls sit in a side column; the result takes the larger stage.
 */
export function AudioWorkspace() {
  const hydrated = useHydrated();
  const tab = useAudioSession((s) => s.tab);
  const setTab = useAudioSession((s) => s.setTab);
  const transcript = useAudioSession((s) => s.transcript);
  const setTranscript = useAudioSession((s) => s.setTranscript);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void checkVoiceAvailability().then((ok) => alive && setAvailable(ok));
    return () => {
      alive = false;
    };
  }, []);

  const pick = async (file: File) => {
    const problem = checkTranscribeFile(file);
    setError(problem);
    if (problem) return;
    setPicked({ file });
    const duration = await probeDuration(file);
    setPicked((p) => (p?.file === file ? { file, duration } : p));
  };

  const transcribe = async () => {
    if (!picked || busy) return;
    setBusy(true);
    setError(null);
    try {
      setTranscript(await transcribeFile(picked.file));
    } catch (e) {
      setError(e instanceof TranscribeError ? e.message : "The transcription service ran into a problem. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) return <div className="flex-1" aria-busy="true" />;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <aside
        aria-label={tab === "voice" ? "Voice settings" : "Transcribe settings"}
        className="flex shrink-0 flex-col gap-5 border-b border-line p-4 sm:p-5 lg:w-[400px] lg:overflow-y-auto lg:border-r lg:border-b-0 xl:w-[440px]"
      >
        <div role="tablist" aria-label="Audio mode" className="flex rounded-card border border-line bg-surface-2 p-1">
          {TABS.map((t) => {
            const active = t.id === tab;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`audio-tab-${t.id}`}
                aria-selected={active}
                aria-controls="audio-panel"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center gap-2 rounded-chip text-[13px] font-medium transition-colors",
                  active ? "border border-line-strong bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg-muted",
                )}
              >
                <Icon aria-hidden="true" className={cn("size-4", active && "text-accent")} />
                {t.label}
              </button>
            );
          })}
        </div>
        <div id="audio-panel" role="tabpanel" aria-labelledby={`audio-tab-${tab}`}>
          {tab === "voice" ? (
            <VoiceComposer available={available} />
          ) : (
            <TranscribeInput
              picked={picked}
              onPick={(f) => void pick(f)}
              onClear={() => {
                setPicked(null);
                setError(null);
              }}
              onTranscribe={() => void transcribe()}
              busy={busy}
              error={error}
            />
          )}
        </div>
      </aside>

      <div className="flex min-h-[50dvh] min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
        {tab === "voice" ? (
          <VoiceStage />
        ) : (
          <TranscriptStage
            result={transcript}
            busy={busy}
            fileName={picked?.file.name}
            onStartOver={() => {
              setTranscript(null);
              setPicked(null);
              setError(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
