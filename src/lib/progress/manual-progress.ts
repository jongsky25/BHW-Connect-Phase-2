// Learner progress through a training program (the BHW Reference Manual):
// whole manual → chapter → subchapter → lesson. Pure; the fetcher lives in
// ./load-manual-progress.ts. Counting rules: docs/bhw-progress-plan.md §5.

export type ProgressState =
  | "unavailable"
  | "coming_soon"
  | "not_started"
  | "in_progress"
  | "ready_for_assessment"
  | "retake_assessment"
  | "completed"
  | "certified";

export type LessonState = "not_started" | "in_progress" | "completed";
export type StepKey = "pretest" | "lessons" | "posttest" | "certificate";
export type StepState = "done" | "current" | "todo" | "skipped" | "retake";

export type Counts = { done: number; total: number; percent: number };

type Titled = { title_fil: string; title_en: string };

export type ManualProgressInput = {
  program: Titled & { id: string; content_key: string };
  chapters: Array<
    Titled & {
      id: string;
      chapter_key: string;
      position: number;
      course_id: string | null;
      availability: "unavailable" | "available";
    }
  >;
  /** Ids of chapter courses that are published; others count as unavailable. */
  publishedCourseIds: string[];
  modules: Array<Titled & { id: string; course_id: string; position: number; type: string }>;
  /** Published lessons only (published_revision_id not null). */
  lessons: Array<Titled & { id: string; module_id: string; position: number; required: boolean }>;
  courseProgress: Array<{ course_id: string; status: string }>;
  completedLessonIds: string[];
  resumes: Array<{ lesson_id: string; updated_at: string }>;
  attempts: Array<{ course_id: string; phase: "pretest" | "posttest" }>;
  certificates: Array<{ course_id: string; verification_code: string }>;
  /** Courses that have a pre/post-test question bank. */
  questionBankCourseIds: string[];
};

export type LessonProgress = Titled & { id: string; number: number; state: LessonState; href: string };

export type SubchapterProgress = Titled & {
  id: string;
  number: string;
  state: ProgressState;
  counts: Counts;
  href: string;
  lessons: LessonProgress[];
};

export type ChapterStep = { key: StepKey; state: StepState };

export type ChapterProgress = Titled & {
  id: string;
  key: string;
  number: number;
  state: ProgressState;
  counts: Counts;
  href: string | null;
  subchapters: SubchapterProgress[];
  steps: ChapterStep[];
  certificateCode: string | null;
};

export type ContinueTarget = Titled & { href: string; chapterNumber: number; subchapterNumber: string };

export type ManualProgress = Titled & {
  programId: string;
  contentKey: string;
  state: ProgressState;
  counts: Counts;
  chapters: ChapterProgress[];
  continueTo: ContinueTarget | null;
};

export function counts(done: number, total: number): Counts {
  if (total === 0) return { done: 0, total: 0, percent: 0 };
  const raw = Math.round((done / total) * 100);
  // Never show 100% until the last lesson is actually done.
  return { done, total, percent: done < total ? Math.min(raw, 99) : 100 };
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export function summariseManualProgress(input: ManualProgressInput): ManualProgress {
  const done = new Set(input.completedLessonIds);
  const requiredIds = new Set(input.lessons.filter((l) => l.required).map((l) => l.id));
  const resumed = new Set(input.resumes.map((r) => r.lesson_id));
  const published = new Set(input.publishedCourseIds);
  const base = `/training/${input.program.id}`;

  const chapters = [...input.chapters].sort(byPosition).map((chapter): ChapterProgress => {
    const number = chapter.position + 1;
    const available = chapter.availability === "available" && !!chapter.course_id && published.has(chapter.course_id);
    const chapterHref = `${base}/${chapter.chapter_key}`;
    const shell = {
      id: chapter.id,
      key: chapter.chapter_key,
      number,
      title_fil: chapter.title_fil,
      title_en: chapter.title_en,
    };
    if (!available) {
      return {
        ...shell,
        state: "unavailable",
        counts: counts(0, 0),
        href: null,
        subchapters: [],
        steps: [],
        certificateCode: null,
      };
    }

    const courseId = chapter.course_id!;
    const subchapters = input.modules
      .filter((m) => m.course_id === courseId && m.type !== "quiz")
      .sort(byPosition)
      .map((m, i): SubchapterProgress => {
        const href = `${chapterHref}/${m.id}`;
        const lessons = input.lessons
          .filter((l) => l.module_id === m.id)
          .sort(byPosition)
          .map((l, j): LessonProgress => ({
            id: l.id,
            number: j + 1,
            title_fil: l.title_fil,
            title_en: l.title_en,
            href: `${href}/${l.id}`,
            state: done.has(l.id) ? "completed" : resumed.has(l.id) ? "in_progress" : "not_started",
          }));
        const required = lessons.filter((l) => requiredIds.has(l.id));
        const c = counts(required.filter((l) => l.state === "completed").length, required.length);
        const state: ProgressState =
          lessons.length === 0
            ? "coming_soon"
            : c.total > 0 && c.done === c.total
              ? "completed"
              : lessons.some((l) => l.state !== "not_started")
                ? "in_progress"
                : "not_started";
        return {
          id: m.id,
          number: `${number}.${i + 1}`,
          title_fil: m.title_fil,
          title_en: m.title_en,
          state,
          counts: c,
          href,
          lessons,
        };
      });

    const c = counts(
      subchapters.reduce((n, s) => n + s.counts.done, 0),
      subchapters.reduce((n, s) => n + s.counts.total, 0),
    );
    const status = input.courseProgress.find((p) => p.course_id === courseId)?.status ?? null;
    const certificate = input.certificates.find((x) => x.course_id === courseId) ?? null;
    const hasBank = input.questionBankCourseIds.includes(courseId);
    const pretest = input.attempts.some((a) => a.course_id === courseId && a.phase === "pretest");
    const posttest = input.attempts.some((a) => a.course_id === courseId && a.phase === "posttest");
    // A course_progress row is only created once the BHW opens a lesson, so it
    // also counts as started — the supervisor view has no resume points.
    const started =
      status === "in_progress" || c.done > 0 || pretest || subchapters.some((s) => s.state === "in_progress");

    const certified = !!certificate || status === "certified";
    const state: ProgressState = certified
      ? "certified"
      : status === "failed_assessment"
        ? "retake_assessment"
        : status === "content_completed"
          ? "ready_for_assessment"
          : c.total === 0
            ? "coming_soon"
            : c.done === c.total
              ? "completed"
              : started
                ? "in_progress"
                : "not_started";

    const lessonsDone = (c.total > 0 && c.done === c.total) || status === "content_completed" || certified;
    const assessed = posttest || certified || status === "failed_assessment";
    const steps: ChapterStep[] = [
      { key: "pretest", state: !hasBank ? "skipped" : pretest || certified ? "done" : "current" },
      {
        key: "lessons",
        state: lessonsDone ? "done" : !hasBank || pretest ? "current" : "todo",
      },
      {
        key: "posttest",
        state: !hasBank
          ? "skipped"
          : status === "failed_assessment"
            ? "retake"
            : assessed
              ? "done"
              : lessonsDone
                ? "current"
                : "todo",
      },
      {
        key: "certificate",
        state: certified ? "done" : lessonsDone && (!hasBank || posttest) ? "current" : "todo",
      },
    ];
    // Only one step is "current": the first one that is.
    let seenCurrent = false;
    for (const step of steps) {
      if (step.state !== "current") continue;
      if (seenCurrent) step.state = "todo";
      seenCurrent = true;
    }

    return {
      ...shell,
      state,
      counts: c,
      href: chapterHref,
      subchapters,
      steps,
      certificateCode: certificate?.verification_code ?? null,
    };
  });

  const available = chapters.filter((c) => c.state !== "unavailable");
  const total = counts(
    available.reduce((n, ch) => n + ch.counts.done, 0),
    available.reduce((n, ch) => n + ch.counts.total, 0),
  );
  const state: ProgressState =
    available.length === 0
      ? "unavailable"
      : total.total === 0
        ? "coming_soon"
        : available.every((ch) => ch.state === "certified")
          ? "certified"
          : total.done === total.total
            ? // Every lesson is done, so the next step is an assessment, if any.
              available.some((ch) => ch.state === "retake_assessment")
              ? "retake_assessment"
              : available.some((ch) => ch.state === "ready_for_assessment")
                ? "ready_for_assessment"
                : "completed"
            : available.some((ch) => ch.state !== "not_started" && ch.state !== "coming_soon")
              ? "in_progress"
              : "not_started";

  return {
    programId: input.program.id,
    contentKey: input.program.content_key,
    title_fil: input.program.title_fil,
    title_en: input.program.title_en,
    state,
    counts: total,
    chapters,
    continueTo: continueTarget(available, input.resumes, input.lessons),
  };
}

// Same rule as continueLesson() in src/lib/elearning/reference-navigation.ts,
// applied across the whole manual: the most recently resumed unfinished
// lesson, else the first unfinished required lesson in reading order.
function continueTarget(
  chapters: ChapterProgress[],
  resumes: ManualProgressInput["resumes"],
  lessons: ManualProgressInput["lessons"],
): ContinueTarget | null {
  const required = new Set(lessons.filter((l) => l.required).map((l) => l.id));
  const ordered = chapters.flatMap((ch) =>
    ch.subchapters.flatMap((s) => s.lessons.map((l) => ({ ch, s, l }))),
  );
  const unfinished = ordered.filter((x) => x.l.state !== "completed");
  const recent = [...resumes]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((r) => unfinished.find((x) => x.l.id === r.lesson_id))
    .find(Boolean);
  const pick = recent ?? unfinished.find((x) => required.has(x.l.id));
  if (!pick) return null;
  return {
    title_fil: pick.l.title_fil,
    title_en: pick.l.title_en,
    href: pick.l.href,
    chapterNumber: pick.ch.number,
    subchapterNumber: pick.s.number,
  };
}
