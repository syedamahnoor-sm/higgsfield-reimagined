import { averageColor } from "@/lib/color";
import { createId } from "@/lib/id";
import type { MediaReference } from "@/lib/types";

/**
 * Reference uploads never leave the browser. The (downscaled) file is stored
 * in IndexedDB and turned into an object URL on demand, so persisted state
 * only ever holds an upload id — never a URL that dies on refresh.
 */

const DB_NAME = "ember-media";
const STORE = "uploads";
const MAX_EDGE = 2048;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const urlCache = new Map<string, string>();

export function getCachedUploadUrl(id: string) {
  return urlCache.get(id) ?? null;
}

export async function getUploadUrl(id: string) {
  const cached = urlCache.get(id);
  if (cached) return cached;
  try {
    const blob = await tx<Blob | undefined>("readonly", (s) => s.get(id));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  } catch {
    return null;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process this image."))), type, quality),
  );
}

/**
 * Stores generated media (AI images and videos) locally and returns its
 * stable media URL. Results are kept as bytes in IndexedDB rather than as
 * provider URLs, which may expire; the "local-media:" URL resolves to a fresh
 * object URL on demand.
 */
export async function saveLocalMedia(blob: Blob) {
  const id = createId("gen");
  await tx("readwrite", (s) => s.put(blob, id));
  urlCache.set(id, URL.createObjectURL(blob));
  return `${LOCAL_MEDIA_PREFIX}${id}`;
}

export const LOCAL_MEDIA_PREFIX = "local-media:";

export function localMediaId(url: string) {
  return url.startsWith(LOCAL_MEDIA_PREFIX) ? url.slice(LOCAL_MEDIA_PREFIX.length) : null;
}

/** Resolves any asset URL to something displayable: stable paths pass through; local media comes from IndexedDB. */
export async function resolveMediaUrl(url: string) {
  const id = localMediaId(url);
  return id ? await getUploadUrl(id) : url;
}

export class UploadError extends Error {}

/** Validates, downscales and stores a reference image chosen by the user. */
export async function importReferenceFile(file: File): Promise<MediaReference> {
  if (!file.type.startsWith("image/")) throw new UploadError("That file isn't an image. Try a JPG, PNG or WebP.");
  if (file.size > MAX_FILE_BYTES) throw new UploadError("That image is larger than 25 MB.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UploadError("This image couldn't be read. Try a JPG, PNG or WebP.");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new UploadError("This browser couldn't process the image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  const blob = await canvasToBlob(canvas, keepAlpha ? "image/webp" : "image/jpeg", 0.9);
  const id = createId("upload");
  try {
    await tx("readwrite", (s) => s.put(blob, id));
  } catch {
    throw new UploadError("Your browser's storage is full or unavailable, so the reference couldn't be saved.");
  }
  urlCache.set(id, URL.createObjectURL(blob));

  return { source: "upload", id, name: file.name, width, height, color: averageColor(canvas) };
}
