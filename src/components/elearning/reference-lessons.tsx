"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
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
import type { LessonNarration } from "@/lib/elearning/reference-narration";
import { ReferenceReadSection } from "./reference-read-section";
import { LessonAssetFigure } from "./lesson-asset-figure";

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
  initialLessonId?: string;
  initialMode?: LessonModality;
  lessonBaseHref?: string;
  returnHref?: string;
  readOnly?: boolean;
  lessonNumber?: number;
  lessonCount?: number;
  nextLessonHref?: string;
  // Lesson ID -> Read-mode narration in the current language (optional).
  narration?: Record<string, LessonNarration>;
  locale: string;
  onResume: (
    resume: Omit<CourseLessonResume, "course_progress_id" | "updated_at">,
  ) => Promise<void>;
  onComplete: (lesson: PublishedLesson) => Promise<void>;
};

function Practice({ check, en, answer, onAnswer }: { check: LessonCheck; en: boolean; answer: number | undefined; onAnswer: (answer: number) => void }) {
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
            onClick={() => onAnswer(i)}
          >
            {en ? o.en : o.fil}
          </button>
        ))}
      </div>
      {answer !== undefined && (
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
  const router=useRouter();
  const initial=lessons.find(l=>l.id===props.initialLessonId);
  const initialResume=props.resumes.filter(r=>r.lesson_id===initial?.id).sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0];
  const [selected, setSelected] = useState<string | null>(props.initialLessonId??null);
  const startingMode=props.initialMode??initialResume?.modality??"read";
  const startingResume=props.resumes.filter(r=>r.lesson_id===initial?.id&&r.modality===startingMode)
    .sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0];
  const [mode, setMode] = useState<LessonModality>(startingMode);
  const [resumes, setResumes] = useState(props.resumes);
  const [completed, setCompleted] = useState(props.completed);
  const [position, setPosition] = useState<string | null>(initial?lessonPosition(initial,startingMode,startingResume).id:null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Practice is formative, not a scored assessment. Keep attempts across
  // section/mode changes, but never carry them into a different revision.
  const [answers, setAnswers] = useState<Record<string, number>>({});
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
  const answerKey = (id: string) => `${lesson?.id}:${lesson?.revision.id}:${mode}:${id}`;
  const answer = item ? answers[answerKey(item.id)] : undefined;
  const checksAnswered = items.every(p => !p.check || answers[answerKey(p.id)] !== undefined);
  const canComplete = items.length > 0 && index === items.length - 1 && checksAnswered;
  const revealSummary = !item?.check || answer !== undefined;
  const practice = item?.check ? <Practice check={item.check} en={en} answer={answer}
    onAnswer={value => setAnswers(old => ({...old, [answerKey(item.id)]: value}))}/> : null;
  const figures =
    lesson && item
      ? item.asset_ids.map((id) => {
          const a = lesson.revision.assets.find((a) => a.id === id);
          return a ? <LessonAssetFigure key={a.id} asset={a} en={en} /> : null;
        })
      : null;

  function save(
    l: PublishedLesson,
    m: LessonModality,
    p: { id: string; concept_ids: string[] },
  ) {
    if(props.readOnly)return;
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
      .then(async () => {await onResume(value);setError(null);})
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
    if(props.lessonBaseHref){router.push(`${props.lessonBaseHref}/${l.id}`);return;}
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
    if (!lesson || props.readOnly || pending || done.has(lesson.id) || !canComplete) return;
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
      {!props.lessonBaseHref && <p>
        {required.filter((l) => done.has(l.id)).length} / {required.length}{" "}
        {ui(
          "natapos na kinakailangang araling inilabas sa Kabanata I",
          "released required Chapter I lessons completed",
        )}
      </p>}
      {!props.lessonBaseHref && <p className="text-sm">
        {ui(
          "Available ang Kabanata I. Hindi pa available ang Kabanata II–III.",
          "Chapter I is available. Chapters II–III are not yet available.",
        )}
      </p>}
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
            {props.lessonBaseHref ? <Link className="self-start underline" href={props.returnHref??props.lessonBaseHref}>{ui("← Bumalik sa mga aralin","← Back to lessons")}</Link> : <button
              type="button"
              className="self-start underline"
              onClick={() => {
                setSelected(null);
                setPosition(null);
              }}
            >
              {ui("← Bumalik sa mga subchapter", "← Back to subchapters")}
            </button>}
            <p>
              {ui("Aralin", "Lesson")}{" "}
              {props.lessonNumber ?? siblings.findIndex((l) => l.id === lesson.id) + 1} /{" "}
              {props.lessonCount ?? siblings.length} · {en ? lesson.title_en : lesson.title_fil}
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
              {"display_fil" in item ? (
                <>
                  <h2 tabIndex={-1} ref={heading} className="text-xl font-semibold">
                    {en ? item.heading_en : item.heading_fil}
                  </h2>
                  {practice}
                  {revealSummary && <div
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
                  </div>}
                  {revealSummary && figures}
                </>
              ) : (
                <ReferenceReadSection
                  key={lesson.id + item.id + props.locale}
                  heading={en ? item.heading_en : item.heading_fil}
                  body={en ? item.body_en : item.body_fil}
                  takeaway={revealSummary ? ((en ? item.takeaway_en : item.takeaway_fil) ?? "") : ""}
                  narration={revealSummary ? props.narration?.[lesson.id]?.[item.id] : undefined}
                  en={en}
                  headingRef={heading}
                >
                  {figures}
                  {practice}
                  {!revealSummary && props.narration?.[lesson.id]?.[item.id] && <p className="mt-3 text-sm">
                    {ui("Sagutin muna ang tanong para mapakinggan ang audio na may buod.", "Answer the check to unlock this section’s audio, which includes the takeaway.")}
                  </p>}
                </ReferenceReadSection>
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
            {!props.readOnly && <>
            {!done.has(lesson.id) && <p id="lesson-completion-help" className="text-sm" aria-live="polite">
              {canComplete ? ui("Maaari mo nang markahang tapos ang aralin.", "You can now mark this lesson complete.") :
                ui("Tapusin ang mga bahagi at sagutin ang bawat tanong sa Basahin o Slides. Hindi kailangang tama ang unang sagot. Kapag ni-reload, sagutin muli ang mga tanong.",
                  "Reach the end and answer every check in Read or Slides. Your first answer does not have to be correct. After a reload, answer the checks again.")}
            </p>}
            <button
              type="button"
              className="rounded bg-primary p-3 text-on-primary disabled:opacity-50"
              disabled={pending || done.has(lesson.id) || !canComplete}
              aria-describedby={!done.has(lesson.id) ? "lesson-completion-help" : undefined}
              onClick={complete}
            >
              {done.has(lesson.id)
                ? ui("Natapos", "Completed")
                : ui("Markahang tapos ang aralin", "Mark lesson complete")}
            </button>
            {done.has(lesson.id) && <div role="status" className="rounded-lg border border-ink/20 p-4">
              <p>{ui("Natapos ang aralin. Naka-save ang iyong progreso.", "Lesson complete. Your progress is saved.")}</p>
              {props.nextLessonHref ? <Link className="mt-3 inline-block rounded bg-primary p-3 text-on-primary" href={props.nextLessonHref}>
                {ui("Magpatuloy sa susunod na aralin →", "Continue to the next lesson →")}
              </Link> : props.lessonBaseHref ? <Link className="mt-3 inline-block underline" href={props.returnHref??props.lessonBaseHref}>
                {ui("Bumalik sa listahan ng mga aralin →", "Return to the lesson list →")}
              </Link> : siblings[siblings.indexOf(lesson)+1] && <button type="button" className="mt-3 rounded bg-primary p-3 text-on-primary" onClick={()=>open(siblings[siblings.indexOf(lesson)+1])}>
                {ui("Magpatuloy sa susunod na aralin →", "Continue to the next lesson →")}
              </button>}
            </div>}
            </>}
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
                  {s.pdf_pages?.length ? `: PDF ${s.pdf_pages.join(", ")}` : null}
                </p>
              ))}
            </details>
          </>
        )
      )}
      {error && <div role="alert"><p>{error}</p>{lesson && item && <button className="mt-2 underline" onClick={()=>save(lesson,mode,item)}>{ui('Subukang i-save muli','Retry saving position')}</button>}</div>}
    </section>
  );
}
