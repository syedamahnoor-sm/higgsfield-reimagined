import { closestAspect } from "@/lib/aspect";
import { downloadAsset } from "@/lib/media/download";
import { createId } from "@/lib/id";
import { LOCAL_MEDIA_PREFIX } from "@/lib/media/uploads";
import type { Asset, CreativeElement, ElementKind, GenSettings, Job, MediaReference, UploadRecord } from "@/lib/types";
import { projectForAsset } from "@/lib/projects";
import { useAudioSession } from "@/store/audio";
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
  // Edits and fixed seeds belong to the result they produced; a remix starts a fresh generation.
  setDraft("image", { ...settings, mode: "image", operation: undefined }, parentId);
  focusPrompt();
  const hadWork = previous.prompt.trim().length > 0 || previous.reference;
  toast({
    message,
    action: hadWork
      ? { label: "Undo", onClick: () => useStudio.getState().setDraft("image", previous, previousParent) }
      : undefined,
  });
}

/** Remix reuses settings: images go back to the Image composer, clips to Video, voices to Audio. */
export function remixAsset(asset: Asset) {
  if (asset.kind === "audio") {
    loadVoiceDraft(asset);
    return;
  }
  if (asset.kind === "video") {
    const message =
      asset.settings.videoEngine === "ai"
        ? "Video prompt and settings loaded. Adjust them and generate again."
        : "Motion settings loaded. Adjust them and animate again.";
    loadVideoDraft(asset.settings, message, asset.parentId);
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
  const { drafts, setDraft, setProjectContext } = useStudio.getState();
  // The clip joins the source image's project, shown (and removable) in the composer.
  const projectId = projectForAsset(asset.id);
  if (projectId) setProjectContext("video", projectId);
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

/* ---------- Stage 8: sets, edits, elements, references ---------- */

/** Regenerate: run the same settings again with a new seed, as a new version in the same set. */
export async function regenerateJob(job: Job) {
  const { startGeneration } = await import("@/lib/generation/run");
  void startGeneration(
    { ...job.settings, seed: undefined },
    { parentId: job.parentId, setId: job.setId ?? job.id, origin: "regenerate", projectId: job.projectId },
  );
}

/**
 * Variations: more takes from the same prompt, direction, look and settings
 * with new seeds. These are independent generations, not image-conditioned.
 */
export async function variationsOf(job: Job) {
  const { startGeneration } = await import("@/lib/generation/run");
  void startGeneration(
    { ...job.settings, seed: undefined, operation: undefined, count: 2 },
    { parentId: job.parentId, setId: job.setId ?? job.id, origin: "variations", projectId: job.projectId },
  );
}

/** Edit with Prompt: the image is sent to the model as the input image with an instruction. */
export async function editAsset(asset: Asset, instruction: string, setId?: string) {
  const { startGeneration } = await import("@/lib/generation/run");
  void startGeneration(
    {
      ...asset.settings,
      prompt: instruction.trim(),
      operation: "edit",
      reference: assetAsReference(asset),
      count: 1,
      seed: undefined,
    },
    // An edit joins the project its source image belongs to.
    { parentId: asset.id, setId, origin: "edit", projectId: projectForAsset(asset.id) },
  );
}

/* ---------- Stage 9: voice ---------- */

/** Loads a voice result's script and settings back into the Voice composer. */
export function loadVoiceDraft(asset: Asset) {
  const audio = asset.audio;
  if (!audio) return;
  const { voiceDraft, updateVoiceDraft, setVoiceParent } = useStudio.getState();
  const previous = voiceDraft;
  updateVoiceDraft({
    script: audio.script,
    language: audio.language,
    speaker: audio.speaker,
    format: audio.format,
    bitRate: audio.bitRate,
    sampleRate: audio.sampleRate,
  });
  setVoiceParent(asset.parentId);
  toast({
    message: "Script and voice loaded into the Voice composer",
    action: { label: "Undo", onClick: () => useStudio.getState().updateVoiceDraft(previous) },
  });
}

/**
 * Create voiceover: opens Voice with this video (or image) as the source, so
 * the audio is linked to it and joins its project. The script is left for
 * the creator to write. The caller navigates to /create/audio.
 */
export function prepareVoiceover(asset: Asset) {
  const { setVoiceParent, setProjectContext } = useStudio.getState();
  setVoiceParent(asset.id);
  const projectId = projectForAsset(asset.id);
  if (projectId) setProjectContext("audio", projectId);
  useAudioSession.getState().setTab("voice");
}

export async function copyPrompt(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ message: "Prompt copied" });
  } catch {
    toast({ tone: "error", message: "Couldn't copy the prompt in this browser." });
  }
}

/** A short default name for an Element, taken from the prompt. */
export function elementNameFrom(text: string) {
  const words = text.trim().split(/\s+/).slice(0, 4).join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Untitled element";
}

/** Saves a reusable visual reference (not a trained model) in this browser. */
export function saveElement(input: { name: string; kind: ElementKind; url: string; width: number; height: number; color?: string; sourceAssetId?: string }) {
  const element: CreativeElement = { id: createId("el"), createdAt: Date.now(), ...input, name: input.name.trim() || "Untitled element" };
  useStudio.getState().saveElement(element);
  toast({ message: `Saved “${element.name}” to Elements` });
  return element;
}

export function elementAsReference(element: CreativeElement): MediaReference {
  return { source: "asset", id: element.id, url: element.url, width: element.width, height: element.height, color: element.color };
}

export function uploadAsReference(upload: UploadRecord): MediaReference {
  return { source: "upload", id: upload.id, name: upload.name, width: upload.width, height: upload.height, color: upload.color };
}

/** Stable URL for any reference, used when saving it as an Element. */
export function referenceUrl(reference: MediaReference) {
  return reference.source === "asset" ? reference.url : `${LOCAL_MEDIA_PREFIX}${reference.id}`;
}

/** Sets the Image reference from any source (upload, Element, result), matching aspect for new uploads. */
export function setImageReference(reference: MediaReference | undefined, options: { matchAspect?: boolean } = {}) {
  const { drafts, updateDraft } = useStudio.getState();
  const patch: Partial<GenSettings> = { reference };
  if (reference && options.matchAspect) patch.aspect = closestAspect(reference.width, reference.height);
  updateDraft("image", patch);
  return drafts.image.aspect !== patch.aspect && patch.aspect ? patch.aspect : null;
}
