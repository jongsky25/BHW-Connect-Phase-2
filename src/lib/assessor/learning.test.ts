import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import manifest from '../../../content/assessor/bhw-reference-manual.v1.json';
import {chapterStudy,studyReaderData} from './learning';
import type {CourseLesson} from '@/lib/elearning/types';
const lesson={id:'lesson',module_id:'m1',lesson_key:'bhw-roles-hepo',published_revision_id:'r1'} as CourseLesson;
const modules=[{id:'m1',position:0}];
const complete={lesson_id:'lesson',revision_id:'r1',completed_at:'2026-09-28'};
const resume={lesson_id:'lesson',revision_id:'r1',modality:'read' as const,language:'en' as const,position_key:'second',concept_id:'c',updated_at:'2026-09-28'};
describe('assessor full chapter study',()=>{
  it('uses the same module positions as the authored delivery sources',()=>{
    for(const chapter of manifest.chapters)for(const [position,module] of chapter.modules.entries()){
      const source=JSON.parse(readFileSync(`${chapter.source_root}/${module.module_key}/module.json`,'utf8'));
      expect(source.position).toBe(position);
    }
  });
  it('retains all 42 requirements when only one lesson is published',()=>{
    expect(chapterStudy('chapter-1',modules,[lesson],[complete],[])).toMatchObject({total:42,completed:1,missing:41});
    expect(chapterStudy('chapter-2',[],[],[],[])).toMatchObject({total:55,completed:0,missing:55});
    expect(chapterStudy('chapter-3',[],[],[],[])).toBeNull();
  });
  it('does not count stale revision, duplicate evidence, wrong module, or unpublished content',()=>{
    expect(chapterStudy('chapter-1',modules,[lesson],[complete,complete],[])?.completed).toBe(1);
    expect(chapterStudy('chapter-1',modules,[lesson],[{...complete,revision_id:'old'}],[])?.completed).toBe(0);
    expect(chapterStudy('chapter-1',[{id:'m1',position:1}],[lesson],[complete],[])?.missing).toBe(42);
    expect(chapterStudy('chapter-1',modules,[{...lesson,published_revision_id:null}],[complete],[])?.missing).toBe(42);
    expect(chapterStudy('chapter-1',[...modules,{id:'duplicate',position:0}],[lesson],[complete],[])?.missing).toBe(42);
  });
  it('restores only bookmarks belonging to available current revisions',()=>{
    const second={...lesson,id:'l2',lesson_key:'bhw-health-educator',published_revision_id:'r2'};
    expect(chapterStudy('chapter-1',modules,[lesson,second],[],[{...resume,lesson_id:'l2',revision_id:'r2'}])?.nextLesson?.id).toBe('l2');
    expect(chapterStudy('chapter-1',modules,[lesson,second],[],[{...resume,lesson_id:'l2',revision_id:'old'}])?.nextLesson?.id).toBe('lesson');
    expect(chapterStudy('chapter-1',modules,[lesson,second],[complete],[resume])?.nextLesson?.id).toBe('l2');
  });
  it('adapts reader data without using a BHW enrollment identity',()=>{
    expect(studyReaderData('chapter',[complete],[resume])).toMatchObject({completed:[{course_progress_id:'assessor:chapter',revision_id:'r1'}],resumes:[{course_progress_id:'assessor:chapter',position_key:'second'}]});
  });
});
