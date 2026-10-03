"use client";

import { useState } from "react";
import { setVideoSource } from "@/lib/actions";
import { UploadError, importReferenceFile } from "@/lib/media/uploads";
import { toast } from "@/store/toasts";

/** Imports a device image as the Video source (stored locally, never uploaded anywhere). */
export function useVideoSourceUpload() {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const reference = await importReferenceFile(file);
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
