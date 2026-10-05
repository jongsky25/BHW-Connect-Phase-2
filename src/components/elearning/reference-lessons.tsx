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
import { translateLesson, translationMatchesLesson, type LessonTranslation, type LessonText } from "@/lib/elearning/lesson-translation";

type ResumeValue = Omit<CourseLessonResume, "course_progress_id" | "updated_at">;
const RESUME_SAVE_DELAY_MS = 3000;

// The pilot database still has the first published wording. Render its
// explicit clock times while the new authored revision awaits a national
// course publisher. Once that revision is published, this is a no-op.
function clarifyMorningTimes(body: string) {
  if (!/^At eight, BHW (Marites|Riza)\b/.test(body)) return body;
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
  translations?: LessonTranslation[];
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

function Practice({ check, en, ui, promptShownInBody, answer, onAnswer }: { check: LessonCheck; en: boolean; ui: LessonText; promptShownInBody: boolean; answer: number | undefined; onAnswer: (answer: number) => void }) {
  return (
    <fieldset className="mt-5 rounded-lg border border-ink/20 p-4">
      <legend className="font-semibold">
        {promptShownInBody ? ui("Pumili ng sagot", "Choose an answer") : en ? check.prompt_en : check.prompt_fil}
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
              ? ui("Tama!", "Correct!")
              : ui("Hindi pa tama. Subukang muli.", "Not quite. Try again.")}
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
  const [translationLanguage, setTranslationLanguage] = useState<string | null>(null);
  const router=useRouter();
  const initial=lessons.find(l=>l.id===props.initialLessonId);
  const initialResume=props.resumes.filter(r=>r.lesson_id===initial?.id).sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0];
  const [selected, setSelected] = useState<string | null>(props.initialLessonId??null);
  const startingMode=props.initialMode??initialResume?.modality??"read";
  const startingResume=props.resumes.filter(r=>r.lesson_id===initial?.id&&r.modality===startingMode)
    .sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0];
  const [mode, setMode] = useState<LessonModality>(startingMode);
  // Video is a view of the featured asset, not a resume modality in the DB.
  const [videoSelected, setVideoSelected] = useState(false);
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
  const sourceLesson = lessons.find((l) => l.id === selected);
  const availableTranslations = sourceLesson ? (props.translations ?? []).filter(translation =>
    (props.readOnly || translation.review_status === "approved") && translationMatchesLesson(sourceLesson, translation)) : [];
  const translation = availableTranslations.find(value => value.language === translationLanguage);
  const lesson = sourceLesson && translation ? translateLesson(sourceLesson, translation) : sourceLesson;
  const ui: LessonText = (fil, eng) => translation?.ui[fil] ?? (en ? eng : fil);
  const lessonNarration = translation ? translation.narration : (lesson ? props.narration?.[lesson.id] : undefined);
  const sourceStoryArt = lesson?.lesson_key === "bhw-roles-hepo"
    ? {
        src: "/training/bhw-1-1/scene-8cdb1498a723.png",
        alt: translation?.story_art.alt ?? ui(
          "Si BHW Riza ay nakikipag-usap sa mga residente; sa tabi niya, isang ina at anak ang kausap ang midwife.",
          "BHW Riza talks with residents; nearby, a mother and child speak with a midwife.",
        ),
        caption: translation?.story_art.caption ?? ui("Isang umaga sa barangay", "One morning in the barangay"),
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
              "Nakikinig si BHW Riza habang tinatalakay ng mga residente at health staff ang mapa ng kanilang purok.",
              "BHW Riza listens as residents and health staff discuss a map of their neighborhood.",
            ),
            caption: ui("Sama-samang pagtalakay sa barangay", "Planning together in the barangay"),
          }
      : lesson?.lesson_key === "bhw-service-provider"
        ? {
            src: "/training/bhw-1-1/service-provider-10b884207b48.png",
            alt: ui(
              "Nakikinig si BHW Riza kay Aling Nena sa labas ng barangay health station; nasa likuran ang midwife.",
              "BHW Riza listens to Aling Nena outside a barangay health station; the midwife is in the background.",
            ),
            caption: ui("Pakikinig at paggabay kasama ang health team", "Listening and guiding with the health team"),
          }
      : lesson?.lesson_key === "bhw-records"
        ? {
            src: "/training/bhw-1-1/records-2a1725eaf243.png",
            alt: ui(
              "Magkasamang tumitingin sina BHW Riza at ang midwife sa mga blangkong folder sa health station; walang nakikitang personal na datos.",
              "BHW Riza and the midwife look at blank folders together in the health station; no personal data is visible.",
            ),
            caption: ui("Pagpili at paglinaw ng tala kasama ang health team", "Choosing and checking a record with the health team"),
          }
      : lesson?.lesson_key === "bhw-roles-application"
        ? {
            src: "/training/bhw-1-1/roles-application-328d2317d8fd.png",
            alt: ui(
              "Si BHW Riza ay nag-uulat sa midwife gamit ang blangkong notebook habang nakikinig ang isang residente.",
              "BHW Riza reports to the midwife using a blank notebook while a resident listens.",
            ),
            caption: ui("Nakita · Ginawa · Kailangan", "Observed · Done · Needed"),
          }
      : lesson?.lesson_key === "uhc-coverage"
        ? {
            src: "/training/bhw-1-2/vlanche-ernesto-7e4e35141628.png",
            alt: ui(
              "Nakikinig si BHW Vlanche kay Mang Ernesto sa labas ng barangay health station habang nagtatanong siya tungkol sa konsulta.",
              "BHW Vlanche listens to Mang Ernesto outside a barangay health station as he asks about a consultation.",
            ),
            caption: ui("Ang tanong ni Mang Ernesto tungkol sa UHC", "Mang Ernesto's question about UHC"),
          }
      : lesson?.lesson_key === "uhc-primary-care"
        ? {
            src: "/training/bhw-1-2/primary-care-next-step-a67521f903c0.png",
            alt: ui(
              "Kinukumpirma nina BHW Vlanche at Mang Ernesto ang susunod na hakbang kasama ang midwife sa health station, gamit ang isang blangkong tala.",
              "BHW Vlanche and Mang Ernesto confirm the next step with a midwife at the health station, using a blank note.",
            ),
            caption: ui("Tiyakin ang susunod na hakbang", "Confirm the next step"),
          }
      : lesson?.lesson_key === "bhs-promotions"
        ? {
            src: "/training/bhw-1-3/mimi-company-offer-b9623263a188.png",
            alt: ui("Nakikinig si BHW Mimi sa kinatawan ng kumpanya at mahinahong ipinapahinto ang pagtanggap ng blangkong sample box at promotional sheet sa BHS.", "BHW Mimi listens to a company representative and calmly pauses acceptance of a blank sample box and promotional sheet at the BHS."),
            caption: ui("Kilalanin · Huminto · Idulog", "Recognize · Pause · Refer"),
          }
      : lesson?.lesson_key === "uhc-local-system"
        ? { src: "/training/bhw-1-2/local-system-observation-13c689fa5226.png", alt: ui("Tinatalakay nina BHW Vlanche, Mang Ernesto at ng midwife ang paulit-ulit na tanong ng mga residente gamit ang blangkong tala sa BHS.", "BHW Vlanche, Mang Ernesto and the midwife discuss recurring resident questions using a blank note at the BHS."), caption: ui("Obserbasyon · mensahe · follow-up", "Observation · message · follow-up") }
      : lesson?.lesson_key === "uhc-improvement"
        ? {
            src: "/training/bhw-1-2/improvement-planning-f1afe0f4a1e5.png",
            alt: ui("Inaayos ni BHW Vlanche ang tatlong blangkong card kasama ang midwife at si Mang Ernesto para sa isang maliit na plano.", "BHW Vlanche arranges three blank cards with the midwife and Mang Ernesto for a small plan."),
            caption: ui("Isang maliit na plano, pinag-uusapan", "One small plan, discussed together"),
          }
      : lesson?.lesson_key === "bhs-decline"
        ? {src: "/training/bhw-1-3/mimi-respectful-refusal-7f71c23bc4bb.png", alt: ui("Malinaw at magalang na tumatanggi si Mimi sa alok.", "Mimi clearly and respectfully declines the offer."), caption: ui("Tumanggi · Ipaliwanag · Iulat", "Decline · Explain · Report")}
      : lesson?.lesson_key === "bhs-support-environment"
        ? {
            src: "/training/bhw-1-3/mimi-support-environment-d1e6bcec9846.png",
            alt: ui("Magalang na nakikinig si BHW Mimi sa magulang na may kargang sanggol sa health station.", "BHW Mimi respectfully listens to a parent holding an infant at the health station."),
            caption: ui("Makinig · kumpirmahin · umalalay", "Listen · confirm · support"),
          }
      : lesson?.lesson_key === "bhw-benefits" && lesson.revision.assets.some(asset => asset.id === "demi-benefits-conditions")
        ? {src: "/training/bhw-1-4/demi-benefits-conditions-2f0be96fe3d8.png", alt: ui("Tinatalakay ni Demi at ng kasamahan ang tanong tungkol sa benepisyo gamit ang dalawang blankong question sheets.", "Demi and a colleague discuss a benefits question using two blank question sheets."), caption: ui("Benepisyo · Kondisyon · Verification", "Benefit · Conditions · Verification")}
      : lesson?.lesson_key === "bhw-legal-role" && lesson.revision.assets.some(asset => asset.id === "demi-legal-basis")
        ? {src: "/training/bhw-1-4/demi-legal-basis-032a985f9c33.png", alt: ui("Nagtatanong si Demi sa health-team support person sa mesa ng health station; blanko ang learning sheet.", "Demi asks a health-team support person a question at a health-station desk; the learning sheet is blank."), caption: ui("Unawain ang batayan. Tiyakin ang katayuan.", "Understand the basis. Verify status.")}
      : lesson?.lesson_key === "bhs-improvement"
        ? {src: "/training/bhw-1-3/mimi-workable-suggestion-8e880add36c1.png", alt: ui("Tinatalakay ni BHW Mimi ang isang mungkahing checklist kasama ang lokal na responsable sa meeting area.", "BHW Mimi discusses a proposed checklist with the local person responsible for the meeting area."), caption: ui("Isang mungkahi · Tiyakin ang saklaw · Magkasundo sa follow-up", "One proposal · Check authority · Agree on follow-up")}
      : lesson?.lesson_key === "bhs-resources"
        ? {src: "/training/bhw-1-3/mimi-resource-use-86ce5a9071e0.png", alt: ui("Tinatalakay ni Mimi ang resource concern sa namamahala.", "Mimi discusses the resource concern with the supervisor."), caption: ui("Obserbasyon · Tuntunin · Pakikipag-ugnayan", "Observation · Rule · Coordination")}
      : null;
  const storyArt = sourceStoryArt && translation ? { ...sourceStoryArt, ...translation.story_art } : sourceStoryArt;
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
  const featuredVideo = featuredAsset && (featuredAsset.video || featuredAsset.videos) ? featuredAsset : undefined;
  const narratedStory = Boolean(featuredVideo?.videos);
  const storyVideoPrompt = narratedStory && index === 0 && Boolean(item);
  const videoLabel = narratedStory
    ? ui("Kuwentong may salaysay", "Narrated story")
    : "Video";
  const canComplete = items.length > 0 && index === items.length - 1 && checksAnswered;
  const revealSummary = !item?.check || answer !== undefined;
  const promptShownInBody = item && "body_fil" in item && item.check
    ? repeatsCheckPrompt(en ? item.body_en : item.body_fil, en ? item.check.prompt_en : item.check.prompt_fil)
    : false;
  const practice = item?.check ? <Practice check={item.check} en={en} ui={ui} promptShownInBody={Boolean(promptShownInBody)} answer={answer}
    onAnswer={value => setAnswers(old => ({...old, [answerKey(item.id)]: value}))}/> : null;
  const figures =
    lesson && item
      ? item.asset_ids.map((id) => {
          const a = lesson.revision.assets.find((a) => a.id === id);
          return a ? <LessonAssetFigure key={a.id} asset={a} en={en} language={translation?.language} /> : null;
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
    setVideoSelected(false);
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
    setVideoSelected(false);
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
    if (lesson?.lesson_key === "bhw-benefits" || lesson?.lesson_key === "bhw-legal-role" || lesson?.lesson_key === "bhs-support-environment" || lesson?.lesson_key === "bhs-resources" || lesson?.lesson_key === "bhs-improvement") {
      setOrientation(window.matchMedia?.("(orientation: landscape)")?.matches ? "landscape" : "portrait");
    }
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
        lang={translation?.language ?? (en ? "en" : "fil")}
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
        {storyVideoPrompt && <button type="button"
          className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-left font-semibold text-primary-text hover:bg-primary/20"
          onClick={() => setVideoSelected(true)}>
          {ui("▶ Panoorin ang animadong kuwento na may salaysay", "▶ Watch the animated narrated story")}
        </button>}
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
            key={lesson.id + item.id + props.locale + (translation?.language ?? "")}
            heading={en ? item.heading_en : item.heading_fil}
            body={en ? (storyLayout && item.id === "morning" ? clarifyMorningTimes(item.body_en) : item.body_en) : item.body_fil}
            takeaway={revealSummary ? ((en ? item.takeaway_en : item.takeaway_fil) ?? "") : ""}
            narration={revealSummary ? lessonNarration?.[item.id] : undefined}
            en={en}
            text={ui}
            headingRef={heading}
          >
            {!storyLayout && figures}
            {practice}
            {!revealSummary && lessonNarration?.[item.id] && <p className="mt-3 text-sm">
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
  const videoContent = featuredVideo && lesson && (
    <div className="reference-story-player rounded-xl border border-ink/15 p-4 sm:p-6" data-lesson={lesson.lesson_key}>
      <p className="mb-1 text-sm font-semibold">{narratedStory ? videoLabel : ui("Panoorin", "Watch")}</p>
      {narratedStory && <p className="text-sm">
        {ui("Pindutin ang Play para marinig ang salaysay sa napiling wika.", "Press Play to hear the story in your selected language.")}
      </p>}
      <LessonAssetFigure
        asset={featuredVideo}
        en={en}
        language={translation?.language}
      />
    </div>
  );

  return (
    <section
      className="flex flex-col gap-4"
      lang={translation?.language ?? (en ? "en" : "fil")}
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
              {(lesson.lesson_key === "bhw-benefits" || lesson.lesson_key === "bhw-legal-role" || lesson.lesson_key === "bhs-resources" || lesson.lesson_key === "bhs-improvement") ? ui(
                "Tinatayang 10 minuto para sa sariling pag-aaral; dagdag ang opsyonal na kuwento at hiwalay ang gabay na pagsasanay.",
                "Estimated 10 minutes for independent study; the optional story is additional and facilitated practice is separate.",
              ) : ui(
                "Tinatayang 3–7 minuto para sa sariling pag-aaral; hiwalay ang gabay na pagsasanay.",
                "Estimated 3–7 minutes for independent study; facilitated practice is separate.",
              )}
            </p>
            <ul>
              {(en ? lesson.objectives_en : lesson.objectives_fil).map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            {availableTranslations.length > 0 && <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {ui("Wika ng aralin", "Lesson language")}
              <select className="min-h-[44px] rounded border border-ink/20 bg-canvas px-3"
                value={translation?.language ?? ""} onChange={event => setTranslationLanguage(event.target.value || null)}>
                <option value="">{en ? "English" : "Filipino"}</option>
                {availableTranslations.map(value => <option key={value.language} value={value.language}>{value.label}</option>)}
              </select>
            </label>}
            {translation?.review_status === "draft" && <p role="status" className="rounded border border-ink/20 px-3 py-2 text-sm">
              {ui("Draft para sa pagsusuri ng salin at pagbigkas.", "Draft for translation and pronunciation review.")}
            </p>}
            <div className="flex flex-wrap gap-2" role="group" aria-label={ui("Uri ng nilalaman", "Content mode")}>
              {(["read", "slides"] as const).map((m) => (
                <button
                  type="button"
                  className="rounded border border-ink/20 px-4 py-2 aria-pressed:bg-primary aria-pressed:text-on-primary"
                  key={m}
                  aria-pressed={!videoSelected && mode === m}
                  onClick={() => changeMode(m)}
                >
                  {m === "read" ? ui("Basahin", "Read") : ui("Slides", "Slides")}
                </button>
              ))}
              {featuredVideo && <button type="button"
                className="rounded border border-ink/20 px-4 py-2 aria-pressed:bg-primary aria-pressed:text-on-primary"
                aria-pressed={videoSelected} onClick={() => setVideoSelected(true)}>
                {videoLabel}
              </button>}
              <button
                type="button"
                className="rounded border border-ink/20 px-4 py-2"
                onClick={openReader}
              >
                {ui("Buong screen", "Full screen")}
              </button>
            </div>
            {!readerOpen && (videoSelected ? videoContent : <>{readerArticle}{readerPager}</>)}
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
                <button key={m} type="button" aria-pressed={!videoSelected && mode === m} onClick={() => changeMode(m)}
                  className="rounded border border-ink/25 px-3 py-2 text-sm aria-pressed:bg-primary aria-pressed:text-on-primary">
                  {m === "read" ? ui("Basahin", "Read") : ui("Slides", "Slides")}
                </button>
              ))}
              {featuredVideo && <button type="button" aria-pressed={videoSelected} onClick={() => setVideoSelected(true)}
                className="rounded border border-ink/25 px-3 py-2 text-sm aria-pressed:bg-primary aria-pressed:text-on-primary">
                {videoLabel}
              </button>}
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
          {readerOpen && lesson && item && (videoSelected ? <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{videoContent}</div> : storyLayout ? <div className="reference-story-presenter">
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
