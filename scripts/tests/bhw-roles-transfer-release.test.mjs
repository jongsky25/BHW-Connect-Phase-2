import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {test,expect} from 'vitest';
import {contentHash,loadReferenceModule} from '../lib/reference-content.mjs';
import {applyBhwRolesTransferRelease} from '../lib/bhw-roles-transfer-release.mjs';
import {applyApprovedReferenceReleases} from '../lib/safety-identify-copy-release.mjs';
import {applyFeedbackWordingRelease} from '../lib/feedback-wording-release.mjs';

const root='content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw';
const packet='docs/feedback-remediation/fb-2.2i-chapter1-transfer-check-review.md';
const approval=JSON.parse(readFileSync('content/training/day1-basic-competencies/lesson-releases/bhw-roles-application-fb-2.2i-v2/approval-record.json'));
const source=loadReferenceModule(root,'public');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('approved transfer check replaces only the final Read and Slides checks',()=>{
  expect(approval.review_packet_commit).toBe('ef926ee74dc7d11becbcb540aa6dc96fa125a2cf');
  expect(sha(readFileSync(packet))).toBe(approval.review_packet_sha256);
  const reviewed=readFileSync(packet,'utf8');
  const line=label=>reviewed.match(new RegExp(`^\\*\\*${label}:\\*\\* (.+)$`,'m'))?.[1];
  expect(approval.approved_check.prompt_en).toBe(line('English prompt'));
  expect(approval.approved_check.prompt_fil).toBe(line('Filipino prompt'));
  expect(approval.approved_check.feedback_en).toBe(line('English feedback'));
  expect(approval.approved_check.feedback_fil).toBe(line('Filipino feedback'));
  const rows=reviewed.split('\n').filter(s=>/^\| [012](?: — correct)? \|/.test(s));
  expect(rows).toHaveLength(3);
  rows.forEach((row,index)=>{
    const [,en,fil]=row.split('|').map(s=>s.trim()).slice(1);
    expect(approval.approved_check.options[index]).toEqual({en,fil});
  });
  const old=source.lessons.find(l=>l.manifest.lesson_key===approval.lesson_key);
  const next=applyBhwRolesTransferRelease(old);
  const expected=structuredClone(old);
  expected.revision.read_sections.find(s=>s.id==='check').check=approval.approved_check;
  expected.revision.slides.find(s=>s.id==='check-slide').check=approval.approved_check;
  expect(contentHash(old)).toBe(approval.base_content_hash);
  expect(contentHash(next)).toBe(approval.new_content_hash);
  expect(next).toEqual(expected);
  expect(old.revision.read_sections.find(s=>s.id==='check').check.options[0].en).toContain('water in three yards');
  expect(next.revision.read_sections.find(s=>s.id==='check').check.prompt_en).toContain('handwashing station');
  const released=applyApprovedReferenceReleases(source);
  for(const lesson of source.lessons){
    const actual=released.lessons.find(l=>l.manifest.lesson_key===lesson.manifest.lesson_key);
    expect(actual).toEqual(lesson.manifest.lesson_key===approval.lesson_key?next:applyFeedbackWordingRelease(lesson));
  }
});

test('release rejects a changed approved source',()=>{
  const old=source.lessons.find(l=>l.manifest.lesson_key===approval.lesson_key);
  const changed=structuredClone(old);
  changed.revision.slides[0].heading_fil+='!';
  expect(()=>applyBhwRolesTransferRelease(changed)).toThrow(/source drift/);
});
