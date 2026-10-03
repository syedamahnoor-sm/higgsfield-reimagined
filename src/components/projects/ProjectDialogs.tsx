"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { Project } from "@/lib/types";

const field =
  "w-full rounded-card border border-line bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-white/20 focus:outline-none";

/** Create or rename a project: a name, plus an optional one-line description. */
export function ProjectFormDialog({
  open,
  onClose,
  project,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  /** When given, the dialog edits this project. */
  project?: Project;
  onSubmit: (values: { name: string; description: string }) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project ? "Rename project" : "New project"}
      description={project ? undefined : "A project keeps one creative idea together: its images, motion, voice, Elements and notes."}
    >
      {open && <ProjectForm project={project} onCancel={onClose} onSubmit={onSubmit} />}
    </Dialog>
  );
}

function ProjectForm({ project, onCancel, onSubmit }: { project?: Project; onCancel: () => void; onSubmit: (v: { name: string; description: string }) => void }) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  return (
    <form
      className="flex flex-col gap-4 p-5 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, description });
      }}
    >
      <div>
        <label htmlFor="project-name" className="mb-1.5 block text-[13px] font-medium text-fg">
          Name
        </label>
        <input
          id="project-name"
          data-autofocus
          onFocus={(e) => e.currentTarget.select()}
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Winter Tea Campaign"
          className={`${field} h-11`}
        />
      </div>
      <div>
        <label htmlFor="project-description" className="mb-1.5 block text-[13px] font-medium text-fg">
          Description <span className="font-normal text-fg-subtle">(optional)</span>
        </label>
        <textarea
          id="project-description"
          value={description}
          maxLength={280}
          rows={2}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this idea about?"
          className={`${field} resize-none py-2.5 leading-relaxed`}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          {project ? "Save" : "Create project"}
        </Button>
      </div>
    </form>
  );
}

/** Confirms deleting a project, and is explicit that the media itself is kept. */
export function DeleteProjectDialog({ project, open, onClose, onConfirm }: { project: Project; open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={`Delete “${project.name}”?`}>
      <div className="flex flex-col gap-5 p-5 pt-3">
        <p className="text-sm leading-relaxed text-fg-muted">
          The project, its Board and its notes are removed. Its images, videos, voices and Elements stay in your Library.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="border-danger/40 bg-danger/10 text-danger hover:border-danger/60 hover:bg-danger/20">
            Delete project
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** "just now", "5 min ago", "3 h ago", "Mar 4". */
export function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}
