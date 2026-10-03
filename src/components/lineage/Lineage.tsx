"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Bookmark, Compass } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";
import { AssetThumb } from "@/components/media/AssetThumb";
import { MediaImage } from "@/components/media/MediaImage";
import { cn } from "@/lib/cn";
import { ancestorsOf, derivedFrom, kindLabel, referenceNode, relationLabel, type LineageNode } from "@/lib/lineage";
import type { Asset } from "@/lib/types";
import { useStudio } from "@/store/studio";

/**
 * Opens another asset. Inside the Library viewer this switches the viewer to
 * it; elsewhere it navigates to the Library with that asset open.
 */
export const OpenAssetContext = createContext<((id: string) => void) | null>(null);

export function useOpenAsset() {
  const open = useContext(OpenAssetContext);
  const router = useRouter();
  return open ?? ((id: string) => router.push(`/library?open=${id}`));
}

/** "Created from" and "Derived work" for one asset, from stored relationships only. */
export function LineagePanel({ asset }: { asset: Asset }) {
  const assets = useStudio((s) => s.assets);
  const elements = useStudio((s) => s.elements);
  const ancestors = ancestorsOf(asset, assets);
  const reference = referenceNode(asset, assets, elements);
  const derived = derivedFrom(asset, assets, elements);
  const hasDerived = derived.children.length + derived.referencedBy.length + derived.elements.length > 0;
  if (!ancestors.length && !reference && !hasDerived) return null;

  return (
    <section aria-label="Creative lineage" className="flex flex-col gap-4">
      {(ancestors.length > 0 || reference) && (
        <div>
          <h3 className="mb-2 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Created from</h3>
          {ancestors.length > 0 && (
            <ol className="flex flex-wrap items-center gap-1.5" aria-label="Lineage, oldest first">
              {ancestors.map((node, i) => (
                <li key={nodeKey(node)} className="flex items-center gap-1.5">
                  <NodeTile node={node} caption={i === 0 ? "Original" : stepLabel(node)} />
                  <ArrowRight aria-hidden="true" className="size-3.5 text-fg-subtle" />
                </li>
              ))}
              <li>
                <NodeTile node={{ type: "asset", asset }} caption={ancestors.length ? relationLabel(asset) : "This"} current />
              </li>
            </ol>
          )}
          {reference && (
            <div className={cn("flex items-center gap-2", ancestors.length > 0 && "mt-3")}>
              <NodeTile node={reference} caption={reference.type === "element" ? "Element" : "Reference"} />
              <p className="text-xs leading-snug text-fg-subtle">Used as the reference image</p>
            </div>
          )}
        </div>
      )}

      {hasDerived && (
        <div>
          <h3 className="mb-2 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Derived work</h3>
          <ul className="flex flex-wrap gap-1.5">
            {derived.children.map((child) => (
              <li key={child.id}>
                <NodeTile node={{ type: "asset", asset: child }} caption={relationLabel(child)} />
              </li>
            ))}
            {derived.referencedBy.map((other) => (
              <li key={other.id}>
                <NodeTile node={{ type: "asset", asset: other }} caption="Used as reference" />
              </li>
            ))}
            {derived.elements.map((element) => (
              <li key={element.id}>
                <NodeTile node={{ type: "element", element }} caption="Saved Element" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function nodeKey(node: LineageNode) {
  return node.type === "asset" ? node.asset.id : node.type === "element" ? node.element.id : node.id;
}

function stepLabel(node: LineageNode) {
  return node.type === "asset" ? relationLabel(node.asset) : "Explore";
}

/** A small clickable thumbnail with a caption; the current asset is outlined and not clickable. */
export function NodeTile({ node, caption, current }: { node: LineageNode; caption: string; current?: boolean }) {
  const openAsset = useOpenAsset();
  const router = useRouter();
  const title =
    node.type === "asset" ? `${kindLabel(node.asset)}: ${node.asset.settings.prompt || "Untitled"}` : node.type === "element" ? `Element: ${node.element.name}` : `Explore: ${node.title}`;
  const visual: ReactNode =
    node.type === "asset" ? (
      <AssetThumb asset={node.asset} sizes="56px" badge />
    ) : node.type === "element" ? (
      <>
        <MediaImage src={node.element.url} alt="" sizes="56px" className="object-cover" />
        <Bookmark aria-hidden="true" className="absolute top-1 right-1 size-3 fill-current text-white drop-shadow" />
      </>
    ) : (
      <>
        <MediaImage src={node.url} alt="" sizes="56px" className="object-cover" />
        <Compass aria-hidden="true" className="absolute top-1 right-1 size-3 text-white drop-shadow" />
      </>
    );
  const body = (
    <>
      <span className={cn("relative block size-14 overflow-hidden rounded-chip bg-surface-3 ring-1", current ? "ring-2 ring-accent" : "ring-line-strong")}>{visual}</span>
      <span className={cn("mt-1 block max-w-14 truncate text-center text-2xs", current ? "text-accent" : "text-fg-subtle")}>{caption}</span>
    </>
  );
  if (current) {
    return (
      <span className="block" aria-current="true" title={title}>
        <span className="sr-only">{title} (this item)</span>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      title={title}
      aria-label={`${caption}. ${title}`}
      onClick={() => {
        if (node.type === "asset") openAsset(node.asset.id);
        else if (node.type === "element") router.push("/library?filter=elements");
        else router.push("/explore");
      }}
      className="block rounded-chip transition-transform duration-150 hover:-translate-y-0.5"
    >
      {body}
    </button>
  );
}
