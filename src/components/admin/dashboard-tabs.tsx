"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type DashboardTab = {
  key: string;
  href: string;
  label: string;
};

type Props = {
  tabs: DashboardTab[];
};

// Exact match, not the prefix match admin-nav.tsx uses: /admin/dashboard is
// itself a sibling of /admin/dashboard/reports and /admin/dashboard/chat-guide,
// not their parent, so a prefix match would keep "Activity" highlighted on
// every dashboard tab.
export function DashboardTabs({ tabs }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-4 border-b border-ink/10 text-sm font-medium">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px flex min-h-[44px] items-center border-b-2 px-1 transition-colors ${
              active ? "border-ink text-ink" : "border-transparent text-secondary hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
