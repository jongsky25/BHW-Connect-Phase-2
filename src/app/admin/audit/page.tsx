import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";

type AuditEventRow = {
  id: string;
  event_type: string;
  plain_summary_fil: string;
  plain_summary_en: string;
  created_at: string;
};

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("audit_events")
    .select("id, event_type, plain_summary_fil, plain_summary_en, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  // A timeout or permission failure is not an empty audit trail. Let the
  // existing error boundary report the failure and offer a retry.
  if (error) {
    throw new Error("Failed to load audit events", { cause: error });
  }

  const locale = await getLocale();
  const t = await getTranslations("admin.audit");
  const rows = (events ?? []) as AuditEventRow[];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("heading")} />

      {rows.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
          {rows.map((event) => (
            <li key={event.id} className="flex flex-col gap-1 px-4 py-3">
              <p className="text-sm text-ink">
                {locale === "en" ? event.plain_summary_en : event.plain_summary_fil}
              </p>
              <p className="text-xs text-ink/50">
                {event.event_type} · {new Date(event.created_at).toLocaleString(locale)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
