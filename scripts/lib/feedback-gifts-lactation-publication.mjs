import assert from 'node:assert/strict';
import { buildGiftsLactationProposal } from './feedback-gifts-lactation-proposal.mjs';
import { releaseHash } from './feedback-uhc-proposal.mjs';
import { fullFormHash, validateRelease } from './chapter1-assessment-content.mjs';
import { activateAssessmentSql } from './feedback-uhc-publication.mjs';

/** Record the owner's approval of the reviewed packet, without specialist claims. */
export function buildApprovedGiftsLactationRelease(base, proposal, approval, context) {
  assert.equal(approval.authorization, 'do it');
  assert.equal(approval.approval_type, 'owner_content_and_publication');
  assert.equal(approval.proposal_sha256, releaseHash(proposal), 'Approved proposal drift');
  assert.equal(approval.release_id, proposal.proposed_release_id);
  assert(approval.reviewer?.trim(), 'An actual approving owner is required');
  assert(/^[a-f0-9]{40}$/.test(approval.source_commit), 'Pin the reviewed source commit');
  const release = buildGiftsLactationProposal(base, proposal, context);
  release.publication_status = 'approved';
  release.source_commit = approval.source_commit;
  for (const phase of ['pretest', 'posttest']) {
    for (const item of release.forms[phase].items.filter(q => ['T08', 'T09'].includes(q.slot))) {
      item.review_status = 'approved';
      item.reviewer = approval.reviewer;
      item.safety_privacy_reviewer = approval.reviewer;
    }
    release.forms[phase].hash = fullFormHash(release.forms[phase].items);
  }
  assert.deepEqual(validateRelease(release, context), [], 'Approved content contract');
  return release;
}

/** Data-only switch; old enrollments, snapshots, scores and legacy keys stay intact. */
export function publishGiftsLactationSql(base, release) {
  assert.equal(base.release_id, 'chapter1-feedback-accreditation-csc-v3');
  assert.equal(release.release_id, 'chapter1-feedback-gifts-lactation-v4');
  assert.equal(release.publication_status, 'approved');
  return activateAssessmentSql(base, release);
}
