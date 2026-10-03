"use client";

import type { MediaReference } from "@/lib/types";
import { LOCAL_MEDIA_PREFIX } from "./uploads";
import { useMediaUrl } from "./useMediaUrl";

/**
 * Resolves a reference to a displayable URL. Asset references use their media
 * URL (which may itself be local media); uploads are loaded from IndexedDB.
 * Returns `undefined` while loading and `null` if the media no longer exists.
 */
export function useReferenceUrl(reference?: MediaReference) {
  const url = !reference ? undefined : reference.source === "asset" ? reference.url : `${LOCAL_MEDIA_PREFIX}${reference.id}`;
  const resolved = useMediaUrl(url);
  return reference ? resolved : null;
}
