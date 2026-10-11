// @vitest-environment node
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { auditChapter1Assessor, PROPOSALS_PATH } from '../lib/chapter1-assessor-audit.mjs';

const root = process.cwd();
const proposals = JSON.parse(readFileSync(path.join(root, PROPOSALS_PATH), 'utf8'));
const lessonDirectory = 'content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify';

function alteredSource(relative, mutate) {
  return (file, encoding) => {
    const text = readFileSync(file, encoding);
    if (file !== path.join(root, relative)) return text;
    const value = JSON.parse(text);
    mutate(value);
    return JSON.stringify(value);
  };
}

describe('read-only Chapter 1 assessor mapping audit', () => {
  test('inventories the actual authored criteria, guides and activities without claiming approval or publication', () => {
    const report = auditChapter1Assessor(root);
    expect(report.summary).toMatchObject({ modules: 9, required_lessons: 42, legacy_indicators: 36,
      proposed_lesson_criteria: 42, bilingual_guides: 84, activities: 27, orientation_cases: 8 });
    expect(report.publication_claim).toBe('authored_files_only');
    expect(report.ready_for_activation).toBe(false);
    expect(report.modules.every((module) => module.review_status === 'unreviewed')).toBe(true);
    expect(report.sources.every((source) => /^[a-f0-9]{64}$/.test(source.sha256_lf))).toBe(true);
  });

  test('does not join local objective zero to component objective zero', () => {
    const moduleReport = auditChapter1Assessor(root).modules.find((entry) => entry.module_key === '06-komunikasyon');
    const record = moduleReport.lessons.find((entry) => entry.lesson_key === 'communication-record');
    expect(record.criteria[0].objective_index).toBe(0);
    expect(record.proposed_legacy_indicator_ids).toEqual([
      'chapter-1:06-komunikasyon:indicator-2', 'chapter-1:06-komunikasyon:indicator-3',
    ]);
    expect(record.relation).toBe('supports_partial_component_evidence');
    expect(record.review_status).toBe('unreviewed');
  });

  test('does not approve even identical bilingual anchors automatically', () => {
    const rubric = JSON.parse(readFileSync(path.join(root, 'content/training/day1-basic-competencies/modules/06-komunikasyon/competency.json'), 'utf8'));
    const report = auditChapter1Assessor(root, {
      readSource: alteredSource(`${lessonDirectory}/competency.json`, (value) => {
        value.observation_indicators = [rubric.observation_indicators[0]];
      }),
    });
    const lesson = report.modules.find((entry) => entry.module_key === '06-komunikasyon').lessons.find((entry) => entry.lesson_key === 'communication-clarify');
    expect(lesson.exact_bilingual_anchor_match).toBe(true);
    expect(lesson.review_status).toBe('unreviewed');
    expect(report.ready_for_activation).toBe(false);
  });

  test('keeps orientation coverage gaps visible rather than fabricating cases', () => {
    const report = auditChapter1Assessor(root);
    expect(report.orientation_coverage.map((entry) => entry.cases)).toEqual([5, 0, 0, 0, 0, 1, 1, 1, 0]);
    expect(report.orientation_cases.every((entry) => entry.review_status === 'unreviewed')).toBe(true);
  });

  test.each([
    ['foreign legacy criterion', (value) => { value.modules[5].lessons[0].legacy_objective_indices = [99]; }, 'invalid proposed legacy'],
    ['duplicate criterion mapping', (value) => { value.modules[5].lessons[0].legacy_objective_indices = [0, 0]; }, 'invalid proposed legacy'],
    ['missing lesson mapping', (value) => { value.modules[5].lessons.pop(); }, 'missing/duplicate proposal lesson'],
    ['duplicate lesson mapping', (value) => { value.modules[5].lessons.push(value.modules[5].lessons[0]); }, 'missing/duplicate proposal lesson'],
    ['missing module', (value) => { value.modules.pop(); }, 'missing/duplicate proposal module'],
    ['approved proposal', (value) => { value.status = 'approved'; }, 'must remain Chapter 1 draft'],
    ['claimed rubric equivalence', (value) => { value.relation = 'equivalent'; }, 'must remain Chapter 1 draft'],
    ['wrong program', (value) => { value.program_key = 'another-program'; }, 'must remain Chapter 1 draft'],
  ])('rejects %s', (_name, mutate, message) => {
    const changed = structuredClone(proposals);
    mutate(changed);
    expect(() => auditChapter1Assessor(root, { proposals: changed })).toThrow(message);
  });

  test('rejects a local criterion pointing outside its lesson objective list', () => {
    expect(() => auditChapter1Assessor(root, {
      readSource: alteredSource(`${lessonDirectory}/competency.json`, (value) => { value.observation_indicators[0].objective_index = 1; }),
    })).toThrow('objective index outside its own objective list');
  });

  test('rejects missing Filipino anchors', () => {
    expect(() => auditChapter1Assessor(root, {
      readSource: alteredSource(`${lessonDirectory}/competency.json`, (value) => { delete value.observation_indicators[0].levels.hindi_pa_fil; }),
    })).toThrow('incomplete fil criterion');
  });

  test('rejects a foreign activity lesson mapping', () => {
    expect(() => auditChapter1Assessor(root, {
      readSource: alteredSource('content/training/day1-basic-competencies/modules/06-komunikasyon/activities.json', (value) => { value[0].lesson_keys = ['another-module-lesson']; }),
    })).toThrow('foreign/duplicate lesson mapping');
  });

  test('rejects a foreign orientation indicator', () => {
    expect(() => auditChapter1Assessor(root, {
      readSource: alteredSource('content/assessor/chapter-1-orientation.v1.json', (value) => { value.cases[0].indicator = 'chapter-2:foreign:indicator-1'; }),
    })).toThrow('foreign orientation indicator');
  });

  test('tracks source drift while retaining all review blockers', () => {
    const source = `${lessonDirectory}/competency.json`;
    const before = auditChapter1Assessor(root);
    const after = auditChapter1Assessor(root, {
      readSource: alteredSource(source, (value) => { value.observation_indicators[0].observable_en += ' Revised for fixture.'; }),
    });
    expect(after.sources.find((entry) => entry.path === source).sha256_lf)
      .not.toBe(before.sources.find((entry) => entry.path === source).sha256_lf);
    expect(after.activation_blockers).toEqual(before.activation_blockers);
    expect(after.ready_for_activation).toBe(false);
  });
});
