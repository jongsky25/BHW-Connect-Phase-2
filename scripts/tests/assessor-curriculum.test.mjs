// @vitest-environment node
import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';
import { auditCurriculum, MANIFEST_PATH } from '../lib/assessor-curriculum.mjs';
const root = process.cwd();
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

test('inventories both Reference Manual chapters without pretending authored content is live', () => {
  const report = auditCurriculum(root);
  expect(report.chapters.map(c => [c.modules, c.lessons])).toEqual([[9, 42], [7, 55]]);
  expect(report.chapters[0].questionCount).toBeGreaterThan(0);
  expect(report.chapters[1].activationBlockers).toContain('chapter_exam_bank_missing');
  expect(report.readyForActivation).toBe(false);
});

for (const [name, mutate] of [
  ['legacy course identity', m => { m.program_key = 'day1-basic-competencies'; }],
  ['missing chapter', m => { m.chapters.pop(); }],
  ['partial module', m => { m.chapters[0].modules.pop(); }],
  ['missing lesson', m => { m.chapters[0].modules[0].required_lesson_keys.pop(); }],
  ['duplicate lesson', m => { m.chapters[0].modules[0].required_lesson_keys.push(m.chapters[0].modules[0].required_lesson_keys[0]); }],
  ['changed bank', m => { m.chapters[0].posttest.sha256 = 'changed'; }],
  ['changed orientation', m => { m.chapters[0].orientation.sha256 = 'changed'; }],
  ['changed orientation content', m => { m.chapters[0].orientation.content_sha256 = 'changed'; }],
  ['changed rubric', m => { m.chapters[0].modules[0].rubric_sha256 = 'changed'; }],
  ['wrong passing score', m => { m.chapters[0].posttest.passing_percent = 50; }],
  ['practical candidate assessment', m => { m.candidate_practical_assessment_required = true; }],
  ['unreviewed activation', m => { m.chapters[0].curriculum_status = 'approved'; }],
  ['fabricated quiz', m => { m.chapters[0].modules[0].required_exam_keys.push('quiz'); }],
]) {
  test(`rejects ${name}`, () => {
    const changed = structuredClone(manifest);
    mutate(changed);
    expect(() => auditCurriculum(root, changed)).toThrow('Assessor curriculum:');
  });
}
