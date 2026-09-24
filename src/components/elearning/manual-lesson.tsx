"use client";

import {useRouter} from 'next/navigation';
import {ReferenceLessons, type ReferenceData} from './reference-lessons';
import type {CourseModule} from '@/lib/elearning/types';
import {createClient} from '@/lib/supabase/client';

export function ManualLesson({data,modules,lessonId,baseHref,locale,readOnly,lessonNumber,lessonCount}:{
  data:ReferenceData; modules:CourseModule[]; lessonId:string; baseHref:string; locale:string; readOnly:boolean;
  lessonNumber:number; lessonCount:number;
}) {
  const router=useRouter();
  return <ReferenceLessons key={lessonId} {...data} modules={modules} initialLessonId={lessonId}
    lessonBaseHref={baseHref} locale={locale} readOnly={readOnly} lessonNumber={lessonNumber} lessonCount={lessonCount}
    onResume={async value=>{
      if(readOnly)return;
      const {error}=await createClient().rpc('rpc_course_lesson_resume',{
        p_lesson_id:value.lesson_id,p_revision_id:value.revision_id,p_modality:value.modality,
        p_language:value.language,p_position_key:value.position_key,p_concept_id:value.concept_id,
      });
      if(error)throw error;
    }}
    onComplete={async lesson=>{
      if(readOnly)return;
      const {error}=await createClient().rpc('rpc_course_lesson_complete',{p_lesson_id:lesson.id,p_revision_id:lesson.revision.id});
      if(error)throw error;
      router.refresh();
    }}/>
}
