import {beforeLesson193} from '../lib/lesson-193-integration.mjs';
// @vitest-environment node
import fs from 'node:fs';import {createHash} from 'node:crypto';import {it,expect} from 'vitest';
import {release184View} from '../lib/lesson-184-release-integration.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const a=JSON.parse(fs.readFileSync('docs/lesson-184-owner-approval.json'));
it('binds owner approval to reviewed teaching and permits only seven asset status promotions',()=>{
 expect(a.authorization).toBe('approved. merge and deploy to live');expect(a.lesson_keys).toEqual(['safety-demonstrate']);expect(a.reviewed_head).toBe('7f072fef018c5aa5c5d8444cd34e8e924c81562f');
 const receipt=JSON.parse(fs.readFileSync('docs/lesson-184-reviewed-package-integrity.json'));expect(a.reviewed_package_sha256).toBe(receipt.zip_sha256);expect(a.reviewed_package_bytes).toBe(receipt.zip_bytes);
 expect(sha(fs.readFileSync('docs/lesson-184-reviewed-proposal-receipt.json'))).toBe(a.reviewed_proposal_receipt_sha256);
 const p='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-demonstrate/lesson.json',actual=JSON.parse(fs.readFileSync(p));expect(actual.assets).toHaveLength(7);
 for(const asset of actual.assets){expect(asset.review_status).toBe('approved');asset.review_status='draft';}expect(actual).toEqual(JSON.parse(a.reviewed_lesson_utf8));
 expect(sha(release184View(p,'reviewed184'))).toBe(a.reviewed_lesson_sha256);expect(()=>release184View(p,'reviewed184',Buffer.from('mutation'))).toThrow('Unpinned');
});
it('preserves every approved source and all twenty-four reviewed selected media bytes',()=>{
 for(const [p,h]of Object.entries(a.approved_source_sha256))expect(sha(beforeLesson193(p)),p).toBe(h);
 expect(a.approved_media).toHaveLength(24);for(const m of a.approved_media){const bytes=fs.readFileSync('public'+m.path);expect(sha(bytes),m.path).toBe(m.sha256);expect(bytes.length).toBe(m.bytes);}
});
