import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FlipchartViewer } from "@/components/flipcharts/flipchart-viewer";
import type { FlipChartPage } from "@/lib/flipcharts/types";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

type FlipChartRow = {
  id: string;
  title_fil: string;
  title_en: string;
  status: string;
};

export default async function FlipchartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: chart } = await supabase
    .from("flip_charts")
    .select("id, title_fil, title_en, status")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle<FlipChartRow>();

  if (!chart) {
    notFound();
  }

  const { data: pages } = await supabase
    .from("flip_chart_pages")
    .select("id, flip_chart_id, position, client_image_url, client_caption_fil, client_caption_en, script_fil, script_en")
    .eq("flip_chart_id", id)
    .order("position")
    .returns<FlipChartPage[]>();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: tCrumbs("home"), href: "/home" },
          { label: t("heading"), href: "/flipcharts" },
          { label: chart.title_en },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{chart.title_en}</h1>
      {pages && pages.length > 0 ? (
        <FlipchartViewer pages={pages} />
      ) : (
        <p className="text-ink/70">{t("empty")}</p>
      )}
    </div>
  );
}
