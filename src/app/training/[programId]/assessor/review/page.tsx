import Link from 'next/link';
import {getLocale} from 'next-intl/server';
import {notFound,redirect} from 'next/navigation';
import {ChapterReviewConsole} from '@/components/elearning/chapter-review-console';
import {getViewer} from '@/lib/auth/viewer';
import {parseChapterReviewState} from '@/lib/assessor/chapter-review';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function ChapterReviewPage({params,searchParams}:{
  params:Promise<{programId:string}>;searchParams:Promise<{learner?:string}>}){
  const [{programId},{learner},viewer,flags,locale]=await Promise.all([
    params,searchParams,getViewer(),getRequestFeatureFlags(),getLocale()]);
  if(!viewer.appUser||viewer.appUser.status!=='active')redirect('/login');
  if(viewer.role!=='assessor'||viewer.appUser.role!=='assessor'||viewer.isPreview
    ||!flags.elearning||!flags.assessor_flow_ui)redirect('/home');
  if(!uuid.test(programId)||!learner||!uuid.test(learner))notFound();
  const {data,error}=await (await createClient()).rpc('rpc_assessor_chapter_review_state',{
    p_program_id:programId,p_bhw_user_id:learner});
  if(error)notFound();
  const state=parseChapterReviewState(data);
  if(!state||state.programId!==programId||state.learnerId!==learner)
    throw new Error('Invalid Chapter 1 review state');
  const en=locale==='en';
  return <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
    <Link prefetch={false} className="min-h-11 w-fit content-center underline"
      href={`/training/${programId}/assessor/workspace#assessment-work`}>
      {en?'Back to assessment work':'Bumalik sa gawaing pagtatasa'}</Link>
    <header><h1 className="text-2xl font-semibold">{en?'Chapter 1 review':'Pagsusuri ng Kabanata 1'}</h1>
      <p className="mt-2">{state.learnerName}</p></header>
    <ChapterReviewConsole state={state} lang={en?'en':'fil'}/>
  </main>;
}
