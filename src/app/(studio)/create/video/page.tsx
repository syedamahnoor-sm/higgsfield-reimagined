import type { Metadata } from "next";
import { VideoWorkspace } from "@/components/create/video/VideoWorkspace";

export const metadata: Metadata = { title: "Create video" };

export default function CreateVideoPage() {
  return <VideoWorkspace />;
}
