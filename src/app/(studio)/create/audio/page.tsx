import type { Metadata } from "next";
import { AudioWorkspace } from "@/components/create/audio/AudioWorkspace";

export const metadata: Metadata = { title: "Create audio" };

export default function CreateAudioPage() {
  return <AudioWorkspace />;
}
