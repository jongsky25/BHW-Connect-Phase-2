"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { prefersReducedMotion } from "@/lib/elearning/reduced-motion";
import { ReferenceReadSection } from "./reference-read-section";
import { LessonAssetFigure } from "./lesson-asset-figure";
import { FittedLessonPage } from "./fitted-lesson-page";

type ResumeValue = Omit<CourseLessonResume, "course_progress_id" | "updated_at">;
const RESUME_SAVE_DELAY_MS = 3000;

// The pilot database still has the first published wording. Render its
// explicit clock times while the new authored revision awaits a national
// course publisher. Once that revision is published, this is a no-op.
function clarifyMorningTimes(body: string) {
  if (!body.startsWith("At eight, BHW Marites")) return body;
  return body
    .replace("At eight,", "At 8:00 a.m.,")
    .replace("At ten,", "At 10:00 a.m.,")
    .replace("At eleven,", "At 11:00 a.m.,");
}

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
  completionMilestone?: { scope: "subchapter" | "chapter"; number: string };
  // Lesson ID -> Read-mode narration in the current language (optional).
  narration?: Record<string, LessonNarration>;
  locale: string;
  onResume: (
    resume: ResumeValue,
  ) => Promise<void>;
  onComplete: (lesson: PublishedLesson) => Promise<void>;
};

function repeatsCheckPrompt(body: string, prompt: string) {
  const lastParagraph = body.trim().split(/\n\s*\n/).at(-1) ?? "";
  const normalize = (text: string) => text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  return normalize(lastParagraph) === normalize(prompt);
}

function Practice({ check, en, promptShownInBody, answer, onAnswer }: { check: LessonCheck; en: boolean; promptShownInBody: boolean; answer: number | undefined; onAnswer: (answer: number) => void }) {
  return (
    <fieldset className="mt-5 rounded-lg border border-ink/20 p-4">
      <legend className="font-semibold">
        {promptShownInBody ? (en ? "Choose an answer" : "Pumili ng sagot") : en ? check.prompt_en : check.prompt_fil}
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
        <div
          role="status"
          aria-live="polite"
          className="reference-check-feedback"
          data-result={answer === check.correct_option_index ? "correct" : "incorrect"}
        >
          <strong className="reference-check-feedback-label">
            <span aria-hidden="true">{answer === check.correct_option_index ? "✓" : "↺"}</span>{" "}
            {answer === check.correct_option_index
              ? en ? "Correct!" : "Tama!"
              : en ? "Not quite. Try again." : "Hindi pa tama. Subukang muli."}
          </strong>
          <p className="reference-check-feedback-detail">{en ? check.feedback_en : check.feedback_fil}</p>
        </div>
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
  const [savedMilestone, setSavedMilestone] = useState<({ lessonId: string } & NonNullable<Props["completionMilestone"]>) | null>(null);
  const [newlyCompletedLessonId, setNewlyCompletedLessonId] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(initial?lessonPosition(initial,startingMode,startingResume).id:null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Practice is formative, not a scored assessment. Keep attempts across
  // section/mode changes, but never carry them into a different revision.
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // Keyed by lesson id, like `answers`, so switching lessons doesn't lose it.
  const [featuredWatched, setFeaturedWatched] = useState<Record<string, boolean>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const readerDialog = useRef<HTMLDialogElement>(null);
  const fullscreenTarget = useRef<HTMLDivElement>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [orientationHelp, setOrientationHelp] = useState(false);
  const writes = useRef(Promise.resolve());
  // Resume positions are saved on a trailing debounce, not on every Next/
  // Previous: each rpc_course_lesson_resume call runs the full visibility
  // check, locks rows and upserts course_lesson_resume, so paging through a
  // lesson wrote once per slide. Only the latest position is kept; it is
  // written after RESUME_SAVE_DELAY_MS of no movement, and immediately when
  // the lesson/mode changes, on completion, on retry, when the tab is hidden,
  // and on unmount.
  const pendingResume = useRef<ResumeValue | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushResumeRef = useRef<() => Promise<void>>(() => writes.current);
  const lesson = lessons.find((l) => l.id === selected);
  const storyArt = lesson?.lesson_key === "bhw-roles-hepo"
    ? {
        src: "/training/bhw-1-1/scene-8cdb1498a723.png",
        alt: ui(
          "Si BHW Marites ay nakikipag-usap sa mga residente; sa tabi niya, isang ina at anak ang kausap ang midwife.",
          "BHW Marites talks with residents; nearby, a mother and child speak with a midwife.",
        ),
        caption: ui("Isang umaga sa barangay", "One morning in the barangay"),
      }
    : lesson?.lesson_key === "bhw-health-educator"
      ? {
          src: "/training/bhw-1-1/health-educator-c9c658e97d1e.png",
          alt: ui(
            "Nakikinig ang BHW sa kabataan, magulang na may sanggol, at nakatatanda sa isang talakayan sa barangay.",
            "A BHW listens to a young person, a parent with an infant, and an older resident at a barangay discussion.",
          ),
          caption: ui("Talakayang angkop sa kausap", "A discussion shaped around its audience"),
        }
      : lesson?.lesson_key === "bhw-community-organizer"
        ? {
            src: "/training/bhw-1-1/community-organizer-4c7f7fa5b422.png",
            alt: ui(
              "Nakikinig si BHW Marites habang tinatalakay ng mga residente at health staff ang mapa ng kanilang purok.",
              "BHW Marites listens as residents and health staff discuss a map of their neighborhood.",
            ),
            caption: ui("Sama-samang pagtalakay sa barangay", "Planning together in the barangay"),
          }
      : lesson?.lesson_key === "bhw-service-provider"
        ? {
            src: "/training/bhw-1-1/service-provider-10b884207b48.png",
            alt: ui(
              "Nakikinig si BHW Marites kay Aling Nena sa labas ng barangay health station; nasa likuran ang midwife.",
              "BHW Marites listens to Aling Nena outside a barangay health station; the midwife is in the background.",
            ),
            caption: ui("Pakikinig at paggabay kasama ang health team", "Listening and guiding with the health team"),
          }
      : null;
  const storyLayout = storyArt !== null;
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
  const featuredAsset = lesson?.revision.featured_asset_id
    ? lesson.revision.assets.find((a) => a.id === lesson.revision.featured_asset_id)
    : undefined;
  const featuredOk = !featuredAsset || Boolean(lesson && featuredWatched[lesson.id]);
  const canComplete = items.length > 0 && index === items.length - 1 && checksAnswered && featuredOk;
  const revealSummary = !item?.check || answer !== undefined;
  const promptShownInBody = item && "body_fil" in item && item.check
    ? repeatsCheckPrompt(en ? item.body_en : item.body_fil, en ? item.check.prompt_en : item.check.prompt_fil)
    : false;
  const practice = item?.check ? <Practice check={item.check} en={en} promptShownInBody={Boolean(promptShownInBody)} answer={answer}
    onAnswer={value => setAnswers(old => ({...old, [answerKey(item.id)]: value}))}/> : null;
  const figures =
    lesson && item
      ? item.asset_ids.map((id) => {
          const a = lesson.revision.assets.find((a) => a.id === id);
          return a ? <LessonAssetFigure key={a.id} asset={a} en={en} /> : null;
        })
      : null;

  function flushResume() {
    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current);
      resumeTimer.current = null;
    }
    const value = pendingResume.current;
    if (!value) return writes.current;
    pendingResume.current = null;
    // Serialize writes so a slower request cannot overwrite newer state.
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
    return writes.current;
  }
  useEffect(() => {
    flushResumeRef.current = flushResume;
  });
  useEffect(() => {
    const clearHelpWhenTurned = () => {
      if (window.matchMedia?.(`(orientation: ${orientation})`).matches) {
        setOrientationHelp(false);
      }
    };
    window.addEventListener("resize", clearHelpWhenTurned);
    return () => window.removeEventListener("resize", clearHelpWhenTurned);
  }, [orientation]);
  useEffect(() => {
    const flush = () => void flushResumeRef.current();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);
  function save(
    l: PublishedLesson,
    m: LessonModality,
    p: { id: string; concept_ids: string[] },
    immediate = false,
  ) {
    if(props.readOnly)return;
    const value: ResumeValue = {
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
    // A pending position for another lesson or mode is its own resume row;
    // write it now rather than letting this one replace it.
    const prev = pendingResume.current;
    if (prev && (prev.lesson_id !== value.lesson_id || prev.modality !== value.modality)) {
      void flushResume();
    }
    pendingResume.current = value;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    if (immediate) {
      void flushResume();
    } else {
      resumeTimer.current = setTimeout(() => void flushResume(), RESUME_SAVE_DELAY_MS);
    }
  }
  function open(l: PublishedLesson) {
    if(props.lessonBaseHref){router.push(`${props.lessonBaseHref}/${l.id}`);return;}
    setSavedMilestone(null);
    setNewlyCompletedLessonId(null);
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
  function changeMode(next: LessonModality) {
    if (!lesson || !item) return;
    move(
      lessonPosition(
        lesson,
        next,
        resumes.find((r) => r.lesson_id === lesson.id && r.modality === next),
        item.concept_ids[0],
      ),
      next,
    );
  }
  function openReader() {
    setReaderOpen(true);
    setOrientationHelp(false);
    readerDialog.current?.showModal();
    // Safari on iPhone does not expose element fullscreen. The modal itself
    // still fills the viewport and keeps the rest of the page out of view.
    const target = fullscreenTarget.current;
    if (target?.requestFullscreen) {
      void target.requestFullscreen().catch(() => {});
    }
  }
  function closeReader() {
    if (document.fullscreenElement === fullscreenTarget.current) {
      void document.exitFullscreen().catch(() => {});
    }
    readerDialog.current?.close();
    setReaderOpen(false);
    setOrientationHelp(false);
  }
  async function chooseOrientation(next: "portrait" | "landscape") {
    setOrientation(next);
    if (window.matchMedia?.(`(orientation: ${next})`).matches) {
      setOrientationHelp(false);
      return;
    }
    const orientationApi = screen.orientation as ScreenOrientation & {
      lock?: (orientation: "portrait" | "landscape") => Promise<void>;
    };
    if (document.fullscreenElement && orientationApi?.lock) {
      try {
        await orientationApi.lock(next);
        setOrientationHelp(false);
        return;
      } catch { /* Physical rotation remains available. */ }
    }
    setOrientationHelp(true);
  }
  async function complete() {
    if (!lesson || props.readOnly || pending || done.has(lesson.id) || !canComplete) return;
    setPending(true);
    setError(null);
    try {
      await flushResume();
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
      setSavedMilestone(props.completionMilestone ? { lessonId: lesson.id, ...props.completionMilestone } : null);
      setNewlyCompletedLessonId(prefersReducedMotion() ? null : lesson.id);
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
  const readerArticle = lesson && item && (
      <article
        className={storyLayout ? "reference-story" : "rounded-xl border border-ink/15 p-4 sm:p-6"}
        data-layout={"layout" in item ? item.layout : "read"}
        data-scene={item.id}
        data-lesson={lesson.lesson_key}
      >
        {storyArt && <figure className="reference-story-art">
          <Image
            src={storyArt.src}
            fill
            sizes="(max-width: 700px) 100vw, 50vw"
            alt={storyArt.alt}
            priority
          />
          <figcaption>{storyArt.caption}</figcaption>
        </figure>}
        <div className={storyLayout ? "reference-story-copy" : undefined}>
        {"display_fil" in item ? (
          <>
            <h2 tabIndex={-1} ref={heading} className={storyLayout ? "reference-story-title" : "text-xl font-semibold"}>
              {en ? item.heading_en : item.heading_fil}
            </h2>
            {practice}
            {revealSummary && <div
              className={storyLayout ? "reference-story-lines" :
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
                  <p key={i} className={storyLayout ? "reference-story-line" : "rounded-lg bg-ink/5 p-4 text-lg"}>
                    {item.layout === "process" ? (
                      <span aria-hidden="true">{i + 1}. </span>
                    ) : null}
                    {line}
                  </p>
                ))}
            </div>}
            {revealSummary && !storyLayout && figures}
          </>
        ) : (
          <ReferenceReadSection
            key={lesson.id + item.id + props.locale}
            heading={en ? item.heading_en : item.heading_fil}
            body={en ? (storyLayout && item.id === "morning" ? clarifyMorningTimes(item.body_en) : item.body_en) : item.body_fil}
            takeaway={revealSummary ? ((en ? item.takeaway_en : item.takeaway_fil) ?? "") : ""}
            narration={revealSummary ? props.narration?.[lesson.id]?.[item.id] : undefined}
            en={en}
            headingRef={heading}
          >
            {!storyLayout && figures}
            {practice}
            {!revealSummary && props.narration?.[lesson.id]?.[item.id] && <p className="mt-3 text-sm">
              {ui("Sagutin muna ang tanong para mapakinggan ang audio na may buod.", "Answer the check to unlock this section’s audio, which includes the takeaway.")}
            </p>}
          </ReferenceReadSection>
        )}
        </div>
      </article>
  );
  const readerPager = lesson && item && (
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
  );

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
            {props.lessonBaseHref ? <Link prefetch={false} className="self-start underline" href={props.returnHref??props.lessonBaseHref}>{ui("← Bumalik sa mga aralin","← Back to lessons")}</Link> : <button
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
            {featuredAsset && (
              <div className="rounded-xl border border-ink/15 p-4 sm:p-6">
                <p className="mb-1 text-sm font-semibold">
                  {ui("Panoorin", "Watch")}
                </p>
                <LessonAssetFigure
                  asset={featuredAsset}
                  en={en}
                  onEnded={() =>
                    setFeaturedWatched((old) => ({ ...old, [lesson.id]: true }))
                  }
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {(["read", "slides"] as const).map((m) => (
                <button
                  type="button"
                  className="rounded border border-ink/20 px-4 py-2"
                  key={m}
                  aria-pressed={mode === m}
                  onClick={() => changeMode(m)}
                >
                  {m === "read" ? ui("Basahin", "Read") : "Slides"}
                </button>
              ))}
              <button
                type="button"
                className="rounded border border-ink/20 px-4 py-2"
                onClick={openReader}
              >
                {ui("Buong screen", "Full screen")}
              </button>
            </div>
            {!readerOpen && <>{readerArticle}{readerPager}</>}
            {!props.readOnly && <>
            {!done.has(lesson.id) && <p id="lesson-completion-help" className="text-sm" aria-live="polite">
              {canComplete ? ui("Maaari mo nang markahang tapos ang aralin.", "You can now mark this lesson complete.") :
                !featuredOk ? ui("Panoorin muna ang video sa itaas ng aralin bago markahang tapos.", "Watch the video at the top of the lesson before marking it complete.") :
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
            {done.has(lesson.id) && <div
              role="status"
              data-celebrating={newlyCompletedLessonId === lesson.id ? "true" : undefined}
              className="lesson-completion flex items-start gap-3 rounded-xl border border-success/40 bg-success/5 p-4"
            >
              <span aria-hidden="true" className="lesson-completion-check flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-xl font-bold text-canvas">✓</span>
              <div className="min-w-0">
                <p className="font-semibold">{ui("Magaling! Natapos mo ang aralin. Naka-save ang iyong progreso.", "Well done! Lesson complete. Your progress is saved.")}</p>
                {savedMilestone?.lessonId === lesson.id && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg border border-celebration/60 bg-celebration/20 px-3 py-2 font-medium">
                    <span aria-hidden="true" className="scope-recognition-star text-primary-text">★</span>
                    <span>{savedMilestone.scope === "chapter"
                      ? ui(
                          `Tapos na ang mga aralin sa Kabanata ${savedMilestone.number}!`,
                          `Chapter ${savedMilestone.number} lessons complete!`,
                        )
                      : ui(
                          `Tapos na ang mga aralin sa subchapter ${savedMilestone.number}!`,
                          `Subchapter ${savedMilestone.number} lessons complete!`,
                        )}</span>
                  </p>
                )}
                {props.nextLessonHref ? <Link prefetch={false} className="mt-3 inline-block rounded bg-primary p-3 text-on-primary" href={props.nextLessonHref}>
                  {ui("Susunod na aralin →", "Next lesson →")}
                </Link> : props.lessonBaseHref ? <Link prefetch={false} className="mt-3 inline-block underline" href={props.returnHref??props.lessonBaseHref}>
                  {ui("Bumalik sa listahan ng mga aralin →", "Return to the lesson list →")}
                </Link> : siblings[siblings.indexOf(lesson)+1] && <button type="button" className="mt-3 rounded bg-primary p-3 text-on-primary" onClick={()=>open(siblings[siblings.indexOf(lesson)+1])}>
                  {ui("Susunod na aralin →", "Next lesson →")}
                </button>}
              </div>
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
      {error && <div role="alert"><p>{error}</p>{lesson && item && <button className="mt-2 underline" onClick={()=>save(lesson,mode,item,true)}>{ui('Subukang i-save muli','Retry saving position')}</button>}</div>}
      <dialog
        ref={readerDialog}
        aria-label={ui("Buong screen na aralin", "Full-screen lesson")}
        onClose={() => {
          if (document.fullscreenElement === fullscreenTarget.current) {
            void document.exitFullscreen().catch(() => {});
          }
          setReaderOpen(false);
          setOrientationHelp(false);
        }}
        className="fixed inset-0 m-0 h-dvh max-h-dvh w-dvw max-w-none border-0 bg-canvas p-0 text-ink backdrop:bg-black/70"
      >
        <div ref={fullscreenTarget} className="relative h-dvh w-dvw overflow-hidden bg-canvas text-ink">
          <div data-orientation={orientation} className="lesson-reader-surface flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
          <div className="lesson-reader-toolbar grid grid-cols-[1fr_auto] items-center gap-2 border-b border-ink/15 px-3 py-2">
            <div className="col-start-1 row-start-1 flex gap-2" role="group" aria-label={ui("Uri ng nilalaman", "Content mode")}>
              {(["read", "slides"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => changeMode(m)}
                  className="rounded border border-ink/25 px-3 py-2 text-sm aria-pressed:bg-primary aria-pressed:text-on-primary">
                  {m === "read" ? ui("Basahin", "Read") : "Slides"}
                </button>
              ))}
            </div>
            <div className="lesson-reader-orientation col-span-2 row-start-2 flex justify-center gap-2" role="group" aria-label={ui("Oryentasyon", "Orientation")}>
              {(["portrait", "landscape"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={orientation === value} onClick={() => void chooseOrientation(value)}
                  className="rounded border border-ink/25 px-3 py-2 text-sm aria-pressed:bg-primary aria-pressed:text-on-primary">
                  {value === "portrait" ? ui("Patayo", "Portrait") : ui("Pahiga", "Landscape")}
                </button>
              ))}
            </div>
            <button type="button" onClick={closeReader} className="lesson-reader-close col-start-2 row-start-1 justify-self-end rounded border border-ink/25 px-3 py-2 text-sm">
              {ui("Isara", "Close")}
            </button>
          </div>
          {orientationHelp && <p role="status" className="px-4 py-2 text-sm">
            {orientation === "landscape"
              ? ui("I-rotate ang device nang pahiga para mabasa ang nilalaman.", "Turn your device sideways to read the content.")
              : ui("I-rotate ang device nang patayo para mabasa ang nilalaman.", "Turn your device upright to read the content.")}
          </p>}
          {readerOpen && lesson && item && (storyLayout ? <div className="reference-story-presenter">
            <div
              className="reference-story-presenter-content"
              role="region"
              tabIndex={0}
              aria-label={ui("Nilalaman ng aralin", "Lesson content")}
            >{readerArticle}</div>
            <div className="reference-story-presenter-pager">{readerPager}</div>
          </div> : <FittedLessonPage
            key={`${lesson.id}:${mode}:${item.id}:${orientation}`}
            content={readerArticle}
            pager={readerPager}
            maxContentWidth={orientation === "portrait" ? 720 : 1800}
            en={en}
          />)}
          </div>
        </div>
      </dialog>
    </section>
  );
}
