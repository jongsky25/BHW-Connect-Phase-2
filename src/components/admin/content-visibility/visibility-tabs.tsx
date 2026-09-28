"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

type Props = {
  /** The list page's own path, e.g. "/admin/kb/entries". */
  basePath: string;
  view: "active" | "archived";
  activeCount: number;
  archivedCount: number;
};

// Active is the default (published, draft and hidden — everything except
// archived); Archived is its own tab, kept in ?view=archived (plan §4.5).
export function VisibilityTabs({ basePath, view, activeCount, archivedCount }: Props) {
  const t = useTranslations("admin.visibility");

  return (
    <nav className="flex flex-wrap gap-4 border-b border-ink/10 text-sm font-medium">
      <Link
        href={basePath}
        aria-current={view === "active" ? "page" : undefined}
        className={`-mb-px flex min-h-[44px] items-center border-b-2 px-1 transition-colors ${
          view === "active" ? "border-ink text-ink" : "border-transparent text-secondary hover:text-ink"
        }`}
      >
        {t("tabs.active")} ({activeCount})
      </Link>
      <Link
        href={`${basePath}?view=archived`}
        aria-current={view === "archived" ? "page" : undefined}
        className={`-mb-px flex min-h-[44px] items-center border-b-2 px-1 transition-colors ${
          view === "archived" ? "border-ink text-ink" : "border-transparent text-secondary hover:text-ink"
        }`}
      >
        {t("tabs.archived")} ({archivedCount})
      </Link>
    </nav>
  );
}
