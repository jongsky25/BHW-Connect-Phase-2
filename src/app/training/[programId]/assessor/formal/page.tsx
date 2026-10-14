import Link from 'next/link';
import {getLocale} from 'next-intl/server';
import {notFound,redirect} from 'next/navigation';
import {FormalAttemptEditor} from '@/components/elearning/formal-attempt-editor';
import {getViewer} from '@/lib/auth/viewer';
import {parseFormalState} from '@/lib/assessor/formal-attempt';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function FormalAssessmentPage({params,searchParams}:{
  params:Promise<{programId:string}>;searchParams:Promise<{request?:string}>}){
  const [{programId},{request},viewer,flags,locale]=await Promise.all([
    params,searchParams,getViewer(),getRequestFeatureFlags(),getLocale()]);
  if(!viewer.appUser||viewer.appUser.status!=='active')redirect('/login');
  if(viewer.role!=='assessor'||viewer.appUser.role!=='assessor'||viewer.isPreview
    ||!flags.elearning||!flags.assessor_flow_ui)redirect('/home');
  if(!uuid.test(programId)||!request||!uuid.test(request))notFound();
  const {data,error}=await (await createClient()).rpc('rpc_assessor_formal_state',{p_request_id:request});
  if(error)notFound();
  const state=parseFormalState(data);
  if(!state)throw new Error('Invalid formal assessment state');
  if(state.programId!==programId)notFound();
  const en=locale==='en';
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
    <Link prefetch={false} href={`/training/${programId}/assessor/workspace#assessment-work`} className="min-h-11 w-fit content-center underline">
      {en?'Back to assessment work':'Bumalik sa gawaing pagtatasa'}</Link>
    <header><h1 className="text-2xl font-semibold">{en?'Formal assessment':'Pormal na pagtatasa'}</h1>
      <p className="mt-2">{state.learnerName} · {en?state.moduleTitleEn:state.moduleTitleFil}</p>
      <p className="mt-2">{en?state.purposeEn:state.purposeFil}</p></header>
    <FormalAttemptEditor state={state} lang={en?'en':'fil'}/>
  </main>;
}
