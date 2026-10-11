// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {assessorChapterCatalog, chapter1DraftRegistry} from './flow-registry';
import {assessorPreparation, assessorPermission, chapterAvailability, chapterAwardValidity, componentEvidence, overallAwardReadiness,
  type FlowRequirements, type FlowContext, type ChapterAward, type ActionScope, type CriterionRequirement, type Observation} from './flow';

// Explicit synthetic approved fixtures: never mutate or approve the real catalog.
function fixture() {
  const requirements: FlowRequirements = {...assessorChapterCatalog()[0], rubricVersion: 'test-rubric-1',
    requiredLessonIds: ['01:a', '02:b'],
    orientation: {version: 'test-orientation-1', lessonIds: ['evidence', 'feedback'], caseCount: 8, passingCount: 7, safetyPassRequired: true},
    simulation: {version: 'test-simulation-1', requiredCheckpointIds: ['prepare', 'observe', 'review']},
    approvals: {requirements: 'test-review', mapping: 'test-review', evidence: 'test-review', orientation: 'test-review',
      simulation: 'test-review', issuer: 'test-review', award: 'test-review'}};
  const identity = {programInstanceId: 'test-instance', programKey: requirements.programKey, chapterKey: requirements.chapterKey,
    requirementsVersion: requirements.requirementsVersion};
  const context: FlowContext = {identity, actor: {id: 'alex', role: 'assessor', active: true, preview: false},
    publication: {curriculumVersion: requirements.curriculumVersion, lessons: [{id: '01:a', revisionId: 'r1'}, {id: '02:b', revisionId: 'r2'}]},
    evidence: {...identity, actorId: 'alex', briefingVersion: requirements.requirementsVersion, pretestRecorded: true,
      completedLessons: [{id: '01:a', revisionId: 'r1'}, {id: '02:b', revisionId: 'r2'}], attempts: [{examId: 'chapter-1:posttest', scorePercent: 80}],
      orientationVersion: 'test-orientation-1', orientationLessonIds: ['evidence', 'feedback'],
      scoringAttempts: [{orientationVersion: 'test-orientation-1', correctCount: 7, safetyPassed: true}], simulationReceipt: null}, award: null, legacyTransitionPending: false};
  return {requirements, context};
}
function earned(requirements: FlowRequirements, context: FlowContext): ChapterAward {
  return {...context.identity, id: `test-award-${requirements.chapterKey}`, actorId: 'alex', status: 'active',
    curriculumVersion: requirements.curriculumVersion, rubricVersion: requirements.rubricVersion!,
    orientationVersion: requirements.orientation!.version, awardRuleVersion: requirements.awardRuleVersion};
}
const scope: ActionScope = {inCatchment: true, learnerActive: true, isSelf: false, learnerReady: true,
  assignedToOther: false, ownsAssignment: true, criteriaReviewed: true};

describe('C1AF-03 catalog and draft registry', () => {
  it('includes all three chapters without granting authority or replacing Chapter 2', () => {
    const catalog = assessorChapterCatalog();
    expect(catalog.map(entry => [entry.chapterKey, entry.requiredLessonIds.length, entry.path])).toEqual([
      ['chapter-1', 42, 'revised_draft'], ['chapter-2', 55, 'existing_path'], ['chapter-3', 0, 'unavailable']]);
    for (const requirement of catalog) {
      expect(chapterAvailability(requirement, {curriculumVersion: requirement.curriculumVersion,
        lessons: requirement.requiredLessonIds.map(id => ({id, revisionId: 'test-only'}))}).available).toBe(false);
    }
    expect(catalog[2].unavailableReasons).toContain('chapter_path_unavailable');
    expect(catalog[0].orientation).toMatchObject({lessonIds: expect.any(Array), passingCount: 7, caseCount: 8});
    expect(catalog[1].simulationRequired).toBe(false);
  });
  it('preserves all 42 provisional identities and bilingual provenance without index joins', () => {
    const registry = chapter1DraftRegistry();
    expect(registry.criteria).toHaveLength(42);
    expect(registry.components).toHaveLength(9);
    expect(registry.readyForActivation).toBe(false);
    const record = registry.criteria.find(entry => entry.lessonKey === 'communication-record')!;
    expect(record.sourceObjectiveIndex).toBe(0);
    expect(record.proposedLegacyIndicatorIds).toEqual(['chapter-1:06-komunikasyon:indicator-2', 'chapter-1:06-komunikasyon:indicator-3']);
    expect(record.reviewStatus).toBe('unreviewed');
    expect(record.decisionId).toBeNull();
    expect(record.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(record.anchors.observable.fil).toBeTruthy();
    expect(record.anchors.observable.en).toBeTruthy();
    const {context} = fixture();
    expect(componentEvidence(context.identity, record.componentId, 'maria', [record], [], 'test-review').state).toBe('unavailable');
  });
  it('returns isolated registry/catalog data, so a caller cannot approve the next read', () => {
    const registry = chapter1DraftRegistry();
    registry.criteria[0].reviewStatus = 'approved';
    registry.criteria[0].anchors.observable.en = 'changed';
    assessorChapterCatalog()[0].requiredLessonIds.pop();
    expect(chapter1DraftRegistry().criteria[0].reviewStatus).toBe('unreviewed');
    expect(chapter1DraftRegistry().criteria[0].anchors.observable.en).not.toBe('changed');
    expect(assessorChapterCatalog()[0].requiredLessonIds).toHaveLength(42);
  });
});

describe('preparation, publication and chapter award boundaries', () => {
  it('requires simulation after scoring, then returns issuance pending without issuing', () => {
    const {requirements, context} = fixture();
    expect(assessorPreparation(requirements, context).state).toBe('platform_simulation');
    context.evidence!.simulationReceipt = {...context.identity, actorId: 'alex', id: 'test-receipt', version: 'test-simulation-1', serverValidated: true, checkpointIds: ['prepare', 'observe', 'review']};
    expect(assessorPreparation(requirements, context)).toMatchObject({state: 'issuance_pending', canRequestIssuance: true});
    expect(context.award).toBeNull();
  });
  it.each([
    {id: 'x', version: 'wrong', serverValidated: true, checkpointIds: ['prepare', 'observe', 'review']},
    {id: 'x', version: 'test-simulation-1', serverValidated: false, checkpointIds: ['prepare', 'observe', 'review']},
    {id: 'x', version: 'test-simulation-1', serverValidated: true, checkpointIds: ['prepare', 'prepare', 'review']},
    {id: 'x', version: 'test-simulation-1', serverValidated: true, checkpointIds: ['prepare']},
    {id: 'x', version: 'test-simulation-1', serverValidated: true, checkpointIds: ['observe', 'prepare', 'review']},
  ])('rejects unvalidated, foreign or incomplete simulation evidence %#', receipt => {
    const {requirements, context} = fixture();
    context.evidence!.simulationReceipt = {...context.identity, actorId: 'alex', ...receipt};
    expect(assessorPreparation(requirements, context).canRequestIssuance).toBe(false);
  });
  it.each(['actorId', 'programInstanceId', 'programKey', 'chapterKey', 'requirementsVersion'] as const)('rejects a simulation receipt with another %s', field => {
    const {requirements, context} = fixture();
    context.evidence!.simulationReceipt = {...context.identity, actorId: 'alex', id: 'receipt', version: 'test-simulation-1',
      serverValidated: true, checkpointIds: ['prepare', 'observe', 'review']};
    Object.assign(context.evidence!.simulationReceipt, {[field]: 'foreign'});
    expect(assessorPreparation(requirements, context).state).toBe('platform_simulation');
  });
  it('does not reuse a scoring pass from an old orientation version', () => {
    const {requirements, context} = fixture(); context.evidence!.scoringAttempts[0].orientationVersion = 'old';
    expect(assessorPreparation(requirements, context).state).toBe('scoring_exercise');
  });
  it('keeps all blockers and the full denominator when publication is partial', () => {
    const {requirements, context} = fixture();
    context.publication.lessons.pop(); context.evidence!.completedLessons.pop();
    context.evidence!.briefingVersion = null;
    const result = assessorPreparation(requirements, context);
    expect(result).toMatchObject({state: 'unavailable', totalLessons: 2, completedLessons: 1});
    expect(result.reasons).toEqual(expect.arrayContaining(['content_unavailable', 'briefing_incomplete', 'study_incomplete', 'platform_simulation_incomplete']));
  });
  it('requires the published lesson revision and retains a pass through failed retries', () => {
    const {requirements, context} = fixture();
    context.evidence!.completedLessons[0].revisionId = 'old';
    context.evidence!.attempts.push({examId: 'chapter-1:posttest', scorePercent: 0});
    expect(assessorPreparation(requirements, context)).toMatchObject({state: 'study', outstandingExams: [], remainingLessons: ['01:a']});
  });
  it.each(['actorId', 'programInstanceId', 'programKey', 'chapterKey', 'requirementsVersion'] as const)('rejects another %s in preparation evidence', field => {
    const {requirements, context} = fixture();
    Object.assign(context.evidence!, {[field]: 'foreign'});
    expect(assessorPreparation(requirements, context)).toMatchObject({state: 'unavailable', completedLessons: 0, canRequestIssuance: false});
  });
  it.each([
    ['briefing', (c: FlowContext) => {c.evidence!.briefingVersion = null;}],
    ['pretest', (c: FlowContext) => {c.evidence!.pretestRecorded = false;}],
    ['posttest', (c: FlowContext) => {c.evidence!.attempts = [{examId: 'chapter-1:posttest', scorePercent: 79.9}];}],
    ['orientation_lessons', (c: FlowContext) => {c.evidence!.orientationVersion = 'old';}],
    ['scoring_exercise', (c: FlowContext) => {c.evidence!.scoringAttempts = [{orientationVersion: 'test-orientation-1', correctCount: 8, safetyPassed: false}];}],
  ] as const)('recommends %s as the earliest incomplete stage', (state, mutate) => {
    const {requirements, context} = fixture(); mutate(context);
    expect(assessorPreparation(requirements, context).state).toBe(state);
  });
  it('does not reset an earned award during replay, but retains publication restrictions', () => {
    const {requirements, context} = fixture(); context.award = earned(requirements, context); context.evidence = null;
    expect(assessorPreparation(requirements, context).state).toBe('certified');
    expect(assessorPreparation(requirements, context).reasons).not.toContain('study_incomplete');
    context.publication.lessons.pop();
    expect(assessorPreparation(requirements, context)).toMatchObject({state: 'certified', availability: {available: false}});
    expect(assessorPermission('formal_submit', requirements, context, scope).allowed).toBe(false);
  });
  it('preserves suspended, revoked, outdated and historical transition states', () => {
    const {requirements, context} = fixture(); context.award = earned(requirements, context);
    context.award.status = 'suspended'; expect(assessorPreparation(requirements, context).state).toBe('suspended');
    context.award.status = 'revoked'; expect(assessorPreparation(requirements, context).state).toBe('revoked');
    context.award.status = 'active'; context.award.requirementsVersion = 'old';
    expect(assessorPreparation(requirements, context).state).toBe('update_required');
    context.award = null; context.legacyTransitionPending = true;
    expect(assessorPreparation(requirements, context).state).toBe('legacy_transition_pending');
  });
  it.each(['actorId', 'programInstanceId', 'programKey', 'chapterKey'] as const)('rejects an award for another %s', field => {
    const {requirements, context} = fixture(); const award = earned(requirements, context); Object.assign(award, {[field]: 'foreign'});
    expect(chapterAwardValidity(requirements, context.identity, context.actor.id, award).status).toBe('foreign');
  });
  it.each(['requirementsVersion', 'curriculumVersion', 'rubricVersion', 'orientationVersion', 'awardRuleVersion'] as const)('requires an update for another award %s', field => {
    const {requirements, context} = fixture(); const award = earned(requirements, context); award[field] = 'old';
    expect(chapterAwardValidity(requirements, context.identity, context.actor.id, award).status).toBe('update_required');
  });
  it('rejects duplicate publication identities and duplicate requirement identities', () => {
    const {requirements, context} = fixture(); context.publication.lessons.push(context.publication.lessons[0]);
    expect(chapterAvailability(requirements, context.publication).reasons).toContain('publication_ambiguous');
    requirements.requiredLessonIds.push(requirements.requiredLessonIds[0]);
    expect(chapterAvailability(requirements, context.publication).reasons).toContain('requirements_invalid');
  });
});

describe('actor and assignment authority', () => {
  it('allows private candidate planning but denies official writes before certification', () => {
    const {requirements, context} = fixture();
    expect(assessorPermission('private_plan', requirements, context, scope).allowed).toBe(true);
    expect(assessorPermission('practice_observation', requirements, context, scope).reasons).toContain('chapter_award_required');
    context.award = earned(requirements, context);
    expect(assessorPermission('formal_submit', requirements, context, scope).allowed).toBe(true);
  });
  it.each([
    ['signed_out', {id: null}], ['account_inactive', {active: false}],
    ['preview_read_only', {preview: true}], ['role_ineligible', {role: 'admin'}],
  ] as const)('blocks all writes for %s even with an earned award', (state, change) => {
    const {requirements, context} = fixture(); context.award = earned(requirements, context); Object.assign(context.actor, change);
    expect(assessorPreparation(requirements, context).state).toBe(state);
    expect(assessorPermission('private_plan', requirements, context, scope).allowed).toBe(false);
    expect(assessorPermission('formal_submit', requirements, context, scope).allowed).toBe(false);
  });
  it.each([
    ['inCatchment', false, 'outside_catchment'], ['learnerActive', false, 'learner_inactive'],
    ['isSelf', true, 'self_assessment'], ['learnerReady', false, 'learner_not_ready'],
    ['assignedToOther', true, 'assigned_elsewhere'], ['ownsAssignment', false, 'assignment_required'],
    ['criteriaReviewed', false, 'criteria_unavailable'],
  ] as const)('rechecks %s when submitting a formal attempt', (field, value, reason) => {
    const {requirements, context} = fixture(); context.award = earned(requirements, context);
    expect(assessorPermission('formal_submit', requirements, context, {...scope, [field]: value})).toMatchObject({allowed: false, reasons: [reason]});
  });
  it('rechecks suspension rather than relying on permission when the form opened', () => {
    const {requirements, context} = fixture(); context.award = earned(requirements, context);
    expect(assessorPermission('formal_submit', requirements, context, scope).allowed).toBe(true);
    context.award.status = 'suspended';
    expect(assessorPermission('formal_submit', requirements, context, scope).reasons).toContain('award_suspended');
    expect(assessorPermission('candidate_progress', requirements, context, scope).allowed).toBe(true);
    expect(assessorPermission('issue_staff_award', requirements, context, scope).allowed).toBe(false);
  });
});

describe('formal component evidence', () => {
  const criterion: CriterionRequirement = {id: 'chapter-1:test:criterion-1', chapterKey: 'chapter-1', componentId: 'chapter-1:test',
    version: 'test-v1', source: 'test-fixture', sourceFingerprint: 'a'.repeat(64), reviewStatus: 'approved', decisionId: 'test-review'};
  function observation(context: FlowContext): Observation {
    return {...context.identity, learnerId: 'maria', criterionId: criterion.id, criterionVersion: criterion.version,
      mode: 'formal', sufficiency: 'sufficient', facts: 'Observed the neutral clarification and confirmed correction.', rating: 'kaya_na'};
  }
  it('requires every reviewed criterion, rather than accepting one successful lesson', () => {
    const {context} = fixture(); const second = {...criterion, id: 'chapter-1:test:criterion-2'};
    expect(componentEvidence(context.identity, criterion.componentId, 'maria', [criterion, second], [observation(context)], 'test-review'))
      .toMatchObject({state: 'formal_incomplete', missingCriterionIds: [second.id], componentSatisfied: false});
  });
  it.each(['not_observed', 'insufficient'] as const)('does not convert %s into a performance failure', sufficiency => {
    const {context} = fixture(); const attempt = {...observation(context), sufficiency, rating: 'hindi_pa' as const};
    expect(componentEvidence(context.identity, criterion.componentId, 'maria', [criterion], [attempt], 'test-review'))
      .toMatchObject({state: 'formal_incomplete', gapCriterionIds: [], componentSatisfied: false});
  });
  it('distinguishes witnessed gaps from missing evidence and complete formal performance', () => {
    const {context} = fixture(); const attempt = observation(context);
    expect(componentEvidence(context.identity, criterion.componentId, 'maria', [criterion], [attempt], 'test-review').state).toBe('component_satisfied');
    attempt.rating = 'kailangan_practice';
    expect(componentEvidence(context.identity, criterion.componentId, 'maria', [criterion], [attempt], 'test-review').state).toBe('formal_needs_practice');
  });
  it.each(['practice', 'foreign_learner', 'old_version', 'foreign_instance', 'empty_facts'] as const)('does not reuse %s evidence automatically', caseKey => {
    const {context} = fixture(); const attempt = observation(context);
    if (caseKey === 'practice') attempt.mode = 'practice';
    if (caseKey === 'foreign_learner') attempt.learnerId = 'other';
    if (caseKey === 'old_version') attempt.criterionVersion = 'old';
    if (caseKey === 'foreign_instance') attempt.programInstanceId = 'other';
    if (caseKey === 'empty_facts') attempt.facts = ' ';
    expect(componentEvidence(context.identity, criterion.componentId, 'maria', [criterion], [attempt], 'test-review').componentSatisfied).toBe(false);
  });
  it('blocks unreviewed rules, duplicate criteria and ambiguous attempts', () => {
    const {context} = fixture(); const attempt = observation(context);
    expect(componentEvidence(context.identity, criterion.componentId, 'maria', [criterion], [attempt], null).state).toBe('unavailable');
    expect(componentEvidence(context.identity, criterion.componentId, 'maria', [criterion, criterion], [attempt], 'test-review').state).toBe('unavailable');
    expect(componentEvidence(context.identity, criterion.componentId, 'maria', [criterion], [attempt, attempt], 'test-review').state).toBe('unavailable');
  });
});

describe('overall three-chapter award readiness', () => {
  function three() {
    const {requirements, context} = fixture();
    const catalog = (['chapter-1', 'chapter-2', 'chapter-3'] as const).map(chapterKey => ({...structuredClone(requirements), chapterKey,
      requirementsVersion: `${chapterKey}:test-version`}));
    const awards = catalog.map(entry => earned(entry, {...context, identity: {...context.identity, chapterKey: entry.chapterKey, requirementsVersion: entry.requirementsVersion}}));
    return {catalog, awards};
  }
  it('accepts exactly three valid compatible source awards without an extra exam', () => {
    const {catalog, awards} = three();
    expect(overallAwardReadiness('test-instance', 'alex', catalog, awards)).toMatchObject({ready: true, requiredChapterCount: 3,
      sourceAwardIds: awards.map(award => award.id), missingChapters: []});
  });
  it('does not reduce the denominator when Chapter 3 is unavailable', () => {
    const {catalog, awards} = three(); catalog[2].path = 'unavailable';
    expect(overallAwardReadiness('test-instance', 'alex', catalog, awards.slice(0, 2))).toMatchObject({ready: false, requiredChapterCount: 3, missingChapters: ['chapter-3']});
  });
  it('rejects three awards for one chapter and duplicate award IDs', () => {
    const {catalog, awards} = three();
    expect(overallAwardReadiness('test-instance', 'alex', catalog, [awards[0], awards[0], awards[0]]).ready).toBe(false);
    awards[1].id = awards[0].id;
    expect(overallAwardReadiness('test-instance', 'alex', catalog, awards).reasons).toContain('duplicate_source_awards');
  });
  it('does not infer approved overall requirements from matching certificate versions', () => {
    const {catalog, awards} = three(); catalog[2].approvals.mapping = null;
    expect(overallAwardReadiness('test-instance', 'alex', catalog, awards)).toMatchObject({ready: false,
      reasons: ['chapter-3:mapping_review_required']});
    catalog[2].approvals.mapping = 'test-review'; catalog[2].requiredLessonIds = [];
    expect(overallAwardReadiness('test-instance', 'alex', catalog, awards).ready).toBe(false);
  });
  it.each(['suspended', 'revoked', 'foreign_instance', 'old_version'] as const)('rejects %s source award while other chapters remain independent', change => {
    const {catalog, awards} = three();
    if (change === 'suspended' || change === 'revoked') awards[2].status = change;
    if (change === 'foreign_instance') awards[2].programInstanceId = 'other';
    if (change === 'old_version') awards[2].requirementsVersion = 'old';
    expect(overallAwardReadiness('test-instance', 'alex', catalog, awards).ready).toBe(false);
    expect(chapterAwardValidity(catalog[0], {programInstanceId: 'test-instance', programKey: catalog[0].programKey,
      chapterKey: 'chapter-1', requirementsVersion: catalog[0].requirementsVersion}, 'alex', awards[0]).valid).toBe(true);
  });
});
