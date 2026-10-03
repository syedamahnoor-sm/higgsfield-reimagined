import { directionLabel, lookLabel } from "@/lib/creative";
import type { Asset, CreativeElement, Project } from "@/lib/types";
import { languageLabel, speakerLabel } from "@/lib/voices";

/**
 * Local, instant Library search. Every whitespace-separated term must match
 * somewhere in the item's searchable text (case-insensitive).
 */

/** Project names per asset/Element id, for "search by project". */
export function projectNamesById(projects: Record<string, Project>) {
  const map = new Map<string, string[]>();
  for (const p of Object.values(projects)) {
    for (const item of p.items) map.set(item.id, [...(map.get(item.id) ?? []), p.name]);
  }
  return map;
}

export function assetSearchText(asset: Asset, projectNames: string[] = []) {
  const parts = [asset.settings.prompt, ...projectNames];
  if (asset.kind === "image") {
    if (asset.settings.direction && asset.settings.direction !== "auto") parts.push(directionLabel(asset.settings.direction));
    if (asset.settings.look && asset.settings.look !== "none") parts.push(lookLabel(asset.settings.look));
    if (asset.settings.operation === "edit") parts.push("edit");
  }
  if (asset.kind === "video") parts.push("video", asset.renderer === "file" ? "ai video" : "motion preview");
  if (asset.audio) parts.push("voice audio", speakerLabel(asset.audio.speaker), languageLabel(asset.audio.language));
  return parts.join(" \n ").toLowerCase();
}

export function elementSearchText(element: CreativeElement, projectNames: string[] = []) {
  return [element.name, element.kind, "element", ...projectNames].join(" \n ").toLowerCase();
}

export function matchesQuery(text: string, query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return terms.every((t) => text.includes(t));
}
