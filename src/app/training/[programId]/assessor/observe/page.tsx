import {getLocale} from 'next-intl/server';
import {notFound,redirect} from 'next/navigation';
import {Chapter1PracticeObservation} from '@/components/elearning/chapter1-practice-observation';
import {getViewer} from '@/lib/auth/viewer';
import {chapter1BriefingIdentity} from '@/lib/assessor/briefing';
import {loadAssessorRollout} from '@/lib/assessor/load-rollout';
import {lessonObservationReturn,parseLessonPracticeContext,selectedWorkspaceLearner} from '@/lib/assessor/lesson-observation';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Query={lesson?:string;learner?:string;returnTo?:string};

export default async function ObserveBhwPage({params,searchParams}:{
  params:Promise<{programId:string}>;searchParams:Promise<Query>;
}) {
  const [{programId},query,viewer,flags,locale]=await Promise.all([
    params,searchParams,getViewer(),getRequestFeatureFlags(),getLocale(),
  ]);
  if(!viewer.appUser||viewer.appUser.status!=='active')redirect('/login');
  if(viewer.appUser.role!=='assessor'||viewer.role!=='assessor'||viewer.isPreview||!flags.elearning)redirect('/home');
  if(!uuid.test(programId)||!query.lesson||!uuid.test(query.lesson)||!query.learner||!uuid.test(query.learner))notFound();
  if(!flags.assessor_flow_ui)notFound();
  const db=await createClient();
  const rollout=await loadAssessorRollout(db,flags,chapter1BriefingIdentity(programId),{actor:{
    id:viewer.appUser.id,role:viewer.appUser.role,active:true,preview:false,
  }});
  if(!rollout.uiVisible)notFound();
  const {data,error}=await db.rpc('rpc_assessor_lesson_practice_context',{
    p_program_id:programId,p_lesson_id:query.lesson,p_bhw_user_id:query.learner,
  });
  if(error)notFound();
  const context=parseLessonPracticeContext(data,programId,query.lesson,query.learner);
  if(!context)notFound();
  const backHref=lessonObservationReturn(query.returnTo,programId,query.lesson,query.learner,context.moduleId)
    ??`/training/${programId}/chapter-1/${context.moduleId}/${query.lesson}?view=run`;
  const workspaceHref=new URL(backHref,'https://training.local').searchParams.get('returnTo')??undefined;
  const safeWorkspaceHref=selectedWorkspaceLearner(workspaceHref,programId)===query.learner?workspaceHref:undefined;
  const [historyResult,legacyResult]=await Promise.all([
    db.rpc('rpc_practice_evidence_history',{p_bhw_user_id:query.learner,p_page:1}),
    db.from('competency_observations')
      .select('id,observed_at,level,note,indicator_snapshot,objective_index')
      .eq('bhw_user_id',query.learner).eq('module_id',context.moduleId)
      .order('observed_at',{ascending:false}).limit(10),
  ]);
  if(historyResult.error||legacyResult.error)throw new Error('Unable to load observation history');
  const history=Array.isArray(historyResult.data)?historyResult.data.filter(item=>item?.lessonId===query.lesson):[];
  const lang=locale==='en'?'en':'fil';
  return <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
    <Chapter1PracticeObservation context={context} lang={lang} backHref={backHref}
      workspaceHref={safeWorkspaceHref} history={history} legacy={legacyResult.data??[]}/>
  </main>;
}
