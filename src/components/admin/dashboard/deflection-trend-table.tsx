import { getTranslations } from "next-intl/server";
import type { DashboardTrendPoint } from "@/lib/dashboard/types";

export async function DeflectionTrendTable({ points }: { points: DashboardTrendPoint[] }) {
  const t = await getTranslations("admin.dashboard.chatGuide");

  if (points.length === 0) {
    return <p className="text-ink/70">{t("deflectionTrendEmpty")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-ink/10">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead className="bg-ink/5">
          <tr>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
              {t("colDate")}
            </th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
              {t("colAsked")}
            </th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
              {t("colAnswered")}
            </th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
              {t("colDeflectionRate")}
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.bucket_date} className="border-b border-ink/10">
              <td className="px-3 py-3 text-sm text-ink">{point.bucket_date}</td>
              <td className="px-3 py-3 text-sm text-ink">{point.asked_count}</td>
              <td className="px-3 py-3 text-sm text-ink">{point.answered_count}</td>
              <td className="px-3 py-3 text-sm text-ink">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-ink/10" aria-hidden="true">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.round(point.deflection_rate * 100)}%` }}
                    />
                  </div>
                  <span>{Math.round(point.deflection_rate * 100)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
