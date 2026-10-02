import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        d="M16 6c1.2 4.4 3.6 6.8 8 8-4.4 1.2-6.8 3.6-8 8-1.2-4.4-3.6-6.8-8-8 4.4-1.2 6.8-3.6 8-8Z"
        fill="currentColor"
      />
      <circle cx="23.5" cy="23.5" r="2" fill="currentColor" opacity=".55" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/create/image"
      aria-label={`${APP_NAME} home`}
      className="grid size-10 place-items-center rounded-card text-accent transition-colors duration-150 hover:bg-surface-2"
    >
      <LogoMark className="size-6" />
    </Link>
  );
}
