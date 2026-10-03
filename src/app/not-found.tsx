import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="This page doesn't exist."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/" variant="secondary">
              Start page
            </ButtonLink>
            <ButtonLink href="/create/image" variant="primary">
              Open Create
            </ButtonLink>
          </div>
        }
      />
    </main>
  );
}
