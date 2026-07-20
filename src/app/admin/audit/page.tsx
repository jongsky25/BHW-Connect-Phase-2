import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AuditFilter } from "./audit-filter";

interface AuditRow {
  id: string;
  event_type: string;
  plain_summary_fil: string;
  plain_summary_en: string;
  created_at: string;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const { event } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("audit_events")
    .select("id, event_type, plain_summary_fil, plain_summary_en, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (event) {
    query = query.eq("event_type", event);
  }

  const [{ data: events }, { data: eventTypeRows }] = await Promise.all([
    query.returns<AuditRow[]>(),
    supabase.from("audit_events").select("event_type").order("event_type"),
  ]);

  const eventTypes = Array.from(new Set((eventTypeRows ?? []).map((row) => row.event_type)));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("auditHeading")}</h1>
        <AuditFilter eventTypes={eventTypes} selected={event} />
      </div>

      <ul className="flex flex-col gap-3">
        {!events || events.length === 0 ? (
          <li className="text-ink/60">{t("auditEmpty")}</li>
        ) : (
          events.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-ink/10 p-3">
              <p className="text-ink">{locale === "en" ? entry.plain_summary_en : entry.plain_summary_fil}</p>
              <p className="mt-1 text-xs text-ink/50">
                {new Date(entry.created_at).toLocaleString(locale === "en" ? "en-PH" : "fil-PH")}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
