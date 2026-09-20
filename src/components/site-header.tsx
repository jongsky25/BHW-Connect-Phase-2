import { useTranslations } from "next-intl";
import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";

type Props = {
  signedIn: boolean;
  notificationsEnabled: boolean;
  notifUnreadCount: number;
};

export function SiteHeader({ signedIn, notificationsEnabled, notifUnreadCount }: Props) {
  const t = useTranslations("common");

  return (
    <header className="border-b border-ink/10 bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href={signedIn ? "/home" : "/"}
          className="rounded-md text-lg font-semibold text-primary-text hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t("appName")}
        </Link>
        <div className="flex items-center gap-3">
          {notificationsEnabled ? <NotificationBell unreadCount={notifUnreadCount} /> : null}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
