import type { Metadata } from "next";
import { ImageWorkspace } from "@/components/create/ImageWorkspace";

export const metadata: Metadata = { title: "Create image" };

export default function CreateImagePage() {
  return <ImageWorkspace />;
}
