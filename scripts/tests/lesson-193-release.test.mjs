// @vitest-environment node
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {it,expect} from 'vitest';
import {reviewed193View} from '../lib/lesson-193-release-integration.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const a=JSON.parse(fs.readFileSync('docs/lesson-193-owner-approval.json'));
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-monitor/';
it('binds owner authorization to frozen package and exactly eight asset-status promotions',()=>{
 expect(a.authorization).toBe('approved. merge and deploy live');expect(a.lesson_keys).toEqual(['resources-monitor']);
 expect(a.reviewed_head).toBe('6db0e35ef27903f8ca9f93ef42d8a23e5409bcdd');
 expect(a.reviewed_package_sha256).toBe('9492f3ae0c3b3fff5c959e9054782038021f22e238ce2a348b00f0d572971c38');
 expect(a.reviewed_artifact_sha256).toBe('ecef0fdba10a5382e86a3fb4926dbfae8128f8688c040c455cab6b16f1e273f4');
 const p=leaf+'lesson.json';expect(sha(reviewed193View(p))).toBe(a.reviewed_lesson_sha256);
 expect(reviewed193View(p).toString()).toBe(execFileSync('git',['show',a.reviewed_head+':'+p],{maxBuffer:32*1024*1024}).toString());
 expect(()=>reviewed193View(p,Buffer.from('unreviewed mutation'))).toThrow('Unpinned');
 const current=JSON.parse(fs.readFileSync(p)),reviewed=JSON.parse(a.reviewed_lesson_utf8),promoted=[];
 for(const asset of current.assets){const original=reviewed.assets.find(x=>x.id===asset.id);if(asset.review_status!==original.review_status){expect(asset.review_status).toBe('approved');expect(original.review_status).toBe('draft');promoted.push(asset.id);}asset.review_status=original.review_status;}
 expect(promoted).toEqual(a.promoted_asset_ids);expect(promoted).toHaveLength(8);expect(current).toEqual(reviewed);
});
it('preserves reviewed teaching, all release source hashes and 28 selected media files',()=>{
 for(const[p,h]of Object.entries(a.approved_source_sha256))expect(sha(fs.readFileSync(p)),p).toBe(h);
 for(const n of ['read.fil.md','read.en.md','slides.json','competency.json','facilitator.fil.md','facilitator.en.md'])expect(fs.readFileSync(leaf+n)).toEqual(execFileSync('git',['show',a.reviewed_head+':'+leaf+n],{maxBuffer:32*1024*1024}));
 expect(a.approved_media).toHaveLength(28);for(const m of a.approved_media){const b=fs.readFileSync('public'+m.path);expect(sha(b)).toBe(m.sha256);expect(b.length).toBe(m.bytes);expect(sha(b)).toBe(sha(execFileSync('git',['show',a.reviewed_head+':public'+m.path],{maxBuffer:32*1024*1024})));}
});
