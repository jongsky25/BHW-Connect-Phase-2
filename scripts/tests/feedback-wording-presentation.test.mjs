import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {loadReferenceModule} from '../lib/reference-content.mjs';
import {wordingReleases,applyFeedbackWordingRelease} from '../lib/feedback-wording-release.mjs';
import {presentationSourceHash} from '../../src/lib/elearning/feedback-wording-release';
import {legalRoleContext} from '../../src/lib/elearning/legal-role-context';
import {isHepoPresentation} from '../../src/lib/elearning/hepo-presentation';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration';

const original=JSON.parse(readFileSync('content/training/day1-basic-competencies/narration.json'));
const recordings=JSON.parse(readFileSync('src/lib/elearning/feedback-wording-narration.json'));
for(const r of wordingReleases){
  const base=loadReferenceModule('content/training/day1-basic-competencies/modules/'+r.module_key,'public').lessons.find(l=>l.manifest.lesson_key===r.lesson_key);
  const successor=applyFeedbackWordingRelease(base);
  const lesson={lesson_key:r.lesson_key,revision:{...successor.revision,content_hash:r.new_content_hash}};
  test('item '+r.queue_number+' supports successor presentation and historical narration independently',()=>{
    expect(presentationSourceHash(r.lesson_key,r.new_content_hash)).toBe(r.base_content_hash);
    expect(presentationSourceHash('unrelated',r.new_content_hash)).toBe(r.new_content_hash);
    expect(presentationSourceHash(r.lesson_key,'future')).toBe('future');
    if(r.queue_number===1)for(const en of [true,false])for(const id of ['section-1','section-2','roles-and-authority']){
      expect(legalRoleContext(lesson,id,en)).not.toBeNull();
      expect(legalRoleContext(lesson,'slide-'+id,en)).not.toBeNull();
    }
    if(r.queue_number===6)expect(isHepoPresentation(lesson)).toBe(true);
    const changed=new Set(r.edits.filter(e=>e.collection==='read_sections').map(e=>e.id+':'+e.field.split('_').at(-1)));
    for(const key of changed){
      const [id,lang]=key.split(':');
      const entry=recordings.lessons[r.lesson_key]?.sections[id]?.[lang];
      expect(entry,'New audio must exist before publication: '+key).toBeDefined();
      const next=narrationForLesson(original,r.lesson_key,lang,successor.revision.read_sections);
      const historic=narrationForLesson(original,r.lesson_key,lang,base.revision.read_sections);
      expect(next[id]?.src).toBe(entry.src);
      expect(historic[id]?.src).toBe(original.lessons[r.lesson_key].sections[id][lang].src);
      expect(next[id].src).not.toBe(historic[id].src);
    }
  });
}
