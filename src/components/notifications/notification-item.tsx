import Link from "next/link";
import type { Notification } from "@/lib/notifications/types";

type Props = {
  notification: Notification;
  locale: string;
};

export function NotificationItem({ notification, locale }: Props) {
  const title = locale === "en" ? notification.title_en : notification.title_fil;
  const body = locale === "en" ? notification.body_en : notification.body_fil;
  const postedAt = new Date(notification.created_at).toLocaleDateString(locale === "en" ? "en-US" : "fil-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const content = (
    <article className="flex flex-col gap-1 rounded-md border border-ink/10 p-4">
      <div className="flex items-center justify-between gap-3 text-sm text-ink/70">
        <span className="font-medium text-ink">{title}</span>
        <span>{postedAt}</span>
      </div>
      {body ? <p className="whitespace-pre-wrap text-ink/80">{body}</p> : null}
    </article>
  );

  if (!notification.link_path) {
    return content;
  }

  return (
    <Link
      href={notification.link_path}
      className="block rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {content}
    </Link>
  );
}
