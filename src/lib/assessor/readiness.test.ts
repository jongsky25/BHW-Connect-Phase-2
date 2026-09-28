import { describe, expect, it } from 'vitest';
import { candidateReadiness, componentReadiness, type CandidateEvidence, type ChapterRequirements, type ComponentContext } from './readiness';

const identity = { programKey: 'bhw-reference-manual', chapterKey: 'chapter-1', version: 'v1' };
const chapter: ChapterRequirements = { ...identity, requiredLessonIds: ['1.1:a', '1.2:b'], exams: [{ id: 'posttest', passingPercent: 80 }] };
const candidate: CandidateEvidence = { ...identity, availableLessonIds: ['1.1:a', '1.2:b'], completedLessonIds: ['1.1:a', '1.2:b'], pretestRecorded: true, attempts: [{ examId: 'posttest', scorePercent: 80 }] };

describe('Reference Manual candidate progression', () => {
  it('unlocks orientation at 80%, without any practical assessment record', () => {
    expect(candidateReadiness(chapter, candidate).state).toBe('orientation_ready');
  });
  it('keeps a 79.9% exam locked and accepts a later pass without deleting history', () => {
    const attempts = [{ examId: 'posttest', scorePercent: 79.9 }];
    expect(candidateReadiness(chapter, { ...candidate, attempts }).state).toBe('exams');
    expect(candidateReadiness(chapter, { ...candidate, attempts: [...attempts, ...candidate.attempts] }).orientationUnlocked).toBe(true);
  });
  it('requires a diagnostic pretest but no pretest passing score', () => {
    expect(candidateReadiness(chapter, { ...candidate, pretestRecorded: false }).state).toBe('pretest');
    expect(candidateReadiness(chapter, { ...candidate, attempts: [...candidate.attempts, { examId: 'pretest', scorePercent: 0 }] }).orientationUnlocked).toBe(true);
  });
  it('requires all lessons even with a 100% exam', () => {
    expect(candidateReadiness(chapter, { ...candidate, completedLessonIds: ['1.1:a'], attempts: [{ examId: 'posttest', scorePercent: 100 }] }).state).toBe('learning');
  });
  it('never equates 100% of a partially published chapter with the full chapter', () => {
    const result = candidateReadiness(chapter, { ...candidate, availableLessonIds: ['1.1:a'], completedLessonIds: ['1.1:a'] });
    expect(result.state).toBe('unavailable');
    expect(result.missingContent).toEqual(['1.2:b']);
  });
  it.each(['programKey', 'chapterKey', 'version'] as const)('does not reuse a different %s', field => {
    expect(candidateReadiness(chapter, { ...candidate, [field]: 'other' }).state).toBe('unavailable');
  });
  it.each([NaN, Infinity, 101, -1])('rejects invalid score %s', scorePercent => {
    expect(candidateReadiness(chapter, { ...candidate, attempts: [{ examId: 'posttest', scorePercent }] }).state).toBe('exams');
  });
  it('does not pass an empty or malformed curriculum', () => {
    expect(candidateReadiness({ ...chapter, exams: [] }, candidate).state).toBe('unavailable');
    expect(candidateReadiness({ ...chapter, requiredLessonIds: [] }, candidate).state).toBe('unavailable');
    expect(candidateReadiness({ ...chapter, exams: [{ id: 'posttest', passingPercent: NaN }] }, candidate).state).toBe('unavailable');
  });
  it('requires each separately authored required quiz', () => {
    expect(candidateReadiness({ ...chapter, exams: [...chapter.exams, { id: 'quiz', passingPercent: 80 }] }, candidate).outstandingExams).toEqual(['quiz']);
  });
});

const component = { ...identity, lessonIds: ['1.1:a'], examIds: [], rubricApproved: true };
const actor: ComponentContext = { ...identity, availableLessonIds: ['1.1:a'], completedLessonIds: ['1.1:a'], passedExamIds: [], actorActive: true, inCatchment: true, isSelf: false, qualified: true, assignedToOther: false };
describe('Progressive BHW component eligibility', () => {
  it('allows related-subchapter readiness before the rest of the chapter or posttest', () => {
    expect(componentReadiness(component, actor).actorCanAssess).toBe(true);
  });
  it('checks a component-specific test when configured', () => {
    expect(componentReadiness({ ...component, examIds: ['quiz'] }, actor).missingExams).toEqual(['quiz']);
  });
  it.each([
    ['qualified', false, 'chapter_qualification_required'],
    ['inCatchment', false, 'outside_catchment'],
    ['actorActive', false, 'actor_inactive'],
    ['isSelf', true, 'self_assessment'],
    ['assignedToOther', true, 'assigned_elsewhere'],
  ] as const)('separates learner readiness from %s', (field, value, reason) => {
    const result = componentReadiness(component, { ...actor, [field]: value });
    expect(result.learnerReady).toBe(true);
    expect(result.actorCanAssess).toBe(false);
    expect(result.reasons).toContain(reason);
  });
  it('blocks incomplete lessons, unpublished content and an unapproved rubric', () => {
    const result = componentReadiness({ ...component, rubricApproved: false }, { ...actor, availableLessonIds: [], completedLessonIds: [] });
    expect(result.learnerReady).toBe(false);
    expect(result.reasons).toEqual(['rubric_unavailable', 'content_unavailable', 'lessons_incomplete']);
  });
});
