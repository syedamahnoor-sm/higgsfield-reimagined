import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Mode } from "@/lib/types";

interface ModeSession {
  /** Jobs started in this browser session, newest first. */
  jobIds: string[];
  /** Job shown on the canvas; null shows the start view. */
  activeJobId: string | null;
  /** When a multi-image job is active, the asset expanded to full size. */
  focusedAssetId: string | null;
}

const EMPTY: ModeSession = { jobIds: [], activeJobId: null, focusedAssetId: null };

interface SessionState {
  sessions: Record<Mode, ModeSession>;
  addJob: (mode: Mode, jobId: string) => void;
  removeJob: (mode: Mode, jobId: string) => void;
  showJob: (mode: Mode, jobId: string, focusedAssetId?: string | null) => void;
  focusAsset: (mode: Mode, assetId: string | null) => void;
  showStart: (mode: Mode) => void;
}

/**
 * The working session behind the filmstrip. Kept in sessionStorage: it
 * survives a refresh of the tab, while a new tab starts a fresh session.
 * Everything generated still lives in the studio store for the Library.
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => {
      const update = (mode: Mode, fn: (s: ModeSession) => ModeSession) =>
        set((state) => ({ sessions: { ...state.sessions, [mode]: fn(state.sessions[mode]) } }));
      return {
        sessions: { image: EMPTY, video: EMPTY },
        addJob: (mode, jobId) =>
          update(mode, (s) => ({ jobIds: [jobId, ...s.jobIds], activeJobId: jobId, focusedAssetId: null })),
        removeJob: (mode, jobId) =>
          update(mode, (s) => ({
            jobIds: s.jobIds.filter((id) => id !== jobId),
            activeJobId: s.activeJobId === jobId ? null : s.activeJobId,
            focusedAssetId: s.activeJobId === jobId ? null : s.focusedAssetId,
          })),
        showJob: (mode, jobId, focusedAssetId = null) =>
          update(mode, (s) => ({ ...s, activeJobId: jobId, focusedAssetId })),
        focusAsset: (mode, assetId) => update(mode, (s) => ({ ...s, focusedAssetId: assetId })),
        showStart: (mode) => update(mode, (s) => ({ ...s, activeJobId: null, focusedAssetId: null })),
      };
    },
    {
      name: "ember-session",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);
