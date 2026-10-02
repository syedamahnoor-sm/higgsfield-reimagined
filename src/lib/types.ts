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

export interface MediaReference {
  /** Set when the reference is an existing Library asset. */
  assetId?: string;
  url: string;
  width: number;
  height: number;
}

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
  createdAt: number;
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
