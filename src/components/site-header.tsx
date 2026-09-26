import { useTranslations } from "next-intl";
import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { MoreMenu } from "@/components/nav/more-menu";
import { NavLink } from "@/components/nav/nav-link";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { FeatureFlags } from "@/lib/flags/types";
import { getNavItems } from "@/lib/nav/nav-items";
import type { AppUser } from "@/lib/supabase/app-user";

type Props = {
  signedIn: boolean;
  account: { username: string; role: AppUser["role"] } | null;
  notificationsEnabled: boolean;
  notifUnreadCount: number;
  flags: FeatureFlags;
};

export function SiteHeader({ signedIn, account, notificationsEnabled, notifUnreadCount, flags }: Props) {
  const t = useTranslations("common");
  const tNav = useTranslations("authHome");

  // Signed-out visitors never see the app's feature nav — only the app name
  // and the language toggle, unchanged from before this increment.
  const navItems = signedIn && account ? getNavItems({ role: account.role, flags }) : [];
  const primaryItems = navItems.filter((item) => item.group === "primary");
  const moreItems = navItems.filter((item) => item.group === "more" || item.group === "admin");

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href={signedIn ? "/home" : "/"}
            className="rounded-md text-lg font-semibold text-primary-text hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t("appName")}
          </Link>
          {primaryItems.length > 0 ? (
            <nav aria-label={t("primaryNavLabel")} className="hidden items-center gap-1 md:flex">
              {primaryItems.map((item) => (
                <NavLink key={item.id} item={item} label={tNav(item.labelKey)} />
              ))}
              {moreItems.length > 0 ? (
                <MoreMenu
                  items={moreItems}
                  labels={Object.fromEntries(moreItems.map((item) => [item.id, tNav(item.labelKey)]))}
                  triggerLabel={t("moreLabel")}
                />
              ) : null}
            </nav>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {signedIn && account ? (
            <div
              aria-label={t("signedInAs", { username: account.username, role: t(`role.${account.role}`) })}
              className="flex min-w-0 max-w-[15rem] items-center gap-2 rounded-full border border-ink/15 bg-ink/5 px-3 py-1.5 text-xs sm:max-w-[20rem] sm:text-sm"
            >
              <span className="truncate font-medium" title={account.username}>{account.username}</span>
              <span aria-hidden="true" className="shrink-0 text-ink/40">·</span>
              <span className="shrink-0 text-ink/70">{t(`role.${account.role}`)}</span>
            </div>
          ) : null}
          {notificationsEnabled ? <NotificationBell unreadCount={notifUnreadCount} /> : null}
          <LanguageToggle signedIn={signedIn} />
        </div>
      </div>
    </header>
  );
}
