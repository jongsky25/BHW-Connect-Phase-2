import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const MANIFEST_PATH = 'content/assessor/bhw-reference-manual.v1.json';
const fail = (message) => { throw new Error(`Assessor curriculum: ${message}`); };
const assert = (ok, message) => { if (!ok) fail(message); };
const equalSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const unique = (values) => new Set(values).size === values.length;
const key = (v) => typeof v === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(v);
// Git's Windows checkout may expand LF to CRLF; hash the committed text form.
const sha = (bytes) => createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');

/** Read-only authored-content audit. It never infers live publication from files. */
export function auditCurriculum(root, supplied) {
  const read = (file) => {
    const full = path.resolve(root, file);
    assert(full.startsWith(path.resolve(root) + path.sep), 'source escapes repository');
    return readFileSync(full);
  };
  const json = (file) => JSON.parse(read(file).toString('utf8'));
  const manifest = supplied ?? json(MANIFEST_PATH);
  assert(manifest.schema_version === 1, 'unsupported schema');
  assert(manifest.program_key === 'bhw-reference-manual', 'course must be BHW Reference Manual');
  assert(typeof manifest.version === 'string' && manifest.version.length > 0, 'version required');
  assert(manifest.pretest === 'diagnostic', 'pretest must be diagnostic');
  assert(manifest.candidate_practical_assessment_required === false, 'candidate must not need practical assessment');
  assert(manifest.component_unlock === 'related_subchapter', 'components unlock per subchapter');
  assert(equalSet(manifest.chapters.map(c => c.chapter_key), ['chapter-1', 'chapter-2']), 'inventory both existing chapters');
  assert(equalSet(manifest.unavailable_chapter_keys, ['chapter-3']), 'Chapter III must remain explicitly unavailable');
  const results = [];
  for (const chapter of manifest.chapters) {
    const expectedRoot = chapter.chapter_key === 'chapter-1'
      ? 'content/training/day1-basic-competencies/modules'
      : 'content/training/chapter2-common-competencies/drafts';
    assert(chapter.source_root === expectedRoot, 'unexpected chapter source mapping');
    assert(chapter.curriculum_status === 'draft', 'AF-01 cannot activate an unreviewed qualification curriculum');
    const dirs = readdirSync(path.join(root, expectedRoot), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
    assert(equalSet(chapter.modules.map(m => m.module_key), dirs), `${chapter.chapter_key}: incomplete or duplicate module inventory`);
    let lessons = 0;
    let indicators = 0;
    for (const subchapter of chapter.modules) {
      assert(key(subchapter.module_key), 'invalid module key');
      const dir = `${expectedRoot}/${subchapter.module_key}`;
      const authored = json(`${dir}/module.json`);
      assert(subchapter.title.fil === authored.title_fil && subchapter.title.en === authored.title_en, `${dir}: title drift`);
      const lessonDirs = readdirSync(path.join(root, dir, 'lessons'), { withFileTypes: true }).filter(d => d.isDirectory());
      const required = lessonDirs.map(d => json(`${dir}/lessons/${d.name}/lesson.json`).manifest).filter(l => l.required).map(l => l.lesson_key);
      assert(required.length > 0 && unique(required), `${dir}: empty/duplicate authored lessons`);
      assert(equalSet(subchapter.required_lesson_keys, required), `${dir}: required lesson inventory drift`);
      // Neither current chapter authors separate module exam banks. Retrieval
      // checks are formative, not quizzes. Add approved banks explicitly later.
      assert(Array.isArray(subchapter.required_exam_keys) && subchapter.required_exam_keys.length === 0, `${dir}: unauthored module exam`);
      assert(subchapter.rubric_source === `${dir}/competency.json`, `${dir}: wrong rubric source`);
      const rubricBytes = read(subchapter.rubric_source);
      assert(sha(rubricBytes) === subchapter.rubric_sha256, `${dir}: rubric changed; review and version the manifest`);
      const rubric = JSON.parse(rubricBytes.toString('utf8')).observation_indicators;
      assert(rubric.length > 0 && unique(rubric.map(i => i.objective_index)), `${dir}: invalid rubric indicators`);
      assert(subchapter.indicators.length === rubric.length && unique(subchapter.indicators.map(i => i.id)), `${dir}: indicator inventory mismatch`);
      for (const [i, indicator] of subchapter.indicators.entries()) {
        assert(indicator.id === `${chapter.chapter_key}:${subchapter.module_key}:indicator-${i + 1}`, `${dir}: unstable indicator ID`);
        assert(indicator.source_objective_index === rubric[i].objective_index, `${dir}: indicator mapping drift`);
      }
      lessons += required.length;
      indicators += rubric.length;
    }
    assert(chapter.posttest.id === `${chapter.chapter_key}:posttest` && chapter.posttest.passing_percent === 80, 'post-test must use approved 80% threshold');
    let questionCount = 0;
    if (chapter.posttest.source) {
      const expectedSource = chapter.chapter_key === 'chapter-1'
        ? 'content/training/day1-basic-competencies/test-questions.json'
        : 'content/training/chapter2-common-competencies/release/los-banos-2026-09-25.json';
      assert(chapter.posttest.source === expectedSource, 'unexpected exam source');
      const bytes = read(chapter.posttest.source);
      assert(sha(bytes) === chapter.posttest.sha256, 'exam bank changed; review and version the manifest');
      const source = JSON.parse(bytes.toString('utf8'));
      if (chapter.chapter_key === 'chapter-1') {
        const questions = source.questions;
        assert(questions.length > 0, 'empty exam bank');
        assert(equalSet([...new Set(questions.map(q => q.module))], chapter.modules.map(m => m.module_key)), 'exam bank does not cover full chapter');
        questionCount = questions.length;
      } else {
        assert(source.status === 'published' && source.counts?.lessons === lessons && source.counts?.modules === chapter.modules.length,
          'Chapter II published release inventory drift');
        assert(source.counts.questions === 14 && source.assessment_question_ids.length === 14
          && unique(source.assessment_question_ids), 'Chapter II published question inventory drift');
        questionCount = source.assessment_question_ids.length;
      }
    } else {
      assert(false, `${chapter.chapter_key}: missing exam source`);
    }
    {
      const orientation = chapter.orientation;
      const expectedVersion = chapter.chapter_key === 'chapter-1' ? '2026-09-29.1' : '2026-09-29.2';
      const expectedMigration = chapter.chapter_key === 'chapter-1'
        ? 'supabase/migrations/20260929050611_assessor_scoring_orientation.sql'
        : 'supabase/migrations/20260929063731_assessor_chapter2_exams_orientation.sql';
      assert(orientation?.version === expectedVersion && orientation.lesson_count === 6
        && orientation.case_count === 8 && orientation.passing_count === 7,
        `${chapter.chapter_key} orientation contract drift`);
      assert(orientation.migration_source === expectedMigration,
        'unexpected orientation source');
      assert(sha(read(orientation.migration_source)) === orientation.sha256,
        'orientation changed; review and version the scoring exercise');
      assert(orientation.content_source === `content/assessor/${chapter.chapter_key}-orientation.v1.json`
        && sha(read(orientation.content_source)) === orientation.content_sha256,
      'orientation source changed; review and version it');
      const material = json(orientation.content_source);
      const localized = value => value && typeof value.fil === 'string' && value.fil.trim()
        && typeof value.en === 'string' && value.en.trim();
      assert(material.chapter_key === chapter.chapter_key && material.curriculum_version === manifest.version
        && material.orientation_version === orientation.version, 'orientation identity drift');
      assert(localized(material.title) && material.guide.length >= 3 && material.guide.every(localized),
        'orientation guide translation incomplete');
      assert(material.lessons.length === orientation.lesson_count && unique(material.lessons.map(l => l.id))
        && material.lessons.every(l => key(l.id) && localized(l.title) && l.body.length >= 2 && l.body.every(localized)),
      'orientation lessons incomplete');
      const indicatorIds = new Set(chapter.modules.flatMap(m => m.indicators.map(i => i.id)));
      assert(material.cases.length === orientation.case_count && unique(material.cases.map(c => c.id))
        && material.cases.every(c => key(c.id) && indicatorIds.has(c.indicator) && localized(c.case)
          && localized(c.reason) && ['kaya_na','kailangan_practice','hindi_pa'].includes(c.correct))
        && material.cases.filter(c => c.critical).length === (chapter.chapter_key === 'chapter-1' ? 1 : 2)
        && material.passing_count === orientation.passing_count,
      'orientation cases or rubric mapping incomplete');
    }
    results.push({ chapter: chapter.chapter_key, modules: chapter.modules.length, lessons, indicators, questionCount,
      activationBlockers: ['curriculum_and_rubric_review', ...(chapter.orientation ? [] : ['orientation_not_implemented']), ...(questionCount ? [] : ['chapter_exam_bank_missing'])] });
  }
  return { program: manifest.program_key, version: manifest.version, chapters: results, readyForActivation: false };
}
