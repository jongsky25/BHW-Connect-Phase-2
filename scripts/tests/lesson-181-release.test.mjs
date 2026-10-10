import fs from 'node:fs';import {createHash} from 'node:crypto';import {it,expect} from 'vitest';
import {release181View} from '../lib/lesson-181-release-integration.mjs';
import {execFileSync} from 'node:child_process';
const hash=b=>createHash('sha256').update(b).digest('hex');
it('binds owner approval to the exact reviewed Apple package and only seven status promotions',()=>{
 const a=JSON.parse(fs.readFileSync('docs/lesson-181-owner-approval.json'));
 expect(a.authorization).toBe('approved. merge and deploy to live');expect(a.reviewed_head).toBe('43397edf230160b02eeec057ff1cbd9d8d221e27');expect(a.reviewed_package_sha256).toBe('686d0d9822fed8da88edc0f22447094c4f31c1d59c01a21ddbd6c049de8a8583');expect(a.lesson_keys).toEqual(['safety-identify']);
 const p='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-identify/lesson.json',actual=JSON.parse(fs.readFileSync(p));expect(actual.assets).toHaveLength(7);
 for(const asset of actual.assets){expect(asset.review_status).toBe('approved');asset.review_status='draft';}expect(actual).toEqual(JSON.parse(a.reviewed_lesson_utf8));expect(hash(Buffer.from(a.reviewed_lesson_utf8))).toBe(a.reviewed_lesson_sha256);
 for(const [p,h]of Object.entries(a.approved_source_sha256))expect(hash(fs.readFileSync(p)),p).toBe(h);
 expect(a.approved_media).toHaveLength(24);for(const m of a.approved_media){const b=fs.readFileSync('public'+m.path);expect(hash(b),m.path).toBe(m.sha256);expect(b.length).toBe(m.bytes);}
});
it('preserves current released siblings, all old public media and registry order',()=>{
 const a=JSON.parse(fs.readFileSync('docs/lesson-181-owner-approval.json')),main=a.integrated_main;
 const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-identify/';
 const changed=execFileSync('git',['diff','--name-only',main,'--','content/training/day1-basic-competencies/modules'],{encoding:'utf8'}).trim().split('\n');
 expect(changed.every(p=>p.startsWith(leaf)||p==='content/training/day1-basic-competencies/modules/08-osh/module.json')).toBe(true);
 const media=execFileSync('git',['diff','--name-status',main,'--','public'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);expect(media.every(p=>p.startsWith('A\t'))).toBe(true);
 const p='content/training/day1-basic-competencies/narration.json',old=JSON.parse(execFileSync('git',['show',main+':'+p],{maxBuffer:32*1024*1024})),now=JSON.parse(fs.readFileSync(p));
 for(const [k,v]of Object.entries(old.lessons))if(k!=='safety-identify')expect(now.lessons[k],k).toEqual(v);
 for(const [k,v]of Object.entries(old.history??{}))if(k!=='safety-identify')expect(now.history[k],k).toEqual(v);
 const r='remotion/src/Root.tsx',source=fs.readFileSync(r,'utf8').replace(/^import \{SafetyIdentifyStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`safety-identify-[\s\S]+?      \)\)\}\n/,'');expect(source).toBe(execFileSync('git',['show',main+':'+r],{encoding:'utf8'}));
});
it('validates both immutable integration views and rejects unreviewed successor mutations',()=>{
 const r=JSON.parse(fs.readFileSync('docs/lesson-181-release-integration.json'));
 for(const [p,e]of Object.entries(r.files)){expect(hash(fs.readFileSync(p)),p).toBe(e.integrated_sha256);for(const side of ['reviewed181','approvedMain'])expect(hash(release181View(p,side)),p).toBe(e[side+'_sha256']);expect(()=>release181View(p,'approvedMain',Buffer.from('unexpected'))).toThrow('Unpinned');}
});
