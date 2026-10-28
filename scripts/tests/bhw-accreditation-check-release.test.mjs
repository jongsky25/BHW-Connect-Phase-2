import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {test,expect} from 'vitest';
import {contentHash,loadReferenceModule} from '../lib/reference-content.mjs';
import {applyBhwAccreditationCheckRelease} from '../lib/bhw-accreditation-check-release.mjs';
import {applyApprovedReferenceReleases} from '../lib/safety-identify-copy-release.mjs';
import {applyFeedbackWordingRelease} from '../lib/feedback-wording-release.mjs';

const root='content/training/day1-basic-competencies';
const approval=JSON.parse(readFileSync(`${root}/lesson-releases/bhw-accreditation-fb-2.2l-v2/approval-record.json`));
const proposalPath='docs/feedback-remediation/proposals/fb-2.2l-accreditation-check.json';
const proposal=JSON.parse(readFileSync(proposalPath));
const packet='docs/feedback-remediation/fb-2.2l-accreditation-check-review.md';
const source=loadReferenceModule(`${root}/modules/04-ra7883`,'public');
const sha=x=>createHash('sha256').update(x).digest('hex');

test('the exact owner-approved bilingual check replaces only two distractors and feedback in both views',()=>{
  expect(approval.review_packet_commit).toBe('9358b49220a72cb44ffdca70a7b436f470701233');
  expect(sha(readFileSync(packet))).toBe(approval.review_packet_sha256);
  expect(sha(readFileSync(proposalPath))).toBe(approval.proposal_sha256);
  const reviewed=readFileSync(packet,'utf8');
  for(const option of proposal.proposed_check.options.slice(1)){
    expect(reviewed).toContain(option.en);
    expect(reviewed).toContain(option.fil);
  }
  expect(reviewed).toContain(proposal.proposed_check.feedback_en);
  expect(reviewed).toContain(proposal.proposed_check.feedback_fil);
  const old=source.lessons.find(l=>l.manifest.lesson_key===approval.lesson_key);
  const next=applyBhwAccreditationCheckRelease(old);
  const expected=structuredClone(old);
  expected.revision.read_sections.find(s=>s.id===proposal.read_section_id).check=proposal.proposed_check;
  expected.revision.slides.find(s=>s.id===proposal.slide_id).check=proposal.proposed_check;
  expect(next).toEqual(expected);
  expect(contentHash(old)).toBe(approval.base_content_hash);
  expect(contentHash(next)).toBe(approval.new_content_hash);
  expect(next.revision.read_sections[5].check).toEqual(next.revision.slides[5].check);
  const released=applyApprovedReferenceReleases(source);
  expect(released.lessons.find(l=>l.manifest.lesson_key===approval.lesson_key)).toEqual(next);
  for(const lesson of source.lessons.filter(l=>l.manifest.lesson_key!==approval.lesson_key))
    expect(released.lessons.find(l=>l.manifest.lesson_key===lesson.manifest.lesson_key)).toEqual(applyFeedbackWordingRelease(lesson));
});

test('the release rejects changes to the reviewed source',()=>{
  const old=source.lessons.find(l=>l.manifest.lesson_key===approval.lesson_key);
  const changed=structuredClone(old);
  changed.revision.slides[0].heading_fil+='!';
  expect(()=>applyBhwAccreditationCheckRelease(changed)).toThrow(/source drift/);
});
