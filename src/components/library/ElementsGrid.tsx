"use client";

import { useRouter } from "next/navigation";
import { Bookmark, ImageUp, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { HOVER_REVEAL, MediaCard } from "@/components/media/MediaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { elementAsReference, setImageReference } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";

/** Library's Elements view: reusable saved references, ready to drop into a new generation. */
export function ElementsGrid() {
  const router = useRouter();
  const elements = useStudio(useShallow((s) => Object.values(s.elements)));
  const removeElement = useStudio((s) => s.removeElement);
  const sorted = useMemo(() => [...elements].sort((a, b) => b.createdAt - a.createdAt), [elements]);

  if (sorted.length === 0) {
    return (
      <div className="flex min-h-[50dvh] flex-1 rounded-panel border border-dashed border-line">
        <EmptyState
          icon={Bookmark}
          className="flex-1"
          title="No Elements yet"
          description="Save a result or an uploaded reference as an Element (a character, product or object) to reuse it as a reference any time."
        />
      </div>
    );
  }

  return (
    <ul className="columns-2 gap-3 md:columns-3 xl:columns-4 2xl:columns-5 [&>li]:mb-3">
      {sorted.map((element) => {
        const use = () => {
          setImageReference(elementAsReference(element));
          toast({ message: `“${element.name}” set as your reference` });
          router.push("/create/image");
        };
        return (
          <li key={element.id} className="break-inside-avoid">
            <MediaCard
              src={element.url}
              alt={element.name}
              aspect={element.width / element.height}
              sizes="25vw"
              openLabel={`Use Element as reference: ${element.name}`}
              onOpen={use}
              scrim={<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />}
            >
              <span className="pointer-events-none absolute right-2 bottom-2 left-2 flex items-end justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-white">{element.name}</span>
                  <span className="font-mono text-2xs text-white/60 capitalize">{element.kind}</span>
                </span>
              </span>
              <div className={cn("absolute top-2 right-2 flex gap-1", HOVER_REVEAL)}>
                <Tooltip label="Use as reference" side="bottom" align="end">
                  <IconButton aria-label={`Use ${element.name} as reference`} variant="glass" size="sm" onClick={use}>
                    <ImageUp aria-hidden="true" className="size-4" />
                  </IconButton>
                </Tooltip>
                <Tooltip label="Remove Element" side="bottom" align="end">
                  <IconButton
                    aria-label={`Remove ${element.name}`}
                    variant="glass"
                    size="sm"
                    onClick={() => {
                      removeElement(element.id);
                      toast({ message: `Removed “${element.name}”`, action: { label: "Undo", onClick: () => useStudio.getState().saveElement(element) } });
                    }}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </IconButton>
                </Tooltip>
              </div>
            </MediaCard>
          </li>
        );
      })}
    </ul>
  );
}
