import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {contentHash,validateReferenceLesson} from './reference-content.mjs';

const root='content/training/day1-basic-competencies/lesson-releases/bhw-accreditation-fb-2.2l-v2';
const packet='docs/feedback-remediation/fb-2.2l-accreditation-check-review.md';
const proposalPath='docs/feedback-remediation/proposals/fb-2.2l-accreditation-check.json';
const approval=JSON.parse(readFileSync(`${root}/approval-record.json`));
const proposal=JSON.parse(readFileSync(proposalPath));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

/** Keep the authored and narrated source intact; apply only the approved check. */
export function applyBhwAccreditationCheckRelease(lesson){
  if(lesson.manifest.lesson_key!==approval.lesson_key)return lesson;
  if(sha(readFileSync(packet))!==approval.review_packet_sha256||
     sha(readFileSync(proposalPath))!==approval.proposal_sha256)
    throw new Error('Accreditation check approval packet drift');
  if(proposal.lesson_key!==approval.lesson_key||
     proposal.base_revision_id!==approval.base_revision_id||
     proposal.base_content_hash!==approval.base_content_hash||
     contentHash(lesson)!==approval.base_content_hash)
    throw new Error('Accreditation check approved source drift');
  const next=structuredClone(lesson);
  for(const [sections,id] of [[next.revision.read_sections,proposal.read_section_id],
                               [next.revision.slides,proposal.slide_id]]){
    const matches=sections.filter(section=>section.id===id);
    if(matches.length!==1||sha(JSON.stringify(matches[0].check))!==proposal.base_check_sha256)
      throw new Error('Accreditation check baseline drift');
    matches[0].check=structuredClone(proposal.proposed_check);
  }
  const old=lesson.revision.read_sections.find(s=>s.id===proposal.read_section_id).check;
  const check=proposal.proposed_check;
  if(check.prompt_en!==old.prompt_en||check.prompt_fil!==old.prompt_fil||
     JSON.stringify(check.options[0])!==JSON.stringify(old.options[0])||
     check.options.length!==3||check.correct_option_index!==0)
    throw new Error('Accreditation check approved scope drift');
  validateReferenceLesson(next);
  if(contentHash(next)!==approval.new_content_hash)
    throw new Error('Accreditation check release hash drift');
  return next;
}
