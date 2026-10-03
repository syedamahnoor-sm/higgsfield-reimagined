/**
 * Core domain model shared by Create, Explore and Library.
 *
 * Everything a creator can reproduce lives in `GenSettings`. Remix copies
 * settings, Use as Reference copies media, and Animate sends an image into
 * the video draft. Assets keep `parentId` so lineage survives those hops.
 */

export type Mode = "image" | "video";

/** Legacy speed/quality choice kept for older drafts and assets; new work uses `quality`. */
export type Intent = "auto" | "photoreal" | "fast";

/** What kind of creative output to make. Applied as guidance on the server; never rewrites the prompt. */
export type Direction = "auto" | "cinematic" | "editorial" | "portrait" | "product" | "illustration";

/** Visual treatment, distinct from Direction. Applied as guidance on the server. */
export type LookId = "none" | "film-grain" | "dreamy-glow" | "vintage-film" | "noir" | "neon-night" | "high-contrast";

/** Output size (a real model parameter): draft 768, standard 1024, high 1536 px long edge. */
export type Quality = "draft" | "standard" | "high";

/** "edit" sends an image plus an instruction to change it (real reference-conditioned editing). */
export type Operation = "generate" | "edit";

export type AspectRatio = "1:1" | "4:5" | "3:4" | "16:9" | "9:16";

export type ImageCount = 1 | 2 | 4;

export type MotionPreset = "push-in" | "pull-out" | "pan" | "orbit" | "drift" | "handheld";

export type VideoDuration = 3 | 5 | 10;

/** How a video is made: real AI image-to-video, or the in-browser camera-move preview. */
export type VideoEngineKind = "ai" | "motion";

export type VideoResolution = "480p" | "580p" | "720p";

/** AI video camera presets; "none" sends the creator's description only. */
export type AiCameraPreset = "none" | "push-in" | "pull-back" | "pan-left" | "pan-right" | "static" | "orbit";

/**
 * A reference image used as input for a generation.
 *
 * Uploads live in IndexedDB and are resolved to a fresh object URL at runtime,
 * so nothing temporary is persisted. Asset references point at stable media URLs.
 */
export type MediaReference =
  | { source: "upload"; id: string; name: string; width: number; height: number; color?: string }
  | { source: "asset"; id: string; url: string; width: number; height: number; color?: string };

export interface GenSettings {
  mode: Mode;
  prompt: string;
  intent: Intent;
  /** Explicit model override from the advanced selector; undefined means "let the intent decide". */
  modelId?: string;
  aspect: AspectRatio;
  count: ImageCount;
  reference?: MediaReference;
  /** Video only. */
  motion?: MotionPreset;
  /** Video only, in seconds. */
  duration?: VideoDuration;
  /** Video only: AI video or Motion Preview. Undefined means Motion Preview (older drafts/assets). */
  videoEngine?: VideoEngineKind;
  /** AI video only. */
  resolution?: VideoResolution;
  /** AI video only: camera move turned into explicit camera wording on the server. */
  camera?: AiCameraPreset;
  /** Image: creative direction (guidance added server-side). */
  direction?: Direction;
  /** Image: visual look (guidance added server-side). */
  look?: LookId;
  /** Image: output size. Falls back to the legacy `intent` when absent. */
  quality?: Quality;
  /** Image: fixed seed for reproducible results; undefined means a new random seed each run. */
  seed?: number;
  /** Image: generate (default) or edit an input image with an instruction. */
  operation?: Operation;
}

export interface Asset {
  id: string;
  kind: Mode;
  url: string;
  /** Still frame for video assets. */
  posterUrl?: string;
  width: number;
  height: number;
  settings: GenSettings;
  /** The model the engine actually used, so "Auto" can show what it picked. */
  resolvedModel: string;
  /** Explore item or asset this one was remixed/animated from. */
  parentId?: string;
  favorite: boolean;
  createdAt: number;
  jobId: string;
  /** Average colour, used for colour-aware matching when reused as a reference. */
  color?: string;
  /** Credit for media that came from a curated photo set rather than a model. */
  attribution?: Attribution;
  /**
   * How the asset is displayed. "image" (default) shows `url`; "motion" is a
   * browser-motion clip reconstructed from `settings.reference` + motion
   * settings; "file" is a real video file (AI video), stored locally.
   */
  renderer?: AssetRenderer;
  /** Underlying model, for subtle display in details only (e.g. "FLUX.2 Turbo"). */
  modelLabel?: string;
  /** The seed the provider used, so a result can be reproduced. */
  seed?: number;
}

/** A reusable saved visual reference (not a trained model). Lives in the browser like the Library. */
export interface CreativeElement {
  id: string;
  name: string;
  kind: ElementKind;
  /** Stable path or local-media URL. */
  url: string;
  width: number;
  height: number;
  color?: string;
  createdAt: number;
  sourceAssetId?: string;
}

export type ElementKind = "character" | "product" | "object" | "reference";

/** A reference image the creator uploaded, kept so it can be picked again later. */
export interface UploadRecord {
  id: string;
  name: string;
  width: number;
  height: number;
  color?: string;
  createdAt: number;
}

export type AssetRenderer = "image" | "motion" | "file";

export interface Attribution {
  name: string;
  url: string;
}

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface Job {
  id: string;
  settings: GenSettings;
  status: JobStatus;
  /** 0–1 */
  progress: number;
  /** Human-readable stage while running, e.g. "Creating image". */
  stage?: string;
  assetIds: string[];
  error?: string;
  /** Engine-provided note about the result, e.g. how closely the prompt was matched. */
  note?: string;
  engineId: string;
  resolvedModel?: string;
  /** Explore item or asset the draft was remixed from, carried onto the produced assets. */
  parentId?: string;
  /** Generation set: the first job of a Regenerate / Variations / Edit chain. */
  setId?: string;
  /** How this job came about within its set. */
  origin?: "generate" | "regenerate" | "variations" | "edit";
  createdAt: number;
  finishedAt?: number;
}

export interface ExploreItem {
  id: string;
  kind: Mode;
  url: string;
  posterUrl?: string;
  width: number;
  height: number;
  title: string;
  settings: GenSettings;
  tags: string[];
}

export type LibraryFilter = "all" | "images" | "videos" | "favorites" | "elements";
