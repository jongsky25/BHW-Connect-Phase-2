"use client";

import { useTranslations } from "next-intl";
import type { Announcement } from "@/lib/announcements/types";

type Props = {
  announcement: Announcement;
  locale: string;
  canModerate: boolean;
  onDeleted?: (id: string) => void;
};

export function AnnouncementCard({ announcement, locale, canModerate, onDeleted }: Props) {
  const t = useTranslations("announcements");
  const body = locale === "en" ? announcement.body_en : announcement.body_fil;
  const postedAt = new Date(announcement.created_at).toLocaleDateString(locale === "en" ? "en-US" : "fil-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="flex flex-col gap-3 rounded-md border border-ink/10 p-4">
      <div className="flex items-center justify-between gap-3 text-sm text-ink/70">
        <span>
          {announcement.org_units?.name ?? "—"}
          {announcement.users?.full_name ? ` · ${announcement.users.full_name}` : ""}
        </span>
        <span>{postedAt}</span>
      </div>

      <p className="whitespace-pre-wrap text-ink">{body}</p>

      {announcement.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-authored announcement image, no known dimensions to optimize for
        <img
          src={announcement.image_url}
          alt=""
          className="max-h-96 w-full rounded-md border border-ink/10 object-cover"
        />
      ) : null}

      {announcement.link_url ? (
        <a
          href={announcement.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-secondary underline"
        >
          {announcement.link_url}
        </a>
      ) : null}

      {canModerate ? (
        <button
          type="button"
          onClick={() => onDeleted?.(announcement.id)}
          className="self-start text-sm font-medium text-danger underline"
        >
          {t("deleteAction")}
        </button>
      ) : null}
    </article>
  );
}
