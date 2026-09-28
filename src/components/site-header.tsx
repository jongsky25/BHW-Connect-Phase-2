import { useTranslations } from "next-intl";
import Link from "next/link";
import { EquityMark } from "@/components/brand/equity-mark";
import { LanguageToggle } from "@/components/language-toggle";
import { MobileDrawer } from "@/components/nav/mobile-drawer";
import { MoreMenu } from "@/components/nav/more-menu";
import { NavLink } from "@/components/nav/nav-link";
import { UserMenu } from "@/components/nav/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { GlobalSearch } from "@/components/search/global-search";
import type { FeatureFlags } from "@/lib/flags/types";
import { getNavItems } from "@/lib/nav/nav-items";
import type { A11ySettings } from "@/lib/settings/types";
import type { AppUser } from "@/lib/supabase/app-user";
import { QuickDisplayPopover } from "./nav/quick-display-popover";

type Props = {
  signedIn: boolean;
  account: { username: string; role: AppUser["role"] } | null;
  notificationsEnabled: boolean;
  notifUnreadCount: number;
  flags: FeatureFlags;
  initialA11y: A11ySettings;
};

export function SiteHeader({ signedIn, account, notificationsEnabled, notifUnreadCount, flags, initialA11y }: Props) {
  const t = useTranslations("common");
  const tNav = useTranslations("authHome");

  // Signed-out visitors never see the app's feature nav — only the app name
  // and the language toggle, unchanged from before this increment.
  const navItems = signedIn && account ? getNavItems({ role: account.role, flags }) : [];
  const primaryItems = navItems.filter((item) => item.group === "primary");
  const moreItems = navItems.filter((item) => item.group === "more" || item.group === "admin");

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2 md:gap-6">
          {signedIn && account ? (
            <MobileDrawer
              account={account}
              items={navItems}
              labels={Object.fromEntries(navItems.map((item) => [item.id, tNav(item.labelKey)]))}
              initialA11y={initialA11y}
            />
          ) : null}
          <Link prefetch={false}
            href={signedIn ? "/home" : "/"}
            className="flex items-center gap-2 whitespace-nowrap rounded-md text-lg font-semibold text-primary-text hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <EquityMark size="sm" decorative />
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
          {signedIn && account ? <GlobalSearch /> : null}
          {notificationsEnabled ? <NotificationBell unreadCount={notifUnreadCount} /> : null}
          {/* Mobile gets the same controls inline in the drawer's "Display"
              section instead (see MobileDrawer) — a separate popover there
              would just be a second, harder-to-reach way to the same thing. */}
          <div className="hidden md:block">
            <QuickDisplayPopover initialA11y={initialA11y} signedIn={signedIn} />
          </div>
          {signedIn && account ? <UserMenu account={account} /> : <LanguageToggle signedIn={signedIn} compact />}
        </div>
      </div>
    </header>
  );
}
