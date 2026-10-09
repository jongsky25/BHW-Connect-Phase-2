import {beforeProposed174} from '../lib/lesson-174-proposal.mjs';
// @vitest-environment node
import {it,expect} from 'vitest';import fs from 'node:fs';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
it('binds explicit owner release approval to the reviewed package, unchanged teaching and exact media',()=>{
 const a=JSON.parse(fs.readFileSync('docs/lesson-172-owner-approval.json'));
 expect(a.authorization).toBe('approved. merge and deploy to live');expect(a.lesson_keys).toEqual(['problem-causes']);
 expect(a.reviewed_head).toBe('587d2cfbe6e5847d54b694f11233737c7a877643');
 expect(a.reviewed_package_sha256).toBe('c477ff8bda460312542f6531b49ae1f0d46e6c32e491786fbbe6fe35e925de94');
 expect(sha(fs.readFileSync('docs/lesson-172-proposal-receipt.json'))).toBe(a.reviewed_proposal_receipt_sha256);
 const old=JSON.parse(a.reviewed_lesson_utf8),actual=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/modules/07-problema/lessons/problem-causes/lesson.json'));
 expect(sha(Buffer.from(a.reviewed_lesson_utf8))).toBe(a.reviewed_lesson_sha256);
 expect(actual.assets).toHaveLength(7);for(const [i,asset]of actual.assets.entries()){expect(asset.review_status).toBe('approved');expect(old.assets[i].review_status).toBe('draft');asset.review_status='draft';}expect(actual).toEqual(old);
 for(const [p,h]of Object.entries(a.approved_source_sha256))expect(sha(beforeProposed174(p)),p).toBe(h);
 for(const m of a.approved_media)expect(sha(fs.readFileSync('public'+m.path)),m.path).toBe(m.sha256);
 const r=JSON.parse(fs.readFileSync('docs/lesson-172-release-integration.json'));
 for(const [p,e]of Object.entries(r.files)){
  expect(sha(beforeProposed174(p)),p).toBe(e.integrated_sha256);
  for(const side of ['reviewed172','approvedMain'])expect(sha(Buffer.from(e[side+'_utf8'])),p).toBe(e[side+'_sha256']);
 }
});
