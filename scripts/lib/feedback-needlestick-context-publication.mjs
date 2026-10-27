import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fullFormHash,validateRelease} from './chapter1-assessment-content.mjs';
import {releaseHash} from './feedback-uhc-proposal.mjs';
import {activateAssessmentSql} from './feedback-uhc-publication.mjs';

/** Build the exact owner-approved T27 successor over the currently published lesson pins. */
export function buildApprovedNeedlestickContextRelease(base,proposal,approval,context){
  assert.deepEqual(validateRelease(base,context),[],'Approved v7 baseline drift');
  assert.equal(proposal.schema_version,1);
  assert.equal(proposal.base_release_id,base.release_id);
  assert.equal(proposal.base_release_sha256,releaseHash(base),'Approved baseline hash drift');
  assert.equal(proposal.proposed_release_id,'chapter1-feedback-needlestick-context-v8');
  assert.equal(approval.release_id,proposal.proposed_release_id);
  assert.equal(approval.authorization,'yes');
  assert.equal(approval.approval_type,'owner_content_and_publication');
  assert.equal(approval.proposal_sha256,releaseHash(proposal),'Approved proposal drift');
  assert(approval.reviewer?.trim(),'An actual approving owner is required');
  assert(/^[a-f0-9]{40}$/.test(approval.source_commit),'Pin the reviewed source commit');
  assert.deepEqual(approval.continuity,proposal.continuity);
  assert.equal(proposal.phase,'pretest');
  assert.equal(proposal.slot,'T27');
  const old=base.forms.pretest.items.find(item=>item.slot==='T27');
  assert.equal(proposal.replaces_item_id,old.item_id);
  assert.equal(proposal.correct_option_id,old.correct_option_id);
  assert.equal(old.safety_privacy_review_required,true);
  assert(!Object.values(base.forms).flatMap(form=>form.items).some(item=>item.item_id===proposal.new_item_id));
  assert(proposal.stem.en?.trim()&&proposal.stem.fil?.trim(),'Both approved stems are required');

  const release=structuredClone(base);
  release.release_id=proposal.proposed_release_id;
  release.source_commit=approval.source_commit;
  release.publication_status='approved';
  const replacement=structuredClone(old);
  replacement.item_id=proposal.new_item_id;
  replacement.editorial_key='pretest-T27-v2';
  replacement.version=old.version+1;
  replacement.stem=structuredClone(proposal.stem);
  replacement.reviewer=approval.reviewer;
  replacement.review_status='approved';
  replacement.safety_privacy_reviewer=approval.reviewer;
  release.forms.pretest.items=release.forms.pretest.items.map(item=>item.slot==='T27'?replacement:item);

  assert.equal(approval.curriculum_pin_updates?.length,2,'Exactly two already published lesson pin updates are required');
  assert.deepEqual(approval.curriculum_pin_updates.map(p=>p.lesson_key),['bhw-roles-application','safety-identify']);
  for(const pin of approval.curriculum_pin_updates){
    const oldPin=base.curriculum_revisions.find(row=>row.lesson_key===pin.lesson_key);
    assert.deepEqual(oldPin,{lesson_key:pin.lesson_key,revision_id:pin.base_revision_id,sha256:pin.base_sha256},`Stale base pin: ${pin.lesson_key}`);
    const approvedLesson=JSON.parse(readFileSync(pin.release_record,'utf8'));
    assert.equal(pin.sha256,approvedLesson.new_content_hash,`Unapproved lesson hash: ${pin.lesson_key}`);
    const current=release.curriculum_revisions.find(row=>row.lesson_key===pin.lesson_key);
    current.revision_id=pin.revision_id;
    current.sha256=pin.sha256;
  }
  for(const phase of ['pretest','posttest']){
    release.forms[phase].form_id=`${release.release_id}-${phase}`;
    release.forms[phase].hash=fullFormHash(release.forms[phase].items);
  }
  assert.deepEqual(validateRelease(release,context),[],'Approved v8 content contract');
  return release;
}

export function publishNeedlestickContextSql(base,release){
  assert.equal(base.release_id,'chapter1-feedback-communication-clarify-v7');
  assert.equal(release.release_id,'chapter1-feedback-needlestick-context-v8');
  assert.equal(release.publication_status,'approved');
  return activateAssessmentSql(base,release);
}
