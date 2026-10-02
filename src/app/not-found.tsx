import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      className="flex-1"
      title="Page not found"
      description="This page doesn't exist. Head back to the studio."
      action={
        <ButtonLink href="/create/image" variant="secondary">
          Back to Create
        </ButtonLink>
      }
    />
  );
}
