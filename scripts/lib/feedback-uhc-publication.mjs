import assert from 'node:assert/strict';
import { buildUhcProposal, releaseHash } from './feedback-uhc-proposal.mjs';
import { fullFormHash, validateRelease } from './chapter1-assessment-content.mjs';
import { draftImportSql } from './chapter1-assessment-import-sql.mjs';

/** Apply the recorded owner's approval without inventing specialist sign-offs. */
export function buildApprovedUhcRelease(base, proposal, approval, context) {
  assert.equal(approval.proposal_sha256, releaseHash(proposal), 'Approved proposal drift');
  assert.equal(approval.release_id, proposal.proposed_release_id);
  assert.equal(approval.authorization, 'approved contents then publish');
  assert.equal(approval.approval_type, 'owner_content_and_publication');
  assert(approval.reviewer?.trim(), 'An actual approving owner is required');
  assert(/^[a-f0-9]{40}$/.test(approval.source_commit), 'Pin the reviewed source commit');
  assert.equal(approval.terminology_note_placement, 'posttest_T05_submitted_review_rationale');
  const release = buildUhcProposal(base, proposal, context);
  release.publication_status = 'approved';
  release.source_commit = approval.source_commit;
  for (const phase of ['pretest', 'posttest']) {
    const item = release.forms[phase].items.find(q => q.slot === 'T05');
    item.reviewer = approval.reviewer;
    item.review_status = 'approved';
    item.safety_privacy_reviewer = approval.reviewer;
    // The note is explanatory feedback only; no answer or scoring changes.
    if (phase === 'posttest') for (const lang of ['en', 'fil']) {
      item.rationale[lang] += `\n\n${proposal.terminology_note.text[lang]}`;
    }
    release.forms[phase].hash = fullFormHash(release.forms[phase].items);
  }
  assert.deepEqual(validateRelease(release, context), [], 'Approved release must pass the unchanged content contract');
  return release;
}

/** One transaction: guard the baseline, import new identities, switch new enrollments.
 * Existing enrollment, attempt, response and score tables are never written.
 */
export function publishUhcSql(base, release) {
  assert.equal(base.release_id, 'chapter1-2026-10-11-v1');
  assert.equal(release.release_id, 'chapter1-feedback-uhc-v2');
  return activateAssessmentSql(base, release);
}

/** Shared guarded activation for explicitly approved immutable successors. */
export function activateAssessmentSql(base, release) {
  assert(/^[a-z0-9-]+$/.test(base.release_id) && /^[a-z0-9-]+$/.test(release.release_id));
  assert.notEqual(base.release_id, release.release_id);
  const imported = draftImportSql(release);
  const guard = `
select pg_advisory_xact_lock(hashtextextended('chapter1-assessment-publication', 0));
do $guard$
begin
  if not exists (select 1 from learner_assessment_private.releases
    where id = '${base.release_id}' and content_hash = '${releaseHash(base)}'
      and status in ('active','draft')) then
    raise exception 'reviewed baseline release missing or changed'; end if;
  if exists (select 1 from learner_assessment_private.releases
    where program_key = 'bhw-reference-manual' and chapter_key = 'chapter-1'
      and status = 'active' and id not in ('${base.release_id}','${release.release_id}')) then
    raise exception 'unexpected active release; publication refused'; end if;
  if exists (select 1 from learner_assessment_private.releases
    where id = '${release.release_id}' and status = 'withdrawn') then
    raise exception 'withdrawn release requires a separate recovery decision'; end if;
  if (select count(*) from learner_assessment_private.forms
    where release_id = '${base.release_id}' and
      ((phase = 'pretest' and form_hash = '${base.forms.pretest.hash}') or
       (phase = 'posttest' and form_hash = '${base.forms.posttest.hash}'))) <> 2 then
    raise exception 'baseline form drift'; end if;
end;
$guard$;`;
  return imported.replace('begin;', `begin;\n${guard}`).replace('commit;', `
-- Draft retains availability to already pinned enrollments; withdrawn would block them.
update learner_assessment_private.releases set status = 'draft'
  where id = '${base.release_id}' and status = 'active';
update learner_assessment_private.releases set status = 'active'
  where id = '${release.release_id}' and status = 'draft';
do $activated$
begin
  if not exists (select 1 from learner_assessment_private.releases
    where id = '${release.release_id}' and status = 'active') then
    raise exception 'new release did not activate'; end if;
end;
$activated$;
commit;`);
}
