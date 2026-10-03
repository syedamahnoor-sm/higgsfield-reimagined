import type { Direction, GenSettings, Intent, LookId, Quality } from "@/lib/types";

/**
 * Creator-facing catalogs. Directions decide what kind of image is made;
 * Looks decide its visual treatment. Neither rewrites the visible prompt:
 * the server adds the matching guidance when building the model request.
 */

export const DIRECTIONS: { id: Direction; label: string; description: string }[] = [
  { id: "auto", label: "Auto", description: "Ember reads your prompt and keeps it as written" },
  { id: "cinematic", label: "Cinematic", description: "Film-still composition, motivated light, depth" },
  { id: "editorial", label: "Editorial", description: "Magazine-grade styling and deliberate art direction" },
  { id: "portrait", label: "Portrait", description: "Flattering light and focus on a person or character" },
  { id: "product", label: "Product", description: "Clean studio presentation with the product as hero" },
  { id: "illustration", label: "Illustration", description: "Stylized digital artwork instead of a photo" },
];

/** Each look has a small swatch so it can be recognised at a glance (decoration only, not a preview). */
export const LOOKS: { id: LookId; label: string; description: string; swatch: string }[] = [
  { id: "none", label: "No look", description: "Natural treatment", swatch: "linear-gradient(135deg,#3a3a40,#1f1f23)" },
  { id: "film-grain", label: "Film Grain", description: "Organic analog grain and texture", swatch: "radial-gradient(circle at 30% 30%,#8f8577,#2b2925)" },
  { id: "dreamy-glow", label: "Dreamy Glow", description: "Soft bloom, airy pastel highlights", swatch: "linear-gradient(135deg,#f4c6d7,#b7c7f5)" },
  { id: "vintage-film", label: "Vintage Film", description: "Warm, faded 1970s color", swatch: "linear-gradient(135deg,#d9a35b,#7a5a3c)" },
  { id: "noir", label: "Noir", description: "Black and white with deep shadows", swatch: "linear-gradient(135deg,#f2f2f2,#111)" },
  { id: "neon-night", label: "Neon Night", description: "Magenta and cyan glow on wet streets", swatch: "linear-gradient(135deg,#ff3fb4,#22d3ee)" },
  { id: "high-contrast", label: "High Contrast", description: "Deep blacks and punchy color", swatch: "linear-gradient(135deg,#ff6a3d,#0a0a0b)" },
];

export const QUALITIES: { id: Quality; label: string; description: string }[] = [
  { id: "draft", label: "Draft", description: "768 px, quickest" },
  { id: "standard", label: "Standard", description: "1024 px" },
  { id: "high", label: "High", description: "1536 px, most detail" },
];

export function directionLabel(id: Direction | undefined) {
  return DIRECTIONS.find((d) => d.id === (id ?? "auto"))?.label ?? "Auto";
}

export function lookLabel(id: LookId | undefined) {
  return LOOKS.find((l) => l.id === (id ?? "none"))?.label ?? "No look";
}

/** Older assets stored a speed/quality intent; newer ones store quality directly. */
export function qualityOf(settings: Pick<GenSettings, "quality" | "intent">): Quality {
  if (settings.quality) return settings.quality;
  const legacy: Record<Intent, Quality> = { fast: "draft", auto: "standard", photoreal: "high" };
  return legacy[settings.intent] ?? "standard";
}

export function qualityLabel(id: Quality) {
  return QUALITIES.find((q) => q.id === id)?.label ?? "Standard";
}

/**
 * Engine name for display. Older assets stored labels such as
 * "AI generation · Photoreal" or "Local preview · Balanced", where the suffix
 * was the legacy intent; Direction, Look and Quality are now shown on their own.
 */
export function engineDisplay(resolvedModel: string | undefined, operation?: GenSettings["operation"]) {
  if (operation === "edit") return "AI edit";
  if (!resolvedModel) return "";
  if (resolvedModel.startsWith("AI generation")) return "AI generation";
  if (resolvedModel.startsWith("Local preview")) return "Local preview";
  return resolvedModel;
}
