import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SurveyResults } from "@/components/surveys/survey-results";
import type { AnswerValue, SurveyQuestion } from "@/lib/surveys/types";
import { createClient } from "@/lib/supabase/server";

type AnswerRow = {
  question_id: string;
  value: AnswerValue;
};

export default async function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations("admin.surveys");
  const locale = await getLocale();

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, title_fil, title_en, is_anonymous")
    .eq("id", id)
    .maybeSingle();

  if (!survey) {
    notFound();
  }

  const [{ data: questions }, { data: answers }, { count: respondentCount }] = await Promise.all([
    supabase
      .from("survey_questions")
      .select("id, survey_id, position, type, prompt_fil, prompt_en, options")
      .eq("survey_id", id)
      .order("position")
      .returns<SurveyQuestion[]>(),
    supabase
      .from("survey_answers")
      .select("question_id, value, survey_responses!inner(survey_id)")
      .eq("survey_responses.survey_id", id)
      .returns<AnswerRow[]>(),
    supabase.from("survey_responses").select("id", { count: "exact", head: true }).eq("survey_id", id),
  ]);

  const answersByQuestion: Record<string, AnswerValue[]> = {};
  for (const row of answers ?? []) {
    (answersByQuestion[row.question_id] ??= []).push(row.value);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {locale === "en" ? survey.title_en : survey.title_fil}
      </h1>
      <p className="text-sm text-ink/70">{t("resultsHeading")}</p>

      <SurveyResults
        questions={questions ?? []}
        answersByQuestion={answersByQuestion}
        respondentCount={respondentCount ?? 0}
        isAnonymous={survey.is_anonymous}
        locale={locale}
      />
    </div>
  );
}
