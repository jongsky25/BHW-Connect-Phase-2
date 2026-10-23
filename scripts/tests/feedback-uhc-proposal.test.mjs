// @vitest-environment node
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { buildUhcProposal } from '../lib/feedback-uhc-proposal.mjs';
import { fullFormHash, loadLessonMap, validateRelease } from '../lib/chapter1-assessment-content.mjs';
import { renderUhcProposalReview } from '../lib/feedback-uhc-review.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
const read = file => JSON.parse(readFileSync(join(source, file), 'utf8'));
const base = read('release.json');
const proposal = read('proposals/fb-2.2a-uhc/proposal.json');
const context = { ...loadLessonMap(root), orientation: read('orientation.json') };
const build = p => buildUhcProposal(base, p ?? proposal, context);

it('keeps the checked-in bilingual review packet identical to the proposed candidate copy', () => {
  expect(readFileSync(join(source, 'proposals/fb-2.2a-uhc/REVIEW.md'), 'utf8')).toBe(renderUhcProposalReview(base, proposal));
});

it('creates a complete draft with new form/item identities while preserving the approved release and referral items', () => {
  const before = JSON.stringify(base);
  const candidate = build();
  expect(candidate.release_id).not.toBe(base.release_id);
  expect(candidate.publication_status).toBe('draft');
  expect(candidate.checkpoints).toEqual(base.checkpoints);
  expect(candidate.curriculum_revisions).toEqual(base.curriculum_revisions);
  for (const phase of ['pretest', 'posttest']) {
    const form = candidate.forms[phase];
    expect(form.items).toHaveLength(30);
    expect(form.form_id).not.toBe(base.forms[phase].form_id);
    expect(form.hash).toBe(fullFormHash(form.items));
    expect(form.hash).not.toBe(base.forms[phase].hash);
    expect(form.items.filter(q => q.slot !== 'T05')).toEqual(base.forms[phase].items.filter(q => q.slot !== 'T05'));
    expect(form.items.find(q => q.slot === 'T06')).toEqual(base.forms[phase].items.find(q => q.slot === 'T06'));
  }
  const items = [...Object.values(candidate.forms).flatMap(form => form.items), ...candidate.checkpoints.flatMap(g => [...g.first, ...g.alternates])];
  expect(new Set(items.map(q => q.item_id)).size).toBe(108);
  expect(JSON.stringify(base)).toBe(before);
  // Only approval checks fail; the ordinary importer contract is unchanged.
  expect(validateRelease(candidate, context).sort()).toEqual([
    'release scope, identity, approval or comparability status is invalid',
    ...['pretest', 'posttest'].flatMap(phase => [`${phase} T05: missing approval metadata`, `${phase} T05: missing safety/privacy review`]),
  ].sort());
});

it('rejects baseline drift before producing an export', () => {
  const changed = structuredClone(base);
  changed.forms.pretest.items[0].stem.en += ' changed';
  changed.forms.pretest.hash = fullFormHash(changed.forms.pretest.items);
  expect(() => buildUhcProposal(changed, proposal, context)).toThrow('Reviewed baseline drift');
});

it.each([
  p => { p.replacements[0].slot = 'T06'; },
  p => { p.replacements[0].replaces_item_id = 'wrong'; },
  p => { p.replacements[0].item.item_id = base.forms.pretest.items[0].item_id; },
  p => { p.replacements[1].item.item_id = p.replacements[0].item.item_id; },
  p => { p.replacements[0].item.version = 1; },
  p => { p.proposed_form_ids.pretest = base.forms.pretest.form_id; },
])('rejects blueprint or identity reuse (%#)', mutate => {
  const changed = structuredClone(proposal); mutate(changed);
  expect(() => build(changed)).toThrow();
});

it.each([
  p => { p.replacements[0].item.options[0].label.fil = ''; },
  p => { p.replacements[0].item.options[0].distractor_rationale.fil = ''; },
  p => { p.replacements[0].item.review_status = 'approved'; },
  p => { p.review_requirements.approval_status = 'approved'; },
  p => { p.terminology_note.scored = true; },
  p => { p.continuity.existing_drafts = 'replace_with_new_form'; },
])('rejects incomplete translation, claimed approval or changed continuity (%#)', mutate => {
  const changed = structuredClone(proposal); mutate(changed);
  expect(() => build(changed)).toThrow();
});

it('exports a draft outside source, refuses overwrites and import flags, and preserves the active source bytes', () => {
  const folder = mkdtempSync(join(tmpdir(), 'uhc-proposal-'));
  const cli = join(root, 'scripts/feedback-uhc-proposal.mjs');
  const before = readFileSync(join(source, 'release.json'));
  try {
    const output = join(folder, 'candidate.json');
    const summary = JSON.parse(execFileSync(process.execPath, [cli, '--output', output], { encoding: 'utf8' }));
    expect(summary.imported).toBe(false); expect(summary.activated).toBe(false);
    expect(JSON.parse(readFileSync(output, 'utf8')).publication_status).toBe('draft');
    for (const args of [['--output', output], ['--output', join(source, 'release.json')], ['--import']]) {
      expect(() => execFileSync(process.execPath, [cli, ...args], { stdio: 'pipe' })).toThrow();
    }
    expect(readFileSync(join(source, 'release.json'))).toEqual(before);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
