import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

type SurveyRow = {
  id: string;
  title_fil: string;
  title_en: string;
  description_fil: string;
  description_en: string;
};

export default async function SurveysPage() {
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.surveys) {
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

  const t = await getTranslations("surveys");
  const tCrumbs = await getTranslations("breadcrumbs");
  const locale = await getLocale();

  const { data: surveys } = await supabase
    .from("surveys")
    .select("id, title_fil, title_en, description_fil, description_en")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .returns<SurveyRow[]>();

  const rows = surveys ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: tCrumbs("home"), href: "/home" }, { label: t("heading") }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>
        <p className="mt-1 text-ink/70">{t("intro")}</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
          {rows.map((survey) => (
            <li key={survey.id}>
              <Link
                href={`/surveys/${survey.id}`}
                className="flex min-h-[44px] flex-col gap-1 px-4 py-3 hover:bg-ink/5"
              >
                <span className="font-medium text-ink">
                  {locale === "en" ? survey.title_en : survey.title_fil}
                </span>
                {(locale === "en" ? survey.description_en : survey.description_fil) ? (
                  <span className="text-sm text-ink/70">
                    {locale === "en" ? survey.description_en : survey.description_fil}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
