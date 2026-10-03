import { AppShell } from "@/components/shell/AppShell";

/** The application: Create, Explore and Library share the rail / bottom navigation. */
export default function StudioLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
