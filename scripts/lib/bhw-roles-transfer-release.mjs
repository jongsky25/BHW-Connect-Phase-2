import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {contentHash,validateReferenceLesson} from './reference-content.mjs';

const packet='docs/feedback-remediation/fb-2.2i-chapter1-transfer-check-review.md';
const approval=JSON.parse(readFileSync('content/training/day1-basic-competencies/lesson-releases/bhw-roles-application-fb-2.2i-v2/approval-record.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export function applyBhwRolesTransferRelease(lesson){
  if(lesson.manifest.lesson_key!==approval.lesson_key)return lesson;
  if(sha(readFileSync(packet))!==approval.review_packet_sha256)throw new Error('Roles transfer approval packet drift');
  if(contentHash(lesson)!==approval.base_content_hash)throw new Error('Roles transfer approved source drift');
  const next=structuredClone(lesson);
  for(const [sections,id] of [[next.revision.read_sections,'check'],[next.revision.slides,'check-slide']]){
    const match=sections.filter(section=>section.id===id);
    if(match.length!==1||match[0].check?.correct_option_index!==0||match[0].check?.options?.length!==3)
      throw new Error('Roles transfer check structure drift');
    match[0].check=structuredClone(approval.approved_check);
  }
  validateReferenceLesson(next);
  if(contentHash(next)!==approval.new_content_hash)throw new Error('Roles transfer release hash drift');
  return next;
}
