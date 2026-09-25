import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

type FlipChartRow = {
  id: string;
  title_fil: string;
  title_en: string;
};

export default async function FlipchartsPage() {
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.flipcharts) {
    redirect("/home");
  }

  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getRequestAppUser(user.id);
  if (!appUser) {
    redirect("/login");
  }

  const t = await getTranslations("flipcharts");
  const tCrumbs = await getTranslations("breadcrumbs");

  const { data: charts } = await supabase
    .from("flip_charts")
    .select("id, title_fil, title_en")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .returns<FlipChartRow[]>();

  const rows = charts ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: tCrumbs("home"), href: "/home" }, { label: t("heading") }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>
        <p className="mt-1 text-ink/70">{t("intro")}</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
          {rows.map((chart) => (
            <li key={chart.id}>
              <Link
                href={`/flipcharts/${chart.id}`}
                className="flex min-h-[44px] items-center px-4 py-3 font-medium text-ink hover:bg-ink/5"
              >
                {chart.title_en}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
