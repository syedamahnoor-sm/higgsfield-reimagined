import { POOL } from "@/lib/generation/pool-data";
import type { AspectRatio, Direction, ExploreItem, ImageCount, LookId } from "@/lib/types";

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

type Seed = [poolId: string, title: string, prompt: string, direction: Direction, aspect: AspectRatio, count: ImageCount, look?: LookId];

const SEEDS: Seed[] = [
  ["p961", "Storm light on the Matterhorn", "Matterhorn peak under dramatic clouds above an alpine valley, moody light", "cinematic", "16:9", 2],
  ["p1027", "Studio portrait", "Studio portrait of a woman with red lips, soft light, dark background", "portrait", "4:5", 2],
  ["p948", "Looking up", "White skyscraper facade looking up into a blue sky, geometric repetition", "editorial", "9:16", 2],
  ["p903", "Under the galaxy", "Stargazer silhouette beneath a colorful milky way galaxy at night", "cinematic", "4:5", 2, "dreamy-glow"],
  ["p1069", "Ember jellyfish", "Orange jellyfish drifting in deep blue water, underwater marine detail", "auto", "1:1", 2],
  ["p923", "Autumn fog", "Misty autumn forest path with red leaves and soft fog", "cinematic", "4:5", 2, "film-grain"],
  ["p857", "Blue hour skyline", "City skyline at blue hour, dramatic clouds and glowing lights", "cinematic", "16:9", 2, "neon-night"],
  ["p593", "Resting tiger", "Tiger lying down, big cat portrait with warm light", "portrait", "4:5", 1],
  ["p949", "Spiral rotunda", "White spiral rotunda interior seen from below, minimal museum architecture", "editorial", "1:1", 2],
  ["p1015", "Fjord from above", "Aerial view of a fjord, steep cliff edge and deep blue water", "cinematic", "16:9", 2],
  ["p836", "Record shop", "Woman playing guitar in a record shop, fashion editorial with a hat", "editorial", "1:1", 2],
  ["p564", "Slot canyon glow", "Antelope slot canyon, glowing orange sandstone and light beams", "cinematic", "3:4", 2],
  ["p1052", "Black sand", "Sea stacks on a black sand beach in snow, monochrome minimal", "editorial", "16:9", 2, "noir"],
  ["p431", "Morning latte", "Latte art coffee cup on a warm cafe table", "product", "1:1", 2],
  ["p1033", "Symmetry underground", "Subway station escalator with perfect symmetry, futuristic urban", "cinematic", "3:4", 2],
  ["p1011", "Paddle out", "Woman in a canoe on a calm mountain lake, travel adventure", "cinematic", "16:9", 2],
  ["p873", "Mirror lake", "Mountain lake reflection, calm turquoise water mirroring the valley", "auto", "9:16", 2],
  ["p1074", "Lioness", "Lioness portrait with an intense gaze, wildlife", "portrait", "4:5", 1],
  ["p893", "Curved facade", "Abstract curved facade pattern, monochrome architecture", "editorial", "1:1", 4, "noir"],
  ["p1039", "Hidden waterfall", "Waterfall in a lush green forest seen from above", "auto", "3:4", 2],
  ["p655", "Road trip", "Blue vintage camper van parked for a road trip", "editorial", "16:9", 2, "vintage-film"],
  ["p525", "Dune walkers", "Hikers crossing an orange sand dune, minimal desert", "cinematic", "4:5", 2],
  ["p1022", "Northern lights", "Green aurora over a lone pine at night", "cinematic", "3:4", 2],
  ["p1071", "Chrome grille", "Vintage green car with a chrome grille on a classic street", "product", "4:5", 2, "vintage-film"],
];

const byId = new Map(POOL.map((p) => [p.id, p]));

export const EXPLORE_ITEMS: (ExploreItem & { category: ExploreCategory; credit: string; creditUrl: string })[] = SEEDS.map(
  ([poolId, title, prompt, direction, aspect, count, look]) => {
    const image = byId.get(poolId);
    if (!image) throw new Error(`Unknown pool image ${poolId}`);
    return {
      id: `explore_${poolId}`,
      kind: "image",
      url: image.src,
      width: image.width,
      height: image.height,
      title,
      settings: { mode: "image", prompt, intent: "auto", direction, look: look ?? "none", quality: "standard", aspect, count },
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
