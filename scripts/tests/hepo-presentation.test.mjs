// @vitest-environment node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {loadReferenceModule,contentHash} from '../lib/reference-content.mjs';
import {beforeFeedbackHepoPresentation} from '../lib/feedback-hepo-preservation.mjs';

it('binds presentation to the approved five section/slide pairs and retains source/media bytes',()=>{
 const source=loadReferenceModule('content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw','public').lessons.find(l=>l.manifest.lesson_key==='bhw-roles-hepo');
 expect(contentHash(source)).toBe('88cf770c7b81b869cc73e684e2ee6eb2bdc105d189f76c2d7e4c406f61c69990');
 expect(source.revision.slides.map(s=>s.id)).toEqual(source.revision.read_sections.map(s=>s.id+'-slide'));
 expect(source.revision.slides.map(s=>s.asset_ids)).toEqual([['A01'],['A04'],['A02'],['A02'],[]]);
 expect(execFileSync('git',['diff','c9926025e154afabff31b476dbbe9f36a0a4abfb','--','content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/lessons/bhw-roles-hepo','public/training/bhw-1-1'])).toHaveLength(0);
});
it('reconstructs the complete previously approved reader without changing older receipts',()=>{
 const r=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-4.1g-reader-preservation.json'));
 expect(beforeFeedbackHepoPresentation(r.path)).toEqual(execFileSync('git',['show',r.base_commit+':'+r.path]));
});
