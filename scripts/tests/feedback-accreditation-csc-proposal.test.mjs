// @vitest-environment node
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { buildAccreditationCscProposal, loadAccreditationCscInputs, renderAccreditationCscReview } from '../lib/feedback-accreditation-csc-proposal.mjs';
import { validateRelease } from '../lib/chapter1-assessment-content.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
const inputs = loadAccreditationCscInputs(root);
const build = (proposal = inputs.proposal) => buildAccreditationCscProposal({ ...inputs, proposal });

it('replaces only T11 while retaining the published UHC update, all other questions and existing pins', () => {
  const before = JSON.stringify(inputs);
  const result = build();
  expect(result.publication_ready).toBe(false);
  expect(result.assessment.publication_status).toBe('draft');
  expect(result.assessment.comparability_status).toBe('unvalidated');
  for (const phase of ['pretest', 'posttest']) {
    expect(result.assessment.forms[phase].items.filter(q => q.slot !== 'T11'))
      .toEqual(inputs.base.forms[phase].items.filter(q => q.slot !== 'T11'));
    expect(result.assessment.forms[phase].form_id).not.toBe(inputs.base.forms[phase].form_id);
  }
  expect(result.assessment.checkpoints).toEqual(inputs.base.checkpoints);
  expect(result.assessment.curriculum_revisions).toEqual(inputs.base.curriculum_revisions);
  expect(validateRelease(result.assessment, inputs.context)).toHaveLength(5);
  expect(JSON.stringify(inputs)).toBe(before);
});

it('adds an unscored filing section in both modes without replacing eligibility checks, media, sources or qualifications', () => {
  const result = build().lesson;
  for (const key of ['manifest', 'notes']) expect(result[key]).toEqual(inputs.lesson[key]);
  for (const key of ['assets', 'featured_asset_id', 'sources']) expect(result.revision[key]).toEqual(inputs.lesson.revision[key]);
  for (const [mode, sectionId, replaceId] of [
    ['read_sections', 'bhwe-filing-receipt', 'section-4'], ['slides', 'slide-bhwe-filing-receipt', 'slide-section-4'],
  ]) {
    expect(result.revision[mode]).toHaveLength(7);
    const note = result.revision[mode].find(s => s.id === sectionId);
    expect(note.check).toBeNull(); expect(note.asset_ids).toEqual([]);
    expect(result.revision[mode].filter(s => ![sectionId, replaceId].includes(s.id)))
      .toEqual(inputs.lesson.revision[mode].filter(s => s.id !== replaceId));
  }
  const note = result.revision.read_sections.find(s => s.id === 'bhwe-filing-receipt');
  expect(note.body_en).toMatch(/in person.*authorized representative.*conduit CSC office.*mail/);
  expect(note.body_fil).toMatch(/personal.*awtorisadong kinatawan.*conduit CSC office.*koreo/);
  expect(note.body_en).toContain('a representative cannot receive it');
  expect(note.body_fil).toContain('hindi ito maaaring tanggapin ng kinatawan');
});

it('keeps the exact bilingual review packet reproducible from the proposed copy', () => {
  expect(readFileSync(join(dir, 'proposals/fb-2.3-accreditation-csc/REVIEW.md'), 'utf8'))
    .toBe(renderAccreditationCscReview(inputs));
});

it.each([
  p => { p.base_release_sha256 = '0'.repeat(64); },
  p => { p.base_lesson_hash = '0'.repeat(64); },
  p => { p.base_lesson_revision_id = '00000000-0000-4000-8000-000000000000'; },
  p => { p.replacements[0].slot = 'T05'; },
  p => { p.replacements[0].item.item_id = inputs.base.forms.posttest.items.find(q => q.slot === 'T11').item_id; },
  p => { p.replacements[0].item.options[0].label.fil = ''; },
  p => { p.lesson_changes.read_section.body_fil = ''; p.lesson_changes.slide.narration_fil = ''; },
  p => { p.lesson_changes.replace_section.body.en = 'Civil Service Commission (CSC) grants everyone eligibility.'; },
  p => { p.approval_status = 'approved'; },
  p => { p.replacements[0].item.reviewer = 'claimed-reviewer'; },
  p => { p.release_requirements.curriculum_pins = 'ready'; },
  p => { p.release_requirements.media = 'approved'; },
  p => { p.continuity.existing_enrollments = 'replace_old_release'; },
])('rejects drift, identity reuse, incomplete translation, invented approval or broken continuity (%#)', mutate => {
  const p = structuredClone(inputs.proposal); mutate(p);
  expect(() => build(p)).toThrow();
});

it('exports a draft bundle without an import path or overwriting source files', () => {
  const folder = mkdtempSync(join(tmpdir(), 'fb23-'));
  const cli = join(root, 'scripts/feedback-accreditation-csc-proposal.mjs');
  const files = [join(dir, 'release.json'), join(dir, 'releases/chapter1-feedback-uhc-v2/release.json'),
    join(root, 'content/training/day1-basic-competencies/modules/04-ra7883/lessons/bhw-eligibility/read.en.md')];
  const before = files.map(f => readFileSync(f));
  try {
    const output = join(folder, 'candidate.json');
    const summary = JSON.parse(execFileSync(process.execPath, [cli, '--output', output], { encoding: 'utf8' }));
    expect(summary.imported).toBe(false); expect(summary.activated).toBe(false);
    expect(summary.publication_ready).toBe(false);
    expect(JSON.parse(readFileSync(output, 'utf8')).assessment.publication_status).toBe('draft');
    for (const args of [['--output', output], ['--output', files[0]], ['--import']])
      expect(() => execFileSync(process.execPath, [cli, ...args], { stdio: 'pipe' })).toThrow();
    files.forEach((file, i) => expect(readFileSync(file)).toEqual(before[i]));
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
