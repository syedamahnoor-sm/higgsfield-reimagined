"use client";

import { useEffect, useState } from "react";
import { getCachedUploadUrl, getUploadUrl, localMediaId } from "./uploads";

/**
 * Resolves an asset URL for display. Plain paths are returned as-is; local
 * media (generated images kept in IndexedDB) resolves asynchronously.
 * Returns `undefined` while loading and `null` if the media no longer exists.
 */
export function useMediaUrl(url: string | undefined) {
  const id = url ? localMediaId(url) : null;
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!id || getCachedUploadUrl(id)) return;
    let alive = true;
    void getUploadUrl(id).then((resolved) => {
      if (alive) setLoaded({ id, url: resolved });
    });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!url) return undefined;
  if (!id) return url;
  return getCachedUploadUrl(id) ?? (loaded?.id === id ? loaded.url : undefined);
}
