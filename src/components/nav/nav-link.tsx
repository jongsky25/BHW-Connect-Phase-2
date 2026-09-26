"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav/nav-items";

type Props = {
  item: NavItem;
  label: string;
};

// "prefix" items (e.g. Knowledge Base) also activate for their sub-routes
// (/kb/some-article), matching item.match from getNavItems.
export function isNavItemActive(pathname: string, item: Pick<NavItem, "href" | "match">): boolean {
  if (item.match === "prefix") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}

export function NavLink({ item, label }: Props) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, item);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active ? "text-primary-text" : "text-ink/70 hover:text-ink"
      }`}
    >
      {label}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full bg-primary-text"
        />
      ) : null}
    </Link>
  );
}
