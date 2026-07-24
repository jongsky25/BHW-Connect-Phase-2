"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { mapAnnouncementRpcError } from "@/lib/announcements/error-messages";
import type { Announcement } from "@/lib/announcements/types";
import { createClient } from "@/lib/supabase/client";
import { AnnouncementCard } from "./announcement-card";
import { AnnouncementForm } from "./announcement-form";

type OrgUnitOption = { id: string; name: string; level: string };

type Props = {
  initialAnnouncements: Announcement[];
  orgUnits: OrgUnitOption[];
  defaultOrgUnitId: string;
  locale: string;
};

export function AnnouncementsConsole({ initialAnnouncements, orgUnits, defaultOrgUnitId, locale }: Props) {
  const t = useTranslations("admin.announcements");
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("rpc_announcement_delete", { p_announcement_id: id });

    if (rpcError) {
      setError(t(mapAnnouncementRpcError(rpcError.message)));
      return;
    }

    setAnnouncements((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>

      <AnnouncementForm
        orgUnits={orgUnits}
        defaultOrgUnitId={defaultOrgUnitId}
        onCreated={(announcement) => setAnnouncements((prev) => [announcement, ...prev])}
      />

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {announcements.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              locale={locale}
              canModerate
              onDeleted={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
