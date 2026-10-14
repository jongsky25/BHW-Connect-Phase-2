import Link from 'next/link';
import {getLocale} from 'next-intl/server';
import {notFound,redirect} from 'next/navigation';
import {getViewer} from '@/lib/auth/viewer';
import {parseBhwFormalResults} from '@/lib/assessor/chapter-review';
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
  const db=await createClient();
  const [requestResult,resultResult]=await Promise.all([
    db.rpc('rpc_bhw_component_requests',{p_program_id:programId}),
    db.rpc('rpc_bhw_formal_results',{p_program_id:programId}),
  ]);
  if(requestResult.error||resultResult.error)notFound();
  const requests=parseBhwComponentRequests(requestResult.data);
  const results=parseBhwFormalResults(resultResult.data);
  if(!requests||!results)throw new Error('Invalid assessment request state');
  const en=locale==='en';const pick=(fil:string,english:string)=>en?english:fil;
  const status=(value:string)=>({pending:pick('Naghihintay ng assessor','Waiting for an assessor'),
    assigned:pick('May nakatalagang assessor','Assessor assigned'),
    arranged:pick('May napagkasunduang pagtatasa','Assessment arranged'),
    assessed:pick('Naitala ang pagtatasa; tingnan ang feedback kung nailabas na','Assessment recorded; see feedback when released'),
    reassessed:pick('May mas bagong kahilingan sa pagtatasa','A newer assessment request is open'),
    cancelled:pick('Kinansela','Cancelled'),released:pick('Ibinalik sa queue','Claim released')})[value as 'pending'|'assigned'|'arranged'|'assessed'|'reassessed'|'cancelled'|'released'];
  const outcome=(value:string)=>({complete:pick('Kumpleto ang bahagi','Component complete'),
    needs_practice:pick('Kailangan ng dagdag na pagsasanay','Further practice needed'),
    insufficient_evidence:pick('Naghihintay ng sapat na ebidensya','Evidence pending')})[value as 'complete'|'needs_practice'|'insufficient_evidence']??value;
  const chapterOutcome=(value:string)=>value==='complete'
    ?pick('Kumpleto ang Kabanata 1','Chapter 1 complete'):outcome(value);
  const sufficiency=(value:string)=>({sufficient:pick('Sapat ang ebidensya','Sufficient evidence'),
    insufficient:pick('Kulang ang ebidensya','Insufficient evidence'),
    not_observed:pick('Hindi naobserbahan','Not observed')})[value as 'sufficient'|'insufficient'|'not_observed']??value;
  const rating=(value:string)=>({kaya_na:pick('Kaya na','Can do'),
    kailangan_practice:pick('Kailangan ng pagsasanay','Needs practice'),
    hindi_pa:pick('Hindi pa','Not yet')})[value as 'kaya_na'|'kailangan_practice'|'hindi_pa']??value;
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
    {!!results.attempts.length&&<section className="space-y-3">
      <h2 className="text-xl font-semibold">{pick('Feedback sa pormal na pagtatasa','Formal assessment feedback')}</h2>
      {results.attempts.map(item=><article key={item.id} className="rounded-xl border border-ink/20 p-5">
        <h3 className="font-semibold">{en?item.moduleTitleEn:item.moduleTitleFil}</h3>
        <p className="mt-1">{outcome(item.outcome)}</p>
        <p className="mt-2">{en?item.feedbackEn:item.feedbackFil}</p>
        <ul className="mt-3 space-y-2">{item.criteria.map(criterion=>{
          const evidence=item.evidence.find(e=>e.id===criterion.id);
          return <li key={criterion.id} className="rounded border border-ink/15 p-3">
            <h4 className="font-medium">{en?criterion.en:criterion.fil}</h4>
            <p className="text-sm">{evidence?sufficiency(evidence.sufficiency):pick('Walang ebidensya','No evidence')}
              {evidence?.rating?` · ${rating(evidence.rating)}`:''}</p>
            {evidence?.facts&&<p className="mt-1">{evidence.facts}</p>}
            {evidence?.nextStep&&<p className="mt-1 text-sm">{pick('Susunod:','Next:')} {evidence.nextStep}</p>}
          </li>;
        })}</ul>
      </article>)}
    </section>}
    {!!results.reviews.length&&<section className="space-y-3">
      <h2 className="text-xl font-semibold">{pick('Pagsusuri ng Kabanata 1','Chapter 1 reviews')}</h2>
      {results.reviews.map(item=><article key={item.id} className="rounded-xl border border-ink/20 p-5">
        <h3 className="font-semibold">{chapterOutcome(item.outcome)}</h3>
        <p className="mt-2">{en?item.summaryEn:item.summaryFil}</p>
        {item.verificationCode&&<Link prefetch={false} className="mt-2 inline-block underline"
          href={`/certificates/${item.verificationCode}`}>
          {pick('Tingnan ang sertipiko','View certificate')}</Link>}
      </article>)}
    </section>}
  </main>;
}
