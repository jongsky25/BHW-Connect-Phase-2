import Link from 'next/link';
import {getLocale} from 'next-intl/server';
import {notFound,redirect} from 'next/navigation';
import {getViewer} from '@/lib/auth/viewer';
import {chapter1BriefingIdentity} from '@/lib/assessor/briefing';
import {loadAssessorRollout} from '@/lib/assessor/load-rollout';
import {followupDueLabel,parsePracticeFollowupState} from '@/lib/assessor/practice-followup';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function PracticeFollowupsPage({params}:{params:Promise<{programId:string}>}){
  const [{programId},viewer,flags,locale]=await Promise.all([
    params,getViewer(),getRequestFeatureFlags(),getLocale(),
  ]);
  if(!viewer.appUser||viewer.appUser.status!=='active')redirect('/login');
  if(viewer.appUser.role!=='assessor'||viewer.role!=='assessor'||viewer.isPreview||!flags.elearning)redirect('/home');
  if(!uuid.test(programId)||!flags.assessor_flow_ui)notFound();
  const db=await createClient();
  const rollout=await loadAssessorRollout(db,flags,chapter1BriefingIdentity(programId),{actor:{
    id:viewer.appUser.id,role:'assessor',active:true,preview:false,
  }});
  if(!rollout.uiVisible)notFound();
  const {data,error}=await db.rpc('rpc_assessor_practice_followup_state',{p_program_id:programId,p_bhw_user_id:null});
  if(error)throw new Error('Unable to load follow-ups');
  const state=parsePracticeFollowupState(data);
  if(!state)throw new Error('Invalid follow-up state');
  const lang=locale==='en'?'en':'fil';
  const pick=(fil:string,en:string)=>lang==='en'?en:fil;
  const open=state.followups.filter(plan=>plan.status==='open');
  return <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
    <Link prefetch={false} href={`/training/${programId}/assessor/workspace`} className="w-fit min-h-11 content-center underline">{pick('Bumalik sa working area','Back to working area')}</Link>
    <header><h1 className="text-2xl font-semibold">{pick('Mga follow-up sa pagsasanay','Practice follow-ups')}</h1>
      <p className="mt-2">{pick('Mga bukas na gawaing ikaw ang responsable o ikaw ang nagplano. Ang pagtatala ng pagsasanay ay hindi pormal na pasya.',
        'Open actions assigned to you or planned by you. Practice records are not formal decisions.')}</p></header>
    {!open.length?<p role="status">{pick('Walang bukas na follow-up.','No open follow-ups.')}</p>
      :open.map(plan=><article key={plan.id} className="rounded-lg border border-ink/20 p-4">
        <h2 className="font-semibold">{plan.learnerName} · {plan.action==='practice'?pick('Pagsasanay','Practice'):pick('Obserbasyon','Observation')}</h2>
        <p className="mt-1 text-sm">{pick('Responsable:','Responsible:')} {plan.assignedName}
          {followupDueLabel(plan)==='overdue'&&` · ${pick('Lampas sa petsa','Overdue')}`}
          {plan.agreedAt&&` · ${new Date(plan.agreedAt).toLocaleString(lang==='fil'?'fil-PH':'en-PH')}`}</p>
        <Link prefetch={false} className="mt-2 inline-block min-h-11 content-center underline"
          href={`/training/${programId}/assessor/observe?${new URLSearchParams({lesson:plan.lessonId,learner:plan.learnerId})}`}>
          {pick('Buksan ang obserbasyon at follow-up','Open observation and follow-up')}</Link>
      </article>)}
  </main>;
}
