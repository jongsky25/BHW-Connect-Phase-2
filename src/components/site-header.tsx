import { useTranslations } from "next-intl";
import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { AppUser } from "@/lib/supabase/app-user";

type Props = {
  signedIn: boolean;
  account: { username: string; role: AppUser["role"] } | null;
  notificationsEnabled: boolean;
  notifUnreadCount: number;
};

export function SiteHeader({ signedIn, account, notificationsEnabled, notifUnreadCount }: Props) {
  const t = useTranslations("common");

  return (
    <header className="border-b border-ink/10 bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href={signedIn ? "/home" : "/"}
          className="rounded-md text-lg font-semibold text-primary-text hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t("appName")}
        </Link>
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
