import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)}>
      <div className="grid size-12 place-items-center rounded-panel border border-line bg-surface-2 text-fg-muted">
        <Icon aria-hidden="true" strokeWidth={1.5} className="size-5" />
      </div>
      <h2 className="mt-5 text-base font-medium tracking-[-0.01em] text-fg">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
