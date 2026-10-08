// Verify the owner-authorized status-only promotion before exposing draft bytes.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const target='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify/lesson.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function reviewed162Bytes(p,actual=fs.readFileSync(p)){
 if(p!==target)return actual;
 const proposal=JSON.parse(fs.readFileSync('docs/lesson-162-proposal-receipt.json'));
 if(sha(actual)===proposal.changed_existing_files[p].proposed_sha256)return actual;
 const approval=JSON.parse(fs.readFileSync('docs/lesson-162-owner-approval.json'));
 assert.equal(approval.interpreted_authorization,'merge and deploy to live');
 assert.deepEqual(approval.lesson_keys,['communication-clarify']);
 assert.equal(approval.reviewed_proposal_receipt_sha256,sha(fs.readFileSync('docs/lesson-162-proposal-receipt.json')));
 assert.equal(approval.approved_source_sha256[p],sha(actual),'Unapproved release successor');
 const reviewed=Buffer.from(approval.reviewed_lesson_utf8,'utf8');
 assert.equal(sha(reviewed),proposal.changed_existing_files[p].proposed_sha256);
 assert.equal(approval.reviewed_source_sha256[p],sha(reviewed));
 const prior=JSON.parse(reviewed),current=JSON.parse(actual);
 assert.equal(current.assets.length,prior.assets.length);
 let promoted=0;
 for(let i=0;i<prior.assets.length;i++){
  assert.equal(current.assets[i].id,prior.assets[i].id);
  assert.equal(current.assets[i].review_status,'approved');
  if(prior.assets[i].review_status==='draft')promoted++;
  current.assets[i].review_status=prior.assets[i].review_status;
 }
 assert.equal(promoted,7);
 assert.deepEqual(current,prior,'Only seven asset review statuses may change');
 return reviewed;
}
