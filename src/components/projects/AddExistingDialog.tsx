"use client";

import { Bookmark, Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AssetThumb } from "@/components/media/AssetThumb";
import { MediaImage } from "@/components/media/MediaImage";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FilterChips } from "@/components/ui/FilterChips";
import { cn } from "@/lib/cn";
import { kindLabel } from "@/lib/lineage";
import { addRefsToProject } from "@/lib/projects";
import { assetSearchText, elementSearchText, matchesQuery } from "@/lib/search";
import type { Project, ProjectRef } from "@/lib/types";
import { useStudio } from "@/store/studio";

type Kind = "all" | "images" | "videos" | "audio" | "elements";

/** Pick existing Library media and Elements to add to a project (by reference). */
export function AddExistingDialog({ project, open, onClose }: { project: Project; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={`Add to “${project.name}”`} description="Choose from your Library. Nothing is copied; the project keeps a link to each item." className="max-w-3xl">
      {open && <Picker project={project} onDone={onClose} />}
    </Dialog>
  );
}

interface Option {
  ref: ProjectRef;
  label: string;
  type: string;
  createdAt: number;
  text: string;
  visual: React.ReactNode;
}

function Picker({ project, onDone }: { project: Project; onDone: () => void }) {
  const assets = useStudio(useShallow((s) => Object.values(s.assets)));
  const elements = useStudio(useShallow((s) => Object.values(s.elements)));
  const [kind, setKind] = useState<Kind>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProjectRef[]>([]);
  const inProject = (ref: ProjectRef) => project.items.some((i) => i.kind === ref.kind && i.id === ref.id);
  const isSelected = (ref: ProjectRef) => selected.some((r) => r.kind === ref.kind && r.id === ref.id);

  const options = useMemo<(Option & { k: Kind })[]>(() => {
    const list: (Option & { k: Kind })[] = [];
    for (const a of assets) {
      list.push({
        ref: { kind: "asset", id: a.id },
        label: a.settings.prompt || "Untitled",
        type: kindLabel(a),
        createdAt: a.createdAt,
        text: assetSearchText(a),
        k: a.kind === "image" ? "images" : a.kind === "video" ? "videos" : "audio",
        visual: <AssetThumb asset={a} sizes="160px" badge />,
      });
    }
    for (const e of elements) {
      list.push({
        ref: { kind: "element", id: e.id },
        label: e.name,
        type: "Element",
        createdAt: e.createdAt,
        text: elementSearchText(e),
        k: "elements",
        visual: (
          <>
            <MediaImage src={e.url} alt="" sizes="160px" className="object-cover" />
            <Bookmark aria-hidden="true" className="absolute top-1.5 left-1.5 size-3.5 fill-current text-white drop-shadow" />
          </>
        ),
      });
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [assets, elements]);

  const visible = options.filter((o) => (kind === "all" || o.k === kind) && (!query.trim() || matchesQuery(o.text, query)));

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-col gap-3 px-5 pt-3 pb-3">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <label htmlFor="add-existing-search" className="sr-only">
            Search your Library
          </label>
          <input
            id="add-existing-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your Library"
            className="h-10 w-full rounded-card border border-line bg-surface-2 pr-3 pl-9 text-sm text-fg placeholder:text-fg-subtle focus:border-white/20 focus:outline-none"
          />
        </div>
        <FilterChips
          label="Media type"
          value={kind}
          onChange={setKind}
          options={[
            { id: "all", label: "All" },
            { id: "images", label: "Images" },
            { id: "videos", label: "Videos" },
            { id: "audio", label: "Audio" },
            { id: "elements", label: "Elements" },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        {options.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-muted">Your Library is empty. Create something first, then add it here.</p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-muted">Nothing matches. Try another search or type.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 pb-3 sm:grid-cols-4 md:grid-cols-5">
            {visible.map((o) => {
              const already = inProject(o.ref);
              const on = already || isSelected(o.ref);
              return (
                <li key={`${o.ref.kind}-${o.ref.id}`}>
                  <button
                    type="button"
                    disabled={already}
                    aria-pressed={on}
                    aria-label={`${o.type}: ${o.label}${already ? " (already in this project)" : ""}`}
                    onClick={() =>
                      setSelected((s) => (isSelected(o.ref) ? s.filter((r) => !(r.kind === o.ref.kind && r.id === o.ref.id)) : [...s, o.ref]))
                    }
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-card bg-surface-2 ring-1 transition-[box-shadow,opacity]",
                      on ? "ring-2 ring-accent" : "ring-line hover:ring-line-strong",
                      already && "opacity-45",
                    )}
                  >
                    {o.visual}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full border",
                        on ? "border-accent bg-accent text-accent-fg" : "border-white/50 bg-black/30",
                      )}
                    >
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pt-4 pb-1.5 text-left text-2xs text-white/85">
                      {already ? "In project" : o.type}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <span className="text-[13px] text-fg-muted">{selected.length ? `${selected.length} selected` : "Select items to add"}</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selected.length}
            onClick={() => {
              addRefsToProject(project.id, selected);
              onDone();
            }}
          >
            Add {selected.length || ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
