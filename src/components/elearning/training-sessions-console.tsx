"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import type { CourseSession } from "@/lib/elearning/types";
import { TrainingSessionForm } from "./training-session-form";

type CourseOption = { id: string; title_fil: string; title_en: string };

type Props = {
  initialSessions: CourseSession[];
  courses: CourseOption[];
  locale: string;
};

// §INC-23 facilitator UI: this session's own sessions (course_sessions_
// facilitator_own RLS already restricts the list to this facilitator's own
// scheduled/completed/cancelled sessions) plus the create form.
export function TrainingSessionsConsole({ initialSessions, courses, locale }: Props) {
  const t = useTranslations("trainingSessions");
  const tCrumbs = useTranslations("breadcrumbs");
  const [sessions, setSessions] = useState(initialSessions);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: tCrumbs("home"), href: "/home" }, { label: t("heading") }]} />
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>

      <TrainingSessionForm
        courses={courses}
        locale={locale}
        onCreated={(session) => setSessions((prev) => [session, ...prev])}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">{t("listHeading")}</h2>
        {sessions.length === 0 ? (
          <EmptyState message={t("empty")} />
        ) : (
          <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/training-sessions/${session.id}`}
                  className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-ink/5"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {locale === "en" ? session.courses?.title_en : session.courses?.title_fil}
                    </p>
                    <p className="text-sm text-ink/70">
                      {new Date(session.scheduled_at).toLocaleString(locale === "en" ? "en-PH" : "fil-PH")}
                      {session.location_note ? ` · ${session.location_note}` : ""}
                    </p>
                  </div>
                  <span className="rounded-md bg-ink/5 px-2 py-1 text-xs font-medium text-ink/70">
                    {t(`status.${session.status}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
