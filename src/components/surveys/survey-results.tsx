import { getTranslations } from "next-intl/server";
import { summarizeAnswers } from "@/lib/surveys/tally";
import type { AnswerValue, SurveyQuestion } from "@/lib/surveys/types";

type Props = {
  questions: SurveyQuestion[];
  answersByQuestion: Record<string, AnswerValue[]>;
  respondentCount: number;
  isAnonymous: boolean;
  locale: string;
};

export async function SurveyResults({ questions, answersByQuestion, respondentCount, isAnonymous, locale }: Props) {
  const t = await getTranslations("admin.surveys");

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink/70">
        {t("respondentCount", { count: respondentCount })}
        {isAnonymous ? ` · ${t("anonymousBadge")}` : ""}
      </p>

      {questions.map((question) => {
        const summary = summarizeAnswers(question, answersByQuestion[question.id] ?? []);
        const prompt = locale === "en" ? question.prompt_en : question.prompt_fil;

        return (
          <div key={question.id} className="flex flex-col gap-2 rounded-md border border-ink/10 p-4">
            <p className="font-medium text-ink">{prompt}</p>

            {question.type === "text" ? (
              summary.textAnswers.length === 0 ? (
                <p className="text-sm text-ink/50">{t("noResponsesYet")}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {summary.textAnswers.map((answer, index) => (
                    <li key={index} className="text-sm text-ink">
                      “{answer}”
                    </li>
                  ))}
                </ul>
              )
            ) : question.type === "rating" ? (
              <div className="flex flex-col gap-1">
                {[1, 2, 3, 4, 5].map((score) => (
                  <div key={score} className="flex items-center gap-2 text-sm text-ink">
                    <span className="w-4">{score}</span>
                    <span className="text-ink/70">
                      {summary.tally[score] ?? 0} {t("responsesUnit")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-ink">
                    <span>{locale === "en" ? option.en : option.fil}</span>
                    <span className="text-ink/70">
                      — {summary.tally[index] ?? 0} {t("responsesUnit")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
