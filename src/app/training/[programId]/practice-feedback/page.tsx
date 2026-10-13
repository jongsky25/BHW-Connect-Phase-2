import Link from 'next/link';
import {getLocale} from 'next-intl/server';
import {notFound,redirect} from 'next/navigation';
import {getViewer} from '@/lib/auth/viewer';
import {parseReleasedPracticeFeedback} from '@/lib/assessor/practice-followup';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function PracticeFeedbackPage({params}:{params:Promise<{programId:string}>}){
  const [{programId},viewer,flags,locale]=await Promise.all([
    params,getViewer(),getRequestFeatureFlags(),getLocale(),
  ]);
  if(!viewer.appUser||viewer.appUser.status!=='active')redirect('/login');
  if(viewer.appUser.role!=='bhw'||viewer.role!=='bhw'||viewer.isPreview||!flags.elearning)redirect('/home');
  if(!uuid.test(programId))notFound();
  const {data,error}=await (await createClient()).rpc('rpc_bhw_practice_feedback',{p_program_id:programId});
  if(error)notFound();
  const records=parseReleasedPracticeFeedback(data);
  if(!records)throw new Error('Invalid practice feedback');
  const lang=locale==='en'?'en':'fil';
  const pick=(fil:string,en:string)=>lang==='en'?en:fil;
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
    <Link prefetch={false} href={`/training/${programId}/chapter-1`} className="w-fit min-h-11 content-center underline">{pick('Bumalik sa Kabanata 1','Back to Chapter 1')}</Link>
    <header className="rounded-xl border border-primary/25 bg-primary/5 p-5">
      <h1 className="text-2xl font-semibold">{pick('Aking feedback sa pagsasanay','My practice feedback')}</h1>
      <p className="mt-2">{pick('Makikita mo rito ang feedback na ibinahagi ng assessor at ang napagkasunduang susunod na hakbang. Ang pagsasanay ay tumutulong maghanda; hiwalay ang pormal na pagtatasa at desisyon sa sertipiko.',
        'This page shows feedback your assessor released and the agreed next step. Practice helps you prepare; formal assessment and certificate decisions are separate.')}</p>
    </header>
    {!records.length?<p role="status">{pick('Wala pang ibinahaging feedback sa pagsasanay. Maaari mong balikan ang mga aralin habang naghihintay.',
      'No practice feedback has been released yet. You can revisit lessons while you wait.')}</p>
      :records.map(item=><article key={item.id} className="space-y-3 rounded-xl border border-ink/20 p-5">
        <h2 className="font-semibold">{pick('Pagsasanay sa Kabanata 1','Chapter 1 practice')} · {new Date(item.releasedAt).toLocaleDateString(lang==='fil'?'fil-PH':'en-PH')}</h2>
        <p><strong>{pick('Feedback:','Feedback:')}</strong> {item.feedback}</p>
        <p><strong>{pick('Susunod na hakbang:','Next step:')}</strong> {item.nextStep}</p>
        {item.followup&&<div className="rounded-md bg-ink/5 p-3 text-sm">
          <p>{item.followup.action==='practice'?pick('Susunod na pagsasanay','Next practice'):pick('Susunod na obserbasyon','Next observation')} · {item.followup.assignedName}</p>
          {item.followup.agreedAt&&<p>{pick('Napagkasunduang petsa:','Agreed date:')} {new Date(item.followup.agreedAt).toLocaleString(lang==='fil'?'fil-PH':'en-PH')}</p>}
          <p>{item.followup.status==='open'?pick('Nakahanda','Planned'):item.followup.status==='completed'?pick('Natapos','Completed'):pick('Kinansela','Cancelled')}</p>
        </div>}
      </article>)}
  </main>;
}
