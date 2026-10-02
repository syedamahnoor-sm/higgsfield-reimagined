import type { Metadata } from "next";
import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Create video" };

export default function CreateVideoPage() {
  return (
    <EmptyState
      icon={Clapperboard}
      className="flex-1"
      title="Video workspace"
      description="Bring an image to life with a camera motion preset, duration and aspect ratio. Clips will play here."
    />
  );
}
