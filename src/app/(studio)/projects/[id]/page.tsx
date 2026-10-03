import type { Metadata } from "next";
import { ProjectDetail } from "@/components/projects/ProjectDetail";
import { PageContainer } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  return (
    <PageContainer className="flex flex-1 flex-col">
      <ProjectDetail id={id} />
    </PageContainer>
  );
}
