// @vitest-environment node
import {describe,it,expect} from 'vitest';
import {beforeProposed163} from './lesson-163-proposal-compat.mjs';
import {createHash} from 'node:crypto';
const read=p=>beforeProposed163(p),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const a=json('docs/lesson-161-owner-approval.json');
describe('approved communication release',()=>{
 it('pins the owner-approved source, original proposal and every selected public byte',()=>{
  expect(a.interpreted_authorization).toBe('merge and deploy to live');
  expect(a.reviewed_head).toBe('5f9830f2d2b41bf6bd4b1c04d8a9340ae0e0e52e');
  expect(a.reviewed_proposal_receipt_sha256).toBe(sha(read('docs/lesson-161-proposal-receipt.json')));
  for(const [p,h]of Object.entries(a.approved_source_sha256))expect(sha(read(p)),p).toBe(h);
  expect(a.approved_media).toHaveLength(63);
  for(const m of a.approved_media)expect(sha(read('public'+m.path)),m.path).toBe(m.sha256);
 });
 it('promotes only asset review metadata in the five reviewed lessons',()=>{
  expect(a.lesson_keys.toSorted()).toEqual(['communication-clarify','communication-explain','communication-handoff','communication-listen','communication-record']);
  expect(Object.keys(a.reviewed_lesson_utf8)).toHaveLength(5);
  for(const [p,text]of Object.entries(a.reviewed_lesson_utf8)){
   expect(sha(Buffer.from(text)),p).toBe(a.reviewed_source_sha256[p]);
   const approved=json(p),reviewed=JSON.parse(text);
   expect(approved.assets.every(asset=>asset.review_status==='approved')).toBe(true);
   approved.assets.forEach((asset,i)=>{asset.review_status=reviewed.assets[i].review_status;});
   expect(approved,p).toEqual(reviewed);
  }
  for(const [p,h]of Object.entries(a.reviewed_source_sha256))if(!a.reviewed_lesson_utf8[p])expect(a.approved_source_sha256[p],p).toBe(h);
 });
});
