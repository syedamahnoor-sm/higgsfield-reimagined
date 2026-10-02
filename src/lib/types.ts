/**
 * Core domain model shared by Create, Explore and Library.
 *
 * Everything a creator can reproduce lives in `GenSettings`. Remix copies
 * settings, Use as Reference copies media, and Animate sends an image into
 * the video draft. Assets keep `parentId` so lineage survives those hops.
 */

export type Mode = "image" | "video";

/** Intent-oriented quality choices. Only intents the active engine genuinely supports are exposed. */
export type Intent = "auto" | "photoreal" | "fast";

export type AspectRatio = "1:1" | "4:5" | "3:4" | "16:9" | "9:16";

export type ImageCount = 1 | 2 | 4;

export type MotionPreset = "push-in" | "pull-out" | "pan" | "orbit" | "drift" | "handheld";

export type VideoDuration = 5 | 10;

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
}

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
  assetIds: string[];
  error?: string;
  /** Engine-provided note about the result, e.g. how closely the prompt was matched. */
  note?: string;
  engineId: string;
  resolvedModel?: string;
  /** Explore item or asset the draft was remixed from, carried onto the produced assets. */
  parentId?: string;
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

export type LibraryFilter = "all" | "images" | "videos" | "favorites";
