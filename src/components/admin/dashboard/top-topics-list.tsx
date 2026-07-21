import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import type { DashboardTopTopic } from "@/lib/dashboard/types";

export async function TopTopicsList({ topics }: { topics: DashboardTopTopic[] }) {
  const t = await getTranslations("admin.dashboard.chatGuide");
  const locale = await getLocale();

  if (topics.length === 0) {
    return <EmptyState message={t("topTopicsEmpty")} />;
  }

  return (
    <ol className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
      {topics.map((topic) => (
        <li key={topic.entry_id} className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm text-ink">{locale === "en" ? topic.question_en : topic.question_fil}</span>
          <span className="shrink-0 text-sm font-medium text-ink/70">
            {topic.match_count} {t("colMatches")}
          </span>
        </li>
      ))}
    </ol>
  );
}
