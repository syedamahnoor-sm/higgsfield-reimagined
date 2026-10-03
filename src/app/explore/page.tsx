import type { Metadata } from "next";
import { ExploreGallery } from "@/components/explore/ExploreGallery";
import { PageContainer, PageHeader } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <PageContainer className="flex flex-1 flex-col pb-8 md:pb-12">
      <PageHeader
        title="Explore"
        description="Curated starting points. Remix any example to load its prompt and settings into Create."
      />
      <ExploreGallery />
    </PageContainer>
  );
}
