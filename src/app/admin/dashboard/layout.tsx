import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { DashboardRangePicker } from "@/components/admin/dashboard-range-picker";
import { getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const flags = await getRequestFeatureFlags();
  const t = await getTranslations("admin.dashboard");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav className="flex flex-wrap gap-4 text-sm font-medium">
          <Link href="/admin/dashboard" className="text-secondary hover:underline">
            {t("tabActivity")}
          </Link>
          <Link href="/admin/dashboard/chat-guide" className="text-secondary hover:underline">
            {t("tabChatGuide")}
          </Link>
          {flags.reports_export ? (
            <Link href="/admin/dashboard/reports" className="text-secondary hover:underline">
              {t("tabReports")}
            </Link>
          ) : null}
        </nav>
        <DashboardRangePicker />
      </div>
      {children}
    </div>
  );
}
