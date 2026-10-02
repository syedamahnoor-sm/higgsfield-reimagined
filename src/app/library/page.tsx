import type { Metadata } from "next";
import { Images, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer, PageHeader } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <PageContainer className="flex flex-1 flex-col">
      <PageHeader title="Library" description="Everything you generate, saved on this device." />
      <div className="flex flex-1 rounded-panel border border-dashed border-line">
        <EmptyState
          icon={Images}
          className="flex-1"
          title="Nothing here yet"
          description="Images and videos you create will be collected here, ready to remix, favorite or download."
          action={
            <ButtonLink href="/create/image" variant="primary">
              <Sparkles aria-hidden="true" className="size-4" strokeWidth={2} />
              Start creating
            </ButtonLink>
          }
        />
      </div>
      <div className="h-6 md:h-10" />
    </PageContainer>
  );
}
