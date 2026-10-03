import { centerCrop } from "@/lib/aspect";
import type { Asset } from "@/lib/types";
import { resolveMediaUrl } from "./uploads";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The image couldn't be loaded for download."));
    img.src = src;
  });
}

function slug(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "image"
  );
}

/**
 * Downloads exactly what is displayed: the asset cropped to its aspect ratio
 * at its stated output resolution.
 */
export async function downloadAsset(asset: Asset) {
  if (asset.renderer === "file") return downloadFile(asset);
  const src = await resolveMediaUrl(asset.url);
  if (!src) throw new Error("This image is no longer available on this device.");
  const img = await loadImage(src);
  const crop = centerCrop(img.naturalWidth, img.naturalHeight, asset.width / asset.height);
  const canvas = document.createElement("canvas");
  canvas.width = asset.width;
  canvas.height = asset.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser couldn't prepare the download.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, asset.width, asset.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("This browser couldn't prepare the download.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ember-${slug(asset.settings.prompt)}-${asset.id.slice(-6)}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Real video and audio files are downloaded byte-for-byte, exactly as stored. */
async function downloadFile(asset: Asset) {
  const audio = asset.kind === "audio";
  const src = await resolveMediaUrl(asset.url);
  if (!src) throw new Error(`This ${audio ? "audio" : "video"} is no longer available on this device.`);
  const blob = await (await fetch(src)).blob();
  const extension = audio ? (asset.audio?.format === "wav" ? "wav" : "mp3") : blob.type.includes("webm") ? "webm" : "mp4";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ember-${audio ? `voice-${asset.audio?.speaker ?? ""}` : "video"}-${slug(asset.settings.prompt)}-${asset.id.slice(-6)}.${extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
