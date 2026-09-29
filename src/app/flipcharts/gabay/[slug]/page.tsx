import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { GabayViewer } from "@/components/flipcharts/gabay-viewer";
import { gabayCharts } from "@/lib/flipcharts/gabay-charts";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function GabayFlipchartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chart = gabayCharts.find((candidate) => candidate.slug === slug);
  if (!chart) notFound();
  const [{ data: { user } }, flags, locale] = await Promise.all([getRequestAuthUser(), getRequestFeatureFlags(), getLocale()]);
  if (!user) redirect("/login");
  const appUser = await getRequestAppUser(user.id);
  if (!appUser) redirect("/login");
  if (appUser.role !== "admin" && (!flags.flipcharts || chart.review !== "approved")) notFound();
  return <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
    <Breadcrumbs items={[{ label: locale === "en" ? "Home" : "Home", href: "/home" },
      { label: locale === "en" ? "Flip Charts" : "Mga Flip Chart", href: "/flipcharts" },
      { label: chart.title[locale === "en" ? "en" : "fil"] }]} />
    <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{chart.title[locale === "en" ? "en" : "fil"]}</h1>
    <GabayViewer chart={chart} initialLocale={locale} />
  </div>;
}
