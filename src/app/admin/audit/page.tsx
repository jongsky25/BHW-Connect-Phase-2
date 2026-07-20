import { getLocale, getTranslations } from "next-intl/server";
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
  const { data: events } = await supabase
    .from("audit_events")
    .select("id, event_type, plain_summary_fil, plain_summary_en, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const locale = await getLocale();
  const t = await getTranslations("admin.audit");
  const rows = (events ?? []) as AuditEventRow[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>

      {rows.length === 0 ? (
        <p className="text-ink/70">{t("empty")}</p>
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
