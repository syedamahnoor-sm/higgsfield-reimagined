import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer, PageHeader } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <PageContainer className="flex flex-1 flex-col">
      <PageHeader title="Explore" description="Find a starting point. Every piece shows its prompt and settings, and can be remixed in one click." />
      <div className="flex flex-1 rounded-panel border border-dashed border-line">
        <EmptyState icon={Compass} className="flex-1" title="Gallery coming together" description="Curated images and videos will appear here." />
      </div>
      <div className="h-6 md:h-10" />
    </PageContainer>
  );
}
