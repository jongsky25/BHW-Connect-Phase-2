"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VisibilityActions, VisibilityBadge, VisibilityTabs } from "@/components/admin/content-visibility";
import { EmptyState } from "@/components/empty-state";
import { mapAnnouncementRpcError } from "@/lib/announcements/error-messages";
import type { Announcement } from "@/lib/announcements/types";
import { createClient } from "@/lib/supabase/client";
import { AnnouncementCard } from "./announcement-card";
import { AnnouncementForm } from "./announcement-form";
import type { OrgUnitNode } from "@/lib/org-units";

type Props = {
  announcements: Announcement[];
  view: "active" | "archived";
  activeCount: number;
  archivedCount: number;
  rootOrgUnit: OrgUnitNode;
  locale: string;
};

export function AnnouncementsConsole({
  announcements,
  view,
  activeCount,
  archivedCount,
  rootOrgUnit,
  locale,
}: Props) {
  const t = useTranslations("admin.announcements");
  const tAnnouncements = useTranslations("announcements");
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("heading")} />

      <AnnouncementForm rootOrgUnit={rootOrgUnit} onCreated={() => router.refresh()} />

      <VisibilityTabs
        basePath="/admin/announcements"
        view={view}
        activeCount={activeCount}
        archivedCount={archivedCount}
      />

      {announcements.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              locale={locale}
              actions={
                <div className="flex items-center gap-2">
                  <VisibilityBadge hidden_at={announcement.hidden_at} archived_at={announcement.archived_at} />
                  <VisibilityActions
                    contentType="announcement"
                    id={announcement.id}
                    hidden_at={announcement.hidden_at}
                    archived_at={announcement.archived_at}
                    extraActions={[
                      {
                        key: "delete",
                        label: tAnnouncements("deleteAction"),
                        confirm: {
                          message: tAnnouncements("confirmDelete"),
                          confirmLabel: tAnnouncements("deleteAction"),
                        },
                        danger: true,
                        run: async () => {
                          const supabase = createClient();
                          const { error: rpcError } = await supabase.rpc("rpc_announcement_delete", {
                            p_announcement_id: announcement.id,
                          });
                          if (rpcError) {
                            return { error: t(mapAnnouncementRpcError(rpcError.message)) };
                          }
                        },
                      },
                    ]}
                  />
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
