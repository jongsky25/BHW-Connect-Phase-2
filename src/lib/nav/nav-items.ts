import type { AppUser } from "@/lib/supabase/app-user";
import type { FeatureFlags } from "@/lib/flags/types";

/**
 * The one list every nav surface (the `/home` action list today; the header,
 * "More" menu and mobile drawer from Phase 1 onward) renders from, so they
 * can't drift apart. `group` says where an item belongs once those surfaces
 * exist; `/home` ignores it for now and renders every item in order, exactly
 * as it always has.
 */
export type NavGroup = "primary" | "more" | "admin";

export type NavItem = {
  id: string;
  href: string;
  /** Key inside the `authHome` message namespace. */
  labelKey: string;
  group: NavGroup;
  /** "exact" (default) matches only the href itself; "prefix" also matches its sub-routes. */
  match?: "exact" | "prefix";
  /** The `/home` CTA style. Only "chat" is "primary" today. */
  variant?: "primary" | "default";
};

type NavContext = {
  role: AppUser["role"];
  flags: FeatureFlags;
};

type NavItemDef = NavItem & {
  show: (ctx: NavContext) => boolean;
};

// Order matches the historical `/home` button order exactly — reordering
// here changes visible layout, which is out of scope for this increment.
const NAV_ITEM_DEFS: NavItemDef[] = [
  {
    id: "chat",
    href: "/chat",
    labelKey: "chatGuideCta",
    group: "primary",
    variant: "primary",
    show: () => true,
  },
  {
    id: "kb",
    href: "/kb",
    labelKey: "kbBrowseCta",
    group: "primary",
    match: "prefix",
    show: () => true,
  },
  {
    id: "announcements",
    href: "/announcements",
    labelKey: "announcementsCta",
    group: "more",
    show: ({ flags }) => flags.announcements,
  },
  {
    id: "surveys",
    href: "/surveys",
    labelKey: "surveysCta",
    group: "more",
    match: "prefix",
    show: ({ flags }) => flags.surveys,
  },
  {
    id: "courses",
    href: "/courses",
    labelKey: "coursesCta",
    group: "primary",
    match: "prefix",
    show: ({ flags }) => flags.elearning,
  },
  {
    id: "assessments",
    href: "/assessments",
    labelKey: "assessmentsCta",
    group: "more",
    show: ({ flags, role }) => flags.elearning && role === "assessor",
  },
  {
    id: "training-sessions",
    href: "/training-sessions",
    labelKey: "trainingSessionsCta",
    group: "more",
    match: "prefix",
    show: ({ flags, role }) => flags.elearning && flags.course_sessions && role === "assessor",
  },
  {
    id: "forum",
    href: "/forum",
    labelKey: "forumCta",
    group: "more",
    match: "prefix",
    show: ({ flags }) => flags.forum,
  },
  {
    id: "flipcharts",
    href: "/flipcharts",
    labelKey: "flipchartsCta",
    group: "more",
    match: "prefix",
    show: ({ flags }) => flags.flipcharts,
  },
  {
    id: "designer-flipcharts",
    href: "/designer/flipcharts",
    labelKey: "designerFlipchartsCta",
    group: "more",
    show: ({ flags, role }) => flags.flipcharts && role === "designer",
  },
  {
    id: "settings",
    href: "/settings",
    labelKey: "settingsCta",
    group: "more",
    show: () => true,
  },
  {
    id: "admin-users",
    href: "/admin/dashboard",
    labelKey: "adminConsoleCta",
    group: "admin",
    match: "prefix",
    show: ({ role }) => role === "admin",
  },
];

export function getNavItems(ctx: NavContext): NavItem[] {
  return NAV_ITEM_DEFS.filter((item) => item.show(ctx)).map(
    ({ id, href, labelKey, group, match, variant }) => ({ id, href, labelKey, group, match, variant }),
  );
}
