import { getTranslations } from "next-intl/server";
import { DashboardRangePicker } from "@/components/admin/dashboard-range-picker";
import { DashboardTabs, type DashboardTab } from "@/components/admin/dashboard-tabs";
import { getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const flags = await getRequestFeatureFlags();
  const t = await getTranslations("admin.dashboard");

  const tabs: DashboardTab[] = [
    { key: "activity", href: "/admin/dashboard", label: t("tabActivity") },
    { key: "chat-guide", href: "/admin/dashboard/chat-guide", label: t("tabChatGuide") },
  ];
  if (flags.reports_export) {
    tabs.push({ key: "reports", href: "/admin/dashboard/reports", label: t("tabReports") });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <DashboardTabs tabs={tabs} />
        <DashboardRangePicker />
      </div>
      {children}
    </div>
  );
}
