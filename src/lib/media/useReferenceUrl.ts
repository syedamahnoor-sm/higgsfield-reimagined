"use client";

import { useEffect, useState } from "react";
import type { MediaReference } from "@/lib/types";
import { getCachedUploadUrl, getUploadUrl } from "./uploads";

/**
 * Resolves a reference to a displayable URL. Asset references are already
 * stable; uploads are loaded from IndexedDB. Returns `undefined` while
 * loading and `null` if the upload no longer exists.
 */
export function useReferenceUrl(reference?: MediaReference) {
  const uploadId = reference?.source === "upload" ? reference.id : null;
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!uploadId || getCachedUploadUrl(uploadId)) return;
    let alive = true;
    void getUploadUrl(uploadId).then((url) => {
      if (alive) setLoaded({ id: uploadId, url });
    });
    return () => {
      alive = false;
    };
  }, [uploadId]);

  if (!reference) return null;
  if (reference.source === "asset") return reference.url;
  return getCachedUploadUrl(reference.id) ?? (loaded?.id === reference.id ? loaded.url : undefined);
}
