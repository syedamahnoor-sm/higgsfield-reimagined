import type { GenSettings } from "@/lib/types";

export interface Template {
  id: string;
  title: string;
  description: string;
  /** Example photo from the curated local set (illustrates the idea; not the template's output). */
  cover: string;
  settings: GenSettings;
}

const base = { mode: "image", intent: "auto", quality: "standard", count: 2 } as const;

/** Quick starts for the empty Image canvas. Each preconfigures prompt, direction, look and shape; all stay editable. */
export const TEMPLATES: Template[] = [
  {
    id: "cinematic-portrait",
    title: "Cinematic Portrait",
    description: "Moody, film-still portrait",
    cover: "/media/pool/832.jpg",
    settings: {
      ...base,
      prompt: "Cinematic portrait of a woman beside a rain-streaked window at dusk, quiet contemplative mood",
      direction: "cinematic",
      look: "film-grain",
      aspect: "4:5",
    },
  },
  {
    id: "product-shot",
    title: "Product Shot",
    description: "Clean hero shot for a product",
    cover: "/media/pool/1068.jpg",
    settings: {
      ...base,
      prompt: "A handmade ceramic vase on a sculpted pedestal, simple elegant composition",
      direction: "product",
      look: "none",
      aspect: "1:1",
    },
  },
  {
    id: "fashion-editorial",
    title: "Fashion Editorial",
    description: "Magazine-ready styling",
    cover: "/media/pool/836.jpg",
    settings: {
      ...base,
      prompt: "Model in an oversized camel coat walking through a minimalist concrete plaza",
      direction: "editorial",
      look: "high-contrast",
      aspect: "3:4",
    },
  },
  {
    id: "character-concept",
    title: "Character Concept",
    description: "Full-body character art",
    cover: "/media/pool/903.jpg",
    settings: {
      ...base,
      prompt: "A lone explorer in a weathered cloak overlooking a glowing alien valley, full-body character concept",
      direction: "illustration",
      look: "dreamy-glow",
      aspect: "3:4",
    },
  },
  {
    id: "social-campaign",
    title: "Social Campaign",
    description: "Scroll-stopping post visual",
    cover: "/media/pool/431.jpg",
    settings: {
      ...base,
      prompt: "Inviting overhead shot of a morning coffee ritual on a warm wooden table for a café launch post",
      direction: "editorial",
      look: "vintage-film",
      aspect: "4:5",
    },
  },
  {
    id: "landscape",
    title: "Landscape / Environment",
    description: "Epic world or location",
    cover: "/media/pool/961.jpg",
    settings: {
      ...base,
      prompt: "Vast mountain valley at golden hour with low clouds rolling through the peaks",
      direction: "cinematic",
      look: "none",
      aspect: "16:9",
    },
  },
];
