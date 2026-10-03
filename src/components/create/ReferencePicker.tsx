"use client";

import { ImagePlus, Loader2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { MediaImage } from "@/components/media/MediaImage";
import { Popover } from "@/components/ui/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import { assetAsReference, elementAsReference, uploadAsReference } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { LOCAL_MEDIA_PREFIX } from "@/lib/media/uploads";
import type { MediaReference } from "@/lib/types";
import { useStudio } from "@/store/studio";

type Tab = "uploads" | "elements" | "generations" | "favorites";
const TABS: { id: Tab; label: string }[] = [
  { id: "uploads", label: "Uploads" },
  { id: "elements", label: "Elements" },
  { id: "generations", label: "Generations" },
  { id: "favorites", label: "Favorites" },
];

export const OPEN_REFERENCE_PICKER = "ember:open-reference-picker";

interface Item {
  key: string;
  url: string;
  label: string;
  reference: MediaReference;
  matchAspect: boolean;
}

/**
 * Reference picker: choose a reference from your uploads, saved Elements,
 * generations or favorites, or upload a new one. The chosen image is sent to
 * the AI model as a real input image.
 */
export function ReferencePicker({
  busy,
  onUpload,
  onSelect,
}: {
  busy: boolean;
  onUpload: () => void;
  onSelect: (reference: MediaReference, matchAspect: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("uploads");
  const uploads = useStudio((s) => s.uploads);
  const elements = useStudio(useShallow((s) => Object.values(s.elements)));
  const images = useStudio(useShallow((s) => Object.values(s.assets).filter((a) => a.kind === "image")));

  // Other parts of Create (e.g. the empty state) can open the picker.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_REFERENCE_PICKER, onOpen);
    return () => window.removeEventListener(OPEN_REFERENCE_PICKER, onOpen);
  }, []);

  const items = useMemo<Record<Tab, Item[]>>(() => {
    const byNewest = <T extends { createdAt: number }>(list: T[]) => [...list].sort((a, b) => b.createdAt - a.createdAt);
    const assetItems = (list: typeof images) =>
      byNewest(list)
        .slice(0, 24)
        .map((a) => ({ key: a.id, url: a.url, label: a.settings.prompt, reference: assetAsReference(a), matchAspect: false }));
    return {
      uploads: uploads.map((u) => ({ key: u.id, url: `${LOCAL_MEDIA_PREFIX}${u.id}`, label: u.name, reference: uploadAsReference(u), matchAspect: true })),
      elements: byNewest(elements).map((e) => ({ key: e.id, url: e.url, label: `${e.name} (${e.kind})`, reference: elementAsReference(e), matchAspect: false })),
      generations: assetItems(images),
      favorites: assetItems(images.filter((a) => a.favorite)),
    };
  }, [uploads, elements, images]);

  const empty: Record<Tab, string> = {
    uploads: "Upload an image from your device to use it as a reference.",
    elements: "Save a result or an upload as an Element to reuse it here.",
    generations: "Images you generate will appear here.",
    favorites: "Images you favorite will appear here.",
  };

  return (
    <Popover
      label="Choose a reference image"
      width={420}
      open={open}
      onOpenChange={setOpen}
      trigger={(props) => (
        <Tooltip label="Add a reference image. It's sent to the AI model to guide the result.">
          <button
            type="button"
            {...props}
            aria-label="Add reference image"
            disabled={busy}
            className="flex h-9 items-center gap-1.5 rounded-chip px-2.5 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg disabled:opacity-60"
          >
            {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <ImagePlus aria-hidden="true" className="size-4" strokeWidth={1.75} />}
            <span className="hidden sm:inline">Reference</span>
          </button>
        </Tooltip>
      )}
    >
      {(close) => (
        <div>
          <div role="tablist" aria-label="Reference sources" className="flex gap-0.5 border-b border-line px-1 pb-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "h-8 rounded-chip px-2.5 text-[13px] font-medium transition-colors",
                  tab === t.id ? "bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg-muted",
                )}
              >
                {t.label}
                <span className="ml-1 font-mono text-2xs text-fg-subtle">{items[t.id].length || ""}</span>
              </button>
            ))}
          </div>
          <div role="tabpanel" className="max-h-[300px] overflow-y-auto p-1 pt-2">
            <ul className="grid grid-cols-4 gap-1.5">
              {tab === "uploads" && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onUpload();
                    }}
                    className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-chip border border-dashed border-line-strong text-fg-muted transition-colors hover:border-white/25 hover:text-fg"
                  >
                    <Upload aria-hidden="true" className="size-4" />
                    <span className="text-2xs font-medium">Upload</span>
                  </button>
                </li>
              )}
              {items[tab].map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    title={item.label}
                    aria-label={`Use as reference: ${item.label}`}
                    onClick={() => {
                      onSelect(item.reference, item.matchAspect);
                      close();
                    }}
                    className="relative block aspect-square w-full overflow-hidden rounded-chip bg-surface-3 ring-1 ring-line transition-[box-shadow,transform] hover:ring-line-strong active:scale-[0.97]"
                  >
                    <MediaImage src={item.url} alt="" sizes="96px" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
            {items[tab].length === 0 && <p className="px-1 pt-3 pb-1 text-xs leading-relaxed text-fg-subtle">{empty[tab]}</p>}
          </div>
        </div>
      )}
    </Popover>
  );
}
