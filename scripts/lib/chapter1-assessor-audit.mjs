import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const PROPOSALS_PATH = 'docs/chapter-1-assessor-map-proposals.json';
const MANIFEST_PATH = 'content/assessor/bhw-reference-manual.v1.json';
const GUIDE_SECTIONS = [
  'purpose', 'time-materials', 'prepare', 'opening', 'steps', 'expected-answers',
  'misconception', 'practice', 'answer-key', 'observe', 'support', 'sources-review',
];
const LANGUAGES = ['fil', 'en'];
const LEVELS = ['kaya_na', 'kailangan_practice', 'hindi_pa'];
const requireValue = (condition, message) => {
  if (!condition) throw new Error(`Chapter 1 assessor audit: ${message}`);
};
const unique = (values) => new Set(values).size === values.length;
const sameSet = (left, right) => unique(left) && unique(right)
  && JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const normalize = (value) => value.replace(/\r\n/g, '\n');
const digest = (value) => createHash('sha256').update(normalize(value)).digest('hex');
const textPresent = (value) => typeof value === 'string' && value.trim().length > 0;
const bilingual = (value) => LANGUAGES.every((language) => textPresent(value?.[language]));

function validateIndicators(indicators, objectives, file) {
  requireValue(Array.isArray(indicators) && indicators.length > 0, `${file}: missing indicators`);
  requireValue(unique(indicators.map((indicator) => indicator.objective_index)), `${file}: duplicate objective index`);
  for (const indicator of indicators) {
    requireValue(Number.isInteger(indicator.objective_index) && indicator.objective_index >= 0
      && LANGUAGES.every((language) => indicator.objective_index < objectives[language].length),
    `${file}: objective index outside its own objective list`);
    for (const language of LANGUAGES) {
      requireValue(textPresent(indicator[`observable_${language}`]) && textPresent(indicator[`not_yet_${language}`])
        && LEVELS.every((level) => textPresent(indicator.levels?.[`${level}_${language}`])),
      `${file}: incomplete ${language} criterion or rating anchor`);
    }
  }
}

/** Authored-file audit only. No network, database, runtime imports or content writes.
 * Explicit proposals are review hypotheses; local objective indices never establish equivalence.
 * Fingerprints record what was inspected and do not update the curriculum's reviewed pins.
 */
export function auditChapter1Assessor(root, { proposals, readSource = readFileSync, listSource = readdirSync } = {}) {
  const repository = path.resolve(root);
  const sources = new Map();
  const read = (relative) => {
    const full = path.resolve(repository, relative);
    requireValue(full.startsWith(`${repository}${path.sep}`), `source escapes repository: ${relative}`);
    const value = String(readSource(full, 'utf8'));
    sources.set(relative, { path: relative, sha256_lf: digest(value) });
    return value;
  };
  const json = (file) => JSON.parse(read(file));
  const directories = (relative) => listSource(path.join(repository, relative), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const manifest = json(MANIFEST_PATH);
  requireValue(manifest.program_key === 'bhw-reference-manual', 'unexpected program identity');
  const chapter = manifest.chapters.find((entry) => entry.chapter_key === 'chapter-1');
  requireValue(chapter?.source_root === 'content/training/day1-basic-competencies/modules', 'unexpected Chapter 1 source');
  const proposal = proposals ?? json(PROPOSALS_PATH);
  requireValue(proposal.schema_version === 1 && proposal.program_key === manifest.program_key
    && proposal.chapter_key === 'chapter-1' && proposal.status === 'draft'
    && proposal.relation === 'supports_partial_component_evidence', 'proposals must remain Chapter 1 draft evidence mappings');
  requireValue(sameSet(chapter.modules.map((module) => module.module_key), directories(chapter.source_root)), 'authored module inventory mismatch');
  requireValue(sameSet(proposal.modules.map((module) => module.module_key), chapter.modules.map((module) => module.module_key)), 'missing/duplicate proposal module');

  const warnings = [];
  const modules = [];
  const allIndicatorIds = new Set();
  for (const authored of chapter.modules) {
    const moduleKey = authored.module_key;
    const directory = `${chapter.source_root}/${moduleKey}`;
    const moduleFile = `${directory}/module.json`;
    const rubricFile = `${directory}/competency.json`;
    const moduleContent = json(moduleFile);
    const rubric = json(rubricFile).observation_indicators;
    const objectives = { fil: moduleContent.objectives_fil, en: moduleContent.objectives_en };
    requireValue(LANGUAGES.every((language) => Array.isArray(objectives[language]) && objectives[language].every(textPresent)), `${moduleFile}: missing objectives`);
    requireValue(objectives.fil.length === objectives.en.length, `${moduleFile}: objective language count mismatch`);
    validateIndicators(rubric, objectives, rubricFile);
    const proposalModule = proposal.modules.find((entry) => entry.module_key === moduleKey);
    requireValue(textPresent(proposalModule.review_note), `${moduleKey}: missing mapping review note`);
    requireValue(sameSet(proposalModule.lessons.map((lesson) => lesson.lesson_key), authored.required_lesson_keys), `${moduleKey}: missing/duplicate proposal lesson`);
    requireValue(sameSet(directories(`${directory}/lessons`), authored.required_lesson_keys), `${moduleKey}: lesson directory inventory mismatch`);

    const indicators = rubric.map((indicator, index) => {
      const identity = authored.indicators.find((entry) => entry.source_objective_index === indicator.objective_index);
      requireValue(identity?.id === `chapter-1:${moduleKey}:indicator-${index + 1}`
        && !allIndicatorIds.has(identity.id), `${moduleKey}: missing/duplicate/foreign legacy indicator identity`);
      allIndicatorIds.add(identity.id);
      return { id: identity.id, source: rubricFile, objective: {
        fil: objectives.fil[indicator.objective_index], en: objectives.en[indicator.objective_index],
      }, ...indicator };
    });
    requireValue(indicators.length === authored.indicators.length, `${moduleKey}: rubric/manifest indicator count mismatch`);
    const lessons = [];
    for (const lessonKey of authored.required_lesson_keys) {
      const lessonDirectory = `${directory}/lessons/${lessonKey}`;
      const lessonFile = `${lessonDirectory}/lesson.json`;
      const lesson = json(lessonFile);
      requireValue(lesson.manifest.lesson_key === lessonKey && lesson.manifest.required === true, `${lessonFile}: lesson identity/requirement mismatch`);
      const lessonObjectives = { fil: lesson.manifest.objectives_fil, en: lesson.manifest.objectives_en };
      requireValue(LANGUAGES.every((language) => Array.isArray(lessonObjectives[language])
        && lessonObjectives[language].length > 0 && lessonObjectives[language].every(textPresent))
        && lessonObjectives.fil.length === lessonObjectives.en.length, `${lessonFile}: incomplete objectives`);
      const lessonRubricFile = `${lessonDirectory}/competency.json`;
      const lessonIndicators = json(lessonRubricFile).observation_indicators;
      validateIndicators(lessonIndicators, lessonObjectives, lessonRubricFile);
      const mapping = proposalModule.lessons.find((entry) => entry.lesson_key === lessonKey);
      requireValue(Array.isArray(mapping.legacy_objective_indices) && mapping.legacy_objective_indices.length > 0
        && unique(mapping.legacy_objective_indices)
        && mapping.legacy_objective_indices.every((index) => indicators.some((indicator) => indicator.objective_index === index)),
      `${lessonKey}: invalid proposed legacy objective index`);
      const targets = mapping.legacy_objective_indices.map((index) => indicators.find((indicator) => indicator.objective_index === index));
      const guides = {};
      for (const language of LANGUAGES) {
        const file = `${lessonDirectory}/facilitator.${language}.md`;
        const notes = read(file);
        const sections = [...notes.matchAll(/^## \[([^\]]+)\]/gm)].map((match) => match[1]);
        requireValue(JSON.stringify(sections) === JSON.stringify(GUIDE_SECTIONS), `${file}: unexpected guide section sequence`);
        guides[language] = { source: file, words: notes.trim().split(/\s+/).length, sections };
      }
      lessons.push({
        lesson_key: lessonKey, position: lesson.manifest.position, source: lessonFile,
        title: { fil: lesson.manifest.title_fil, en: lesson.manifest.title_en }, objectives: lessonObjectives,
        concept_ids: [...new Set(lesson.sections.flatMap((section) => section.concept_ids ?? []))].sort(),
        guides,
        criteria: lessonIndicators.map((indicator) => ({
          proposed_id: `chapter-1:${moduleKey}:lesson:${lessonKey}:criterion-${indicator.objective_index + 1}`,
          source: lessonRubricFile, ...indicator,
        })),
        proposed_legacy_indicator_ids: targets.map((target) => target.id),
        relation: proposal.relation,
        review_status: 'unreviewed',
        exact_bilingual_anchor_match: targets.length === 1 && lessonIndicators.length === 1
          && LANGUAGES.every((language) => ['observable', 'not_yet'].every((field) =>
            normalize(lessonIndicators[0][`${field}_${language}`]) === normalize(targets[0][`${field}_${language}`]))
            && LEVELS.every((level) => normalize(lessonIndicators[0].levels[`${level}_${language}`])
              === normalize(targets[0].levels[`${level}_${language}`]))),
      });
    }
    requireValue(unique(lessons.map((lesson) => lesson.position)), `${moduleKey}: duplicate lesson position`);
    warnings.push({ code: 'mapping_review_required', module_key: moduleKey, detail: proposalModule.review_note });
    if (lessons.some((lesson) => lesson.criteria.some((criterion) => criterion.objective_index === 0))) {
      warnings.push({ code: 'local_indices_are_not_component_mapping', module_key: moduleKey,
        detail: 'Lesson objective 0 is local to that lesson. Use reviewed stable mappings; never join directly to module objective 0.' });
    }
    const activitiesFile = `${directory}/activities.json`;
    const activities = json(activitiesFile);
    requireValue(Array.isArray(activities) && unique(activities.map((activity) => activity.id)), `${activitiesFile}: invalid/duplicate activities`);
    const activityMappings = activities.map((activity) => {
      requireValue(textPresent(activity.id) && bilingual(activity.title) && Number.isInteger(activity.version) && activity.version > 0, `${activitiesFile}: invalid activity identity`);
      requireValue(Array.isArray(activity.objective_indices) && unique(activity.objective_indices)
        && activity.objective_indices.every((index) => indicators.some((indicator) => indicator.objective_index === index)), `${activity.id}: invalid activity objective`);
      requireValue(Array.isArray(activity.lesson_keys) && unique(activity.lesson_keys)
        && activity.lesson_keys.every((key) => authored.required_lesson_keys.includes(key)), `${activity.id}: foreign/duplicate lesson mapping`);
      return { id: activity.id, version: activity.version, source: activitiesFile, title: activity.title,
        lesson_keys: activity.lesson_keys,
        legacy_indicator_ids: activity.objective_indices.map((index) => indicators.find((indicator) => indicator.objective_index === index).id),
        evidence_coverage: 'not_established_by_participation', review_status: 'unreviewed' };
    });
    const moduleGuides = Object.fromEntries(LANGUAGES.map((language) => {
      const file = `${directory}/facilitator-notes.${language}.md`;
      const notes = read(file);
      requireValue(textPresent(notes), `${file}: empty module guide`);
      return [language, { source: file, words: notes.trim().split(/\s+/).length }];
    }));
    modules.push({ module_key: moduleKey, component_id: `chapter-1:${moduleKey}`, source: moduleFile,
      title: { fil: moduleContent.title_fil, en: moduleContent.title_en }, review_status: 'unreviewed',
      review_note: proposalModule.review_note, guides: moduleGuides, indicators, lessons, activities: activityMappings });
  }

  const orientation = json(chapter.orientation.content_source);
  requireValue(orientation.chapter_key === 'chapter-1' && unique(orientation.cases.map((item) => item.id)), 'invalid orientation identity/cases');
  const orientationCases = orientation.cases.map((item) => {
    requireValue(allIndicatorIds.has(item.indicator), `${item.id}: foreign orientation indicator`);
    requireValue(bilingual(item.case) && bilingual(item.reason) && LEVELS.includes(item.correct), `${item.id}: incomplete orientation case`);
    return { id: item.id, legacy_indicator_id: item.indicator, correct: item.correct,
      critical: item.critical === true, source: chapter.orientation.content_source, review_status: 'unreviewed' };
  });
  const orientationCoverage = modules.map((module) => ({
    module_key: module.module_key,
    cases: orientationCases.filter((item) => module.indicators.some((indicator) => indicator.id === item.legacy_indicator_id)).length,
  }));
  warnings.push({ code: 'calibration_coverage_review_required', detail: 'Case counts show authored coverage only. Coverage gaps do not establish a new exam/pass rule.', coverage: orientationCoverage });
  const allLessons = modules.flatMap((module) => module.lessons);
  const criteria = allLessons.flatMap((lesson) => lesson.criteria);
  requireValue(unique(criteria.map((criterion) => criterion.proposed_id)), 'duplicate proposed criterion identity');
  return {
    schema_version: 1, program_key: manifest.program_key, chapter_key: 'chapter-1',
    curriculum_version: manifest.version, status: 'draft', ready_for_activation: false,
    publication_claim: 'authored_files_only',
    summary: { modules: modules.length, required_lessons: allLessons.length,
      legacy_indicators: allIndicatorIds.size, proposed_lesson_criteria: criteria.length,
      activities: modules.reduce((count, module) => count + module.activities.length, 0),
      bilingual_guides: allLessons.length * LANGUAGES.length, orientation_cases: orientationCases.length,
      exact_bilingual_anchor_matches: allLessons.filter((lesson) => lesson.exact_bilingual_anchor_match).length,
      unreviewed_lesson_mappings: allLessons.length },
    modules, orientation_cases: orientationCases, orientation_coverage: orientationCoverage,
    activation_blockers: ['component_rubric_mapping_review', 'orientation_rubric_review', 'evidence_sufficiency_review'],
    warnings,
    sources: [...sources.values()].sort((left, right) => left.path.localeCompare(right.path)),
  };
}
