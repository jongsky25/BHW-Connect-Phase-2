"use client";

import {useRouter} from 'next/navigation';
import {TrainingConnectionNotice} from './training-connection-notice';
import {LessonReadingTools} from './lesson-reading-tools';
import {ReferenceLessons, type ReferenceData} from './reference-lessons';
import type {CourseModule,LessonModality} from '@/lib/elearning/types';
import type {LessonNarration} from '@/lib/elearning/reference-narration';
import type {LessonTranslation} from '@/lib/elearning/lesson-translation';
import {createClient} from '@/lib/supabase/client';

export function ManualLesson({data,modules,lessonId,baseHref,returnHref,locale,readOnly,lessonNumber,lessonCount,narration,translations,nextLessonHref,initialMode,assessorChapterId,completionMilestone,storyQuestionHandoff}:{
  assessorChapterId?:string;
  storyQuestionHandoff?:boolean;
  data:ReferenceData; modules:CourseModule[]; lessonId:string; baseHref:string; locale:string; readOnly:boolean;
  lessonNumber:number; lessonCount:number; narration?:LessonNarration; nextLessonHref?:string; initialMode?:LessonModality; returnHref?:string;
  completionMilestone?:{scope:'subchapter'|'chapter';number:string};
  translations?:LessonTranslation[];
}) {
  const router=useRouter();
  return <><TrainingConnectionNotice locale={locale} readOnly={readOnly}/><LessonReadingTools key={lessonId} locale={locale}><ReferenceLessons key={lessonId} {...data} modules={modules} initialLessonId={lessonId}
    lessonBaseHref={baseHref} returnHref={returnHref} locale={locale} readOnly={readOnly} lessonNumber={lessonNumber} lessonCount={lessonCount} initialMode={initialMode}
    nextLessonHref={nextLessonHref} completionMilestone={completionMilestone} storyQuestionHandoff={storyQuestionHandoff}
    narration={narration?{[lessonId]:narration}:undefined}
    translations={translations}
    onResume={async value=>{
      if(readOnly)return;
      const {error}=await createClient().rpc(assessorChapterId?'rpc_assessor_lesson_resume':'rpc_course_lesson_resume',{
        ...(assessorChapterId?{p_chapter_id:assessorChapterId}:{}),
        p_lesson_id:value.lesson_id,p_revision_id:value.revision_id,p_modality:value.modality,
        p_language:value.language,p_position_key:value.position_key,p_concept_id:value.concept_id,
      });
      if(error)throw error;
    }}
    onComplete={async lesson=>{
      if(readOnly)return;
      const {error}=await createClient().rpc(assessorChapterId?'rpc_assessor_lesson_complete':'rpc_course_lesson_complete',{...(assessorChapterId?{p_chapter_id:assessorChapterId}:{}),p_lesson_id:lesson.id,p_revision_id:lesson.revision.id});
      if(error)throw error;
      router.refresh();
    }}/></LessonReadingTools></>
}
