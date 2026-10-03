import type { Metadata } from "next";
import { Suspense } from "react";
import { CommandButton } from "@/components/command/CommandPalette";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { PageContainer, PageHeader } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <PageContainer className="flex flex-1 flex-col pb-8 md:pb-12">
      <PageHeader
        title="Projects"
        description="Each creative idea in one place: its images, motion, voice, Elements and notes."
        actions={<CommandButton className="md:hidden" />}
      />
      <Suspense fallback={<div className="min-h-[50dvh]" aria-busy="true" />}>
        <ProjectsView />
      </Suspense>
    </PageContainer>
  );
}
