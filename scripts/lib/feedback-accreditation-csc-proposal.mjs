import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { contentHash, loadReferenceModule, validateReferenceLesson } from './reference-content.mjs';
import { fullFormHash, loadLessonMap, validateRelease } from './chapter1-assessment-content.mjs';
import { releaseHash } from './feedback-uhc-proposal.mjs';

export function loadAccreditationCscInputs(root) {
  const dir = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
  const read = path => JSON.parse(readFileSync(join(dir, path), 'utf8'));
  return {
    base: read('releases/chapter1-feedback-uhc-v2/release.json'),
    proposal: read('proposals/fb-2.3-accreditation-csc/proposal.json'),
    lesson: loadReferenceModule(join(root, 'content/training/day1-basic-competencies/modules/04-ra7883'), join(root, 'public'))
      .lessons.find(l => l.manifest.lesson_key === 'bhw-eligibility'),
    context: { ...loadLessonMap(root), orientation: read('orientation.json') },
  };
}

/** Author-only bundle. Approval, published lesson pins and media are still pending. */
export function buildAccreditationCscProposal({ base, proposal: p, lesson, context }) {
  assert.deepEqual(validateRelease(base, context), [], 'Invalid approved baseline');
  assert.equal(p.schema_version, 1);
  assert.equal(p.proposal_id, 'FB-2.3-accreditation-csc');
  assert.equal(p.editorial_status, 'draft');
  assert.equal(p.approval_status, 'pending');
  assert.equal(p.reviewer, null, 'Draft cannot claim review');
  assert.equal(p.base_release_id, base.release_id);
  assert.equal(p.base_release_sha256, releaseHash(base), 'Assessment baseline drift');
  assert.equal(p.base_lesson_hash, contentHash(lesson), 'Lesson baseline drift');
  assert(base.curriculum_revisions.some(r => r.lesson_key === 'bhw-eligibility' &&
    r.revision_id === p.base_lesson_revision_id && r.sha256 === p.base_lesson_hash), 'Lesson pin drift');
  assert.deepEqual(p.continuity, {
    existing_enrollments: 'remain_on_original_release_for_both_phases', existing_drafts: 'finish_pinned_form',
    submitted_attempts: 'retain_snapshot_answers_and_scores', comparability: 'unvalidated_no_automatic_cross_release_gain_comparison',
  });
  assert.deepEqual(p.release_requirements, {
    lesson_revision: 'pending_reviewed_publication', curriculum_pins: 'refresh_after_approved_lesson_revision',
    media: 'reconcile_narration_captions_and_optional_story_before_publication',
    activation: 'separate_approved_release_only', review_status: 'pending',
    bilingual_reviewer: null, policy_reviewer: null, assessment_reviewer: null,
  }, 'Draft must retain its publication blockers');
  assert.equal(p.proposed_release_id, 'chapter1-feedback-accreditation-csc-v3');
  const sources = new Set(p.sources.map(s => s.id));
  const existingItems = [...Object.values(base.forms).flatMap(f => f.items),
    ...base.checkpoints.flatMap(c => [...c.first, ...c.alternates])];
  const existingIds = new Set(existingItems.map(q => q.item_id));
  const existingEditorialKeys = new Set(existingItems.map(q => q.editorial_key));
  assert.equal(p.replacements.length, 2);
  const assessment = structuredClone(base);
  assessment.release_id = p.proposed_release_id;
  assessment.source_commit = 'pending-reviewed-commit';
  assessment.publication_status = 'draft';
  const phases = new Set();
  for (const r of p.replacements) {
    assert(['pretest', 'posttest'].includes(r.phase) && !phases.has(r.phase), 'One item per phase');
    phases.add(r.phase);
    assert.equal(r.slot, 'T11', 'Only accreditation slot T11 is in scope');
    const old = base.forms[r.phase].items.find(q => q.slot === 'T11');
    assert.equal(r.replaces_item_id, old.item_id);
    assert(!existingIds.has(r.item.item_id), 'New item identity required');
    assert(!existingEditorialKeys.has(r.item.editorial_key), 'New editorial identity required');
    assert.equal(r.item.version, old.version + 1);
    assert.equal(r.item.slot, 'T11');
    assert.equal(r.item.review_status, 'draft'); assert.equal(r.item.reviewer, null);
    assert.equal(r.item.safety_privacy_review_required, true); assert.equal(r.item.safety_privacy_reviewer, null);
    assert(r.source_ids.length && r.source_ids.every(id => sources.has(id)), 'Unresolved question source');
    assert.equal(p.proposed_form_ids[r.phase], `${p.proposed_release_id}-${r.phase}`);
    assessment.forms[r.phase].form_id = p.proposed_form_ids[r.phase];
    assessment.forms[r.phase].items = assessment.forms[r.phase].items.map(q => q.slot === 'T11' ? structuredClone(r.item) : q);
    assessment.forms[r.phase].hash = fullFormHash(assessment.forms[r.phase].items);
  }
  assert.deepEqual(validateRelease(assessment, context).sort(), [
    'release scope, identity, approval or comparability status is invalid',
    ...['pretest', 'posttest'].flatMap(phase => [`${phase} T11: missing approval metadata`, `${phase} T11: missing safety/privacy review`]),
  ].sort(), 'Draft question structure failed validation');

  const c = p.lesson_changes;
  assert.equal(c.lesson_key, 'bhw-eligibility');
  assert(c.source_ids.length && c.source_ids.every(id => sources.has(id)));
  assert.equal(c.replace_section.id, 'section-4');
  assert.equal(c.insert_after, 'bhwe-verification');
  assert.equal(c.read_section.id, 'bhwe-filing-receipt');
  assert.equal(c.slide.id, 'slide-bhwe-filing-receipt');
  assert.equal(c.read_section.check, null); assert.equal(c.slide.check, null, 'Filing note is unscored');
  assert.deepEqual(c.read_section.asset_ids, []); assert.deepEqual(c.slide.asset_ids, []);
  assert.deepEqual(c.read_section.concept_ids, ['m4.bhwe']); assert.deepEqual(c.slide.concept_ids, ['m4.bhwe']);
  const draftLesson = structuredClone(lesson);
  for (const lang of ['en', 'fil']) {
    const oldBody = lesson.revision.read_sections.find(s => s.id === 'section-4')[`body_${lang}`];
    const [before, after] = lang === 'en' ? ['CSC implementing conditions are more detailed.',
      'The Civil Service Commission (CSC) sets more detailed implementing conditions.'] :
      ['May mas detalyadong implementing conditions ang CSC.',
        'May mas detalyadong implementing conditions ang Civil Service Commission (CSC).'];
    assert(oldBody.includes(before));
    assert.equal(c.replace_section.body[lang], oldBody.replace(before, after), 'Keep all existing qualification conditions');
    assert(c.replace_section.display[lang]?.startsWith('Civil Service Commission (CSC)\n'), 'Expand agency name on Slides');
    assert(c.replace_section.body[lang]?.includes('Civil Service Commission (CSC)'), 'Expand agency name');
    draftLesson.revision.read_sections.find(s => s.id === c.replace_section.id)[`body_${lang}`] = c.replace_section.body[lang];
    const slide = draftLesson.revision.slides.find(s => s.id === `slide-${c.replace_section.id}`);
    slide[`display_${lang}`] = c.replace_section.display[lang];
    slide[`narration_${lang}`] = c.replace_section.body[lang];
    assert.equal(c.read_section[`body_${lang}`], c.slide[`narration_${lang}`], 'Read/narration parity');
  }
  for (const [key, after, item] of [
    ['read_sections', c.insert_after, c.read_section], ['slides', `slide-${c.insert_after}`, c.slide],
  ]) {
    const position = draftLesson.revision[key].findIndex(s => s.id === after);
    assert(position >= 0);
    draftLesson.revision[key].splice(position + 1, 0, structuredClone(item));
  }
  const coverage = draftLesson.revision.coverage.find(c => c.id === 'm4.bhwe');
  coverage.read_ids = draftLesson.revision.read_sections.map(s => s.id);
  coverage.slide_ids = draftLesson.revision.slides.map(s => s.id);
  validateReferenceLesson(draftLesson);
  return { proposal_id: p.proposal_id, editorial_status: 'draft', publication_ready: false,
    assessment, lesson: draftLesson, publication_blockers: structuredClone(p.release_requirements) };
}

export function renderAccreditationCscReview({ base, proposal: p, lesson }) {
  const lines = ['# FB-2.3 — accreditation and CSC content proposal', '',
    '**Draft for content review.** This packet is authoring material; it is not served to learners. Reviewer fields remain unassigned.', '',
    'The examples establish a local committee without implying that every locality must have one. The Local Health Board retains the accreditation decision. The two new T11 identities replace only their paired accreditation questions; the approved UHC T05 items and all other items remain intact.', '',
    '## Paired T11 questions'];
  for (const { phase, item: q } of p.replacements) {
    const old = base.forms[phase].items.find(q => q.slot === 'T11');
    lines.push('', `### ${phase}`, '', `Proposed item: \`${q.item_id}\`, version ${q.version}.`);
    for (const [lang, label] of [['en', 'English'], ['fil', 'Filipino']]) {
      lines.push('', `**${label} — current stem**`, '', old.stem[lang], '', `**${label} — proposed stem**`, '', q.stem[lang], '');
      for (const o of q.options) {
        lines.push(`- **${o.id}${o.id === q.correct_option_id ? ' — proposed correct answer' : ''}:** ${o.label[lang]}`);
        if (o.distractor_rationale) lines.push(`  Explanation: ${o.distractor_rationale[lang]}`);
      }
      lines.push('', '**Proposed rationale:**', '', q.rationale[lang]);
    }
  }
  lines.push('', '## CSC agency name — existing section 4', '');
  for (const lang of ['en', 'fil']) lines.push(`### ${lang}`, '', '**Current Read/narration**', '',
    lesson.revision.read_sections.find(s => s.id === 'section-4')[`body_${lang}`], '', '**Proposed Read/narration**', '',
    p.lesson_changes.replace_section.body[lang], '', '**Proposed slide display**', '', p.lesson_changes.replace_section.display[lang], '');
  lines.push('## New unscored section — filing and certificate receipt', '',
    'Insert after `bhwe-verification` and before the existing application check. It adds no assessment item. Existing qualification conditions and the application check are retained.', '');
  for (const lang of ['en', 'fil']) lines.push(`### ${lang}`, '', p.lesson_changes.read_section[`heading_${lang}`], '',
    p.lesson_changes.read_section[`body_${lang}`], '', '**Takeaway:**', '', p.lesson_changes.read_section[`takeaway_${lang}`], '',
    '**Slide display:**', '', p.lesson_changes.slide[`display_${lang}`], '', 'Slide narration uses the Read copy above.', '');
  lines.push('## Sources and review checks', '');
  for (const source of p.sources) lines.push(`- [${source.id}](${source.url}): ${source.locators.join('; ')}. ${source.status}`);
  lines.push('');
  for (const check of p.review_checks) lines.push(`- ${check}`);
  lines.push('', '## Publication and continuity', '',
    'The candidate lesson must receive content review and a real published revision before a future assessment release can pin its revision ID and hash. The draft assessment deliberately retains the old lesson pins as a baseline reference; those are not valid evidence of the proposed lesson publication. Do not substitute a draft hash for a published revision ID.', '',
    'Reconcile changed narration/captions and the optional story before publication. Existing media have not been regenerated or approved for the new guidance. No media-consistency sign-off is claimed.', '',
    'The ordinary assessment importer rejects this draft. The local authoring command has no import or activation operation. Existing enrollments keep their release for both phases, drafts keep their served forms, and submitted answers/scores stay unchanged. Comparability remains unvalidated.', '',
    'Reproduce with `node scripts/feedback-accreditation-csc-proposal.mjs --review`. Use `--output /tmp/fb-2.3-candidate.json` to export the complete local bundle without overwriting a file.');
  return lines.join('\n') + '\n';
}
