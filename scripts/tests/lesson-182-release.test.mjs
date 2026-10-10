import {release183View} from '../lib/lesson-183-release-integration.mjs';
import fs from 'node:fs';import {createHash} from 'node:crypto';import {it,expect} from 'vitest';
import {release182View} from '../lib/lesson-182-release-integration.mjs';
import {execFileSync} from 'node:child_process';
const hash=b=>createHash('sha256').update(b).digest('hex');
it('binds owner approval to the exact reviewed Apple package and only seven status promotions',()=>{
 const a=JSON.parse(fs.readFileSync('docs/lesson-182-owner-approval.json'));
 expect(a.authorization).toBe('approved. merge and deploy to live');expect(a.reviewed_head).toBe('12ef2c8d6c802995a37bfe14847de49e23fdc0ef');expect(a.reviewed_package_sha256).toBe('ced4c59e3d58e3e82de67a8c41389c810c5af4906f7cd288a11b9ff1bd1b5d69');expect(a.lesson_keys).toEqual(['safety-controls']);
 const p='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-controls/lesson.json',actual=JSON.parse(fs.readFileSync(p));expect(actual.assets).toHaveLength(7);
 for(const asset of actual.assets){expect(asset.review_status).toBe('approved');asset.review_status='draft';}expect(actual).toEqual(JSON.parse(a.reviewed_lesson_utf8));expect(hash(Buffer.from(a.reviewed_lesson_utf8))).toBe(a.reviewed_lesson_sha256);
 for(const [p,h]of Object.entries(a.approved_source_sha256))expect(hash(release183View(p,'approvedMain')),p).toBe(h);
 for(const name of ['slides.json','read.fil.md','read.en.md','facilitator.fil.md','facilitator.en.md','competency.json']){const path='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-controls/'+name;expect(fs.readFileSync(path).equals(execFileSync('git',['show',a.reviewed_head+':'+path])),path).toBe(true);}
 expect(a.approved_media).toHaveLength(24);for(const m of a.approved_media){const b=fs.readFileSync('public'+m.path);expect(hash(b),m.path).toBe(m.sha256);expect(b.length).toBe(m.bytes);}
});
it('preserves current released siblings, all old public media and registry order',()=>{
 const a=JSON.parse(fs.readFileSync('docs/lesson-182-owner-approval.json')),main=a.integrated_main;
 const leaf='content/training/day1-basic-competencies/modules/08-osh/lessons/safety-controls/';
 const changed=execFileSync('git',['diff','--name-only',main,'--','content/training/day1-basic-competencies/modules'],{encoding:'utf8'}).trim().split('\n').filter(p=>!release183View(p,'approvedMain').equals(execFileSync('git',['show',main+':'+p])));
 expect(changed.every(p=>p.startsWith(leaf)||p==='content/training/day1-basic-competencies/modules/08-osh/module.json')).toBe(true);
 const media=execFileSync('git',['diff','--name-status',main,'--','public'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);expect(media.every(p=>p.startsWith('A\t'))).toBe(true);
 const p='content/training/day1-basic-competencies/narration.json',old=JSON.parse(execFileSync('git',['show',main+':'+p],{maxBuffer:32*1024*1024})),now=JSON.parse(release183View(p,'approvedMain'));
 for(const [k,v]of Object.entries(old.lessons))if(k!=='safety-controls')expect(now.lessons[k],k).toEqual(v);
 for(const [k,v]of Object.entries(old.history??{}))if(k!=='safety-controls')expect(now.history[k],k).toEqual(v);
 const r='remotion/src/Root.tsx',source=release183View(r,'approvedMain').toString().replace(/^import \{SafetyControlsStory[^\n]+\n/,'').replace(/      \{\(\["fil", "en"\] as const\)\.map\(\(language\) => \(\n        <Composition key=\{`safety-controls-[\s\S]+?      \)\)\}\n/,'');expect(source).toBe(execFileSync('git',['show',main+':'+r],{encoding:'utf8'}));
});
it('validates both immutable integration views and rejects unreviewed successor mutations',()=>{
 const r=JSON.parse(fs.readFileSync('docs/lesson-182-release-integration.json'));
 for(const [p,e]of Object.entries(r.files)){expect(hash(release183View(p,'approvedMain')),p).toBe(e.integrated_sha256);for(const side of ['reviewed182','approvedMain'])expect(hash(release182View(p,side)),p).toBe(e[side+'_sha256']);expect(()=>release182View(p,'approvedMain',Buffer.from('unexpected'))).toThrow('Unpinned');}
});
