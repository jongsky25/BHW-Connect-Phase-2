import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {reviewed174} from '../lib/lesson-174-proposal.mjs';
const a=JSON.parse(fs.readFileSync('docs/lesson-174-owner-approval.json'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-action-plan/lesson.json';
describe('Owner-authorized 1.7.4 release',()=>{
 it('binds the approved reviewed package and permits only seven status promotions',()=>{
  expect(a.authorization).toBe('approved. merge and deploy to live');
  expect(a.reviewed_head).toBe('12663a8a74e7ccb3a57a9cbda79cef4cc350a237');
  expect(a.reviewed_package_sha256).toBe('5767d386e0a934d470eadd5316680523fa949341d5746c0a568571bcb5fca958');
  expect(a.lesson_keys).toEqual(['problem-action-plan']);
  expect(hash(fs.readFileSync('docs/lesson-174-reviewed-proposal-receipt.json'))).toBe(a.reviewed_proposal_receipt_sha256);
  const current=JSON.parse(fs.readFileSync(leaf));
  expect(current.assets).toHaveLength(7);
  for(const asset of current.assets){expect(asset.review_status).toBe('approved');asset.review_status='draft';}
  expect(current).toEqual(JSON.parse(a.reviewed_lesson_utf8));
  expect(hash(reviewed174(leaf))).toBe(a.reviewed_lesson_sha256);
  expect(()=>reviewed174(leaf,Buffer.from('unexpected'))).toThrow('Unpinned');
 });
 it('preserves every authorized source and selected public medium exactly',()=>{
  for(const [p,h]of Object.entries(a.approved_source_sha256))expect(hash(fs.readFileSync(p)),p).toBe(h);
  expect(a.approved_media).toHaveLength(24);
  for(const m of a.approved_media){const b=fs.readFileSync('public'+m.path);expect(hash(b),m.path).toBe(m.sha256);expect(b.length).toBe(m.bytes);}
 });
});
