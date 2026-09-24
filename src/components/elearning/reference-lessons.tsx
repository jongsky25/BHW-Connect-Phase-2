"use client";

import { useRef, useState } from "react";
import type {
  CourseModule,
  CourseLessonProgress,
  CourseLessonResume,
  LessonCheck,
  LessonModality,
  TrainingProgramChapter,
} from "@/lib/elearning/types";
import {
  continueLesson,
  lessonPosition,
  type PublishedLesson,
} from "@/lib/elearning/reference-navigation";

export type ReferenceData = {
  title_fil: string;
  title_en: string;
  chapters: TrainingProgramChapter[];
  lessons: PublishedLesson[];
  completed: CourseLessonProgress[];
  resumes: CourseLessonResume[];
};
type Props = ReferenceData & {
  modules: CourseModule[];
  locale: string;
  onResume: (
    resume: Omit<CourseLessonResume, "course_progress_id" | "updated_at">,
  ) => Promise<void>;
  onComplete: (lesson: PublishedLesson) => Promise<void>;
};

function Practice({ check, en }: { check: LessonCheck; en: boolean }) {
  const [answer, setAnswer] = useState<number | null>(null);
  return (
    <fieldset className="mt-5 rounded-lg border border-ink/20 p-4">
      <legend className="font-semibold">
        {en ? check.prompt_en : check.prompt_fil}
      </legend>
      <div className="flex flex-col gap-2">
        {check.options.map((o, i) => (
          <button
            type="button"
            className="rounded border border-ink/20 p-3 text-left"
            aria-pressed={answer === i}
            key={i}
            onClick={() => setAnswer(i)}
          >
            {en ? o.en : o.fil}
          </button>
        ))}
      </div>
      {answer !== null && (
        <p role="status" className="mt-3">
          {answer === check.correct_option_index
            ? en
              ? "Correct. "
              : "Tama. "
            : en
              ? "Try again. "
              : "Subukang muli. "}
          {en ? check.feedback_en : check.feedback_fil}
        </p>
      )}
    </fieldset>
  );
}

export function ReferenceLessons(props: Props) {
  const { lessons, modules, onResume, onComplete } = props,
    en = props.locale === "en";
  const ui = (fil: string, eng: string) => (en ? eng : fil);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<LessonModality>("read");
  const [resumes, setResumes] = useState(props.resumes);
  const [completed, setCompleted] = useState(props.completed);
  const [position, setPosition] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const writes = useRef(Promise.resolve());
  const lesson = lessons.find((l) => l.id === selected);
  const items = lesson
    ? mode === "read"
      ? lesson.revision.read_sections
      : lesson.revision.slides
    : [];
  const item = items.find((p) => p.id === position) ?? items[0];
  const index = item ? items.findIndex((p) => p.id === item.id) : 0;
  const done = new Set(completed.map((p) => p.lesson_id));
  const required = lessons.filter((l) => l.required);
  const nextLesson = continueLesson(lessons, completed, resumes);
  const siblings = lessons.filter((l) => l.module_id === lesson?.module_id);

  function save(
    l: PublishedLesson,
    m: LessonModality,
    p: { id: string; concept_ids: string[] },
  ) {
    const value = {
      lesson_id: l.id,
      revision_id: l.revision.id,
      modality: m,
      language: en ? ("en" as const) : ("fil" as const),
      position_key: p.id,
      concept_id: p.concept_ids[0],
    };
    setResumes((old) => [
      ...old.filter((r) => !(r.lesson_id === l.id && r.modality === m)),
      {
        ...value,
        course_progress_id: "",
        updated_at: new Date().toISOString(),
      },
    ]);
    // Serialize rapid navigation so a slower request cannot overwrite newer state.
    writes.current = writes.current
      .then(() => onResume(value))
      .catch(() =>
        setError(
          ui(
            "Hindi nai-save ang puwesto. Subukang muli.",
            "Position could not be saved. Try again.",
          ),
        ),
      );
  }
  function open(l: PublishedLesson) {
    const latest = resumes
      .filter((r) => r.lesson_id === l.id)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    const m = latest?.modality ?? mode;
    const p = lessonPosition(
      l,
      m,
      resumes.find((r) => r.lesson_id === l.id && r.modality === m),
    );
    setSelected(l.id);
    setMode(m);
    setPosition(p.id);
    setError(null);
    save(l, m, p);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function move(p: typeof item, m = mode) {
    if (!lesson || !p) return;
    setMode(m);
    setPosition(p.id);
    save(lesson, m, p);
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function complete() {
    if (!lesson) return;
    setPending(true);
    setError(null);
    try {
      await writes.current;
      await onComplete(lesson);
      setCompleted((old) =>
        done.has(lesson.id)
          ? old
          : [
              ...old,
              {
                course_progress_id: "",
                lesson_id: lesson.id,
                revision_id: lesson.revision.id,
                completed_at: new Date().toISOString(),
                completion_basis: "learner",
                legacy_module_id: null,
                migration_batch: null,
              },
            ],
      );
    } catch {
      setError(
        ui(
          "Hindi nai-save ang pagkumpleto. Subukang muli o i-reload ang aralin.",
          "Completion could not be saved. Retry or reload the lesson.",
        ),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className="flex flex-col gap-4"
      aria-label={ui("Mga aralin sa Kabanata I", "Chapter I lessons")}
    >
      <p>
        {required.filter((l) => done.has(l.id)).length} / {required.length}{" "}
        {ui(
          "natapos na kinakailangang araling inilabas sa Kabanata I",
          "released required Chapter I lessons completed",
        )}
      </p>
      <p className="text-sm">
        {ui(
          "Available ang Kabanata I. Hindi pa available ang Kabanata II–III.",
          "Chapter I is available. Chapters II–III are not yet available.",
        )}
      </p>
      {!lesson &&
        props.chapters
          .filter((c) => c.availability === "unavailable")
          .map((c) => (
            <p key={c.id} className="rounded border border-ink/10 p-3">
              {en ? c.title_en : c.title_fil} —{" "}
              {ui("Hindi pa available", "Not yet available")}
            </p>
          ))}
      {!lesson ? (
        <>
          {nextLesson && (
            <button
              type="button"
              className="rounded bg-primary p-3 text-on-primary"
              onClick={() => open(nextLesson)}
            >
              {ui("Ipagpatuloy ang pag-aaral", "Continue learning")}
            </button>
          )}
          {!nextLesson && (
            <p>
              {ui(
                "Natapos ang mga inilabas na aralin. Maaari mong balikan ang mga ito.",
                "Released lessons complete. You can revisit them below.",
              )}
            </p>
          )}
          {modules
            .filter((m) => lessons.some((l) => l.module_id === m.id))
            .map((m) => (
              <details key={m.id} open>
                <summary className="cursor-pointer py-3 font-semibold">
                  {en ? m.title_en : m.title_fil}
                </summary>
                <ol className="flex flex-col gap-2">
                  {lessons
                    .filter((l) => l.module_id === m.id)
                    .map((l) => (
                      <li key={l.id}>
                        <button
                          type="button"
                          className="w-full rounded border border-ink/20 p-3 text-left"
                          onClick={() => open(l)}
                        >
                          {en ? l.title_en : l.title_fil}
                          {done.has(l.id) ? " ✓" : ""}
                        </button>
                      </li>
                    ))}
                </ol>
              </details>
            ))}
        </>
      ) : (
        item && (
          <>
            <button
              type="button"
              className="self-start underline"
              onClick={() => {
                setSelected(null);
                setPosition(null);
              }}
            >
              {ui("← Bumalik sa mga subchapter", "← Back to subchapters")}
            </button>
            <p>
              {ui("Aralin", "Lesson")}{" "}
              {siblings.findIndex((l) => l.id === lesson.id) + 1} /{" "}
              {siblings.length} · {en ? lesson.title_en : lesson.title_fil}
            </p>
            <p className="text-sm">
              {ui(
                "Tinatayang 3–7 minuto para sa sariling pag-aaral; hiwalay ang gabay na pagsasanay.",
                "Estimated 3–7 minutes for independent study; facilitated practice is separate.",
              )}
            </p>
            <ul>
              {(en ? lesson.objectives_en : lesson.objectives_fil).map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              {(["read", "slides"] as const).map((m) => (
                <button
                  type="button"
                  className="rounded border border-ink/20 px-4 py-2"
                  key={m}
                  aria-pressed={mode === m}
                  onClick={() =>
                    move(
                      lessonPosition(
                        lesson,
                        m,
                        resumes.find(
                          (r) => r.lesson_id === lesson.id && r.modality === m,
                        ),
                        item.concept_ids[0],
                      ),
                      m,
                    )
                  }
                >
                  {m === "read" ? ui("Basahin", "Read") : "Slides"}
                </button>
              ))}
            </div>
            <article
              className="rounded-xl border border-ink/15 p-4 sm:p-6"
              data-layout={"layout" in item ? item.layout : "read"}
            >
              <h2 tabIndex={-1} ref={heading} className="text-xl font-semibold">
                {en ? item.heading_en : item.heading_fil}
              </h2>
              {"display_fil" in item ? (
                <div
                  className={
                    ["comparison", "relationship-map", "scene"].includes(
                      item.layout,
                    )
                      ? "my-5 grid gap-3 sm:grid-cols-2"
                      : "my-5 flex flex-col gap-3"
                  }
                >
                  {(en ? item.display_en : item.display_fil)
                    .split("\n")
                    .filter(Boolean)
                    .map((line, i) => (
                      <p key={i} className="rounded-lg bg-ink/5 p-4 text-lg">
                        {item.layout === "process" ? (
                          <span aria-hidden="true">{i + 1}. </span>
                        ) : null}
                        {line}
                      </p>
                    ))}
                </div>
              ) : (
                <p className="my-5 whitespace-pre-wrap leading-relaxed">
                  {en ? item.body_en : item.body_fil}
                </p>
              )}
              {item.asset_ids.map((id) => {
                const a = lesson.revision.assets.find((a) => a.id === id);
                return a ? (
                  <figure key={a.id} className="my-4">
                    {/* Public static assets; text alternatives remain visible if an image fails. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.path}
                      width={720}
                      height={360}
                      loading="lazy"
                      alt={en ? a.alt_en : a.alt_fil}
                      className="h-auto w-full rounded-lg"
                    />
                    <figcaption className="text-sm">
                      {en ? a.caption_en : a.caption_fil}
                    </figcaption>
                  </figure>
                ) : null;
              })}
              {"takeaway_fil" in item && (
                <p className="border-l-4 border-primary pl-3">
                  {en ? item.takeaway_en : item.takeaway_fil}
                </p>
              )}
              {item.check && (
                <Practice
                  key={lesson.id + mode + item.id + props.locale}
                  check={item.check}
                  en={en}
                />
              )}
            </article>
            <nav
              className="flex items-center justify-between gap-2"
              aria-label={ui("Puwesto sa aralin", "Lesson position")}
            >
              <button
                type="button"
                className="rounded border p-3 disabled:opacity-40"
                disabled={index === 0}
                onClick={() => move(items[index - 1])}
              >
                {ui("Nakaraan", "Previous")}
              </button>
              <span aria-live="polite">
                {index + 1} / {items.length}
              </span>
              <button
                type="button"
                className="rounded border p-3 disabled:opacity-40"
                disabled={index === items.length - 1}
                onClick={() => move(items[index + 1])}
              >
                {ui("Susunod", "Next")}
              </button>
            </nav>
            <button
              type="button"
              className="rounded bg-primary p-3 text-on-primary disabled:opacity-50"
              disabled={pending || done.has(lesson.id)}
              onClick={complete}
            >
              {done.has(lesson.id)
                ? ui("Natapos", "Completed")
                : ui("Markahang tapos ang aralin", "Mark lesson complete")}
            </button>
            <nav
              className="flex flex-wrap justify-between gap-2"
              aria-label={ui("Mga aralin sa subchapter", "Subchapter lessons")}
            >
              {siblings[siblings.indexOf(lesson) - 1] && (
                <button
                  type="button"
                  className="rounded border p-3"
                  onClick={() => open(siblings[siblings.indexOf(lesson) - 1])}
                >
                  {ui("Nakaraang aralin", "Previous lesson")}
                </button>
              )}
              {siblings[siblings.indexOf(lesson) + 1] && (
                <button
                  type="button"
                  className="rounded border p-3"
                  onClick={() => open(siblings[siblings.indexOf(lesson) + 1])}
                >
                  {ui("Susunod na aralin", "Next lesson")}
                </button>
              )}
            </nav>
            <p className="text-sm">
              {ui(
                "Ang pagkumpleto ng aralin ay hindi katibayan ng praktikal na kakayahan.",
                "Lesson completion is separate from demonstrated practical competence.",
              )}
            </p>
            <details>
              <summary>{ui("Mga sanggunian", "Sources")}</summary>
              {lesson.revision.sources.map((s) => (
                <p key={s.id}>
                  {s.url ? (
                    <a
                      className="underline"
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.title}
                    </a>
                  ) : (
                    s.title
                  )}
                  : PDF {s.pdf_pages.join(", ")}
                </p>
              ))}
            </details>
          </>
        )
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
