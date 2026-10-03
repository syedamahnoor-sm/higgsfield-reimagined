"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAudioSession } from "./audio";
import { useSession } from "./session";
import { useStudio } from "./studio";

function subscribe(callback: () => void) {
  const a = useStudio.persist.onFinishHydration(callback);
  const b = useSession.persist.onFinishHydration(callback);
  const c = useAudioSession.persist.onFinishHydration(callback);
  return () => {
    a();
    b();
    c();
  };
}

const snapshot = () => useStudio.persist.hasHydrated() && useSession.persist.hasHydrated() && useAudioSession.persist.hasHydrated();

/** True once persisted state has been restored on the client. Always false during SSR. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

/** Restores persisted stores after mount so server and client markup match. */
export function StoreHydrator() {
  useEffect(() => {
    void useStudio.persist.rehydrate();
    void useSession.persist.rehydrate();
    void useAudioSession.persist.rehydrate();
  }, []);
  return null;
}
