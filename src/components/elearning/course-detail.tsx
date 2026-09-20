"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LessonModule, type LessonPosition } from "@/components/elearning/lesson-module";
import { LessonSlides } from "@/components/elearning/lesson-slides";
import { TestForm, TestScores } from "@/components/elearning/pre-post-test";
import { mapElearningRpcError } from "@/lib/elearning/error-messages";
import type {
  CourseModule,
  CourseModuleVisual,
  CourseProgressStatus,
  CourseTestAttempt,
  CourseTestQuestion,
  LessonDensity,
  ModuleProgress,
  QuizQuestion,
} from "@/lib/elearning/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  courseId: string;
  quizMaxAttempts: number;
  modules: CourseModule[];
  questions: QuizQuestion[];
  visuals: CourseModuleVisual[];
  testQuestions: CourseTestQuestion[];
  testAttempts: CourseTestAttempt[];
  density: LessonDensity;
  sessionId: string | null;
  progressStatus: CourseProgressStatus | null;
  moduleProgress: ModuleProgress[];
  certificateCode: string | null;
  locale: string;
};

export function CourseDetail({
  courseId,
  quizMaxAttempts,
  modules,
  questions,
  visuals,
  testQuestions,
  testAttempts: initialTestAttempts,
  density,
  sessionId,
  progressStatus,
  moduleProgress,
  certificateCode,
  locale,
}: Props) {
  const t = useTranslations("courses");
  const tt = useTranslations("training");
  const router = useRouter();
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // INC-26: Basahin/Islide is a per-module toggle, not a page-level one —
  // each module.map() row owns its own view and reading position, keyed by
  // module id, so switching one module's renderer never touches another's.
  const [moduleView, setModuleView] = useState<Record<string, "read" | "slides">>(
    {},
  );
  const [modulePosition, setModulePosition] = useState<
    Record<string, LessonPosition>
  >({});
  const [quizResult, setQuizResult] = useState<
    Record<string, { passed: boolean; score: number; attemptsLeft: number }>
  >({});
  const [testAttempts, setTestAttempts] = useState<
    Array<Pick<CourseTestAttempt, "phase" | "score_percent">>
  >(
    initialTestAttempts.map(({ phase, score_percent }) => ({
      phase,
      score_percent,
    })),
  );

  function handleTestSubmitted(attempt: {
    phase: "pretest" | "posttest";
    score_percent: number;
  }) {
    setTestAttempts((prev) => [
      ...prev.filter((a) => a.phase !== attempt.phase),
      attempt,
    ]);
  }

  const pretestAttempt =
    testAttempts.find((a) => a.phase === "pretest") ?? null;
  const posttestAttempt =
    testAttempts.find((a) => a.phase === "posttest") ?? null;
  const hasTestBank = testQuestions.length > 0;
  const pretestRequired = hasTestBank && !pretestAttempt;

  function progressFor(moduleId: string) {
    return moduleProgress.find((p) => p.module_id === moduleId) ?? null;
  }

  function setModuleViewFor(moduleId: string, view: "read" | "slides") {
    setModuleView((prev) => ({ ...prev, [moduleId]: view }));
  }

  function setModulePositionFor(moduleId: string, position: LessonPosition) {
    setModulePosition((prev) => ({ ...prev, [moduleId]: position }));
  }

  async function handleModuleComplete(moduleId: string) {
    setError(null);
    setPendingModuleId(moduleId);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc(
        "rpc_course_module_complete",
        {
          p_course_id: courseId,
          p_module_id: moduleId,
        },
      );

      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }

      router.refresh();
    } finally {
      setPendingModuleId(null);
    }
  }

  if (progressStatus === "certified") {
    return (
      <div className="rounded-md border border-success/40 bg-success/5 p-4">
        <p className="font-medium text-success">{t("status.certified")}</p>
        {certificateCode ? (
          <div className="mt-2 flex flex-wrap gap-4">
            <Link
              href={`/certificates/${certificateCode}`}
              className="text-sm font-medium text-secondary underline"
            >
              {t("viewCertificateAction")}
            </Link>
            <a
              href={`/api/certificates/${certificateCode}/pdf`}
              className="text-sm font-medium text-secondary underline"
            >
              {t("downloadPdfAction")}
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  if (progressStatus === "failed_assessment") {
    return (
      <div className="rounded-md border border-danger/40 bg-danger/5 p-4">
        <p className="font-medium text-danger">
          {t("status.failed_assessment")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {progressStatus === "content_completed" ? (
        <div className="rounded-md border border-info/40 bg-info/5 p-4">
          <p className="font-medium text-info">
            {t("status.content_completed")}
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {hasTestBank ? (
        <TestScores
          pretestAttempt={pretestAttempt}
          posttestAttempt={posttestAttempt}
        />
      ) : null}

      {pretestRequired ? (
        <TestForm
          courseId={courseId}
          phase="pretest"
          sessionId={sessionId}
          questions={testQuestions}
          locale={locale}
          onSubmitted={handleTestSubmitted}
        />
      ) : (
        <>
          {modules.map((module) => {
            const title = locale === "en" ? module.title_en : module.title_fil;
            const mProgress = progressFor(module.id);
            const isDone = mProgress?.completed_at != null;

            return (
              <div
                key={module.id}
                className="flex flex-col gap-3 rounded-md border border-ink/10 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-medium text-ink">{title}</h2>

                  {module.type === "text" && module.lesson ? (
                    <div className="inline-flex overflow-hidden rounded-full border border-ink/15 text-sm">
                      {(["read", "slides"] as const).map((view) => (
                        <button
                          key={view}
                          type="button"
                          aria-pressed={(moduleView[module.id] ?? "read") === view}
                          onClick={() => setModuleViewFor(module.id, view)}
                          className={`px-3 py-1 font-medium transition-colors ${
                            (moduleView[module.id] ?? "read") === view
                              ? "bg-primary text-on-primary"
                              : "bg-transparent text-ink hover:bg-ink/5"
                          }`}
                        >
                          {view === "read" ? tt("readModeLabel") : tt("slideModeLabel")}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {module.type === "text" && module.lesson ? (
                  (moduleView[module.id] ?? "read") === "slides" ? (
                    <LessonSlides
                      module={module}
                      visuals={visuals.filter((v) => v.module_id === module.id)}
                      density={density}
                      locale={locale}
                      isDone={isDone}
                      pending={pendingModuleId === module.id}
                      onComplete={() => handleModuleComplete(module.id)}
                      completedLabel={t("completedLabel")}
                      markCompleteLabel={t("markCompleteAction")}
                      initialPosition={modulePosition[module.id]}
                      onPositionChange={(position) =>
                        setModulePositionFor(module.id, position)
                      }
                    />
                  ) : (
                    <LessonModule
                      module={module}
                      visuals={visuals.filter((v) => v.module_id === module.id)}
                      density={density}
                      locale={locale}
                      isDone={isDone}
                      pending={pendingModuleId === module.id}
                      onComplete={() => handleModuleComplete(module.id)}
                      completedLabel={t("completedLabel")}
                      markCompleteLabel={t("markCompleteAction")}
                      initialPosition={modulePosition[module.id]}
                      onPositionChange={(position) =>
                        setModulePositionFor(module.id, position)
                      }
                    />
                  )
                ) : (
                  <>
                    {module.type === "text" ? (
                      <p className="whitespace-pre-wrap text-sm text-ink/80">
                        {locale === "en" ? module.body_en : module.body_fil}
                      </p>
                    ) : null}

                    {module.type === "video" && module.video_url ? (
                      <a
                        href={module.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-secondary underline"
                      >
                        {module.video_url}
                      </a>
                    ) : null}

                    {module.type === "text" || module.type === "video" ? (
                      isDone ? (
                        <span className="self-start rounded-md bg-success/10 px-3 py-1 text-xs font-medium text-success">
                          {t("completedLabel")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={pendingModuleId === module.id}
                          onClick={() => handleModuleComplete(module.id)}
                          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
                        >
                          {t("markCompleteAction")}
                        </button>
                      )
                    ) : null}
                  </>
                )}

                {module.type === "quiz" ? (
                  <QuizForm
                    courseId={courseId}
                    moduleId={module.id}
                    questions={questions.filter(
                      (q) => q.module_id === module.id,
                    )}
                    locale={locale}
                    isDone={isDone}
                    attemptsUsed={mProgress?.quiz_attempts ?? 0}
                    maxAttempts={quizMaxAttempts}
                    lastScore={mProgress?.quiz_score ?? null}
                    result={quizResult[module.id]}
                    onResult={(result) =>
                      setQuizResult((prev) => ({
                        ...prev,
                        [module.id]: result,
                      }))
                    }
                    onSubmitted={() => router.refresh()}
                  />
                ) : null}
              </div>
            );
          })}

          {hasTestBank && pretestAttempt && !posttestAttempt ? (
            progressStatus === "content_completed" ? (
              <TestForm
                courseId={courseId}
                phase="posttest"
                sessionId={sessionId}
                questions={testQuestions}
                locale={locale}
                onSubmitted={handleTestSubmitted}
              />
            ) : (
              <p className="text-sm text-ink/70">
                {tt("posttestLockedMessage")}
              </p>
            )
          ) : null}
        </>
      )}
    </div>
  );
}

type QuizFormProps = {
  courseId: string;
  moduleId: string;
  questions: QuizQuestion[];
  locale: string;
  isDone: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  lastScore: number | null;
  result: { passed: boolean; score: number; attemptsLeft: number } | undefined;
  onResult: (result: {
    passed: boolean;
    score: number;
    attemptsLeft: number;
  }) => void;
  onSubmitted: () => void;
};

function QuizForm({
  courseId,
  moduleId,
  questions,
  locale,
  isDone,
  attemptsUsed,
  maxAttempts,
  lastScore,
  result,
  onResult,
  onSubmitted,
}: QuizFormProps) {
  const t = useTranslations("courses");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attemptsLeft = result?.attemptsLeft ?? maxAttempts - attemptsUsed;
  const noAttemptsLeft = attemptsLeft <= 0;

  if (isDone) {
    return (
      <span className="self-start rounded-md bg-success/10 px-3 py-1 text-xs font-medium text-success">
        {t("completedLabel")} {lastScore != null ? `(${lastScore}%)` : ""}
      </span>
    );
  }

  if (noAttemptsLeft) {
    return (
      <p className="text-sm text-danger">{t("noAttemptsRemainingMessage")}</p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const payload = questions.map((q) => ({
        question_id: q.id,
        selected_option_index: answers[q.id] ?? -1,
      }));

      const { data, error: rpcError } = await supabase.rpc(
        "rpc_course_quiz_submit",
        {
          p_course_id: courseId,
          p_module_id: moduleId,
          p_answers: payload,
        },
      );

      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }

      const row = (
        data as Array<{
          passed: boolean;
          score_percent: number;
          attempts_used: number;
          max_attempts: number;
        }> | null
      )?.[0];
      if (!row) {
        setError(t("genericError"));
        return;
      }

      onResult({
        passed: row.passed,
        score: row.score_percent,
        attemptsLeft: row.max_attempts - row.attempts_used,
      });
      onSubmitted();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {result ? (
        <p
          className={
            result.passed ? "text-sm text-success" : "text-sm text-danger"
          }
        >
          {t(result.passed ? "quizPassedMessage" : "quizFailedMessage", {
            score: result.score,
          })}
          {!result.passed && result.attemptsLeft > 0
            ? ` ${t("attemptsRemainingMessage", { remaining: result.attemptsLeft })}`
            : ""}
        </p>
      ) : null}

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
                    name={`quiz-${question.id}`}
                    required
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
        {loading ? t("quizSubmitting") : t("quizSubmitAction")}
      </button>
    </form>
  );
}
