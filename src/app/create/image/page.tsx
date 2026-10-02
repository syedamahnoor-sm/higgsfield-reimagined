import type { Metadata } from "next";
import { ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Create image" };

export default function CreateImagePage() {
  return (
    <EmptyState
      icon={ImageIcon}
      className="flex-1"
      title="Image workspace"
      description="Describe an image, add an optional reference, pick a style and aspect ratio. Results will appear here, large and ready to refine."
    />
  );
}
