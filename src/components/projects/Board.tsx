"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Clapperboard,
  Eye,
  GripVertical,
  ImageUp,
  Mic,
  MoreHorizontal,
  PencilLine,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { AudioPlayer, SpeakerAvatar } from "@/components/audio/AudioPlayer";
import { AssetMoreMenu, useAssetActions } from "@/components/create/ResultActions";
import { AssetThumb } from "@/components/media/AssetThumb";
import { MediaImage } from "@/components/media/MediaImage";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem, Popover } from "@/components/ui/Popover";
import { elementAsReference, prepareVoiceover, setImageReference } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/id";
import { kindLabel } from "@/lib/lineage";
import { resolveRef } from "@/lib/projects";
import type { Asset, BoardCard, CreativeElement, Project } from "@/lib/types";
import { speakerLabel } from "@/lib/voices";
import { useStudio } from "@/store/studio";
import { toast } from "@/store/toasts";

/**
 * A project's Board: the creative idea laid out as tiles (media, Elements
 * and notes) in a chosen order. Reorder by dragging (pointer) or with Move
 * earlier / later in each tile's menu (keyboard and touch).
 */
export function Board({ project, onInspect, onAddExisting }: { project: Project; onInspect: (assetId: string) => void; onAddExisting: () => void }) {
  const assets = useStudio((s) => s.assets);
  const elements = useStudio((s) => s.elements);
  const addBoardCard = useStudio((s) => s.addBoardCard);
  const moveBoardCard = useStudio((s) => s.moveBoardCard);
  const [dragId, setDragId] = useState<string | null>(null);
  // The dragged tile is also kept in a ref, so dragover/drop never depend on a re-render.
  const dragRef = useRef<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Tiles whose media no longer exists are skipped rather than shown broken.
  const cards = project.board.filter((c) => c.type === "note" || resolveRef({ assets, elements }, c.ref));

  const addNote = () => {
    const id = createId("card");
    addBoardCard(project.id, { id, type: "note", text: "" });
    setEditingId(id);
  };

  return (
    <section aria-label="Board" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-fg-muted">
          {cards.length > 1 ? (
            <>
              <span className="hidden md:inline">Drag tiles to arrange the idea, or use each tile&apos;s menu.</span>
              <span className="md:hidden">Use each tile&apos;s menu to arrange the idea.</span>
            </>
          ) : (
            "Lay out the idea: media, Elements and notes, in the order that tells the story."
          )}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={addNote}
            className="flex h-8 items-center gap-1.5 rounded-chip border border-line px-3 text-[13px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <StickyNote aria-hidden="true" className="size-3.5" /> Add note
          </button>
          <button
            type="button"
            onClick={onAddExisting}
            className="flex h-8 items-center gap-1.5 rounded-chip border border-line px-3 text-[13px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <Plus aria-hidden="true" className="size-3.5" /> Add media
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center rounded-panel border border-dashed border-line px-6 py-14 text-center">
          <StickyNote aria-hidden="true" strokeWidth={1.5} className="size-6 text-fg-subtle" />
          <h3 className="mt-4 text-base font-medium text-fg">The Board is empty</h3>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">
            Everything you add to this project lands here. Create something with the buttons above, add media from your Library, or start with a note
            about the idea.
          </p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={addNote} className="flex h-9 items-center gap-2 rounded-card bg-accent px-4 text-[13px] font-semibold text-accent-fg hover:bg-accent-hover">
              <StickyNote aria-hidden="true" className="size-4" /> Write a note
            </button>
            <button type="button" onClick={onAddExisting} className="flex h-9 items-center gap-2 rounded-card border border-line-strong bg-surface-2 px-4 text-[13px] font-medium text-fg hover:bg-surface-3">
              <Plus aria-hidden="true" className="size-4" /> Add media
            </button>
          </div>
        </div>
      ) : (
        <ol className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-label="Board tiles, in order">
          {cards.map((card, index) => (
            <li
              key={card.id}
              draggable={editingId !== card.id}
              onDragStart={(e) => {
                dragRef.current = card.id;
                setDragId(card.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", card.id);
              }}
              onDragEnd={() => {
                dragRef.current = null;
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                if (!dragRef.current) return;
                e.preventDefault();
                if (overId !== card.id) setOverId(card.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragRef.current;
                if (from && from !== card.id) moveBoardCard(project.id, from, project.board.findIndex((c) => c.id === card.id));
                dragRef.current = null;
                setDragId(null);
                setOverId(null);
              }}
              className={cn(
                "group/tile relative rounded-panel transition-[opacity,box-shadow] duration-150",
                dragId === card.id && "opacity-40",
                overId === card.id && dragId !== card.id && "ring-2 ring-accent ring-offset-2 ring-offset-canvas",
              )}
            >
              <BoardTile
                project={project}
                card={card}
                index={index}
                total={cards.length}
                editing={editingId === card.id}
                onEditingChange={(v) => setEditingId(v ? card.id : null)}
                onInspect={onInspect}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function BoardTile({
  project,
  card,
  index,
  total,
  editing,
  onEditingChange,
  onInspect,
}: {
  project: Project;
  card: BoardCard;
  index: number;
  total: number;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onInspect: (assetId: string) => void;
}) {
  // Select the stored object itself (stable between renders), then wrap it.
  const target = useStudio((s) => (card.type === "ref" ? (card.ref.kind === "asset" ? s.assets[card.ref.id] : s.elements[card.ref.id]) : undefined));
  const resolved = card.type === "ref" && target ? (card.ref.kind === "asset" ? { kind: "asset" as const, asset: target as Asset } : { kind: "element" as const, element: target as CreativeElement }) : null;
  const moveBoardCard = useStudio((s) => s.moveBoardCard);
  const removeBoardCard = useStudio((s) => s.removeBoardCard);
  const actualIndex = project.board.findIndex((c) => c.id === card.id);

  const move = (delta: number) => {
    moveBoardCard(project.id, card.id, actualIndex + delta);
    toast({ message: delta < 0 ? "Moved earlier on the Board" : "Moved later on the Board" });
  };
  const remove = () => {
    const before = useStudio.getState().projects[project.id];
    removeBoardCard(project.id, card.id);
    toast({
      message: card.type === "note" ? "Note removed" : "Removed from the Board (still in this project)",
      action: before ? { label: "Undo", onClick: () => useStudio.getState().restoreProject(before) } : undefined,
    });
  };
  const arrange = (
    <>
      {index > 0 && <MenuItem icon={<ArrowLeft className="size-4" />} label="Move earlier" onSelect={() => move(-1)} />}
      {index < total - 1 && <MenuItem icon={<ArrowRight className="size-4" />} label="Move later" onSelect={() => move(1)} />}
      <MenuItem icon={<Trash2 className="size-4" />} label={card.type === "note" ? "Delete note" : "Remove from Board"} onSelect={remove} />
    </>
  );

  if (card.type === "note") {
    return <NoteTile project={project} card={card} editing={editing} onEditingChange={onEditingChange} menu={arrange} />;
  }
  if (!resolved) return null;
  if (resolved.kind === "element") return <ElementTile element={resolved.element} menu={arrange} />;
  return <AssetTile asset={resolved.asset} menu={arrange} onInspect={() => onInspect(resolved.asset.id)} />;
}

/** Tile chrome shared by every tile: frame, type label, caption and a menu. */
function TileFrame({ label, caption, menu, children, accent }: { label: ReactNode; caption?: string; menu: ReactNode; children: ReactNode; accent?: boolean }) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden rounded-panel border bg-surface-1", accent ? "border-accent/25" : "border-line")}>
      {children}
      <div className="flex min-h-12 items-center gap-2 px-3 py-2">
        <GripVertical aria-hidden="true" className="hidden size-3.5 shrink-0 cursor-grab text-fg-subtle md:block" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-2xs tracking-[0.08em] text-fg-subtle uppercase">{label}</p>
          {caption && <p className="truncate text-[13px] text-fg-muted">{caption}</p>}
        </div>
        <Popover
          label="Tile actions"
          side="top"
          align="end"
          width={220}
          trigger={(props) => (
            <IconButton {...props} aria-label="Tile actions" size="sm">
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </IconButton>
          )}
        >
          {(close) => (
            <div className="flex flex-col" onClick={close}>
              {menu}
            </div>
          )}
        </Popover>
      </div>
    </div>
  );
}

function AssetTile({ asset, menu, onInspect }: { asset: Asset; menu: ReactNode; onInspect: () => void }) {
  const router = useRouter();
  const a = useAssetActions(asset);
  const isImage = asset.kind === "image";
  const isVideo = asset.kind === "video";

  const quick = (
    <>
      <MenuItem icon={<Eye className="size-4" />} label="Inspect" onSelect={onInspect} />
      {isImage && <MenuItem icon={<ImageUp className="size-4" />} label="Use as reference" onSelect={a.reference} />}
      {isImage && <MenuItem icon={<Clapperboard className="size-4" />} label="Animate" onSelect={a.animate} />}
      {isVideo && (
        <MenuItem
          icon={<Mic className="size-4" />}
          label="Create voiceover"
          onSelect={() => {
            prepareVoiceover(asset);
            router.push("/create/audio");
          }}
        />
      )}
      <div className="my-1 h-px bg-line" />
      {menu}
    </>
  );

  if (asset.kind === "audio" && asset.audio) {
    return (
      <TileFrame label={<>Voice · {speakerLabel(asset.audio.speaker)}</>} caption={asset.audio.script} menu={quick} accent>
        <div className="flex aspect-[4/3] flex-col justify-between bg-gradient-to-br from-surface-3 to-surface-1 p-4">
          <div className="flex items-center gap-2">
            <SpeakerAvatar speaker={asset.audio.speaker} size="sm" />
            <button type="button" onClick={onInspect} className="min-w-0 truncate text-left text-[13px] font-medium text-fg hover:underline">
              {speakerLabel(asset.audio.speaker)}
            </button>
          </div>
          <p className="line-clamp-3 text-[13px] leading-snug text-fg-muted">“{asset.audio.script}”</p>
          <AudioPlayer asset={asset} variant="compact" />
        </div>
      </TileFrame>
    );
  }

  return (
    <TileFrame label={kindLabel(asset)} caption={asset.settings.prompt || "Untitled"} menu={quick}>
      <div className="relative aspect-[4/3] bg-surface-2">
        <AssetThumb asset={asset} sizes="(min-width: 1024px) 30vw, 50vw" badge />
        <button type="button" onClick={onInspect} aria-label={`Inspect ${kindLabel(asset)}: ${asset.settings.prompt || "untitled"}`} className="absolute inset-0 cursor-zoom-in" />
        {isImage && (
          <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 [@media(hover:none)]:opacity-100">
            <AssetMoreMenu
              asset={asset}
              initialView="edit"
              side="top"
              variant="glass"
              trigger={(props) => (
                <IconButton {...props} aria-label="Edit with prompt" variant="glass" size="sm">
                  <PencilLine aria-hidden="true" className="size-4" />
                </IconButton>
              )}
            />
            <IconButton aria-label="Animate" variant="glass" size="sm" onClick={a.animate} className="text-accent hover:text-accent">
              <Clapperboard aria-hidden="true" className="size-4" />
            </IconButton>
          </div>
        )}
        {isVideo && (
          <div className="absolute right-2 bottom-2 opacity-0 transition-opacity duration-200 group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 [@media(hover:none)]:opacity-100">
            <IconButton
              aria-label="Create voiceover"
              variant="glass"
              size="sm"
              onClick={() => {
                prepareVoiceover(asset);
                router.push("/create/audio");
              }}
            >
              <Mic aria-hidden="true" className="size-4" />
            </IconButton>
          </div>
        )}
      </div>
    </TileFrame>
  );
}

function ElementTile({ element, menu }: { element: CreativeElement; menu: ReactNode }) {
  const router = useRouter();
  const use = () => {
    setImageReference(elementAsReference(element));
    toast({ message: `“${element.name}” set as your reference` });
    router.push("/create/image");
  };
  return (
    <TileFrame
      label={
        <span className="inline-flex items-center gap-1">
          <Bookmark aria-hidden="true" className="size-3 fill-current text-accent" /> Element · {element.kind}
        </span>
      }
      caption={element.name}
      menu={
        <>
          <MenuItem icon={<ImageUp className="size-4" />} label="Use as reference" onSelect={use} />
          <div className="my-1 h-px bg-line" />
          {menu}
        </>
      }
    >
      <div className="relative aspect-[4/3] bg-surface-2">
        <MediaImage src={element.url} alt={element.name} sizes="(min-width: 1024px) 30vw, 50vw" className="object-cover" />
        <button type="button" onClick={use} aria-label={`Use Element ${element.name} as reference`} className="absolute inset-0" />
      </div>
    </TileFrame>
  );
}

function NoteTile({
  project,
  card,
  editing,
  onEditingChange,
  menu,
}: {
  project: Project;
  card: Extract<BoardCard, { type: "note" }>;
  editing: boolean;
  onEditingChange: (v: boolean) => void;
  menu: ReactNode;
}) {
  const update = useStudio((s) => s.updateBoardNote);
  const remove = useStudio((s) => s.removeBoardCard);
  const [text, setText] = useState(card.text);
  const save = () => {
    onEditingChange(false);
    if (!text.trim() && !card.title) {
      remove(project.id, card.id);
      return;
    }
    update(project.id, card.id, { text: text.trim() });
  };
  return (
    <TileFrame
      label={
        <span className="inline-flex items-center gap-1">
          <StickyNote aria-hidden="true" className="size-3 text-accent" /> Note
        </span>
      }
      menu={
        <>
          <MenuItem
            icon={<PencilLine className="size-4" />}
            label="Edit note"
            onSelect={() => {
              setText(card.text);
              onEditingChange(true);
            }}
          />
          <div className="my-1 h-px bg-line" />
          {menu}
        </>
      }
    >
      <div className="aspect-[4/3] bg-[linear-gradient(160deg,rgb(255_106_61/0.07),transparent_55%)] p-4">
        {editing ? (
          <>
            <label htmlFor={`note-${card.id}`} className="sr-only">
              Note
            </label>
            <textarea
              id={`note-${card.id}`}
              autoFocus
              value={text}
              maxLength={4000}
              onChange={(e) => setText(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  save();
                }
              }}
              placeholder="A thought, a direction, a line of copy…"
              className="size-full resize-none bg-transparent text-[15px] leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setText(card.text);
              onEditingChange(true);
            }}
            aria-label="Edit note"
            className="flex size-full flex-col items-start overflow-hidden text-left"
          >
            {card.title && <span className="mb-1.5 line-clamp-1 text-[13px] font-semibold text-fg">{card.title}</span>}
            <span className={cn("line-clamp-6 text-[15px] leading-relaxed whitespace-pre-line", card.text ? "text-fg" : "text-fg-subtle")}>
              {card.text || "Empty note"}
            </span>
          </button>
        )}
      </div>
    </TileFrame>
  );
}
