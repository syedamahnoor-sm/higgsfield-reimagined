import { findExploreItem } from "@/lib/explore";
import type { Asset, CreativeElement } from "@/lib/types";

/**
 * Creative lineage from relationships the data already stores:
 * - `parentId`: the asset (or Explore example) a result was remixed, edited,
 *   animated or voiced from;
 * - `settings.reference`: the image (result or Element) used as a reference;
 * - Element `sourceAssetId`: the result an Element was saved from.
 * Nothing is inferred beyond these fields.
 */

export type LineageNode =
  | { type: "asset"; asset: Asset }
  | { type: "explore"; id: string; title: string; url: string }
  | { type: "element"; element: CreativeElement };

/** How a result relates to the thing it came from, e.g. "AI edit" or "Voiceover". */
export function relationLabel(child: Asset): string {
  if (child.kind === "audio") return "Voiceover";
  if (child.kind === "video") return "Animated";
  if (child.settings.operation === "edit") return "AI edit";
  return "Remix";
}

export function kindLabel(asset: Asset) {
  if (asset.kind === "audio") return "Voice";
  if (asset.kind === "video") return asset.renderer === "file" ? "AI video" : "Motion Preview";
  if (asset.settings.operation === "edit") return "AI edit";
  return "Image";
}

/** Ancestors from the oldest known origin down to (but excluding) the asset itself. */
export function ancestorsOf(asset: Asset, assets: Record<string, Asset>): LineageNode[] {
  const chain: LineageNode[] = [];
  const seen = new Set([asset.id]);
  let parentId = asset.parentId;
  while (parentId && !seen.has(parentId) && chain.length < 12) {
    seen.add(parentId);
    const parent = assets[parentId];
    if (parent) {
      chain.unshift({ type: "asset", asset: parent });
      parentId = parent.parentId;
      continue;
    }
    const example = findExploreItem(parentId);
    if (example) chain.unshift({ type: "explore", id: example.id, title: example.title, url: example.posterUrl ?? example.url });
    break;
  }
  return chain;
}

/** The reference used to make this asset, when it is one of the user's results or Elements (not the edit source). */
export function referenceNode(asset: Asset, assets: Record<string, Asset>, elements: Record<string, CreativeElement>): LineageNode | null {
  const ref = asset.settings.reference;
  if (!ref || ref.source !== "asset" || ref.id === asset.parentId) return null;
  if (assets[ref.id]) return { type: "asset", asset: assets[ref.id] };
  if (elements[ref.id]) return { type: "element", element: elements[ref.id] };
  return null;
}

/** Work made from this asset: direct children, results that used it as a reference, and Elements saved from it. */
export function derivedFrom(asset: Asset, assets: Record<string, Asset>, elements: Record<string, CreativeElement>) {
  const children: Asset[] = [];
  const referencedBy: Asset[] = [];
  for (const other of Object.values(assets)) {
    if (other.id === asset.id) continue;
    if (other.parentId === asset.id) children.push(other);
    else if (other.settings.reference?.source === "asset" && other.settings.reference.id === asset.id) referencedBy.push(other);
  }
  const savedElements = Object.values(elements).filter((e) => e.sourceAssetId === asset.id);
  const byTime = (a: Asset, b: Asset) => a.createdAt - b.createdAt;
  return { children: children.sort(byTime), referencedBy: referencedBy.sort(byTime), elements: savedElements };
}

/**
 * Chains within a set of assets, for a project's lineage view: every path from
 * an origin to its final pieces, with at least one step. Each chain includes
 * ancestors outside the set, so the origin is always shown.
 */
export function chainsFor(assetIds: string[], assets: Record<string, Asset>, max = 6) {
  const inSet = new Set(assetIds);
  const hasChildInSet = new Set<string>();
  for (const id of assetIds) {
    const parent = assets[id]?.parentId;
    if (parent) hasChildInSet.add(parent);
  }
  const chains: Asset[][] = [];
  for (const id of assetIds) {
    const asset = assets[id];
    if (!asset || hasChildInSet.has(id) || !asset.parentId) continue;
    const ancestors = ancestorsOf(asset, assets).flatMap((n) => (n.type === "asset" ? [n.asset] : []));
    if (!ancestors.length) continue;
    chains.push([...ancestors, asset]);
  }
  // Chains that differ only in their final piece (e.g. several voice takes for one clip) become one row.
  const grouped = new Map<string, { path: Asset[]; leaves: Asset[] }>();
  for (const chain of chains.filter((c) => c.some((a) => inSet.has(a.id)))) {
    const path = chain.slice(0, -1);
    const key = path.map((a) => a.id).join(">");
    const group = grouped.get(key) ?? { path, leaves: [] };
    group.leaves.push(chain[chain.length - 1]);
    grouped.set(key, group);
  }
  const newest = (g: { leaves: Asset[] }) => Math.max(...g.leaves.map((a) => a.createdAt));
  return [...grouped.values()].sort((a, b) => b.path.length - a.path.length || newest(b) - newest(a)).slice(0, max);
}
