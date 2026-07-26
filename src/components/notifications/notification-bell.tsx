import { useTranslations } from "next-intl";
import Link from "next/link";

type Props = {
  unreadCount: number;
};

export function NotificationBell({ unreadCount }: Props) {
  const t = useTranslations("notifications");
  const label = unreadCount > 0 ? t("bellAriaLabelUnread", { count: unreadCount }) : t("bellAriaLabel");

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="relative rounded-md p-2 text-ink hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 12.5 6 8Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      {unreadCount > 0 ? (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-canvas"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
