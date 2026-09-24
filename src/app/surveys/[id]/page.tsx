import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SurveyRespondForm } from "@/components/surveys/survey-respond-form";
import type { SurveyQuestion } from "@/lib/surveys/types";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function SurveyRespondPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, title_fil, title_en, description_fil, description_en, status")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!survey) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("survey_questions")
    .select("id, survey_id, position, type, prompt_fil, prompt_en, options")
    .eq("survey_id", id)
    .order("position")
    .returns<SurveyQuestion[]>();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: tCrumbs("home"), href: "/home" },
          { label: t("heading"), href: "/surveys" },
          { label: locale === "en" ? survey.title_en : survey.title_fil },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {locale === "en" ? survey.title_en : survey.title_fil}
        </h1>
        {(locale === "en" ? survey.description_en : survey.description_fil) ? (
          <p className="mt-1 text-ink/70">{locale === "en" ? survey.description_en : survey.description_fil}</p>
        ) : null}
      </div>

      {(questions ?? []).length === 0 ? (
        <p className="text-ink/70">{t("empty")}</p>
      ) : (
        <SurveyRespondForm surveyId={survey.id} questions={questions ?? []} locale={locale} />
      )}
    </div>
  );
}
