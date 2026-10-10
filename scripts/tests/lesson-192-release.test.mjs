import {beforeLesson191} from '../lib/lesson-191-integration.mjs';
// @vitest-environment node
import fs from 'node:fs';import {createHash} from 'node:crypto';import {it,expect} from 'vitest';
import {reviewed192View} from '../lib/lesson-192-release-integration.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const a=JSON.parse(fs.readFileSync('docs/lesson-192-owner-approval.json'));
it('binds release to exact reviewed teaching and only seven approved asset flags',()=>{
 expect(a.authorization).toBe('approved. merge and deploy to live');expect(a.reviewed_head).toBe('6a613adda6404d2959d531d29f726c60b60ca500');expect(a.lesson_keys).toEqual(['resources-safe-change']);
 expect(a.reviewed_package_sha256).toBe('b96b505c14781cb571a7aee01a6ed2200565beda3098a6be4daaf1f3e7f2d16f');
 const p='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-safe-change/lesson.json';
 expect(sha(reviewed192View(p))).toBe(a.reviewed_lesson_sha256);expect(()=>reviewed192View(p,Buffer.from('mutation'))).toThrow('Unpinned');
 const changed=JSON.parse(fs.readFileSync(p));changed.sections[0].id='changed';expect(()=>reviewed192View(p,Buffer.from(JSON.stringify(changed)))).toThrow('Unpinned');
});
it('retains all approved source and twenty-four selected media hashes',()=>{
 for(const[p,h]of Object.entries(a.approved_source_sha256))expect(sha(beforeLesson191(p)),p).toBe(h);
 expect(a.approved_media).toHaveLength(24);for(const m of a.approved_media){const b=fs.readFileSync('public'+m.path);expect(sha(b)).toBe(m.sha256);expect(b.length).toBe(m.bytes)}
});
