import {parseSessionReturn} from '@/lib/elearning/session-return';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type LangText={fil:string;en:string};
export type ReviewedCriterion={id:string;version:string;requirementsVersion:string;rubricVersion:string;
  recordable:boolean;rubric:{observable:LangText;levels:Record<'kaya_na'|'kailangan_practice'|'hindi_pa',LangText>}};
export type LessonPracticeContext={programId:string;chapterId:string;moduleId:string;lessonId:string;
  learner:{id:string;name:string;barangay:string}|null;criteria:ReviewedCriterion[];canRecord:boolean};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0;
const localized=(value:unknown):value is LangText=>object(value)&&text(value.fil)&&text(value.en);

export function parseLessonPracticeContext(data:unknown,programId:string,lessonId:string,learnerId?:string):LessonPracticeContext|null {
  if(!object(data)||data.programId!==programId||data.lessonId!==lessonId||!uuid.test(String(data.chapterId))
    ||!uuid.test(String(data.moduleId))||typeof data.canRecord!=='boolean'||!Array.isArray(data.criteria)
    ||data.criteria.length>20)return null;
  const learner=data.learner;
  if(learnerId && (!object(learner)||learner.id!==learnerId||!text(learner.name)||!text(learner.barangay)))return null;
  if(!learnerId && learner!==null)return null;
  if(!data.criteria.every(value=>{
    if(!object(value)||!text(value.id)||!text(value.version)||!text(value.requirementsVersion)
      ||!text(value.rubricVersion)||typeof value.recordable!=='boolean'||!object(value.rubric))return false;
    const rubric=value.rubric;
    return localized(rubric.observable)&&object(rubric.levels)
      &&['kaya_na','kailangan_practice','hindi_pa'].every(level=>localized((rubric.levels as Record<string,unknown>)[level]));
  }))return null;
  return data as LessonPracticeContext;
}

export function selectedWorkspaceLearner(returnHref:string|undefined,programId:string){
  if(!returnHref)return null;
  try{
    const url=new URL(returnHref,'https://training.local');
    if(!returnHref.startsWith('/')||url.origin!=='https://training.local'
      ||url.pathname!==`/training/${programId}/assessor/workspace`||url.hash)return null;
    const learner=url.searchParams.get('learner');
    return learner&&uuid.test(learner)?learner:null;
  }catch{return null;}
}

export function lessonObservationReturn(value:unknown,programId:string,lessonId:string,learnerId:string,moduleId:string){
  const parsed=parseSessionReturn(value);
  if(!parsed||parsed.programId!==programId||parsed.lessonId!==lessonId||parsed.moduleId!==moduleId)return null;
  const url=new URL(parsed.href,'https://training.local');
  const workspace=url.searchParams.get('returnTo');
  if(workspace&&selectedWorkspaceLearner(workspace,programId)!==learnerId)return null;
  return parsed.href;
}

export function observationHref(programId:string,lessonId:string,learnerId:string,guideHref:string){
  return `/training/${programId}/assessor/observe?${new URLSearchParams({lesson:lessonId,learner:learnerId,returnTo:guideHref})}`;
}
