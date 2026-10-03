import { Compass, FolderOpen, Images, Sparkles, type LucideIcon } from "lucide-react";

export interface NavItem {
  id: "create" | "explore" | "projects" | "library";
  label: string;
  href: string;
  /** Pathname prefix that marks this item active. */
  match: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "create", label: "Create", href: "/create/image", match: "/create", icon: Sparkles },
  { id: "explore", label: "Explore", href: "/explore", match: "/explore", icon: Compass },
  { id: "projects", label: "Projects", href: "/projects", match: "/projects", icon: FolderOpen },
  { id: "library", label: "Library", href: "/library", match: "/library", icon: Images },
];

export function isNavItemActive(item: NavItem, pathname: string) {
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}
