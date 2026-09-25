"use client";

import { ActivityLibrary } from "./activity-library";
import type { ActivityRun } from "@/lib/elearning/activities";
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
  CourseSessionDelivery,
  CourseSessionEnrollment,
  EnrollmentStatus,
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
  initialDeliveries: CourseSessionDelivery[];
  initialActivityRuns?: ActivityRun[];
  courseProgress: ProgressRow[];
  moduleProgress: ModuleProgressRow[];
  testAttempts: SessionTestAttempt[];
  bhwCandidates: BhwOption[];
  locale: string;
};

const DENSITIES: LessonDensity[] = ["short", "normal", "long"];
const ATTENDANCE: EnrollmentStatus[] = ["enrolled", "attended", "no_show"];

export function TrainingSessionDetail({
  session,
  modules,
  visuals,
  facilitatorNotes,
  initialEnrollments,
  initialDeliveries,
  initialActivityRuns = [],
  courseProgress,
  moduleProgress,
  testAttempts,
  bhwCandidates: initialCandidates,
  locale,
}: Props) {
  const t = useTranslations("trainingSessions");
  const tCrumbs = useTranslations("breadcrumbs");
  const [density, setDensity] = useState(session.lesson_density);
  const [status, setStatus] = useState(session.status);
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedBhwId, setSelectedBhwId] = useState(initialCandidates[0]?.id ?? "");
  const [densityPending, setDensityPending] = useState(false);
  const [enrollPending, setEnrollPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const deliverable = modules.filter((m) => m.type !== "quiz");
  const [logModuleId, setLogModuleId] = useState(deliverable[0]?.id ?? "");
  const [logMinutes, setLogMinutes] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logPending, setLogPending] = useState(false);
  const [logSaved, setLogSaved] = useState(false);
  const [attendancePending, setAttendancePending] = useState<string | null>(null);
  const [completePending, setCompletePending] = useState(false);
  const sessionOpen = status === "scheduled";

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

  async function handleAttendance(enrollment: CourseSessionEnrollment, next: EnrollmentStatus) {
    setError(null);
    setAttendancePending(enrollment.bhw_user_id);
    try {
      const { error: rpcError } = await createClient().rpc("rpc_course_session_set_attendance", {
        p_session_id: session.id,
        p_bhw_user_id: enrollment.bhw_user_id,
        p_status: next,
      });
      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }
      setEnrollments((prev) => prev.map((e) => (e.bhw_user_id === enrollment.bhw_user_id ? { ...e, status: next } : e)));
    } finally {
      setAttendancePending(null);
    }
  }

  async function handleLogDelivery() {
    const minutes = Number(logMinutes);
    if (!logModuleId || !Number.isInteger(minutes) || minutes < 1 || minutes > 600) {
      setError(t("invalidDurationError"));
      return;
    }
    setError(null);
    setLogSaved(false);
    setLogPending(true);
    try {
      const { data, error: rpcError } = await createClient().rpc("rpc_course_session_log_delivery", {
        p_session_id: session.id,
        p_module_id: logModuleId,
        p_duration_minutes: minutes,
        p_notes: logNotes,
      });
      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }
      const entry: CourseSessionDelivery = {
        id: String(data),
        session_id: session.id,
        module_id: logModuleId,
        duration_minutes: minutes,
        notes: logNotes.trim(),
        recorded_at: new Date().toISOString(),
      };
      setDeliveries((prev) => [...prev.filter((d) => d.module_id !== logModuleId), entry]);
      setLogMinutes("");
      setLogNotes("");
      setLogSaved(true);
    } finally {
      setLogPending(false);
    }
  }

  async function handleComplete() {
    setError(null);
    setCompletePending(true);
    try {
      const { error: rpcError } = await createClient().rpc("rpc_course_session_complete", { p_session_id: session.id });
      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }
      setStatus("completed");
    } finally {
      setCompletePending(false);
    }
  }

  const moduleTitle = (id: string) => {
    const m = modules.find((x) => x.id === id);
    return m ? (locale === "en" ? m.title_en : m.title_fil) : id;
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
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
                    {t("colAttendance")}
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
                        <select
                          aria-label={`${t("colAttendance")}: ${enrollment.users?.full_name ?? ""}`}
                          value={enrollment.status}
                          disabled={!sessionOpen || attendancePending === enrollment.bhw_user_id || enrollment.id.startsWith("optimistic-")}
                          onChange={(event) => handleAttendance(enrollment, event.target.value as EnrollmentStatus)}
                          className={`${inputClass} min-w-[150px] disabled:opacity-60`}
                        >
                          {ATTENDANCE.map((option) => (
                            <option key={option} value={option}>
                              {t(`attendance.${option}`)}
                            </option>
                          ))}
                        </select>
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

      {deliverable.filter(m => notesByModuleId.get(m.id)?.activities?.length || initialActivityRuns.some(r=>r.module_id===m.id)).map(m =>
        <details key={m.id} className="rounded-md border border-ink/15 p-4">
          <summary className="min-h-[44px] cursor-pointer font-medium">
            {locale === "en" ? "Optional activities: " : "Opsyonal na mga gawain: "}{locale === "en" ? m.title_en : m.title_fil}
          </summary>
          <ActivityLibrary lang={locale === "en" ? "en" : "fil"}
            moduleTitle={locale === "en" ? m.title_en : m.title_fil}
            activities={notesByModuleId.get(m.id)?.activities ?? []} sessionId={session.id} moduleId={m.id} sessionOpen={sessionOpen}
            initialRuns={initialActivityRuns.filter(r=>r.module_id===m.id)}/>
        </details>)}

      <section className="flex flex-col gap-3 rounded-md border border-ink/10 p-4" aria-labelledby="session-log-heading">
        <h2 id="session-log-heading" className="text-lg font-semibold text-ink">{t("logHeading")}</h2>
        <p className="text-sm text-ink/70">{t("logIntro")}</p>
        {deliveries.length === 0 ? (
          <p className="text-sm text-ink/60">{t("logEmpty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
            {deliveries.map((d) => (
              <li key={d.module_id} className="flex flex-col gap-1 p-3 text-sm">
                <span className="font-medium text-ink">
                  {moduleTitle(d.module_id)} · {t("logMinutes", { minutes: d.duration_minutes })}
                </span>
                {d.notes ? <span className="whitespace-pre-wrap text-ink/80">{d.notes}</span> : null}
              </li>
            ))}
          </ul>
        )}
        {sessionOpen && deliverable.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <Field label={t("logModuleLabel")} htmlFor="log-module">
                <select id="log-module" value={logModuleId} onChange={(event) => setLogModuleId(event.target.value)} className={`${inputClass} min-w-[240px]`}>
                  {deliverable.map((m) => (
                    <option key={m.id} value={m.id}>
                      {moduleTitle(m.id)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("logMinutesLabel")} htmlFor="log-minutes">
                <input id="log-minutes" type="number" inputMode="numeric" min={1} max={600} value={logMinutes}
                  onChange={(event) => setLogMinutes(event.target.value)} className={`${inputClass} w-28`} />
              </Field>
            </div>
            <Field label={t("logNotesLabel")} htmlFor="log-notes">
              <textarea id="log-notes" rows={3} maxLength={2000} value={logNotes} onChange={(event) => setLogNotes(event.target.value)} className={inputClass} />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={logPending} onClick={handleLogDelivery}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60">
                {logPending ? t("logging") : t("logAction")}
              </button>
              {logSaved ? <p role="status" className="text-sm text-success">{t("logSaved")}</p> : null}
            </div>
          </div>
        ) : null}
      </section>

      {sessionOpen ? (
        <section className="flex flex-col gap-2 rounded-md border border-ink/10 p-4">
          <h2 className="text-lg font-semibold text-ink">{t("completeHeading")}</h2>
          <p className="text-sm text-ink/70">{t("completeNote")}</p>
          <button type="button" disabled={completePending} onClick={handleComplete}
            className="self-start rounded-md border border-ink/20 px-4 py-2 text-sm font-medium disabled:opacity-60">
            {completePending ? t("completing") : t("completeAction")}
          </button>
        </section>
      ) : null}

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
