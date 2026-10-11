import {candidateReadiness, type ExamRequirement} from './readiness';

/** Pure projections of trusted server records, never authentication or an RPC
 * authorization boundary. No resolver issues an award or mutates evidence.
 */
export type ChapterKey = 'chapter-1' | 'chapter-2' | 'chapter-3';
export type FlowIdentity = {programInstanceId: string; programKey: string; chapterKey: ChapterKey; requirementsVersion: string};
export type Actor = {id: string | null; role: string; active: boolean; preview: boolean};
export type FlowRequirements = {
  programKey: string; chapterKey: ChapterKey; title: string;
  path: 'revised_draft' | 'existing_path' | 'unavailable';
  requirementsVersion: string; curriculumVersion: string; rubricVersion: string | null; awardRuleVersion: string;
  requiredLessonIds: string[]; exams: ExamRequirement[];
  orientation: {version: string; lessonIds: string[]; caseCount: number; passingCount: number; safetyPassRequired: boolean} | null;
  simulationRequired: boolean;
  simulation: {version: string; requiredCheckpointIds: string[]} | null;
  approvals: Record<'requirements' | 'mapping' | 'evidence' | 'orientation' | 'simulation' | 'issuer' | 'award', string | null>;
  unavailableReasons: string[];
};
export type Publication = {curriculumVersion: string; lessons: {id: string; revisionId: string}[]};
export type PreparationEvidence = FlowIdentity & {
  actorId: string; briefingVersion: string | null; pretestRecorded: boolean;
  completedLessons: {id: string; revisionId: string}[];
  attempts: {examId: string; scorePercent: number}[];
  orientationVersion: string | null; orientationLessonIds: string[];
  scoringAttempts: {orientationVersion: string; correctCount: number; safetyPassed: boolean}[];
  simulationReceipt: null | (FlowIdentity & {actorId: string; id: string; version: string; serverValidated: boolean; checkpointIds: string[]});
};
export type ChapterAward = FlowIdentity & {id: string; actorId: string;
  status: 'active' | 'suspended' | 'revoked'; curriculumVersion: string; rubricVersion: string;
  orientationVersion: string; awardRuleVersion: string};
export type FlowContext = {identity: FlowIdentity; actor: Actor; publication: Publication;
  evidence: PreparationEvidence | null; award: ChapterAward | null; legacyTransitionPending: boolean};
const present = (value: string | null | undefined) => !!value?.trim();
const unique = (ids: readonly string[]) => ids.length === new Set(ids).size;
const identityMatches = (a: FlowIdentity, b: FlowIdentity) =>
  a.programInstanceId === b.programInstanceId && a.programKey === b.programKey &&
  a.chapterKey === b.chapterKey && a.requirementsVersion === b.requirementsVersion;
const requiredMatch = (requirements: FlowRequirements, identity: FlowIdentity) =>
  present(identity.programInstanceId) && identity.programKey === requirements.programKey &&
  identity.chapterKey === requirements.chapterKey && identity.requirementsVersion === requirements.requirementsVersion;

function requirementsBlockers(requirements: FlowRequirements) {
  const reasons = [...requirements.unavailableReasons];
  if (requirements.path === 'unavailable') reasons.push('chapter_path_unavailable');
  const ids = requirements.requiredLessonIds;
  const orientation = requirements.orientation;
  const simulation = requirements.simulation;
  if (!present(requirements.requirementsVersion) || !present(requirements.curriculumVersion) || !present(requirements.awardRuleVersion)
    || !ids.length || !unique(ids) || ids.some(id => !present(id))
    || !requirements.exams.length || !unique(requirements.exams.map(exam => exam.id))
    || requirements.exams.some(exam => !present(exam.id) || !Number.isFinite(exam.passingPercent) || exam.passingPercent <= 0 || exam.passingPercent > 100)
    || !orientation || !present(orientation.version) || !orientation.lessonIds.length || !unique(orientation.lessonIds)
    || !Number.isInteger(orientation.caseCount) || !Number.isInteger(orientation.passingCount)
    || orientation.passingCount <= 0 || orientation.passingCount > orientation.caseCount
    || (requirements.simulationRequired && (!simulation || !present(simulation.version)
      || !simulation.requiredCheckpointIds.length || !unique(simulation.requiredCheckpointIds)))) reasons.push('requirements_invalid');
  for (const [gate, decision] of Object.entries(requirements.approvals)) {
    if (gate === 'simulation' && !requirements.simulationRequired) continue;
    if (!present(decision)) reasons.push(`${gate}_review_required`);
  }
  if (!present(requirements.rubricVersion)) reasons.push('rubric_version_unavailable');
  return [...new Set(reasons)];
}

export function chapterAvailability(requirements: FlowRequirements, publication: Publication) {
  const reasons = requirementsBlockers(requirements);
  if (publication.curriculumVersion !== requirements.curriculumVersion) reasons.push('publication_version_mismatch');
  const published = publication.lessons.filter(lesson => present(lesson.revisionId));
  if (!unique(publication.lessons.map(lesson => lesson.id))) reasons.push('publication_ambiguous');
  const missingContent = requirements.requiredLessonIds.filter(id => !published.some(lesson => lesson.id === id));
  if (missingContent.length) reasons.push('content_unavailable');
  return {available: reasons.length === 0, reasons: [...new Set(reasons)], missingContent};
}

export function chapterAwardValidity(requirements: FlowRequirements, identity: FlowIdentity, actorId: string | null, award: ChapterAward | null) {
  if (!award) return {status: 'missing' as const, valid: false, reasons: ['chapter_award_required']};
  if (!present(actorId) || !present(award.id) || award.actorId !== actorId || !requiredMatch(requirements, identity)
    || !present(award.programInstanceId) || award.programInstanceId !== identity.programInstanceId
    || award.programKey !== identity.programKey || award.chapterKey !== identity.chapterKey) {
    return {status: 'foreign' as const, valid: false, reasons: ['award_identity_mismatch']};
  }
  if (award.status !== 'active') return {status: award.status, valid: false, reasons: [`award_${award.status}`]};
  if (award.requirementsVersion !== requirements.requirementsVersion || award.curriculumVersion !== requirements.curriculumVersion
    || award.rubricVersion !== requirements.rubricVersion || award.orientationVersion !== requirements.orientation?.version
    || award.awardRuleVersion !== requirements.awardRuleVersion) {
    return {status: 'update_required' as const, valid: false, reasons: ['award_version_mismatch']};
  }
  return {status: 'valid' as const, valid: true, reasons: []};
}

export type PreparationState = 'signed_out' | 'account_inactive' | 'preview_read_only' | 'role_ineligible' | 'unavailable'
  | 'briefing' | 'pretest' | 'study' | 'posttest' | 'orientation_lessons' | 'scoring_exercise' | 'platform_simulation'
  | 'issuance_pending' | 'certified' | 'update_required' | 'suspended' | 'revoked' | 'legacy_transition_pending';
const NEXT: Record<PreparationState, string> = {
  signed_out: 'sign_in', account_inactive: 'contact_admin', preview_read_only: 'leave_preview', role_ineligible: 'open_own_learning',
  unavailable: 'review_availability', briefing: 'open_briefing', pretest: 'take_pretest', study: 'continue_study',
  posttest: 'take_posttest', orientation_lessons: 'continue_orientation', scoring_exercise: 'complete_scoring',
  platform_simulation: 'resume_simulation', issuance_pending: 'request_issuance', certified: 'open_workspace',
  update_required: 'review_update', suspended: 'contact_admin', revoked: 'contact_admin', legacy_transition_pending: 'review_transition',
};

export function assessorPreparation(requirements: FlowRequirements, context: FlowContext) {
  const availability = chapterAvailability(requirements, context.publication);
  const award = chapterAwardValidity(requirements, context.identity, context.actor.id, context.award);
  const reasons = [...availability.reasons];
  if (!requiredMatch(requirements, context.identity)) reasons.push('context_identity_mismatch');
  const evidence = context.evidence && identityMatches(context.identity, context.evidence)
    && context.evidence.actorId === context.actor.id ? context.evidence : null;
  if (context.evidence && !evidence) reasons.push('evidence_identity_mismatch');
  const published = context.publication.lessons;
  const completedLessonIds = evidence?.completedLessons.filter(lesson => published.some(entry => entry.id === lesson.id && entry.revisionId === lesson.revisionId))
    .map(lesson => lesson.id) ?? [];
  const learning = candidateReadiness({programKey: requirements.programKey, chapterKey: requirements.chapterKey,
    version: requirements.curriculumVersion, requiredLessonIds: requirements.requiredLessonIds, exams: requirements.exams}, {
    programKey: requirements.programKey, chapterKey: requirements.chapterKey, version: requirements.curriculumVersion,
    availableLessonIds: published.filter(lesson => present(lesson.revisionId)).map(lesson => lesson.id),
    completedLessonIds, pretestRecorded: evidence?.pretestRecorded ?? false, attempts: evidence?.attempts ?? [],
  });
  const orientationCurrent = evidence?.orientationVersion === requirements.orientation?.version;
  const remainingOrientation = requirements.orientation?.lessonIds.filter(id => !orientationCurrent || !evidence?.orientationLessonIds.includes(id)) ?? [];
  const scoringPassed = !!requirements.orientation && orientationCurrent && !!evidence?.scoringAttempts.some(attempt =>
    attempt.orientationVersion === requirements.orientation!.version && Number.isInteger(attempt.correctCount) && attempt.correctCount >= requirements.orientation!.passingCount
    && attempt.correctCount <= requirements.orientation!.caseCount && (!requirements.orientation!.safetyPassRequired || attempt.safetyPassed));
  const receipt = evidence?.simulationReceipt;
  const simulationPassed = !requirements.simulationRequired || (!!requirements.simulation && !!receipt && present(receipt.id)
    && identityMatches(context.identity, receipt) && receipt.actorId === context.actor.id
    && receipt.serverValidated && receipt.version === requirements.simulation.version && unique(receipt.checkpointIds)
    && receipt.checkpointIds.length === requirements.simulation.requiredCheckpointIds.length
    && requirements.simulation.requiredCheckpointIds.every((id, index) => receipt.checkpointIds[index] === id));
  const outstanding: PreparationState[] = [];
  if (evidence?.briefingVersion !== requirements.requirementsVersion) outstanding.push('briefing');
  if (!evidence?.pretestRecorded) outstanding.push('pretest');
  if (learning.remainingLessons.length) outstanding.push('study');
  if (learning.outstandingExams.length) outstanding.push('posttest');
  if (remainingOrientation.length) outstanding.push('orientation_lessons');
  if (!scoringPassed) outstanding.push('scoring_exercise');
  if (!simulationPassed) outstanding.push('platform_simulation');
  if (!award.valid) reasons.push(...outstanding.map(step => `${step}_incomplete`));
  let state: PreparationState;
  if (!context.actor.id) { state = 'signed_out'; reasons.push('signed_out'); }
  else if (!context.actor.active) { state = 'account_inactive'; reasons.push('actor_inactive'); }
  else if (context.actor.preview) { state = 'preview_read_only'; reasons.push('preview_read_only'); }
  else if (context.actor.role !== 'assessor') { state = 'role_ineligible'; reasons.push('role_ineligible'); }
  else if (award.status === 'suspended' || award.status === 'revoked') state = award.status;
  else if (award.status === 'update_required') state = 'update_required';
  else if (award.valid) state = 'certified'; // Replay and missing new progress never erase an earned award.
  else if (context.legacyTransitionPending) { state = 'legacy_transition_pending'; reasons.push('legacy_transition_pending'); }
  else if (!availability.available || reasons.includes('context_identity_mismatch') || reasons.includes('evidence_identity_mismatch') || award.status === 'foreign') state = 'unavailable';
  else state = outstanding[0] ?? 'issuance_pending';
  if (!award.valid && context.award) reasons.push(...award.reasons);
  return {state, nextAction: NEXT[state], reasons: [...new Set(reasons)], availability, award,
    remainingLessons: learning.remainingLessons, outstandingExams: learning.outstandingExams, remainingOrientation,
    totalLessons: requirements.requiredLessonIds.length,
    completedLessons: requirements.requiredLessonIds.filter(id => completedLessonIds.includes(id)).length,
    canRequestIssuance: state === 'issuance_pending'};
}

export type CriterionRequirement = {id: string; chapterKey: ChapterKey; componentId: string; version: string;
  source: string; sourceFingerprint: string; reviewStatus: 'unreviewed' | 'approved'; decisionId: string | null};
export type PerformanceRating = 'kaya_na' | 'kailangan_practice' | 'hindi_pa';
export type Observation = FlowIdentity & {learnerId: string; criterionId: string; criterionVersion: string;
  mode: 'practice' | 'formal'; sufficiency: 'not_observed' | 'insufficient' | 'sufficient';
  facts: string; rating: PerformanceRating | null};

/** Direct formal evidence only; reuse of practice/history awaits reviewed rules.
 * A supplied rating never converts missing evidence into low performance.
 */
export function componentEvidence(identity: FlowIdentity, componentId: string, learnerId: string,
  criteria: readonly CriterionRequirement[], observations: readonly Observation[], evidenceDecisionId: string | null) {
  const reasons: string[] = [];
  const invalid = !present(identity.programInstanceId) || !present(identity.programKey) || !present(identity.requirementsVersion)
    || !present(componentId) || !present(learnerId) || !criteria.length || !unique(criteria.map(criterion => criterion.id))
    || criteria.some(criterion => criterion.chapterKey !== identity.chapterKey || criterion.componentId !== componentId
      || !present(criterion.id) || !present(criterion.version) || !present(criterion.source)
      || !/^[a-f0-9]{64}$/.test(criterion.sourceFingerprint) || criterion.reviewStatus !== 'approved' || !present(criterion.decisionId));
  if (invalid) reasons.push('criteria_unavailable');
  if (!present(evidenceDecisionId)) reasons.push('evidence_rule_unreviewed');
  const matching = observations.filter(observation => identityMatches(identity, observation) && observation.learnerId === learnerId
    && observation.mode === 'formal' && criteria.some(criterion => criterion.id === observation.criterionId && criterion.version === observation.criterionVersion));
  if (!unique(matching.map(observation => observation.criterionId))) reasons.push('ambiguous_evidence');
  const missing = criteria.filter(criterion => !matching.some(observation => observation.criterionId === criterion.id
    && observation.sufficiency === 'sufficient' && present(observation.facts)
    && ['kaya_na', 'kailangan_practice', 'hindi_pa'].includes(observation.rating ?? ''))).map(criterion => criterion.id);
  const gaps = matching.filter(observation => observation.sufficiency === 'sufficient' && present(observation.facts)
    && (observation.rating === 'kailangan_practice' || observation.rating === 'hindi_pa')).map(observation => observation.criterionId);
  if (missing.length) reasons.push('evidence_incomplete');
  const state = invalid || !present(evidenceDecisionId) || reasons.includes('ambiguous_evidence') ? 'unavailable'
    : missing.length ? 'formal_incomplete' : gaps.length ? 'formal_needs_practice' : 'component_satisfied';
  return {state, reasons, missingCriterionIds: missing, gapCriterionIds: gaps, componentSatisfied: state === 'component_satisfied'};
}

export type OfficialAction = 'private_plan' | 'candidate_progress' | 'issue_staff_award' | 'official_delivery' | 'practice_observation' | 'formal_claim' | 'formal_submit';
export type ActionScope = {inCatchment: boolean; learnerActive: boolean; isSelf: boolean; learnerReady: boolean;
  assignedToOther: boolean; ownsAssignment: boolean; criteriaReviewed: boolean};
export function assessorPermission(action: OfficialAction, requirements: FlowRequirements, context: FlowContext, scope: ActionScope) {
  const preparation = assessorPreparation(requirements, context);
  const reasons: string[] = [];
  if (!context.actor.id) reasons.push('signed_out');
  if (!context.actor.active) reasons.push('actor_inactive');
  if (context.actor.preview) reasons.push('preview_read_only');
  if (context.actor.role !== 'assessor') reasons.push('role_ineligible');
  if (!requiredMatch(requirements, context.identity)) reasons.push('context_identity_mismatch');
  if (action !== 'private_plan') reasons.push(...preparation.availability.reasons);
  if (action !== 'private_plan' && preparation.reasons.includes('evidence_identity_mismatch')) reasons.push('evidence_identity_mismatch');
  if (action === 'issue_staff_award' && !preparation.canRequestIssuance && !preparation.award.valid) reasons.push('preparation_incomplete');
  if (!['private_plan', 'candidate_progress', 'issue_staff_award'].includes(action)) {
    if (!preparation.award.valid) reasons.push(...preparation.award.reasons);
    if (!scope.inCatchment) reasons.push('outside_catchment');
    if (action !== 'official_delivery') {
      if (!scope.learnerActive) reasons.push('learner_inactive');
      if (scope.isSelf) reasons.push('self_assessment');
      if (!scope.criteriaReviewed) reasons.push('criteria_unavailable');
    }
    if (action === 'formal_claim' || action === 'formal_submit') {
      if (!scope.learnerReady) reasons.push('learner_not_ready');
      if (scope.assignedToOther) reasons.push('assigned_elsewhere');
      if (action === 'formal_submit' && !scope.ownsAssignment) reasons.push('assignment_required');
    }
  }
  const actions: Record<string, string> = {outside_catchment: 'review_scope', learner_inactive: 'review_learner_status',
    self_assessment: 'assign_another_assessor', learner_not_ready: 'review_learner_readiness',
    assigned_elsewhere: 'review_assignment', assignment_required: 'claim_assessment', criteria_unavailable: 'review_criteria'};
  return {allowed: reasons.length === 0, reasons: [...new Set(reasons)],
    nextAction: reasons.length ? actions[reasons[0]] ?? preparation.nextAction : 'continue'};
}

/** Exactly three selected source awards. History is not reduced to a count and
 * unavailable Chapter 3 never changes the denominator. No overall capstone.
 */
export function overallAwardReadiness(programInstanceId: string, actorId: string, requirements: readonly FlowRequirements[], awards: readonly ChapterAward[]) {
  const keys: ChapterKey[] = ['chapter-1', 'chapter-2', 'chapter-3'];
  const reasons: string[] = [];
  if (!present(programInstanceId) || !present(actorId) || requirements.length !== 3 || !unique(requirements.map(entry => entry.chapterKey))
    || keys.some(key => !requirements.some(entry => entry.chapterKey === key))
    || new Set(requirements.map(entry => entry.programKey)).size !== 1 || new Set(requirements.map(entry => entry.awardRuleVersion)).size !== 1) reasons.push('overall_rule_invalid');
  if (awards.length > 3 || !unique(awards.map(award => award.id)) || !unique(awards.map(award => award.chapterKey))) reasons.push('duplicate_source_awards');
  const missingChapters = keys.filter(key => !awards.some(award => award.chapterKey === key));
  for (const requirement of requirements) {
    reasons.push(...requirementsBlockers(requirement).map(reason => `${requirement.chapterKey}:${reason}`));
    const award = awards.find(entry => entry.chapterKey === requirement.chapterKey) ?? null;
    const result = chapterAwardValidity(requirement, {programInstanceId, programKey: requirement.programKey,
      chapterKey: requirement.chapterKey, requirementsVersion: requirement.requirementsVersion}, actorId, award);
    reasons.push(...result.reasons.map(reason => `${requirement.chapterKey}:${reason}`));
  }
  return {ready: reasons.length === 0 && missingChapters.length === 0, requiredChapterCount: 3,
    missingChapters, reasons: [...new Set(reasons)], sourceAwardIds: keys.flatMap(key => awards.filter(award => award.chapterKey === key).map(award => award.id))};
}
