import releases from './feedback-wording-releases.json';

/** Presentation compatibility for these exact copy-only successor hashes.
 * Existing selectors still require their original section/text/asset bindings.
 */
export function presentationSourceHash(lessonKey:string,hash:string){
  return releases.find(r=>r.lesson_key===lessonKey&&r.new_content_hash===hash)?.base_content_hash??hash;
}
