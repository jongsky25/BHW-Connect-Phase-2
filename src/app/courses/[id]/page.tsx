import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CourseDetail } from "@/components/elearning/course-detail";
import type { ReferenceData } from "@/components/elearning/reference-lessons";
import type { CourseLesson, CourseLessonRevision, CourseLessonProgress, CourseLessonResume, TrainingProgramChapter } from "@/lib/elearning/types";
import type {
  CourseModule,
  CourseModuleAudio,
  CourseModuleVisual,
  CourseProgressStatus,
  CourseTestAttempt,
  CourseTestQuestion,
  LessonDensity,
  ModuleProgress,
  QuizQuestion,
} from "@/lib/elearning/types";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.elearning) {
    redirect("/home");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getAppUser(supabase, user.id);
  if (!appUser) {
    redirect("/login");
  }

  const locale = await getLocale();
  const tCourses = await getTranslations("courses");
  const tCrumbs = await getTranslations("breadcrumbs");

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title_fil, title_en, description_fil, description_en, quiz_max_attempts, status",
    )
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!course) {
    notFound();
  }

  const { data: modules } = await supabase
    .from("course_modules")
    .select(
      "id, course_id, position, type, title_fil, title_en, body_fil, body_en, video_url, objectives_fil, objectives_en, summary_fil, summary_en, lesson",
    )
    .eq("course_id", id)
    .order("position")
    .returns<CourseModule[]>();

  const quizModuleIds = (modules ?? [])
    .filter((m) => m.type === "quiz")
    .map((m) => m.id);
  const moduleIds = (modules ?? []).map((m) => m.id);

  const { data: questions } =
    quizModuleIds.length > 0
      ? await supabase
          .from("course_quiz_questions")
          .select(
            "id, module_id, position, prompt_fil, prompt_en, options, correct_option_index",
          )
          .in("module_id", quizModuleIds)
          .order("position")
          .returns<QuizQuestion[]>()
      : { data: [] as QuizQuestion[] };

  const { data: visuals } =
    moduleIds.length > 0
      ? await supabase
          .from("course_module_visuals")
          .select(
            "id, module_id, position, primitive, svg_markup, image_url, caption_fil, caption_en, alt_text_fil, alt_text_en, tier",
          )
          .in("module_id", moduleIds)
          .order("position")
          .returns<CourseModuleVisual[]>()
      : { data: [] as CourseModuleVisual[] };

  const { data: audios } =
    moduleIds.length > 0
      ? await supabase
          .from("course_module_audio")
          .select(
            "id, module_id, section_index, language, audio_url, format, duration_seconds, content_hash, timings",
          )
          .in("module_id", moduleIds)
          .returns<CourseModuleAudio[]>()
      : { data: [] as CourseModuleAudio[] };

  // §A.6/INC-22: the BHW's own session for this course, if any — the
  // course_sessions_bhw_read RLS policy already restricts this to sessions
  // the BHW is actually enrolled in. Only queried when course_sessions is
  // on; feature flags gate the UI/route layer only, never an RPC, so the
  // schema itself has no such gate (docs/training-modules-plan.md).
  const { data: session } = flags.course_sessions
    ? await supabase
        .from("course_sessions")
        .select("id, lesson_density")
        .eq("course_id", id)
        .maybeSingle<{ id: string; lesson_density: LessonDensity }>()
    : { data: null };

  const density: LessonDensity = session?.lesson_density ?? "normal";
  const sessionId = session?.id ?? null;

  const { data: testQuestions } = flags.course_sessions
    ? await supabase
        .from("course_test_questions")
        .select(
          "id, course_id, position, prompt_fil, prompt_en, options, correct_option_index",
        )
        .eq("course_id", id)
        .order("position")
        .returns<CourseTestQuestion[]>()
    : { data: [] as CourseTestQuestion[] };

  const { data: testAttempts } = flags.course_sessions
    ? await supabase
        .from("course_test_attempts")
        .select("id, course_id, session_id, phase, score_percent, taken_at")
        .eq("course_id", id)
        .returns<CourseTestAttempt[]>()
    : { data: [] as CourseTestAttempt[] };

  const { data: progress } = await supabase
    .from("course_progress")
    .select("id, status")
    .eq("course_id", id)
    .maybeSingle<{ id: string; status: CourseProgressStatus }>();

  const { data: moduleProgress } = progress
    ? await supabase
        .from("course_module_progress")
        .select("module_id, completed_at, quiz_score, quiz_attempts")
        .eq("course_progress_id", progress.id)
        .returns<ModuleProgress[]>()
    : { data: [] as ModuleProgress[] };

  const { data: certificate } =
    progress?.status === "certified"
      ? await supabase
          .from("certificates")
          .select("verification_code")
          .eq("course_id", id)
          .maybeSingle<{ verification_code: string }>()
      : { data: null };

  // Opt in only for a published mapped program. Private facilitator notes are
  // deliberately absent from every learner query and serialized prop.
  let reference: ReferenceData | undefined;
  const {data: chapter, error: chapterError} = await supabase.from('training_program_chapters')
    .select('program_id').eq('course_id',id).eq('availability','available').maybeSingle();
  if (chapterError) throw new Error('Unable to load training hierarchy');
  if(chapter && moduleIds.length) {
    const {data: program,error: programError} = await supabase.from('training_programs')
      .select('id,title_fil,title_en').eq('id',chapter.program_id).eq('status','published').maybeSingle();
    if(programError)throw new Error('Unable to load training program');
    if(program) {
      const [chapterResult, lessonResult, completedResult, resumeResult] = await Promise.all([
        supabase.from('training_program_chapters').select('*').eq('program_id',program.id).order('position').returns<TrainingProgramChapter[]>(),
        supabase.from('course_lessons').select('*').in('module_id',moduleIds).not('published_revision_id','is',null).order('position').returns<CourseLesson[]>(),
        progress ? supabase.from('course_lesson_progress').select('*').eq('course_progress_id',progress.id).returns<CourseLessonProgress[]>() : Promise.resolve({data:[],error:null}),
        progress ? supabase.from('course_lesson_resume').select('*').eq('course_progress_id',progress.id).returns<CourseLessonResume[]>() : Promise.resolve({data:[],error:null}),
      ]);
      if([chapterResult,lessonResult,completedResult,resumeResult].some(r=>r.error))throw new Error('Unable to load lesson state');
      const lessonRows=lessonResult.data??[];
      if(lessonRows.length) {
        const {data: revisions,error} = await supabase.from('course_lesson_revisions')
          .select('id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,created_by,created_at')
          .in('id',lessonRows.map(l=>l.published_revision_id!)).returns<CourseLessonRevision[]>();
        if(error || lessonRows.some(l=>!revisions?.some(r=>r.id===l.published_revision_id)))throw new Error('Unable to load published lesson revisions');
        reference={...program,chapters:chapterResult.data??[],completed:completedResult.data??[],resumes:resumeResult.data??[],
          lessons:modules!.flatMap(m=>lessonRows.filter(l=>l.module_id===m.id).map(l=>({...l,revision:revisions!.find(r=>r.id===l.published_revision_id)!})))};
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: tCrumbs("home"), href: "/home" },
          { label: tCourses("heading"), href: "/courses" },
          { label: locale === "en" ? course.title_en : course.title_fil },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {reference ? (locale === 'en' ? reference.title_en : reference.title_fil) : (locale === "en" ? course.title_en : course.title_fil)}
        </h1>
        {(locale === "en" ? course.description_en : course.description_fil) ? (
          <p className="mt-1 text-ink/70">
            {locale === "en" ? course.description_en : course.description_fil}
          </p>
        ) : null}
      </div>

      <CourseDetail
        reference={reference}
        courseId={course.id}
        quizMaxAttempts={course.quiz_max_attempts}
        modules={modules ?? []}
        questions={questions ?? []}
        visuals={visuals ?? []}
        audios={audios ?? []}
        testQuestions={testQuestions ?? []}
        testAttempts={testAttempts ?? []}
        density={density}
        sessionId={sessionId}
        progressStatus={progress?.status ?? null}
        moduleProgress={moduleProgress ?? []}
        certificateCode={certificate?.verification_code ?? null}
        locale={locale}
      />
    </div>
  );
}
