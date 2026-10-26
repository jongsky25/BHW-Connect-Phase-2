import assert from 'node:assert/strict';
import { fullFormHash, validateRelease } from './chapter1-assessment-content.mjs';
import { releaseHash } from './feedback-uhc-proposal.mjs';
import { activateAssessmentSql } from './feedback-uhc-publication.mjs';

/** Reconstruct the exact owner-approved T18 correct choice as a new immutable item. */
export function buildApprovedCommunicationClarifyRelease(base, proposal, approval, context) {
  assert.deepEqual(validateRelease(base, context), [], 'Approved v6 baseline drift');
  assert.equal(proposal.schema_version, 1);
  assert.equal(proposal.base_release_id, base.release_id);
  assert.equal(proposal.base_release_sha256, releaseHash(base), 'Approved baseline hash drift');
  assert.equal(proposal.proposed_release_id, 'chapter1-feedback-communication-clarify-v7');
  assert.equal(approval.release_id, proposal.proposed_release_id);
  assert.equal(approval.authorization, 'Approve exact wording');
  assert.equal(approval.approval_type, 'owner_content_and_publication');
  assert.equal(approval.proposal_sha256, releaseHash(proposal), 'Approved proposal drift');
  assert(approval.reviewer?.trim(), 'An actual approving owner is required');
  assert(/^[a-f0-9]{40}$/.test(approval.source_commit), 'Pin the reviewed source commit');
  assert.deepEqual(approval.continuity, proposal.continuity);
  assert.equal(proposal.phase, 'pretest');
  assert.equal(proposal.slot, 'T18');
  const old = base.forms.pretest.items.find(item => item.slot === 'T18');
  assert.equal(proposal.replaces_item_id, old.item_id);
  assert.equal(proposal.correct_option_id, old.correct_option_id);
  assert(!Object.values(base.forms).flatMap(form => form.items).some(item => item.item_id === proposal.new_item_id));
  assert(proposal.replacement_label.en?.trim() && proposal.replacement_label.fil?.trim(), 'Both approved choice labels are required');

  const release = structuredClone(base);
  release.release_id = proposal.proposed_release_id;
  release.source_commit = approval.source_commit;
  release.publication_status = 'approved';
  const replacement = structuredClone(old);
  replacement.item_id = proposal.new_item_id;
  replacement.editorial_key = 'pretest-T18-v2';
  replacement.version = old.version + 1;
  assert.equal(proposal.replace_option_id, old.correct_option_id);
  replacement.options.find(option => option.id === proposal.replace_option_id).label = structuredClone(proposal.replacement_label);
  replacement.reviewer = approval.reviewer;
  replacement.review_status = 'approved';
  release.forms.pretest.items = release.forms.pretest.items.map(item => item.slot === 'T18' ? replacement : item);
  for (const phase of ['pretest', 'posttest']) {
    release.forms[phase].form_id = `${release.release_id}-${phase}`;
    release.forms[phase].hash = fullFormHash(release.forms[phase].items);
  }
  assert.deepEqual(validateRelease(release, context), [], 'Approved v7 content contract');
  return release;
}

export function publishCommunicationClarifySql(base, release) {
  assert.equal(base.release_id, 'chapter1-feedback-resource-monitor-v6');
  assert.equal(release.release_id, 'chapter1-feedback-communication-clarify-v7');
  assert.equal(release.publication_status, 'approved');
  return activateAssessmentSql(base, release);
}
