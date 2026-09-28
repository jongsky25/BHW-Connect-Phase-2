import manifest from '../../../content/assessor/bhw-reference-manual.v1.json';
import type {CourseLesson, CourseLessonProgress, CourseLessonResume} from '@/lib/elearning/types';

type Module = {id:string;position:number};
export type StudyCompletion = {lesson_id:string;revision_id:string;completed_at:string};
export type StudyResume = Omit<CourseLessonResume,'course_progress_id'>;

/** Map authored module order to delivery module positions, just as training-load does.
 * Only the complete authored list determines the denominator; publication cannot
 * turn a partial chapter into completed study. This does NOT award qualification.
 */
export function chapterStudy(chapterKey:string, modules:Module[], lessons:CourseLesson[], completed:StudyCompletion[], resumes:StudyResume[]) {
  const chapter=manifest.chapters.find(c=>c.chapter_key===chapterKey);
  if(!chapter)return null;
  const entries=chapter.modules.flatMap((module,position)=>module.required_lesson_keys.map(key=>{
    const matches=modules.filter(m=>m.position===position);
    const candidates=matches.length===1?lessons.filter(l=>l.module_id===matches[0].id && l.lesson_key===key && l.published_revision_id):[];
    const lesson=candidates.length===1?candidates[0]:null;
    const done=!!lesson && completed.some(c=>c.lesson_id===lesson.id && c.revision_id===lesson.published_revision_id);
    return {key:`${module.module_key}:${key}`,moduleTitle:module.title,modulePosition:position,lesson,done};
  }));
  const available=entries.flatMap(e=>e.lesson?[e.lesson]:[]);
  const latest=resumes.filter(r=>available.some(l=>l.id===r.lesson_id && l.published_revision_id===r.revision_id))
    .sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0];
  const resumeLesson=latest?available.find(l=>l.id===latest.lesson_id):undefined;
  return {entries,total:entries.length,completed:entries.filter(e=>e.done).length,missing:entries.filter(e=>!e.lesson).length,
    nextLesson:(resumeLesson && !entries.find(e=>e.lesson?.id===resumeLesson.id)?.done?resumeLesson:null)??entries.find(e=>e.lesson&&!e.done)?.lesson??resumeLesson??null};
}

/** Adapter for the existing lesson renderer only. Never writes BHW progress. */
export function studyReaderData(chapterId:string, completed:StudyCompletion[], resumes:StudyResume[]):{completed:CourseLessonProgress[];resumes:CourseLessonResume[]} {
  return {
    completed:completed.map(c=>({...c,course_progress_id:`assessor:${chapterId}`,completion_basis:'learner',legacy_module_id:null,migration_batch:null})),
    resumes:resumes.map(r=>({...r,course_progress_id:`assessor:${chapterId}`})),
  };
}
