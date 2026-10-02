"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToasts } from "@/store/toasts";

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 md:top-4 md:pl-rail"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-card border border-line-strong bg-surface-2/95 py-2 pr-2 pl-3.5 text-[13px] text-fg shadow-float backdrop-blur-xl"
          >
            {t.tone === "error" && <AlertCircle aria-hidden="true" className="size-4 shrink-0 text-danger" />}
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="rounded-chip px-2 py-1 font-medium text-accent transition-colors hover:bg-accent-soft"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className={cn("grid size-7 place-items-center rounded-chip text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg")}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
