"use client";

import { useRouter } from "next/navigation";
import { AudioLines, Clapperboard, Compass, CornerDownLeft, FolderOpen, FolderPlus, ImageIcon, Images, Search, type LucideIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { create } from "zustand";
import { AssetThumb } from "@/components/media/AssetThumb";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { kindLabel } from "@/lib/lineage";
import { useStudio } from "@/store/studio";

/** Open state, so any button (rail, page headers) can open the palette. */
export const useCommandPalette = create<{ open: boolean; setOpen: (open: boolean) => void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

interface Command {
  id: string;
  group: "Go to" | "Create" | "Projects" | "Recent";
  label: string;
  hint?: string;
  icon?: LucideIcon;
  visual?: React.ReactNode;
  keywords?: string;
  run: () => void;
}

const subscribeNoop = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** "⌘K" on Apple platforms, "Ctrl K" elsewhere. */
export function useShortcutLabel() {
  return useSyncExternalStore(subscribeNoop, () => (isMac() ? "⌘K" : "Ctrl K"), () => "Ctrl K");
}

/**
 * Global command palette (Ctrl+K / Cmd+K): jump to a workspace, open or
 * create a project, or reopen something recent. A combobox over a listbox:
 * type to filter, Up/Down to move, Enter to run, Escape to close.
 */
export function CommandPalette() {
  const open = useCommandPalette((s) => s.open);
  const setOpen = useCommandPalette((s) => s.setOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        setOpen(!useCommandPalette.getState().open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Command palette" hideHeader position="top" className="max-w-xl">
      {open && <PaletteBody onClose={() => setOpen(false)} />}
    </Dialog>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const projects = useStudio((s) => s.projects);
  const assets = useStudio((s) => s.assets);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    const list: Command[] = [
      { id: "create-image", group: "Create", label: "Create Image", icon: ImageIcon, keywords: "generate picture photo new", run: go("/create/image") },
      { id: "create-video", group: "Create", label: "Create Video", icon: Clapperboard, keywords: "animate motion clip new", run: go("/create/video") },
      { id: "create-audio", group: "Create", label: "Create Audio", hint: "Voice and Transcribe", icon: AudioLines, keywords: "voice voiceover speech transcribe tts new", run: go("/create/audio") },
      { id: "new-project", group: "Create", label: "New Project", icon: FolderPlus, keywords: "add campaign idea", run: go("/projects?new=1") },
      { id: "go-explore", group: "Go to", label: "Explore", icon: Compass, keywords: "inspiration gallery browse", run: go("/explore") },
      { id: "go-projects", group: "Go to", label: "Projects", icon: FolderOpen, keywords: "board campaign", run: go("/projects") },
      { id: "go-library", group: "Go to", label: "Library", icon: Images, keywords: "assets history favorites elements search", run: go("/library") },
    ];
    for (const p of Object.values(projects).sort((a, b) => b.updatedAt - a.updatedAt)) {
      list.push({ id: `project-${p.id}`, group: "Projects", label: p.name, hint: `${p.items.length} items`, icon: FolderOpen, keywords: p.description, run: go(`/projects/${p.id}`) });
    }
    const recent = Object.values(assets).sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
    for (const a of recent) {
      list.push({
        id: `asset-${a.id}`,
        group: "Recent",
        label: a.settings.prompt || "Untitled",
        hint: kindLabel(a),
        visual: (
          <span className="relative block size-7 shrink-0 overflow-hidden rounded-[6px] bg-surface-3">
            <AssetThumb asset={a} sizes="28px" />
          </span>
        ),
        run: go(`/library?open=${a.id}`),
      });
    }
    return list;
  }, [projects, assets, router]);

  const filtered = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return commands;
    return commands.filter((c) => {
      const text = `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""} ${c.group}`.toLowerCase();
      return terms.every((t) => text.includes(t));
    });
  }, [commands, query]);

  const index = Math.min(active, Math.max(0, filtered.length - 1));
  const current = filtered[index];

  useEffect(() => {
    if (current) document.getElementById(`${listId}-${current.id}`)?.scrollIntoView({ block: "nearest" });
  }, [current, listId]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  let lastGroup = "";
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
        <input
          ref={inputRef}
          data-autofocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
          aria-autocomplete="list"
          aria-label="Search commands, projects and recent work"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((index + 1) % Math.max(1, filtered.length));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((index - 1 + filtered.length) % Math.max(1, filtered.length));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(current);
            }
          }}
          placeholder="Search or jump to…"
          className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none"
        />
        <kbd className="hidden rounded-[5px] border border-line-strong px-1.5 py-0.5 font-mono text-2xs text-fg-subtle sm:block">Esc</kbd>
      </div>
      <ul id={listId} role="listbox" aria-label="Commands" className="max-h-[min(60dvh,420px)] overflow-y-auto p-2">
        {filtered.length === 0 && <li className="px-3 py-8 text-center text-sm text-fg-muted">No commands or projects match “{query.trim()}”.</li>}
        {filtered.map((c, i) => {
          const header = c.group !== lastGroup ? c.group : null;
          lastGroup = c.group;
          const Icon = c.icon;
          const selected = i === index;
          return (
            <li key={c.id} role="presentation">
              {header && (
                <p role="presentation" className="px-3 pt-2.5 pb-1 font-mono text-2xs tracking-[0.12em] text-fg-subtle uppercase">
                  {header}
                </p>
              )}
              <div
                id={`${listId}-${c.id}`}
                role="option"
                aria-selected={selected}
                onMouseMove={() => i !== index && setActive(i)}
                onClick={() => run(c)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-card px-3 py-2 text-sm transition-colors",
                  selected ? "bg-surface-3 text-fg" : "text-fg-muted",
                )}
              >
                {c.visual ?? (Icon && <Icon aria-hidden="true" className={cn("size-4 shrink-0", selected && "text-accent")} />)}
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                {c.hint && <span className="shrink-0 font-mono text-2xs text-fg-subtle">{c.hint}</span>}
                {selected && <CornerDownLeft aria-hidden="true" className="size-3.5 shrink-0 text-fg-subtle" />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Visible way into the palette (for mouse, touch and discoverability). */
export function CommandButton({ className, compact }: { className?: string; compact?: boolean }) {
  const setOpen = useCommandPalette((s) => s.setOpen);
  const shortcut = useShortcutLabel();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Search and commands"
      aria-keyshortcuts="Control+K Meta+K"
      title={`Search and commands (${shortcut})`}
      className={cn(
        "flex items-center justify-center gap-2 rounded-card border border-line text-fg-subtle transition-colors hover:border-line-strong hover:text-fg",
        compact ? "size-10 flex-col gap-0.5" : "h-10 px-3 text-[13px]",
        className,
      )}
    >
      <Search aria-hidden="true" className="size-4" />
      {compact ? <span className="font-mono text-[9px] leading-none">{shortcut}</span> : <span className="text-[13px]">Search</span>}
    </button>
  );
}
