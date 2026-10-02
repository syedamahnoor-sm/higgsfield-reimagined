"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSession } from "./session";
import { useStudio } from "./studio";

function subscribe(callback: () => void) {
  const a = useStudio.persist.onFinishHydration(callback);
  const b = useSession.persist.onFinishHydration(callback);
  return () => {
    a();
    b();
  };
}

const snapshot = () => useStudio.persist.hasHydrated() && useSession.persist.hasHydrated();

/** True once persisted state has been restored on the client. Always false during SSR. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

/** Restores persisted stores after mount so server and client markup match. */
export function StoreHydrator() {
  useEffect(() => {
    void useStudio.persist.rehydrate();
    void useSession.persist.rehydrate();
  }, []);
  return null;
}
