"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/admin/form-field";
import { mapElearningRpcError } from "@/lib/elearning/error-messages";
import type { CourseSession, LessonDensity } from "@/lib/elearning/types";
import { createClient } from "@/lib/supabase/client";

type CourseOption = { id: string; title_fil: string; title_en: string };

type Props = {
  courses: CourseOption[];
  locale: string;
  onCreated: (session: CourseSession) => void;
};

// §A.6 density selector, defaulting to Karaniwan/normal per INC-23's DoD.
const DENSITIES: LessonDensity[] = ["short", "normal", "long"];

export function TrainingSessionForm({ courses, locale, onCreated }: Props) {
  const t = useTranslations("trainingSessions");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [density, setDensity] = useState<LessonDensity>("normal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!courseId || !scheduledAt) {
      setError(t("requiredFieldError"));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("rpc_course_session_create", {
        p_course_id: courseId,
        p_scheduled_at: new Date(scheduledAt).toISOString(),
        p_location_note: locationNote.trim(),
        p_lesson_density: density,
      });

      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }

      const row = (data as Array<{ session_id: string }> | null)?.[0];
      if (!row) {
        setError(t("genericError"));
        return;
      }

      const course = courses.find((c) => c.id === courseId) ?? null;
      onCreated({
        id: row.session_id,
        course_id: courseId,
        org_unit_id: "",
        facilitator_user_id: "",
        scheduled_at: new Date(scheduledAt).toISOString(),
        location_note: locationNote.trim(),
        lesson_density: density,
        status: "scheduled",
        created_at: new Date().toISOString(),
        courses: course ? { title_fil: course.title_fil, title_en: course.title_en } : null,
      });

      setScheduledAt("");
      setLocationNote("");
      setDensity("normal");
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  if (courses.length === 0) {
    return <p className="text-sm text-ink/60">{t("noPublishedCourses")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-ink/10 p-4" noValidate>
      <h2 className="text-lg font-semibold text-ink">{t("createHeading")}</h2>

      <Field label={t("courseLabel")} htmlFor="session-course">
        <select
          id="session-course"
          required
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
          className={inputClass}
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {locale === "en" ? course.title_en : course.title_fil}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("scheduledAtLabel")} htmlFor="session-scheduled-at">
          <input
            id="session-scheduled-at"
            type="datetime-local"
            required
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("locationNoteLabel")} htmlFor="session-location-note">
          <input
            id="session-location-note"
            value={locationNote}
            onChange={(event) => setLocationNote(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={t("densityLabel")} htmlFor="session-density">
        <select
          id="session-density"
          value={density}
          onChange={(event) => setDensity(event.target.value as LessonDensity)}
          className={inputClass}
        >
          {DENSITIES.map((option) => (
            <option key={option} value={option}>
              {t(`density.${option}`)}
            </option>
          ))}
        </select>
      </Field>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-primary px-6 py-3 font-medium text-on-primary disabled:opacity-60"
      >
        {loading ? t("creating") : t("createAction")}
      </button>
    </form>
  );
}
