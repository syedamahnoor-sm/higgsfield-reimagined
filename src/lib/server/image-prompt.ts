import "server-only";
import type { Direction, LookId } from "@/lib/types";

/**
 * Server-side prompt treatment for images. The creator's prompt is never
 * rewritten in the UI; Direction and Look add guidance here, when the model
 * request is built.
 */

/** Direction = what kind of image to make. */
export const DIRECTION_GUIDANCE: Record<Exclude<Direction, "auto">, string> = {
  cinematic:
    "Cinematic film still: deliberate widescreen-style composition, motivated dramatic lighting, shallow depth of field, rich color grade.",
  editorial:
    "High-end editorial photograph: magazine-quality styling, deliberate art direction, clean controlled lighting, fashion-forward composition.",
  portrait:
    "Professional portrait: flattering soft key light, natural skin and material texture, sharp focus on the eyes, clean separation from the background.",
  product:
    "Premium product photograph: the product is the clear hero, clean uncluttered studio setting, soft controlled light with crisp highlights and reflections.",
  illustration:
    "High-quality digital illustration, not a photograph: cohesive stylized rendering, deliberate color palette, clean shapes and confident linework.",
};

/** Look = visual treatment, independent of Direction. */
export const LOOK_GUIDANCE: Record<Exclude<LookId, "none">, string> = {
  "film-grain": "Visual treatment: subtle analog film grain and organic texture, gently rolled-off highlights.",
  "dreamy-glow": "Visual treatment: soft dreamy glow, gentle bloom and halation on highlights, airy pastel tones.",
  "vintage-film": "Visual treatment: vintage 1970s film photograph, warm faded colors, soft contrast, light grain.",
  noir: "Visual treatment: black-and-white film noir, deep shadows, high-contrast chiaroscuro lighting.",
  "neon-night": "Visual treatment: neon-lit night, saturated magenta and cyan glow, reflections on wet surfaces.",
  "high-contrast": "Visual treatment: bold high contrast, deep blacks, crisp punchy highlights, strong saturated color.",
};

const REFERENCE_GUIDANCE = "Use the provided reference image as visual guidance for the subject, composition and style.";

/** Final prompt for a normal generation: the creator's words first, then Direction, Look and reference guidance. */
export function composeImagePrompt({
  prompt,
  direction,
  look,
  hasReference,
}: {
  prompt: string;
  direction: Direction;
  look: LookId;
  hasReference: boolean;
}) {
  const parts = [prompt.trim().replace(/[.\s]+$/, "") + "."];
  if (direction !== "auto") parts.push(DIRECTION_GUIDANCE[direction]);
  if (look !== "none") parts.push(LOOK_GUIDANCE[look]);
  if (hasReference) parts.push(REFERENCE_GUIDANCE);
  return parts.join(" ");
}

/** Final prompt for an edit: the instruction applied to the input image, everything else preserved. */
export function composeEditPrompt(instruction: string) {
  return `Edit the input image: ${instruction.trim().replace(/[.\s]+$/, "")}. Keep everything else about the image the same, including the subject, framing and lighting unless the instruction says otherwise.`;
}
