import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'vitest';
import assert from 'node:assert/strict';
import {contentHash,loadReferenceModule} from '../lib/reference-content.mjs';
import {applyApprovedReferenceReleases,applySafetyIdentifyCopyRelease} from '../lib/safety-identify-copy-release.mjs';

const approval=JSON.parse(readFileSync('content/training/day1-basic-competencies/lesson-releases/safety-identify-fb-2.3o-v2/approval-record.json'));
const moduleRoot=join('content/training/day1-basic-competencies/modules/08-osh');
const source=loadReferenceModule(moduleRoot,'public');

test('approved copy release changes exactly the same Filipino choice in Read and Slides',()=>{
  const old=source.lessons.find(l=>l.manifest.lesson_key==='safety-identify');
  const next=applySafetyIdentifyCopyRelease(old);
  assert.equal(contentHash(old),approval.base_content_hash);
  assert.equal(contentHash(next),approval.new_content_hash);
  const expected=structuredClone(old);
  expected.revision.read_sections.find(s=>s.id==='check').check.options[0].fil=approval.approved_fil;
  expected.revision.slides.find(s=>s.id==='slide-check').check.options[0].fil=approval.approved_fil;
  assert.deepEqual(next,expected);
  assert.equal(old.revision.read_sections.find(s=>s.id==='check').check.options[0].fil,approval.old_fil);
  const released=applyApprovedReferenceReleases(source);
  assert.equal(released.lessons.length,source.lessons.length);
  for(const lesson of source.lessons){
    const actual=released.lessons.find(l=>l.manifest.lesson_key===lesson.manifest.lesson_key);
    if(lesson.manifest.lesson_key!=='safety-identify')assert.deepEqual(actual,lesson);
  }
});

test('release refuses source drift rather than silently changing a future lesson',()=>{
  const old=source.lessons.find(l=>l.manifest.lesson_key==='safety-identify');
  const changed=structuredClone(old);changed.revision.slides[0].heading_fil+='!';
  assert.throws(()=>applySafetyIdentifyCopyRelease(changed),/source drift/);
});
