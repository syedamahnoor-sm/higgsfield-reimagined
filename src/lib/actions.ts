import { closestAspect } from "@/lib/aspect";
import { downloadAsset } from "@/lib/media/download";
import type { Asset, GenSettings, MediaReference } from "@/lib/types";
import { useSession } from "@/store/session";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";

/**
 * The three ways a result feeds the next creation. They are deliberately distinct:
 *
 * - Remix:            reuse the prompt and settings.
 * - Use as reference: reuse the media itself as input.
 * - Animate:          send the image into the Video workflow as its source.
 */

export const PROMPT_INPUT_ID = "composer-prompt";

/**
 * Focuses the composer prompt. Retries for a short while so it also works
 * right after navigating to /create/image from another page.
 */
export function focusPrompt(attemptsLeft = 90) {
  requestAnimationFrame(() => {
    const el = document.getElementById(PROMPT_INPUT_ID) as HTMLTextAreaElement | null;
    if (!el) {
      if (attemptsLeft > 0) focusPrompt(attemptsLeft - 1);
      return;
    }
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  });
}

/** Replaces the image draft, offering Undo when there was something to lose. */
export function loadImageDraft(settings: GenSettings, message: string, parentId?: string) {
  const { drafts, draftParents, setDraft } = useStudio.getState();
  const previous = drafts.image;
  const previousParent = draftParents.image;
  setDraft("image", { ...settings, mode: "image" }, parentId);
  focusPrompt();
  const hadWork = previous.prompt.trim().length > 0 || previous.reference;
  toast({
    message,
    action: hadWork
      ? { label: "Undo", onClick: () => useStudio.getState().setDraft("image", previous, previousParent) }
      : undefined,
  });
}

/** Remix reuses settings: images go back to the Image composer, motion clips to the Video composer. */
export function remixAsset(asset: Asset) {
  if (asset.kind === "video") {
    loadVideoDraft(asset.settings, "Motion settings loaded. Adjust them and animate again.", asset.parentId);
    return;
  }
  loadImageDraft(asset.settings, "Prompt and settings loaded into the composer", asset.id);
}

/** Replaces the video draft and shows its source on the Video canvas, with Undo. */
export function loadVideoDraft(settings: GenSettings, message: string, parentId?: string) {
  const { drafts, draftParents, setDraft } = useStudio.getState();
  const previous = drafts.video;
  const previousParent = draftParents.video;
  setDraft("video", { ...settings, mode: "video" }, parentId);
  useSession.getState().showStart("video");
  toast({
    message,
    action: previous.reference
      ? { label: "Undo", onClick: () => useStudio.getState().setDraft("video", previous, previousParent) }
      : undefined,
  });
}

/** Sets the Video source (an upload or one of the user's images), defaulting the aspect ratio to the source's. */
export function setVideoSource(reference: MediaReference | undefined, parentId?: string) {
  const { drafts, setDraft } = useStudio.getState();
  setDraft(
    "video",
    {
      ...drafts.video,
      reference,
      aspect: reference ? closestAspect(reference.width, reference.height) : drafts.video.aspect,
    },
    parentId,
  );
  useSession.getState().showStart("video");
}

export function assetAsReference(asset: Asset): MediaReference {
  return { source: "asset", id: asset.id, url: asset.url, width: asset.width, height: asset.height, color: asset.color };
}

export function setAssetAsReference(asset: Asset) {
  const { drafts, updateDraft } = useStudio.getState();
  const previous = drafts.image.reference;
  updateDraft("image", { reference: assetAsReference(asset) });
  focusPrompt();
  toast({
    message: "Image set as the reference for your next generation",
    action: { label: "Undo", onClick: () => useStudio.getState().updateDraft("image", { reference: previous }) },
  });
}

/** Prepares the Video draft with this image as its source. The caller navigates to /create/video. */
export function prepareAnimate(asset: Asset) {
  useSession.getState().showStart("video");
  const { drafts, setDraft } = useStudio.getState();
  setDraft(
    "video",
    {
      ...drafts.video,
      prompt: asset.settings.prompt,
      reference: assetAsReference(asset),
      aspect: closestAspect(asset.width, asset.height),
    },
    asset.id,
  );
}

export async function downloadWithFeedback(asset: Asset) {
  try {
    await downloadAsset(asset);
  } catch (error) {
    toast({ tone: "error", message: error instanceof Error ? error.message : "Download failed." });
  }
}
