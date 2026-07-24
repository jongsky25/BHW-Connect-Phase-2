"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { mapSurveyRpcError } from "@/lib/surveys/error-messages";
import type { AnswerValue, SurveyQuestion } from "@/lib/surveys/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  surveyId: string;
  questions: SurveyQuestion[];
  locale: string;
};

export function SurveyRespondForm({ surveyId, questions, locale }: Props) {
  const t = useTranslations("surveys");
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleMultiChoice(questionId: string, optionIndex: number) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as number[]) : [];
      const next = current.includes(optionIndex)
        ? current.filter((i) => i !== optionIndex)
        : [...current, optionIndex];
      return { ...prev, [questionId]: next };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const payload = questions.map((q) => ({ question_id: q.id, value: answers[q.id] ?? null }));

      const { error: rpcError } = await supabase.rpc("rpc_survey_respond", {
        p_survey_id: surveyId,
        p_answers: payload,
      });

      if (rpcError) {
        setError(t(mapSurveyRpcError(rpcError.message)));
        return;
      }

      setSubmitted(true);
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return <p className="rounded-md bg-success/10 px-4 py-3 text-ink">{t("thankYou")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      {questions.map((question) => {
        const prompt = locale === "en" ? question.prompt_en : question.prompt_fil;

        return (
          <fieldset key={question.id} className="flex flex-col gap-2 rounded-md border border-ink/10 p-4">
            <legend className="px-1 font-medium text-ink">{prompt}</legend>

            {question.type === "text" ? (
              <textarea
                required
                rows={3}
                value={(answers[question.id] as string) ?? ""}
                onChange={(event) => setAnswer(question.id, event.target.value)}
                className="rounded-md border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            ) : question.type === "rating" ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <label key={score} className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1">
                    <input
                      type="radio"
                      name={`rating-${question.id}`}
                      required
                      checked={answers[question.id] === score}
                      onChange={() => setAnswer(question.id, score)}
                    />
                    {score}
                  </label>
                ))}
              </div>
            ) : question.type === "multi_choice" ? (
              <div className="flex flex-col gap-2">
                {question.options.map((option, index) => (
                  <label key={index} className="flex min-h-[44px] items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Array.isArray(answers[question.id]) && (answers[question.id] as number[]).includes(index)}
                      onChange={() => toggleMultiChoice(question.id, index)}
                    />
                    {locale === "en" ? option.en : option.fil}
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {question.options.map((option, index) => (
                  <label key={index} className="flex min-h-[44px] items-center gap-2">
                    <input
                      type="radio"
                      name={`choice-${question.id}`}
                      required
                      checked={answers[question.id] === index}
                      onChange={() => setAnswer(question.id, index)}
                    />
                    {locale === "en" ? option.en : option.fil}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        );
      })}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-primary px-6 py-3 font-medium text-canvas disabled:opacity-60"
      >
        {loading ? t("submitting") : t("submitAction")}
      </button>
    </form>
  );
}
