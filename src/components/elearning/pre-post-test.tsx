"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { mapElearningRpcError } from "@/lib/elearning/error-messages";
import type {
  CourseTestAttempt,
  CourseTestQuestion,
  TestPhase,
} from "@/lib/elearning/types";
import { createClient } from "@/lib/supabase/client";

type ScoreAttempt = Pick<CourseTestAttempt, "phase" | "score_percent">;

// INC-19 pretest/posttest measurement, INC-22 UI. One code path for
// enrolled-in-a-session vs. solo — the only branch is which sessionId value
// (or null) gets passed to rpc_course_test_submit.
export function TestScores({
  pretestAttempt,
  posttestAttempt,
}: {
  pretestAttempt: ScoreAttempt | null;
  posttestAttempt: ScoreAttempt | null;
}) {
  const t = useTranslations("training");

  if (!pretestAttempt && !posttestAttempt) {
    return null;
  }

  const delta =
    pretestAttempt && posttestAttempt
      ? Math.round(
          (posttestAttempt.score_percent - pretestAttempt.score_percent) * 10,
        ) / 10
      : null;

  return (
    <div className="flex flex-col gap-1 rounded-md border border-info/40 bg-info/5 p-4 text-sm text-ink">
      {pretestAttempt ? (
        <p>
          {t("pretestScoreMessage", { score: pretestAttempt.score_percent })}
        </p>
      ) : null}
      {posttestAttempt ? (
        <p>
          {t("posttestScoreMessage", { score: posttestAttempt.score_percent })}
        </p>
      ) : null}
      {delta !== null ? (
        <p className="font-medium">{t("scoreDeltaMessage", { delta })}</p>
      ) : null}
    </div>
  );
}

type TestFormProps = {
  courseId: string;
  phase: TestPhase;
  sessionId: string | null;
  questions: CourseTestQuestion[];
  locale: string;
  onSubmitted: (attempt: { phase: TestPhase; score_percent: number }) => void;
};

export function TestForm({
  courseId,
  phase,
  sessionId,
  questions,
  locale,
  onSubmitted,
}: TestFormProps) {
  const t = useTranslations("training");
  const tc = useTranslations("courses");
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (Object.keys(answers).length < questions.length) {
      setError(t("requiredFieldError"));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const payload = questions.map((q) => ({
        question_id: q.id,
        selected_option_index: answers[q.id] ?? -1,
      }));

      const { data, error: rpcError } = await supabase.rpc(
        "rpc_course_test_submit",
        {
          p_course_id: courseId,
          p_phase: phase,
          p_answers: payload,
          p_session_id: sessionId,
        },
      );

      if (rpcError) {
        setError(tc(mapElearningRpcError(rpcError.message)));
        return;
      }

      const row = (data as Array<{ score_percent: number }> | null)?.[0];
      if (!row) {
        setError(tc("genericError"));
        return;
      }

      onSubmitted({ phase, score_percent: row.score_percent });
      router.refresh();
    } catch {
      setError(tc("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-md border border-primary-text/30 bg-primary/5 p-4"
      noValidate
    >
      <div>
        <h2 className="font-medium text-ink">
          {t(phase === "pretest" ? "pretestHeading" : "posttestHeading")}
        </h2>
        <p className="text-sm text-ink/70">
          {t(phase === "pretest" ? "pretestIntro" : "posttestIntro")}
        </p>
      </div>

      {questions.map((question) => {
        const prompt =
          locale === "en" ? question.prompt_en : question.prompt_fil;
        return (
          <fieldset key={question.id} className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink">{prompt}</legend>
            <div className="flex flex-col gap-1">
              {question.options.map((option, index) => (
                <label
                  key={index}
                  className="flex min-h-[44px] items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="radio"
                    name={`test-${phase}-${question.id}`}
                    checked={answers[question.id] === index}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [question.id]: index }))
                    }
                  />
                  {locale === "en" ? option.en : option.fil}
                </label>
              ))}
            </div>
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
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
      >
        {loading ? t("testSubmitting") : t("testSubmitAction")}
      </button>
    </form>
  );
}
