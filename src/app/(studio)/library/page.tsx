import type { Metadata } from "next";
import { Suspense } from "react";
import { CommandButton } from "@/components/command/CommandPalette";
import { LibraryView } from "@/components/library/LibraryView";
import { PageContainer, PageHeader } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <PageContainer className="flex flex-1 flex-col pb-8 md:pb-12">
      <PageHeader title="Library" description="Everything you generate, saved on this device." actions={<CommandButton className="md:hidden" />} />
      <Suspense fallback={<div className="min-h-[50dvh]" aria-busy="true" />}>
        <LibraryView />
      </Suspense>
    </PageContainer>
  );
}
