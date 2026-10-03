import { POOL } from "@/lib/generation/pool-data";
import type { AspectRatio, ExploreItem, ImageCount, Intent } from "@/lib/types";

/**
 * Curated inspiration for Explore. These are hand-picked photographs from the
 * local set, each paired with a prompt and settings written to reproduce the
 * idea in Create. They are examples, never presented as the user's own work.
 */

export type ExploreCategory = "landscapes" | "architecture" | "people" | "wildlife" | "objects";

export const EXPLORE_CATEGORIES: { id: ExploreCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "landscapes", label: "Landscapes" },
  { id: "architecture", label: "Architecture & city" },
  { id: "people", label: "People" },
  { id: "wildlife", label: "Wildlife" },
  { id: "objects", label: "Food & objects" },
];

const POOL_CATEGORY: Record<string, ExploreCategory> = {
  mountains: "landscapes",
  coast: "landscapes",
  "night-sky": "landscapes",
  forest: "landscapes",
  desert: "landscapes",
  architecture: "architecture",
  city: "architecture",
  portrait: "people",
  wildlife: "wildlife",
  food: "objects",
  vehicles: "objects",
  "still-life": "objects",
};

type Seed = [poolId: string, title: string, prompt: string, intent: Intent, aspect: AspectRatio, count: ImageCount];

const SEEDS: Seed[] = [
  ["p961", "Storm light on the Matterhorn", "Matterhorn peak under dramatic clouds above an alpine valley, moody light", "photoreal", "16:9", 2],
  ["p1027", "Studio portrait", "Studio portrait of a woman with red lips, soft light, dark background", "photoreal", "4:5", 2],
  ["p948", "Looking up", "White skyscraper facade looking up into a blue sky, geometric repetition", "auto", "9:16", 2],
  ["p903", "Under the galaxy", "Stargazer silhouette beneath a colorful milky way galaxy at night", "auto", "4:5", 2],
  ["p1069", "Ember jellyfish", "Orange jellyfish drifting in deep blue water, underwater marine detail", "fast", "1:1", 2],
  ["p923", "Autumn fog", "Misty autumn forest path with red leaves and soft fog", "auto", "4:5", 2],
  ["p857", "Blue hour skyline", "City skyline at blue hour, dramatic clouds and glowing lights", "photoreal", "16:9", 2],
  ["p593", "Resting tiger", "Tiger lying down, big cat portrait with warm light", "photoreal", "4:5", 1],
  ["p949", "Spiral rotunda", "White spiral rotunda interior seen from below, minimal museum architecture", "auto", "1:1", 2],
  ["p1015", "Fjord from above", "Aerial view of a fjord, steep cliff edge and deep blue water", "photoreal", "16:9", 2],
  ["p836", "Record shop", "Woman playing guitar in a record shop, fashion editorial with a hat", "auto", "1:1", 2],
  ["p564", "Slot canyon glow", "Antelope slot canyon, glowing orange sandstone and light beams", "photoreal", "3:4", 2],
  ["p1052", "Black sand", "Sea stacks on a black sand beach in snow, monochrome minimal", "auto", "16:9", 2],
  ["p431", "Morning latte", "Latte art coffee cup on a warm cafe table", "fast", "1:1", 2],
  ["p1033", "Symmetry underground", "Subway station escalator with perfect symmetry, futuristic urban", "auto", "3:4", 2],
  ["p1011", "Paddle out", "Woman in a canoe on a calm mountain lake, travel adventure", "photoreal", "16:9", 2],
  ["p873", "Mirror lake", "Mountain lake reflection, calm turquoise water mirroring the valley", "auto", "9:16", 2],
  ["p1074", "Lioness", "Lioness portrait with an intense gaze, wildlife", "photoreal", "4:5", 1],
  ["p893", "Curved facade", "Abstract curved facade pattern, monochrome architecture", "fast", "1:1", 4],
  ["p1039", "Hidden waterfall", "Waterfall in a lush green forest seen from above", "auto", "3:4", 2],
  ["p655", "Road trip", "Blue vintage camper van parked for a road trip", "auto", "16:9", 2],
  ["p525", "Dune walkers", "Hikers crossing an orange sand dune, minimal desert", "photoreal", "4:5", 2],
  ["p1022", "Northern lights", "Green aurora over a lone pine at night", "photoreal", "3:4", 2],
  ["p1071", "Chrome grille", "Vintage green car with a chrome grille on a classic street", "fast", "4:5", 2],
];

const byId = new Map(POOL.map((p) => [p.id, p]));

export const EXPLORE_ITEMS: (ExploreItem & { category: ExploreCategory; credit: string; creditUrl: string })[] = SEEDS.map(
  ([poolId, title, prompt, intent, aspect, count]) => {
    const image = byId.get(poolId);
    if (!image) throw new Error(`Unknown pool image ${poolId}`);
    return {
      id: `explore_${poolId}`,
      kind: "image",
      url: image.src,
      width: image.width,
      height: image.height,
      title,
      settings: { mode: "image", prompt, intent, aspect, count },
      tags: image.tags,
      category: POOL_CATEGORY[image.category] ?? "objects",
      credit: image.credit,
      creditUrl: image.sourceUrl,
    };
  },
);

export function findExploreItem(id: string | undefined) {
  return id ? EXPLORE_ITEMS.find((item) => item.id === id) : undefined;
}
