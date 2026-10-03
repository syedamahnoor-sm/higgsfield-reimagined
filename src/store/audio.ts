import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { VoiceSettings } from "@/lib/types";

export type AudioTab = "voice" | "transcribe";

/** A voice generation in progress (or one that just failed). Not persisted: a reload ends it. */
export interface VoiceRun {
  id: string;
  status: "running" | "failed";
  stage: string;
  error?: string;
  /** Set when the AI service is temporarily unavailable (usage or rate limit). */
  limited?: boolean;
  settings: VoiceSettings;
  parentId?: string;
  projectId?: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  fileName: string;
  fileBytes: number;
  text: string;
  segments: TranscriptSegment[];
  language?: string;
  duration?: number;
  wordCount?: number;
  createdAt: number;
}

interface AudioSessionState {
  tab: AudioTab;
  /** Voice results made in this browser session, newest first (asset ids). */
  takes: string[];
  activeAssetId: string | null;
  run: VoiceRun | null;
  transcript: TranscriptResult | null;
  setTab: (tab: AudioTab) => void;
  setRun: (run: VoiceRun | null) => void;
  patchRun: (id: string, patch: Partial<VoiceRun>) => void;
  addTake: (assetId: string) => void;
  showTake: (assetId: string | null) => void;
  setTranscript: (transcript: TranscriptResult | null) => void;
}

/**
 * The Audio workspace's working session, kept in sessionStorage like the
 * Image/Video filmstrip. Finished voices are Library assets in the studio store.
 */
export const useAudioSession = create<AudioSessionState>()(
  persist(
    (set) => ({
      tab: "voice",
      takes: [],
      activeAssetId: null,
      run: null,
      transcript: null,
      setTab: (tab) => set({ tab }),
      setRun: (run) => set({ run }),
      patchRun: (id, patch) => set((s) => (s.run?.id === id ? { run: { ...s.run, ...patch } } : s)),
      addTake: (assetId) => set((s) => ({ takes: [assetId, ...s.takes.filter((t) => t !== assetId)].slice(0, 30), activeAssetId: assetId })),
      showTake: (assetId) => set({ activeAssetId: assetId }),
      setTranscript: (transcript) => set({ transcript }),
    }),
    {
      name: "ember-audio-session",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (s) => ({ tab: s.tab, takes: s.takes, activeAssetId: s.activeAssetId, transcript: s.transcript }),
    },
  ),
);
