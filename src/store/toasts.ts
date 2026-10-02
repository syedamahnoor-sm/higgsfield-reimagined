import { create } from "zustand";
import { createId } from "@/lib/id";

export interface Toast {
  id: string;
  message: string;
  tone?: "default" | "error";
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  show: (toast: Omit<Toast, "id">, durationMs?: number) => string;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (toast, durationMs = 4500) => {
    const id = createId("toast");
    // Keep the stack short: newest three.
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }].slice(-3) }));
    setTimeout(() => get().dismiss(id), durationMs);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (t: Omit<Toast, "id">, durationMs?: number) => useToasts.getState().show(t, durationMs);
