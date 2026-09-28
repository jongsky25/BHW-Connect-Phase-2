/** AF-01 pure contract. Input evidence must come from trusted server records.
 * This is not a grant of authority; mutation RPCs must recheck all prerequisites.
 * Candidate progression is intentionally separate from BHW certification.
 */
export type CurriculumIdentity = { programKey: string; chapterKey: string; version: string };
export type ExamRequirement = { id: string; passingPercent: number };
export type ChapterRequirements = CurriculumIdentity & {
  requiredLessonIds: string[];
  exams: ExamRequirement[];
};
export type CandidateEvidence = CurriculumIdentity & {
  availableLessonIds: string[];
  completedLessonIds: string[];
  pretestRecorded: boolean;
  // Preserve attempts: a failed retry never erases a valid pass for this version.
  attempts: { examId: string; scorePercent: number }[];
};
export type CandidateState = "unavailable" | "pretest" | "learning" | "exams" | "orientation_ready";

const sameIdentity = (a: CurriculumIdentity, b: CurriculumIdentity) =>
  a.programKey === b.programKey && a.chapterKey === b.chapterKey && a.version === b.version;

export function candidateReadiness(requirements: ChapterRequirements, evidence: CandidateEvidence) {
  const { requiredLessonIds, exams } = requirements;
  const available = new Set(evidence.availableLessonIds);
  const complete = new Set(evidence.completedLessonIds);
  const missingContent = requiredLessonIds.filter(id => !available.has(id));
  const remainingLessons = requiredLessonIds.filter(id => !complete.has(id));
  const outstandingExams = exams.filter(exam => !evidence.attempts.some(a =>
    a.examId === exam.id && Number.isFinite(a.scorePercent) && a.scorePercent <= 100 &&
    a.scorePercent >= exam.passingPercent,
  )).map(e => e.id);
  const invalidRequirements = requiredLessonIds.length === 0 || exams.length === 0 ||
    new Set(requiredLessonIds).size !== requiredLessonIds.length ||
    new Set(exams.map(e => e.id)).size !== exams.length ||
    exams.some(e => !e.id || !Number.isFinite(e.passingPercent) || e.passingPercent <= 0 || e.passingPercent > 100);
  let state: CandidateState;
  if (invalidRequirements || !sameIdentity(requirements, evidence) || missingContent.length) state = "unavailable";
  else if (!evidence.pretestRecorded) state = "pretest";
  else if (remainingLessons.length) state = "learning";
  else if (outstandingExams.length) state = "exams";
  else state = "orientation_ready";
  return { state, missingContent, remainingLessons, outstandingExams, orientationUnlocked: state === "orientation_ready" };
}

export type ComponentRequirements = CurriculumIdentity & {
  lessonIds: string[];
  examIds: string[];
  rubricApproved: boolean;
};
export type ComponentContext = CurriculumIdentity & {
  availableLessonIds: string[];
  completedLessonIds: string[];
  passedExamIds: string[];
  actorActive: boolean;
  inCatchment: boolean;
  isSelf: boolean;
  qualified: boolean;
  assignedToOther: boolean;
};

/** Learner readiness and this assessor's authority are independent facts. */
export function componentReadiness(requirements: ComponentRequirements, context: ComponentContext) {
  const missingLessons = requirements.lessonIds.filter(id => !context.completedLessonIds.includes(id));
  const missingExams = requirements.examIds.filter(id => !context.passedExamIds.includes(id));
  const reasons: string[] = [];
  if (!sameIdentity(requirements, context)) reasons.push("curriculum_mismatch");
  if (!requirements.rubricApproved) reasons.push("rubric_unavailable");
  if (!requirements.lessonIds.length || requirements.lessonIds.some(id => !context.availableLessonIds.includes(id))) reasons.push("content_unavailable");
  if (missingLessons.length) reasons.push("lessons_incomplete");
  if (missingExams.length) reasons.push("tests_incomplete");
  const learnerReady = reasons.length === 0;
  if (!context.actorActive) reasons.push("actor_inactive");
  if (!context.inCatchment) reasons.push("outside_catchment");
  if (context.isSelf) reasons.push("self_assessment");
  if (!context.qualified) reasons.push("chapter_qualification_required");
  if (context.assignedToOther) reasons.push("assigned_elsewhere");
  return { learnerReady, actorCanAssess: reasons.length === 0, reasons, missingLessons, missingExams };
}
