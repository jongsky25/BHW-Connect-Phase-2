// @vitest-environment node
import {it,expect} from 'vitest';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {reviewed171} from '../lib/lesson-171-integration.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
it('binds owner approval to the exact package and promotes only seven statuses',()=>{
 const a=JSON.parse(fs.readFileSync('docs/lesson-171-owner-approval.json'));expect(a.authorization).toBe('approved. merge and deploy to live');expect(a.lesson_keys).toEqual(['problem-define']);expect(a.reviewed_head).toBe('1205456b2f8d45e5637ff5962e3fdc7130377f12');expect(a.reviewed_package_sha256).toBe('4991d6cad2363c2e3d8281bf5692a00147638d13448bb353af837ef56fd2595a');
 expect(sha(fs.readFileSync('docs/lesson-171-proposal-receipt.json'))).toBe(a.reviewed_proposal_receipt_sha256);
 const p='content/training/day1-basic-competencies/modules/07-problema/lessons/problem-define/lesson.json',old=JSON.parse(reviewed171(p)),current=JSON.parse(fs.readFileSync(p));let count=0;
 for(const[i,asset]of current.assets.entries()){expect(asset.review_status).toBe('approved');if(old.assets[i].review_status==='draft')count++;asset.review_status=old.assets[i].review_status;}expect(count).toBe(7);expect(current).toEqual(old);
 expect(()=>reviewed171(p,Buffer.from('changed'))).toThrow('Unpinned');
 for(const[p,h]of Object.entries(a.approved_source_sha256))expect(sha(fs.readFileSync(p)),p).toBe(h);
 for(const m of a.approved_media)expect(sha(fs.readFileSync('public'+m.path)),m.path).toBe(m.sha256);
});
