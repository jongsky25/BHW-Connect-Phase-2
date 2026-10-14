import Link from 'next/link';
import {getLocale} from 'next-intl/server';
import {notFound,redirect} from 'next/navigation';
import {getViewer} from '@/lib/auth/viewer';
import {parseBhwComponentRequests} from '@/lib/assessor/component-requests';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function AssessmentRequestsPage({params}:{params:Promise<{programId:string}>}){
  const [{programId},viewer,flags,locale]=await Promise.all([
    params,getViewer(),getRequestFeatureFlags(),getLocale(),
  ]);
  if(!viewer.appUser||viewer.appUser.status!=='active')redirect('/login');
  if(viewer.appUser.role!=='bhw'||viewer.role!=='bhw'||viewer.isPreview||!flags.elearning)redirect('/home');
  if(!uuid.test(programId))notFound();
  const {data,error}=await (await createClient()).rpc('rpc_bhw_component_requests',{p_program_id:programId});
  if(error)notFound();
  const requests=parseBhwComponentRequests(data);
  if(!requests)throw new Error('Invalid assessment request state');
  const en=locale==='en';const pick=(fil:string,english:string)=>en?english:fil;
  const status=(value:string)=>({pending:pick('Naghihintay ng assessor','Waiting for an assessor'),
    assigned:pick('May nakatalagang assessor','Assessor assigned'),
    arranged:pick('May napagkasunduang pagtatasa','Assessment arranged'),
    assessed:pick('Naitala ang pagtatasa; naghihintay ng paglabas ng resulta','Assessment recorded; outcome pending release'),
    cancelled:pick('Kinansela','Cancelled'),released:pick('Ibinalik sa queue','Claim released')})[value as 'pending'|'assigned'|'arranged'|'assessed'|'cancelled'|'released'];
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
    <Link prefetch={false} href={`/training/${programId}/chapter-1`} className="min-h-11 w-fit content-center underline">{pick('Bumalik sa Kabanata 1','Back to Chapter 1')}</Link>
    <header><h1 className="text-2xl font-semibold">{pick('Aking mga kahilingan sa pagtatasa','My assessment requests')}</h1>
      <p className="mt-2">{pick('Dito makikita ang layunin, aprubadong pamantayan, at napagkasunduang ayos ng pormal na pagtatasa. Ang pagkakaroon ng iskedyul ay hindi pa pasya sa resulta.',
        'See the purpose, approved criteria, and agreed arrangement for a formal assessment. Scheduling is not an outcome decision.')}</p></header>
    {!requests.length?<p role="status">{pick('Wala pang kahilingan sa pormal na pagtatasa.','No formal assessment requests yet.')}</p>
      :requests.map(item=><article key={item.id} className="rounded-xl border border-ink/20 p-5">
        <h2 className="font-semibold">{en?item.moduleTitleEn:item.moduleTitleFil}</h2>
        <p className="mt-1 text-sm">{status(item.status)}</p>
        <p className="mt-3"><strong>{pick('Layunin:','Purpose:')}</strong> {en?item.purposeEn:item.purposeFil}</p>
        <h3 className="mt-3 font-medium">{pick('Susuriing pamantayan','Criteria to be assessed')}</h3>
        <ul className="mt-1 list-disc pl-5">{item.criteria.map((criterion,index)=><li key={index}>{en?criterion.en:criterion.fil}</li>)}</ul>
        {item.assessorName&&<p className="mt-3">{pick('Assessor:','Assessor:')} {item.assessorName}</p>}
        {item.status==='arranged'&&<div className="mt-3 rounded bg-primary/5 p-3">
          {item.agreedAt&&<p>{pick('Petsa at oras:','Date and time:')} {new Date(item.agreedAt).toLocaleString(en?'en-PH':'fil-PH')}</p>}
          {item.location&&<p>{pick('Lugar o paraan:','Place or channel:')} {item.location}</p>}
          {item.note&&<p>{pick('Dagdag na kasunduan:','Additional arrangement:')} {item.note}</p>}
        </div>}
      </article>)}
  </main>;
}
