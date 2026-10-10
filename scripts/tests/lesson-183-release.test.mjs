import {release184View} from '../lib/lesson-184-release-integration.mjs';
// @vitest-environment node
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {it,expect} from 'vitest';
const hash=b=>createHash('sha256').update(b).digest('hex');
const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-prepare/';
const approval=JSON.parse(fs.readFileSync('docs/lesson-183-owner-approval.json'));
it('binds owner approval to the reviewed package and only seven status promotions',()=>{
 expect(approval.authorization).toBe('approved. merge and deploy');
 expect(approval.lesson_keys).toEqual(['safety-prepare']);
 expect(approval.reviewed_head).toBe('3696d2fd89b5f9525e7f754945f9fa99bcf0d26c');
 expect(hash(Buffer.from(approval.reviewed_lesson_utf8))).toBe(approval.reviewed_lesson_sha256);
 const reviewed=JSON.parse(approval.reviewed_lesson_utf8),actual=JSON.parse(fs.readFileSync(leaf+'lesson.json'));
 expect(actual.assets).toHaveLength(7);
 for(const asset of actual.assets){expect(asset.review_status).toBe('approved');asset.review_status='draft';}
 expect(actual).toEqual(reviewed);
});
it('preserves every approved target source and selected public media byte',()=>{
 for(const[p,h]of Object.entries(approval.approved_source_sha256))expect(hash(release184View(p,'approvedMain')),p).toBe(h);
 expect(approval.approved_media).toHaveLength(24);
 for(const m of approval.approved_media){const bytes=fs.readFileSync('public'+m.path);expect(hash(bytes),m.path).toBe(m.sha256);expect(bytes.length).toBe(m.bytes);}
});
