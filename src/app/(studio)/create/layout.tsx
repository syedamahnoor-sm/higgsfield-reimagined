import { WorkspaceFrame } from "@/components/create/WorkspaceFrame";

export default function CreateLayout({ children }: LayoutProps<"/create">) {
  return <WorkspaceFrame>{children}</WorkspaceFrame>;
}
