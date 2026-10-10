// @vitest-environment node
import fs from 'node:fs';import {createHash} from 'node:crypto';import {it,expect} from 'vitest';
const sha=b=>createHash('sha256').update(b).digest('hex');
const approval=JSON.parse(fs.readFileSync('docs/lesson-191-owner-approval.json'));
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-audit/';
it('binds owner authorization to the exact reviewed lesson and seven status-only promotions',()=>{
 expect(approval.authorization).toBe('approved. merge and deploy to live');expect(approval.lesson_keys).toEqual(['resources-audit']);
 expect(approval.reviewed_head).toBe('a69040ea90a2be4e7f53534155c7ec8082cf7470');
 expect(approval.reviewed_package_sha256).toBe('1586afb4c0b7c7cda681a0176290eff2accd6de88c0f4e1b83b2b1b358409440');
 expect(sha(Buffer.from(approval.reviewed_lesson_utf8))).toBe(approval.reviewed_lesson_sha256);
 const bytes=fs.readFileSync(leaf+'lesson.json');expect(sha(bytes)).toBe(approval.approved_lesson_sha256);
 const current=JSON.parse(bytes),reviewed=JSON.parse(approval.reviewed_lesson_utf8),promoted=[];
 for(const a of current.assets){const original=reviewed.assets.find(x=>x.id===a.id);if(a.review_status!==original.review_status){expect(a.review_status).toBe('approved');expect(original.review_status).toBe('draft');promoted.push(a.id);}a.review_status=original.review_status;}
 expect(promoted).toEqual(approval.promoted_asset_ids);expect(promoted).toHaveLength(7);expect(current).toEqual(reviewed);
});
it('pins every integrated release source and all 24 exact selected media files',()=>{
 for(const[p,h]of Object.entries(approval.approved_source_sha256))expect(sha(fs.readFileSync(p)),p).toBe(h);
 expect(approval.approved_media).toHaveLength(24);for(const m of approval.approved_media){const b=fs.readFileSync('public'+m.path);expect(sha(b)).toBe(m.sha256);expect(b.length).toBe(m.bytes);}
});
