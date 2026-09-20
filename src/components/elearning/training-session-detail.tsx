"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Field, inputClass } from "@/components/admin/form-field";
import { mapElearningRpcError } from "@/lib/elearning/error-messages";
import { computeCohortSummary, type SessionTestAttempt } from "@/lib/elearning/session-summary";
import type {
  BhwOption,
  CourseModule,
  CourseModuleFacilitatorNotes,
  CourseModuleVisual,
  CourseSession,
  CourseSessionEnrollment,
  LessonDensity,
} from "@/lib/elearning/types";
import { createClient } from "@/lib/supabase/client";
import { FacilitatorModuleView } from "./facilitator-module-view";

type ProgressRow = { id: string; bhw_user_id: string };
type ModuleProgressRow = { course_progress_id: string; module_id: string; completed_at: string | null };

type Props = {
  session: CourseSession;
  modules: CourseModule[];
  visuals: CourseModuleVisual[];
  facilitatorNotes: CourseModuleFacilitatorNotes[];
  initialEnrollments: CourseSessionEnrollment[];
  courseProgress: ProgressRow[];
  moduleProgress: ModuleProgressRow[];
  testAttempts: SessionTestAttempt[];
  bhwCandidates: BhwOption[];
  locale: string;
};

const DENSITIES: LessonDensity[] = ["short", "normal", "long"];

export function TrainingSessionDetail({
  session,
  modules,
  visuals,
  facilitatorNotes,
  initialEnrollments,
  courseProgress,
  moduleProgress,
  testAttempts,
  bhwCandidates: initialCandidates,
  locale,
}: Props) {
  const t = useTranslations("trainingSessions");
  const tCrumbs = useTranslations("breadcrumbs");
  const [density, setDensity] = useState(session.lesson_density);
  const [status] = useState(session.status);
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedBhwId, setSelectedBhwId] = useState(initialCandidates[0]?.id ?? "");
  const [densityPending, setDensityPending] = useState(false);
  const [enrollPending, setEnrollPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const densityLocked = status !== "scheduled";
  const courseTitle = locale === "en" ? session.courses?.title_en : session.courses?.title_fil;

  const notesByModuleId = useMemo(() => {
    const map = new Map<string, CourseModuleFacilitatorNotes>();
    for (const note of facilitatorNotes) {
      map.set(note.module_id, note);
    }
    return map;
  }, [facilitatorNotes]);

  const progressByBhwId = useMemo(() => {
    const map = new Map<string, ProgressRow>();
    for (const p of courseProgress) {
      map.set(p.bhw_user_id, p);
    }
    return map;
  }, [courseProgress]);

  const completedCountByProgressId = useMemo(() => {
    const map = new Map<string, number>();
    for (const mp of moduleProgress) {
      if (mp.completed_at) {
        map.set(mp.course_progress_id, (map.get(mp.course_progress_id) ?? 0) + 1);
      }
    }
    return map;
  }, [moduleProgress]);

  const attemptsByBhwId = useMemo(() => {
    const map = new Map<string, { pretest: number | null; posttest: number | null }>();
    for (const a of testAttempts) {
      const entry = map.get(a.bhw_user_id) ?? { pretest: null, posttest: null };
      entry[a.phase] = a.score_percent;
      map.set(a.bhw_user_id, entry);
    }
    return map;
  }, [testAttempts]);

  const cohortSummary = useMemo(() => computeCohortSummary(testAttempts), [testAttempts]);

  async function handleDensityChange(next: LessonDensity) {
    setError(null);
    setDensityPending(true);
    const previous = density;
    setDensity(next);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_course_session_set_density", {
        p_session_id: session.id,
        p_lesson_density: next,
      });

      if (rpcError) {
        setDensity(previous);
        setError(t(mapElearningRpcError(rpcError.message)));
      }
    } finally {
      setDensityPending(false);
    }
  }

  async function handleEnroll() {
    if (!selectedBhwId) return;
    setError(null);
    setEnrollPending(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_course_session_enroll", {
        p_session_id: session.id,
        p_bhw_user_id: selectedBhwId,
      });

      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }

      const candidate = candidates.find((c) => c.id === selectedBhwId);
      if (candidate) {
        setEnrollments((prev) => [
          ...prev,
          {
            id: `optimistic-${candidate.id}`,
            session_id: session.id,
            bhw_user_id: candidate.id,
            status: "enrolled",
            enrolled_at: new Date().toISOString(),
            users: { full_name: candidate.full_name, username: candidate.username },
          },
        ]);
        setCandidates((prev) => prev.filter((c) => c.id !== selectedBhwId));
      }
    } finally {
      setEnrollPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: tCrumbs("home"), href: "/home" },
          { label: t("heading"), href: "/training-sessions" },
          { label: courseTitle ?? "" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{courseTitle}</h1>
        <p className="mt-1 text-ink/70">
          {new Date(session.scheduled_at).toLocaleString(locale === "en" ? "en-PH" : "fil-PH")}
          {session.location_note ? ` · ${session.location_note}` : ""}
          {" · "}
          <span className="font-medium">{t(`status.${status}`)}</span>
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3 rounded-md border border-ink/10 p-4">
        <Field label={t("densityLabel")} htmlFor="density-field">
          <select
            id="density-field"
            value={density}
            disabled={densityLocked || densityPending}
            onChange={(event) => handleDensityChange(event.target.value as LessonDensity)}
            className={`${inputClass} max-w-xs disabled:opacity-60`}
          >
            {DENSITIES.map((option) => (
              <option key={option} value={option}>
                {t(`density.${option}`)}
              </option>
            ))}
          </select>
        </Field>
        {densityLocked ? <p className="text-sm text-ink/60">{t("densityLockedNote")}</p> : null}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-ink/10 p-4">
        <h2 className="text-lg font-semibold text-ink">{t("enrollHeading")}</h2>
        {candidates.length === 0 ? (
          <p className="text-sm text-ink/60">{t("noBhwCandidates")}</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("bhwLabel")} htmlFor="enroll-bhw">
              <select
                id="enroll-bhw"
                value={selectedBhwId}
                onChange={(event) => setSelectedBhwId(event.target.value)}
                className={`${inputClass} min-w-[240px]`}
              >
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.full_name} ({candidate.org_units?.name ?? candidate.username})
                  </option>
                ))}
              </select>
            </Field>
            <button
              type="button"
              disabled={enrollPending}
              onClick={handleEnroll}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
            >
              {enrollPending ? t("enrolling") : t("enrollAction")}
            </button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">{t("rosterHeading")}</h2>
        {enrollments.length === 0 ? (
          <EmptyState message={t("emptyRoster")} />
        ) : (
          <div className="overflow-x-auto rounded-md border border-ink/10">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="bg-ink/5">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                    {t("colBhw")}
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                    {t("colModuleProgress")}
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                    {t("colPretest")}
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                    {t("colPosttest")}
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                    {t("colDelta")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => {
                  const progress = progressByBhwId.get(enrollment.bhw_user_id);
                  const completed = progress ? (completedCountByProgressId.get(progress.id) ?? 0) : 0;
                  const scores = attemptsByBhwId.get(enrollment.bhw_user_id) ?? { pretest: null, posttest: null };
                  const delta =
                    scores.pretest != null && scores.posttest != null ? scores.posttest - scores.pretest : null;

                  return (
                    <tr key={enrollment.id} className="border-b border-ink/10">
                      <td className="px-3 py-3 text-sm text-ink">
                        {enrollment.users?.full_name ?? enrollment.bhw_user_id}
                      </td>
                      <td className="px-3 py-3 text-sm text-ink">
                        {completed}/{modules.length}
                      </td>
                      <td className="px-3 py-3 text-sm text-ink">{scores.pretest != null ? `${scores.pretest}%` : "—"}</td>
                      <td className="px-3 py-3 text-sm text-ink">
                        {scores.posttest != null ? `${scores.posttest}%` : "—"}
                      </td>
                      <td className="px-3 py-3 text-sm text-ink">
                        {delta != null ? `${delta > 0 ? "+" : ""}${delta}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-md border border-ink/10 bg-ink/5 p-4">
        <h2 className="text-lg font-semibold text-ink">{t("summaryHeading")}</h2>
        {cohortSummary.pretestCount === 0 && cohortSummary.posttestCount === 0 ? (
          <p className="text-sm text-ink/60">{t("noScoresYet")}</p>
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                {t("summaryPretestAvgLabel")}
              </dt>
              <dd className="text-xl font-semibold text-ink">
                {cohortSummary.pretestAverage != null ? `${cohortSummary.pretestAverage.toFixed(1)}%` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                {t("summaryPosttestAvgLabel")}
              </dt>
              <dd className="text-xl font-semibold text-ink">
                {cohortSummary.posttestAverage != null ? `${cohortSummary.posttestAverage.toFixed(1)}%` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                {t("summaryDeltaAvgLabel")}
              </dt>
              <dd className="text-xl font-semibold text-success">
                {cohortSummary.deltaAverage != null
                  ? `${cohortSummary.deltaAverage > 0 ? "+" : ""}${cohortSummary.deltaAverage.toFixed(1)}%`
                  : "—"}
              </dd>
            </div>
          </dl>
        )}
        <p className="text-xs text-ink/50">{t("summaryPairedNote", { count: cohortSummary.pairedCount })}</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">{t("moduleViewHeading")}</h2>
        {modules.length === 0 ? (
          <EmptyState message={t("noModules")} />
        ) : (
          modules.map((module) => (
            <FacilitatorModuleView
              key={module.id}
              module={module}
              visuals={visuals.filter((v) => v.module_id === module.id)}
              notes={notesByModuleId.get(module.id) ?? null}
              density={density}
              locale={locale}
            />
          ))
        )}
      </section>
    </div>
  );
}
