/**
 * Core domain model shared by Create, Explore and Library.
 *
 * Everything a creator can reproduce lives in `GenSettings`. Remix copies
 * settings, Use as Reference copies media, and Animate sends an image into
 * the video draft. Assets keep `parentId` so lineage survives those hops.
 */

export type Mode = "image" | "video";

/** Every kind of media the studio keeps: generated images and videos, plus voice audio. */
export type MediaKind = Mode | "audio";

/** The three Create workspaces. */
export type CreateKind = MediaKind;

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
  /** "audio" only appears on voice assets, whose script is kept in `prompt` so search and copy work everywhere. */
  mode: MediaKind;
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
  kind: MediaKind;
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
  /** Voice audio only: what was spoken, by whom, and the file that came back. */
  audio?: AudioMeta;
}

/* ---------- Audio (voice) ---------- */

/** Voice models are per language (Aura-2 English and Aura-2 Spanish). */
export type VoiceLanguage = "en" | "es";

/** MP3 (default) or uncompressed WAV. */
export type AudioFormat = "mp3" | "wav";

export interface VoiceSettings {
  script: string;
  language: VoiceLanguage;
  speaker: string;
  format: AudioFormat;
  /** MP3 only: 48000 (default) or 32000 bits per second. */
  bitRate?: number;
  /** WAV only: 24000 (default), 48000 or 16000 Hz. */
  sampleRate?: number;
}

export interface AudioMeta extends VoiceSettings {
  /** Seconds, measured from the decoded file. */
  duration?: number;
  contentType: string;
  bytes?: number;
  /** Real peak amplitudes (0–1) measured from the decoded audio, for the waveform. */
  peaks?: number[];
}

/* ---------- Projects ---------- */

/** Something a project holds: one of the user's assets or Elements, by id (media is never copied). */
export interface ProjectRef {
  kind: "asset" | "element";
  id: string;
}

/** A tile on a project's Board: a reference to project media, or a short text note. */
export type BoardCard =
  | { id: string; type: "ref"; ref: ProjectRef }
  | { id: string; type: "note"; title?: string; text: string };

/** One creative idea or campaign: its media (by reference), a Board, and a cover. */
export interface Project {
  id: string;
  name: string;
  description?: string;
  /** Asset id chosen as the cover; otherwise the newest image is used. */
  coverAssetId?: string;
  items: (ProjectRef & { addedAt: number })[];
  board: BoardCard[];
  createdAt: number;
  updatedAt: number;
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
  /** Project the results join when they finish. */
  projectId?: string;
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

export type LibraryFilter = "all" | "images" | "videos" | "audio" | "favorites" | "elements";
