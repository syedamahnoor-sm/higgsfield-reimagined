"use client";

import { LineagePanel } from "@/components/lineage/Lineage";
import { AddToProjectPopover, ProjectChips } from "@/components/projects/AddToProject";
import type { Asset } from "@/lib/types";

/** Where an asset lives and where it came from: its projects, Add to project, and its lineage. */
export function AssetRelations({ asset }: { asset: Asset }) {
  const ref = { kind: "asset" as const, id: asset.id };
  return (
    <div className="flex flex-col gap-5 border-t border-line pt-5">
      <div className="flex flex-col gap-3">
        <ProjectChips refItem={ref} />
        <AddToProjectPopover refs={[ref]} side="top" />
      </div>
      <LineagePanel asset={asset} />
    </div>
  );
}
