import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fullFormHash, validateRelease } from './chapter1-assessment-content.mjs';

export const releaseHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const bilingual = value => ['en', 'fil'].every(lang => typeof value?.[lang] === 'string' && value[lang].trim());

/** Build an unapproved local snapshot. No import, activation or database access. */
export function buildUhcProposal(base, proposal, context) {
  assert.deepEqual(validateRelease(base, context), [], 'The reviewed baseline must pass the existing release contract');
  assert.equal(proposal.schema_version, 1);
  assert.equal(proposal.editorial_status, 'draft');
  assert.equal(proposal.base_release_id, base.release_id);
  assert.equal(proposal.base_release_sha256, releaseHash(base), 'Reviewed baseline drift');
  assert.equal(proposal.comparability_status, 'unvalidated');
  assert(proposal.proposed_release_id && proposal.proposed_release_id !== base.release_id, 'A new release ID is required');
  assert.equal(proposal.review_requirements.approval_status, 'pending');
  for (const key of ['bilingual_reviewer', 'health_policy_reviewer', 'assessment_reviewer']) {
    assert.equal(proposal.review_requirements[key], null, 'The draft must not claim reviewer approval');
  }
  assert.deepEqual(proposal.continuity, {
    activation: 'not_in_this_proposal', existing_drafts: 'finish_pinned_form',
    submitted_attempts: 'retain_snapshot_answers_and_scores',
    existing_enrollments: 'remain_on_original_release_for_both_phases',
    new_enrollments: 'new_release_only_after_review_and_separate_activation',
    comparability: 'unvalidated_no_automatic_gain_comparison_across_releases',
  });
  const originalItems = [...Object.values(base.forms).flatMap(form => form.items),
    ...base.checkpoints.flatMap(group => [...group.first, ...group.alternates])];
  const ids = new Set(originalItems.map(item => item.item_id));
  const editorialKeys = new Set(originalItems.map(item => item.editorial_key));
  const sources = new Set(proposal.sources.map(source => source.id));
  assert.equal(proposal.replacements.length, 2, 'Only the paired T05 items are in scope');
  const phases = new Set();
  const candidate = structuredClone(base);
  candidate.release_id = proposal.proposed_release_id;
  candidate.source_commit = 'pending-reviewed-commit';
  candidate.publication_status = 'draft';
  candidate.comparability_status = 'unvalidated';
  for (const replacement of proposal.replacements) {
    const { phase, slot, item } = replacement;
    assert(['pretest', 'posttest'].includes(phase) && !phases.has(phase), 'One replacement per phase is required');
    phases.add(phase);
    assert.equal(slot, 'T05', 'T06 referral and other blueprint slots are outside this proposal');
    const old = base.forms[phase].items.find(q => q.slot === slot);
    assert.equal(replacement.replaces_item_id, old.item_id);
    assert(uuid.test(item.item_id) && !ids.has(item.item_id), 'Replacement needs a new unique item ID');
    ids.add(item.item_id);
    assert(item.editorial_key && !editorialKeys.has(item.editorial_key), 'Replacement needs a new editorial key');
    editorialKeys.add(item.editorial_key);
    assert.equal(item.version, old.version + 1);
    assert.equal(item.slot, slot); assert.equal(item.target, slot);
    assert(item.lesson_keys.includes(context.slotTargets[slot]), 'Keep the primary coverage lesson mapping');
    assert(item.lesson_keys.every(key => context.lessonKeys.includes(key)));
    assert(bilingual(item.stem) && bilingual(item.rationale), 'Bilingual stem and rationale required');
    assert.equal(item.options.length, 3);
    assert.equal(new Set(item.options.map(option => option.id)).size, 3);
    assert(item.options.some(option => option.id === item.correct_option_id));
    for (const option of item.options) {
      assert(bilingual(option.label), 'Bilingual option labels required');
      if (option.id !== item.correct_option_id) assert(bilingual(option.distractor_rationale), 'Bilingual distractor rationale required');
    }
    assert.equal(item.review_status, 'draft'); assert.equal(item.reviewer, null);
    assert.equal(item.safety_privacy_review_required, true); assert.equal(item.safety_privacy_reviewer, null);
    assert(replacement.source_ids.length && replacement.source_ids.every(id => sources.has(id)), 'Resolve official source references');
    const formId = proposal.proposed_form_ids[phase];
    assert(formId && !Object.values(base.forms).some(form => form.form_id === formId), 'A new form ID is required');
    candidate.forms[phase].form_id = formId;
    candidate.forms[phase].items = candidate.forms[phase].items.map(q => q.slot === slot ? structuredClone(item) : q);
    candidate.forms[phase].hash = fullFormHash(candidate.forms[phase].items);
    assert.equal(proposal.base_form_hashes[phase], base.forms[phase].hash);
  }
  assert.notEqual(candidate.forms.pretest.form_id, candidate.forms.posttest.form_id);
  assert.equal(proposal.terminology_note.editorial_status, 'draft');
  assert.equal(proposal.terminology_note.scored, false);
  assert.equal(proposal.terminology_note.reviewer, null);
  assert(bilingual(proposal.terminology_note.text));
  assert(proposal.terminology_note.source_ids.every(id => sources.has(id)));
  // Keep approval checks intact while rejecting any additional structural error.
  const expectedReviewErrors = [
    'release scope, identity, approval or comparability status is invalid',
    ...['pretest', 'posttest'].flatMap(phase => [
      `${phase} T05: missing approval metadata`, `${phase} T05: missing safety/privacy review`,
    ]),
  ];
  assert.deepEqual(validateRelease(candidate, context).sort(), expectedReviewErrors.sort(), 'Draft structural validation failed');
  return candidate;
}
