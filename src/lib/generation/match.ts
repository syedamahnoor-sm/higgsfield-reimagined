import { colorDistance } from "@/lib/color";
import type { PoolImage } from "./pool-types";

/** Everyday words mapped onto the vocabulary the curated set is tagged with. */
const SYNONYMS: Record<string, string[]> = {
  alps: ["alpine", "mountain"],
  mountain: ["mountains", "peak"],
  peak: ["mountains"],
  summit: ["peak", "mountains"],
  hill: ["hills"],
  glacier: ["snow", "mountains"],
  ice: ["snow", "winter"],
  snowy: ["snow"],
  sea: ["ocean", "coast"],
  ocean: ["coast", "water"],
  beach: ["coast", "sand"],
  shore: ["coast"],
  surf: ["wave"],
  water: ["ocean", "lake"],
  island: ["coast"],
  cliff: ["cliffs"],
  star: ["night-sky", "stars"],
  galaxy: ["night-sky"],
  space: ["night-sky", "galaxy"],
  cosmic: ["galaxy"],
  aurora: ["night-sky"],
  night: ["night-sky"],
  wood: ["forest", "trees"],
  tree: ["trees", "forest"],
  jungle: ["forest", "lush"],
  fog: ["mist", "foggy"],
  misty: ["mist"],
  foggy: ["mist"],
  building: ["architecture"],
  architectural: ["architecture"],
  brutalism: ["brutalist"],
  concrete: ["brutalist"],
  modernist: ["minimal", "architecture"],
  tower: ["skyscraper"],
  geometry: ["geometric"],
  urban: ["city"],
  street: ["city", "urban"],
  skyline: ["city"],
  downtown: ["city"],
  neon: ["night", "city", "lights"],
  cyberpunk: ["night", "city", "futuristic"],
  metro: ["subway"],
  train: ["subway"],
  person: ["portrait", "woman", "man"],
  people: ["portrait"],
  woman: ["portrait"],
  girl: ["woman", "portrait"],
  man: ["portrait"],
  model: ["portrait", "fashion"],
  face: ["portrait"],
  headshot: ["portrait"],
  editorial: ["fashion", "portrait"],
  animal: ["wildlife"],
  lion: ["lioness"],
  cat: ["big", "tiger", "lioness"],
  bird: ["eagle"],
  puppy: ["dog"],
  underwater: ["marine"],
  fish: ["marine"],
  fruit: ["food"],
  breakfast: ["food", "coffee"],
  dessert: ["cake", "food"],
  drink: ["coffee"],
  espresso: ["coffee"],
  latte: ["coffee"],
  cafe: ["coffee"],
  berry: ["fruit", "strawberries"],
  strawberry: ["strawberries"],
  dune: ["desert"],
  sand: ["desert"],
  canyon: ["desert"],
  rock: ["desert"],
  car: ["vehicles", "vintage"],
  truck: ["vehicles"],
  van: ["vehicles"],
  retro: ["vintage"],
  classic: ["vintage"],
  product: ["still-life", "minimal"],
  minimalist: ["minimal"],
  clean: ["minimal"],
  interior: ["still-life"],
  sunset: ["golden"],
  sunrise: ["golden"],
  dawn: ["golden"],
  dusk: ["golden", "sunset"],
  cinematic: ["moody"],
  dramatic: ["moody"],
  dark: ["moody"],
  blackandwhite: ["monochrome"],
};

const STOP = new Set([
  "a", "an", "the", "of", "in", "on", "with", "and", "at", "for", "to", "by", "from", "into",
  "shot", "photo", "image", "picture", "style", "very", "highly", "ultra", "detailed",
]);

function singular(word: string) {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function promptTerms(prompt: string) {
  const words = prompt
    .toLowerCase()
    .replace(/black\s*(and|&)\s*white/g, "blackandwhite")
    .split(/[^a-z-]+/)
    .filter((w) => w && !STOP.has(w));
  const terms = new Set<string>();
  for (const word of words) {
    for (const w of new Set([word, singular(word)])) {
      terms.add(w);
      for (const syn of SYNONYMS[w] ?? []) terms.add(syn);
    }
  }
  return terms;
}

export interface ScoredImage {
  image: PoolImage;
  score: number;
  /** The prompt names this photo's primary subject. */
  subject: boolean;
}

/**
 * Scores every pool image against the prompt's terms, the requested
 * orientation, and (when a reference is attached) the reference colour.
 */
export function scorePool(pool: PoolImage[], prompt: string, aspect: number, referenceColor?: string): ScoredImage[] {
  const terms = promptTerms(prompt);
  const longTerms = [...terms].filter((t) => t.length >= 5);
  return pool
    .map((image) => {
      let score = 0;
      let subject = false;
      if (terms.has(image.category)) score += 3;
      image.tags.forEach((tag, i) => {
        const t = singular(tag);
        // The first tag is the photo's primary subject and counts the most.
        if (terms.has(tag) || terms.has(t)) {
          score += i === 0 ? 5 : 2;
          if (i === 0) subject = true;
        }
        else if (t.length >= 5 && longTerms.some((term) => term.startsWith(t) || t.startsWith(term))) score += 1;
      });
      // Prefer sources whose orientation survives the crop.
      if (image.width / image.height >= 1 === aspect >= 1) score += 0.5;
      if (referenceColor) score += (1 - colorDistance(referenceColor, image.color)) * 1.5;
      return { image, score, subject };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Chooses `count` distinct images: weighted random among the strongest matches,
 * so regenerating the same prompt varies the result while staying on-topic.
 */
export function pickImages(scored: ScoredImage[], count: number, random: () => number = Math.random) {
  const top = scored[0]?.score ?? 0;
  const matched = top >= 2.5;
  const threshold = matched ? top * 0.6 : 0;
  // When the prompt names enough subjects we have, stay on them unless another photo is nearly as strong.
  const bySubject = scored.filter((s) => s.subject).length >= count;
  let candidates = scored
    .filter((s) => (bySubject ? s.subject || s.score >= top * 0.85 : s.score >= threshold))
    // Unmatched prompts draw from the whole set rather than always the same few photos.
    .slice(0, matched ? Math.max(count * 3, 6) : undefined);
  if (candidates.length < count) candidates = scored.slice(0, count);

  const picks: ScoredImage[] = [];
  const remaining = [...candidates];
  while (picks.length < count && remaining.length) {
    // Steep weighting: strong matches dominate, near-equals still vary between runs.
    const weights = remaining.map((s) => Math.max(0.25, s.score) ** 4);
    let r = random() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < remaining.length - 1 && (r -= weights[i]) > 0) i++;
    picks.push(remaining.splice(i, 1)[0]);
  }
  return { picks, matched };
}
