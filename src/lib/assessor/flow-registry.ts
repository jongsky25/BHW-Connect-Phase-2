import manifest from '../../../content/assessor/bhw-reference-manual.v1.json';
import orientation1 from '../../../content/assessor/chapter-1-orientation.v1.json';
import orientation2 from '../../../content/assessor/chapter-2-orientation.v1.json';
import audit from '../../../docs/chapter-1-assessor-audit.json';
import type {ChapterKey, FlowRequirements, CriterionRequirement} from './flow';

export const CHAPTER_KEYS: readonly ChapterKey[] = ['chapter-1', 'chapter-2', 'chapter-3'];
export const PROGRAM_KEY = 'bhw-reference-manual';
export const DRAFT_AWARD_RULE = 'c1af-combined-award.draft-1';

/** Authored catalog, not delivery availability. No route/RPC consumes this yet.
 * Chapter 2's existing qualification path remains in curriculum.ts and its RPCs.
 */
export function assessorChapterCatalog(): FlowRequirements[] {
  return CHAPTER_KEYS.map(chapterKey => {
    const chapter = manifest.chapters.find(entry => entry.chapter_key === chapterKey);
    const orientation = chapterKey === 'chapter-1' ? orientation1 : orientation2;
    return {
      programKey: PROGRAM_KEY, chapterKey,
      title: chapter?.title ?? 'Chapter 3',
      path: chapterKey === 'chapter-1' ? 'revised_draft' : chapter ? 'existing_path' : 'unavailable',
      requirementsVersion: `${chapterKey}:c1af.draft-1`,
      curriculumVersion: manifest.version,
      rubricVersion: null, // Canonical crosswalk/anchors are not approved yet.
      awardRuleVersion: DRAFT_AWARD_RULE,
      requiredLessonIds: chapter?.modules.flatMap(entry => entry.required_lesson_keys.map(key => `${entry.module_key}:${key}`)) ?? [],
      exams: chapter ? [{id: chapter.posttest.id, passingPercent: chapter.posttest.passing_percent}] : [],
      orientation: chapter ? {
        version: chapter.orientation.version,
        lessonIds: orientation.lessons.map(lesson => lesson.id),
        caseCount: chapter.orientation.case_count,
        passingCount: chapter.orientation.passing_count,
        safetyPassRequired: true,
      } : null,
      // C1AF-06b supplies a reviewed scenario/checkpoint contract, not a guessed receipt.
      simulation: null,
      simulationRequired: chapterKey === 'chapter-1',
      approvals: {requirements: null, mapping: null, evidence: null, orientation: null, simulation: null, issuer: null, award: null},
      unavailableReasons: chapter ? [] : ['chapter_path_unavailable'],
    };
  });
}

/** Provisional criterion identities with exact bilingual anchor provenance.
 * Keep this audit-backed module out of client bundles; presentation needs only
 * the state summary. Local objective indexes never become a join key.
 */
export function chapter1DraftRegistry() {
  const fingerprints = new Map(audit.sources.map(source => [source.path, source.sha256_lf]));
  const criteria = audit.modules.flatMap(component => component.lessons.flatMap(lesson => lesson.criteria.map(criterion => {
    const sourceFingerprint = fingerprints.get(criterion.source);
    if (!sourceFingerprint) throw new Error(`Missing criterion provenance: ${criterion.source}`);
    const requirement: CriterionRequirement = {
      id: criterion.proposed_id, chapterKey: 'chapter-1', componentId: component.component_id,
      version: `draft:${sourceFingerprint}`, source: criterion.source, sourceFingerprint,
      reviewStatus: 'unreviewed', decisionId: null,
    };
    return {
      ...requirement,
      lessonKey: lesson.lesson_key, sourceObjectiveIndex: criterion.objective_index,
      objective: {fil: [...lesson.objectives.fil], en: [...lesson.objectives.en]},
      anchors: {observable: {fil: criterion.observable_fil, en: criterion.observable_en},
        notYet: {fil: criterion.not_yet_fil, en: criterion.not_yet_en}, levels: {...criterion.levels}},
      proposedLegacyIndicatorIds: [...lesson.proposed_legacy_indicator_ids],
      relation: 'supports_partial_component_evidence' as const,
    };
  })));
  const ids = new Set(criteria.map(criterion => criterion.id));
  if (criteria.length !== 42 || ids.size !== criteria.length) throw new Error('Incomplete/duplicate Chapter 1 draft registry');
  const legacyIds = new Set(audit.modules.flatMap(component => component.indicators.map(indicator => indicator.id)));
  if (criteria.some(criterion => criterion.proposedLegacyIndicatorIds.some(id => !legacyIds.has(id)))) {
    throw new Error('Foreign legacy target in Chapter 1 draft registry');
  }
  return {programKey: PROGRAM_KEY, chapterKey: 'chapter-1' as const,
    curriculumVersion: audit.curriculum_version, status: 'draft' as const, readyForActivation: false as const,
    criteria,
    components: audit.modules.map(component => ({id: component.component_id, reviewStatus: 'unreviewed' as const,
      requiredCriterionIds: criteria.filter(criterion => criterion.componentId === component.component_id).map(criterion => criterion.id),
      evidenceDecisionId: null,
      legacyIndicatorIds: component.indicators.map(indicator => indicator.id),
    })),
  };
}
