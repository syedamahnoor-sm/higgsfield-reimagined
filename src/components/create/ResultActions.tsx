"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bookmark, Clapperboard, Copy, Download, Heart, ImageUp, Loader2, MoreHorizontal, PencilLine, Shuffle } from "lucide-react";
import { useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem, Popover } from "@/components/ui/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import { copyPrompt, downloadWithFeedback, editAsset, elementNameFrom, prepareAnimate, remixAsset, setAssetAsReference } from "@/lib/actions";
import { cn } from "@/lib/cn";
import type { Asset } from "@/lib/types";
import { useStudio } from "@/store/studio";
import { SaveElementForm } from "./SaveElement";

export const ACTION_COPY = {
  remix: { label: "Remix", hint: "Load this prompt and settings into the composer" },
  reference: { label: "Use as reference", hint: "Send this image to the AI model as the reference for your next generation" },
  animate: { label: "Animate", hint: "Turn this image into video" },
  edit: { label: "Edit", hint: "Change this image with a written instruction (AI edit)" },
  download: { label: "Download", hint: "Download this image" },
} as const;

/**
 * The single implementation of every asset action, shared by Create, Library
 * and the viewer. Remix and Use as reference land in the Image workspace, so
 * from any other page they navigate there.
 */
export function useAssetActions(asset: Asset) {
  const router = useRouter();
  const pathname = usePathname();
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const [downloading, setDownloading] = useState(false);
  const goTo = (path: string) => {
    if (pathname !== path) router.push(path);
  };
  const toImage = () => goTo("/create/image");
  return {
    remix: () => {
      remixAsset(asset);
      goTo(asset.kind === "video" ? "/create/video" : "/create/image");
    },
    reference: () => {
      setAssetAsReference(asset);
      toImage();
    },
    animate: () => {
      prepareAnimate(asset);
      router.push("/create/video");
    },
    edit: (instruction: string, setId?: string) => {
      void editAsset(asset, instruction, setId);
      toImage();
    },
    favorite: () => toggleFavorite(asset.id),
    downloading,
    download: async () => {
      setDownloading(true);
      await downloadWithFeedback(asset);
      setDownloading(false);
    },
  };
}

export function FavoriteButton({
  asset,
  onToggle,
  variant,
  align,
}: {
  asset: Asset;
  onToggle: () => void;
  variant: "glass" | "ghost";
  align?: "center" | "end";
}) {
  return (
    <Tooltip label={asset.favorite ? "Remove from favorites" : "Add to favorites"} align={align}>
      <IconButton
        aria-label="Favorite"
        aria-pressed={asset.favorite}
        variant={variant}
        size="sm"
        onClick={onToggle}
        className={cn(asset.favorite && "text-accent! hover:text-accent!")}
      >
        <Heart
          aria-hidden="true"
          className={cn("size-4 transition-transform duration-200", asset.favorite && "scale-110 fill-current")}
        />
      </IconButton>
    </Tooltip>
  );
}

/** Edit with Prompt: a real AI edit that sends this image plus the instruction to the model. */
function EditForm({ asset, setId, onDone }: { asset: Asset; setId?: string; onDone: () => void }) {
  const a = useAssetActions(asset);
  const [text, setText] = useState("");
  return (
    <form
      className="flex flex-col gap-2 p-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        a.edit(text, setId);
        onDone();
      }}
    >
      <p className="px-0.5 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">Edit with prompt</p>
      <label htmlFor={`edit-${asset.id}`} className="sr-only">
        Describe the change
      </label>
      <textarea
        id={`edit-${asset.id}`}
        autoFocus
        rows={2}
        maxLength={400}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Describe the change… e.g. make the background a snowy mountain range"
        className="resize-none rounded-chip border border-line bg-surface-1 px-2.5 py-2 text-[13px] leading-relaxed text-fg placeholder:text-fg-subtle focus:border-white/20 focus:outline-none"
      />
      <p className="px-0.5 text-xs leading-snug text-fg-subtle">The AI model edits this image from your instruction. The original stays in this set.</p>
      <button type="submit" disabled={!text.trim()} className="h-9 rounded-chip bg-accent text-[13px] font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-40">
        Apply edit
      </button>
    </form>
  );
}

/** Less-common actions in one tidy menu: Edit, Copy prompt, Save as Element. */
export function AssetMoreMenu({
  asset,
  setId,
  side = "top",
  variant = "ghost",
  initialView = "menu",
  trigger,
}: {
  asset: Asset;
  setId?: string;
  side?: "top" | "bottom";
  variant?: "ghost" | "glass";
  initialView?: "menu" | "edit";
  trigger?: Parameters<typeof Popover>[0]["trigger"];
}) {
  const [view, setView] = useState<"menu" | "edit" | "save">(initialView);
  const [open, setOpen] = useState(false);
  return (
    <Popover
      label="More actions"
      side={side}
      align="end"
      width={view === "menu" ? 240 : 300}
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setView(initialView);
      }}
      trigger={
        trigger ??
        ((props) => (
          <Tooltip label="More actions" side={side === "top" ? "top" : "bottom"} align="end">
            <IconButton {...props} aria-label="More actions" variant={variant} size="sm">
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </IconButton>
          </Tooltip>
        ))
      }
    >
      {(close) =>
        view === "edit" ? (
          <EditForm asset={asset} setId={setId} onDone={close} />
        ) : view === "save" ? (
          <SaveElementForm
            source={{ url: asset.url, width: asset.width, height: asset.height, color: asset.color, defaultName: elementNameFrom(asset.settings.prompt), sourceAssetId: asset.id }}
            onDone={close}
          />
        ) : (
          <div className="flex flex-col">
            <MenuItem icon={<PencilLine className="size-4" />} label="Edit with prompt…" hint="AI edit of this image" onSelect={() => setView("edit")} />
            <MenuItem icon={<Bookmark className="size-4" />} label="Save as Element…" hint="Reuse it as a reference later" onSelect={() => setView("save")} />
            <MenuItem
              icon={<Copy className="size-4" />}
              label="Copy prompt"
              onSelect={() => {
                void copyPrompt(asset.settings.prompt);
                close();
              }}
            />
          </div>
        )
      }
    </Popover>
  );
}

/**
 * Action bar beneath a single, focused result. Hierarchy: Animate is the
 * primary next step; Edit, Remix and Use as reference are secondary; Favorite
 * and Download are quick icons; the rest lives in the overflow menu.
 */
export function ResultActionBar({ asset, setId }: { asset: Asset; setId?: string }) {
  const a = useAssetActions(asset);
  const button =
    "flex h-9 items-center gap-2 rounded-chip px-3 text-[13px] font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg";
  return (
    <div role="toolbar" aria-label="Result actions" className="flex items-center justify-center gap-0.5">
      <Tooltip label={ACTION_COPY.animate.hint}>
        <button
          type="button"
          onClick={a.animate}
          className="mr-1 flex h-9 items-center gap-2 rounded-chip bg-accent-soft px-3.5 text-[13px] font-semibold text-accent transition-colors duration-150 hover:bg-accent hover:text-accent-fg"
        >
          <Clapperboard aria-hidden="true" className="size-4" /> {ACTION_COPY.animate.label}
        </button>
      </Tooltip>
      <AssetMoreMenu
        asset={asset}
        setId={setId}
        initialView="edit"
        trigger={(props) => (
          <Tooltip label={ACTION_COPY.edit.hint}>
            <button type="button" {...props} aria-label={ACTION_COPY.edit.label} className={button}>
              <PencilLine aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">{ACTION_COPY.edit.label}</span>
            </button>
          </Tooltip>
        )}
      />
      <Tooltip label={ACTION_COPY.remix.hint}>
        <button type="button" onClick={a.remix} aria-label={ACTION_COPY.remix.label} className={button}>
          <Shuffle aria-hidden="true" className="size-4" /> <span className="hidden sm:inline">{ACTION_COPY.remix.label}</span>
        </button>
      </Tooltip>
      <Tooltip label={ACTION_COPY.reference.hint}>
        <button type="button" onClick={a.reference} aria-label="Use as reference" className={button}>
          <ImageUp aria-hidden="true" className="size-4" /> <span className="hidden md:inline">Use as reference</span>
        </button>
      </Tooltip>
      <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-line-strong sm:block" />
      <FavoriteButton asset={asset} onToggle={a.favorite} variant="ghost" />
      <Tooltip label={ACTION_COPY.download.hint}>
        <IconButton aria-label="Download" size="sm" onClick={a.download} disabled={a.downloading}>
          {a.downloading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
        </IconButton>
      </Tooltip>
      <AssetMoreMenu asset={asset} setId={setId} />
    </div>
  );
}

/** Compact overlay actions for a tile in a multi-image grid; shown on hover or keyboard focus. */
export function TileActions({ asset, setId }: { asset: Asset; setId?: string }) {
  const a = useAssetActions(asset);
  return (
    <>
      <div className="absolute top-2 right-2 flex gap-1">
        <FavoriteButton asset={asset} onToggle={a.favorite} variant="glass" align="end" />
        <Tooltip label={ACTION_COPY.download.hint} side="bottom" align="end">
          <IconButton aria-label="Download" variant="glass" size="sm" onClick={a.download} disabled={a.downloading}>
            {a.downloading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
          </IconButton>
        </Tooltip>
        <AssetMoreMenu asset={asset} setId={setId} side="bottom" variant="glass" />
      </div>
      <div role="toolbar" aria-label="Result actions" className="absolute bottom-2 left-2 flex gap-1">
        <Tooltip label={ACTION_COPY.animate.hint} align="start">
          <IconButton aria-label={ACTION_COPY.animate.label} variant="glass" size="sm" onClick={a.animate} className="text-accent hover:text-accent">
            <Clapperboard aria-hidden="true" className="size-4" />
          </IconButton>
        </Tooltip>
        <Tooltip label={ACTION_COPY.remix.hint} align="start">
          <IconButton aria-label={ACTION_COPY.remix.label} variant="glass" size="sm" onClick={a.remix}>
            <Shuffle aria-hidden="true" className="size-4" />
          </IconButton>
        </Tooltip>
        <Tooltip label={ACTION_COPY.reference.hint} align="start">
          <IconButton aria-label={ACTION_COPY.reference.label} variant="glass" size="sm" onClick={a.reference}>
            <ImageUp aria-hidden="true" className="size-4" />
          </IconButton>
        </Tooltip>
      </div>
    </>
  );
}
