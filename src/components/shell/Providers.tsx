"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/Toaster";
import { StoreHydrator } from "@/store/hydration";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <StoreHydrator />
      {children}
      <Toaster />
    </MotionConfig>
  );
}
