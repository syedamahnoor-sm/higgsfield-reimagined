import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Standard width and gutters for browse-style pages (Explore, Library). */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}

/** Compact, tool-like page header: title, optional description, optional trailing actions. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4 pt-6 pb-5 md:pt-10 md:pb-7", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg md:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
