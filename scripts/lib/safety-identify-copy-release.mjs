import {readFileSync} from 'node:fs';
import {contentHash,validateReferenceLesson} from './reference-content.mjs';
import {applyBhwRolesTransferRelease} from './bhw-roles-transfer-release.mjs';
import {applyBhwAccreditationCheckRelease} from './bhw-accreditation-check-release.mjs';

const approval=JSON.parse(readFileSync('content/training/day1-basic-competencies/lesson-releases/safety-identify-fb-2.3o-v2/approval-record.json'));

// The approved 1.8.1 source remains immutable. Apply this reviewed successor
// after compilation so a later scoped loader cannot accidentally republish it.
export function applySafetyIdentifyCopyRelease(lesson){
  if(lesson.manifest.lesson_key!==approval.lesson_key)return lesson;
  if(contentHash(lesson)!==approval.base_content_hash)throw new Error('Safety-identify approved source drift; review a new release');
  const next=structuredClone(lesson);
  for(const [sections,id] of [[next.revision.read_sections,'check'],[next.revision.slides,'slide-check']]){
    const matches=sections.filter(section=>section.id===id);
    if(matches.length!==1||matches[0].check?.correct_option_index!==0||matches[0].check?.options?.[0]?.fil!==approval.old_fil)
      throw new Error('Safety-identify check drift; review a new release');
    matches[0].check.options[0].fil=approval.approved_fil;
  }
  validateReferenceLesson(next);
  if(contentHash(next)!==approval.new_content_hash)throw new Error('Safety-identify release hash drift');
  return next;
}

export function applyApprovedReferenceReleases(module){
  if(module.module_key==='08-osh')return {...module,lessons:module.lessons.map(applySafetyIdentifyCopyRelease)};
  if(module.module_key==='01-tungkulin-ng-bhw')return {...module,lessons:module.lessons.map(applyBhwRolesTransferRelease)};
  if(module.module_key==='04-ra7883')return {...module,lessons:module.lessons.map(applyBhwAccreditationCheckRelease)};
  return module;
}
