import type { Metadata } from "next";
import { VideoHandoff } from "@/components/create/VideoHandoff";

export const metadata: Metadata = { title: "Create video" };

export default function CreateVideoPage() {
  return <VideoHandoff />;
}
