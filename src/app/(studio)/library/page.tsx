import type { Metadata } from "next";
import { LibraryView } from "@/components/library/LibraryView";
import { PageContainer, PageHeader } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <PageContainer className="flex flex-1 flex-col pb-8 md:pb-12">
      <PageHeader title="Library" description="Everything you generate, saved on this device." />
      <LibraryView />
    </PageContainer>
  );
}
