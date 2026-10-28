import {readFileSync} from 'node:fs';
import {contentHash,validateReferenceLesson} from './reference-content.mjs';

export const wordingReleases=JSON.parse(readFileSync('src/lib/elearning/feedback-wording-releases.json'));

export function applyFeedbackWordingRelease(lesson){
  const release=wordingReleases.find(r=>r.lesson_key===lesson.manifest.lesson_key);
  if(!release)return lesson;
  if(contentHash(lesson)!==release.base_content_hash)throw new Error('Feedback wording baseline drift: '+release.lesson_key);
  const next=structuredClone(lesson);
  for(const edit of release.edits){
    const section=next.revision[edit.collection].find(s=>s.id===edit.id);
    if(!section||!section[edit.field]?.includes(edit.old)||section[edit.field].split(edit.old).length!==2)
      throw new Error('Feedback wording text drift: '+release.lesson_key);
    section[edit.field]=section[edit.field].replace(edit.old,edit.new);
  }
  validateReferenceLesson(next);
  if(release.new_content_hash&&contentHash(next)!==release.new_content_hash)throw new Error('Feedback wording successor drift');
  return next;
}
