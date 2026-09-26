import type { FeatureFlagKey } from "@/lib/flags/types";

export type AdminNavItem = {
  /** Key under messages.admin.nav — also used as the React key. */
  key: string;
  href: string;
  /** Hidden unless this flag is enabled. Omit to always show. */
  flag?: FeatureFlagKey;
  /** Only shown to super admins. */
  superAdminOnly?: boolean;
};

export type AdminNavGroup = {
  /** Key under messages.admin.nav.groups. */
  id: string;
  items: AdminNavItem[];
};

// One flat menu was fine at 5 pages; at 17 it wraps into several lines on
// desktop and buries pages on mobile with no sense of where they sit
// relative to each other. Grouping mirrors how the pages relate to each
// other (a knowledge-base editor doesn't care about training progress),
// not the order they shipped in.
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    items: [{ key: "dashboard", href: "/admin/dashboard" }],
  },
  {
    id: "people",
    items: [
      { key: "users", href: "/admin/users" },
      { key: "audit", href: "/admin/audit" },
    ],
  },
  {
    id: "knowledge",
    items: [
      { key: "kbCategories", href: "/admin/kb/categories" },
      { key: "kbEntries", href: "/admin/kb/entries" },
      { key: "kbArticles", href: "/admin/kb/articles", flag: "kb_articles" },
      { key: "kbSynonyms", href: "/admin/kb/synonyms" },
    ],
  },
  {
    id: "training",
    items: [
      { key: "courses", href: "/admin/courses", flag: "elearning" },
      { key: "courseProgress", href: "/admin/course-progress", flag: "elearning" },
      { key: "trainingProgress", href: "/admin/training-progress", flag: "elearning" },
      { key: "flipcharts", href: "/admin/flipcharts", flag: "flipcharts" },
    ],
  },
  {
    id: "engagement",
    items: [
      { key: "announcements", href: "/admin/announcements", flag: "announcements" },
      { key: "surveys", href: "/admin/surveys", flag: "surveys" },
      { key: "forum", href: "/admin/forum", flag: "forum" },
    ],
  },
  {
    id: "system",
    items: [
      { key: "flags", href: "/admin/flags" },
      { key: "superAdmin", href: "/super-admin", superAdminOnly: true },
    ],
  },
];

// Kept out of the groups above: it's the signed-in user's own language/
// theme/font preferences, not admin configuration, so it's rendered as a
// separate "my account" link at the bottom of the menu instead of sitting
// among the system-configuration pages.
export const ADMIN_NAV_PREFERENCES_ITEM: AdminNavItem = { key: "myPreferences", href: "/settings" };

type VisibilityContext = {
  flags: Partial<Record<FeatureFlagKey, boolean>>;
  isSuperAdmin: boolean;
};

export function isAdminNavItemVisible(item: AdminNavItem, ctx: VisibilityContext): boolean {
  if (item.superAdminOnly && !ctx.isSuperAdmin) return false;
  if (item.flag && !ctx.flags[item.flag]) return false;
  return true;
}

export function visibleAdminNavGroups(ctx: VisibilityContext): { id: string; items: AdminNavItem[] }[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    id: group.id,
    items: group.items.filter((item) => isAdminNavItemVisible(item, ctx)),
  })).filter((group) => group.items.length > 0);
}

/** True when `pathname` is on or under `href` (e.g. /admin/kb/entries/new under /admin/kb/entries). */
export function isAdminNavItemActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
