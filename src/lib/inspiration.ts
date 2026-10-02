import type { GenSettings } from "@/lib/types";

export interface InspirationExample {
  id: string;
  title: string;
  /** Cover photo from the curated local set. */
  cover: string;
  settings: GenSettings;
}

/** Starting points for the empty Image canvas. "Try this" loads the settings; it never fakes a result. */
export const IMAGE_EXAMPLES: InspirationExample[] = [
  {
    id: "alpine-dawn",
    title: "Alpine dawn",
    cover: "/media/pool/906.jpg",
    settings: {
      mode: "image",
      prompt: "Snow-covered alpine peak at dawn against a clear sky, crisp light, minimal composition",
      intent: "photoreal",
      aspect: "16:9",
      count: 2,
    },
  },
  {
    id: "window-light",
    title: "Window-light portrait",
    cover: "/media/pool/832.jpg",
    settings: {
      mode: "image",
      prompt: "Cinematic portrait of a woman reading by the window, soft natural light, moody shadows",
      intent: "photoreal",
      aspect: "4:5",
      count: 2,
    },
  },
  {
    id: "aurora",
    title: "Aurora night",
    cover: "/media/pool/901.jpg",
    settings: {
      mode: "image",
      prompt: "Green aurora borealis over snowy mountains at night, deep starry sky",
      intent: "auto",
      aspect: "16:9",
      count: 2,
    },
  },
  {
    id: "brutalist",
    title: "Brutalist geometry",
    cover: "/media/pool/942.jpg",
    settings: {
      mode: "image",
      prompt: "Minimal brutalist architecture, white concrete geometry against the sky, monochrome",
      intent: "auto",
      aspect: "3:4",
      count: 4,
    },
  },
  {
    id: "lioness",
    title: "Wild gaze",
    cover: "/media/pool/1074.jpg",
    settings: {
      mode: "image",
      prompt: "Close wildlife portrait of a lioness with an intense gaze, dark moody background",
      intent: "photoreal",
      aspect: "4:5",
      count: 1,
    },
  },
  {
    id: "strawberries",
    title: "Red still life",
    cover: "/media/pool/1080.jpg",
    settings: {
      mode: "image",
      prompt: "Overhead flat lay of fresh strawberries, vivid red fruit, editorial food photography",
      intent: "fast",
      aspect: "1:1",
      count: 2,
    },
  },
];
