"use client";

import { useState } from "react";
import { setVideoSource } from "@/lib/actions";
import { UploadError, importReferenceFile } from "@/lib/media/uploads";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";

/** Imports a device image as the Video source (stored locally, never uploaded anywhere). */
export function useVideoSourceUpload() {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const reference = await importReferenceFile(file);
      if (reference.source === "upload") {
        useStudio.getState().addUpload({ id: reference.id, name: reference.name, width: reference.width, height: reference.height, color: reference.color, createdAt: Date.now() });
      }
      setVideoSource(reference);
    } catch (error) {
      toast({
        tone: "error",
        message: error instanceof UploadError ? error.message : "That image couldn't be added. Try another file.",
      });
    } finally {
      setBusy(false);
    }
  };
  return { busy, upload };
}
