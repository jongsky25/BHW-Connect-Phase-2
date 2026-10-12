'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';

type Status='active'|'suspended'|'revoked';
type Event={id:string;operatorId:string;previousStatus:Status;nextStatus:Status;reason:string;at:string};
export type AwardRow={id:string;certificateId:string;actorId:string;name:string;programId:string;chapterId:string;
  status:Status;issuedAt:string;statusChangedAt:string|null;history:Event[]};
export type TransitionRow={legacyId:string;actorId:string;name:string;chapterKey:string;programId:string;
  status:Status;curriculumVersion:string;orientationVersion:string;requirementsVersion:string|null;
  category:string;blockers:string[];nextStep:string;combinedAwardId:string|null};

const words:Record<string,[string,string]>={
  active:['Aktibo','Active'],suspended:['Sinuspinde','Suspended'],revoked:['Binawi','Revoked'],
  legacy_status_suspended:['Sinuspinde ang dating kwalipikasyon','Legacy qualification suspended'],
  legacy_status_revoked:['Binawi ang dating kwalipikasyon','Legacy qualification revoked'],
  combined_path_unavailable:['Wala pang pinagsamang landas','Combined path unavailable'],
  accepted_contract_unavailable:['Wala pang aprubadong kontrata','Accepted contract unavailable'],
  prior_evidence_reuse_unapproved:['Hindi pa aprubado ang paggamit ng dating ebidensiya','Prior evidence reuse unapproved'],
  version_mismatch:['Hindi tugma ang bersyon','Version mismatch'],
  study_missing:['Kulang ang pag-aaral','Study missing'],briefing_missing:['Kulang ang briefing','Briefing missing'],
  orientation_lessons_missing:['Kulang ang aralin sa oryentasyon','Orientation lessons missing'],
  pretest_missing:['Kulang ang pretest','Pretest missing'],posttest_missing:['Kulang ang posttest','Posttest missing'],
  orientation_missing:['Kulang ang oryentasyon','Orientation missing'],
  simulation_missing:['Kulang ang simulation','Simulation missing'],
  restricted:['May paghihigpit','Restricted'],legacy_only:['Dating kwalipikasyon lamang','Legacy only'],
  already_awarded:['May pinagsamang award','Combined award exists'],policy_unavailable:['Wala pang aprubadong patakaran','Approved policy unavailable'],
  version_conflict:['Hindi tugma ang bersyon','Version conflict'],missing_evidence:['Kulang ang ebidensiya','Missing evidence'],
  publication_unavailable:['Hindi available ang publikasyon','Publication unavailable'],await_publication:['Hintayin ang publikasyon','Await publication'],
  evidence_complete:['Kumpleto ang naobserbahang ebidensiya; kailangan pa rin ang pagsusuri ng issuer','Observed evidence complete; issuer check still required'],
  contact_admin:['Makipag-ugnayan sa admin','Contact an admin'],await_combined_chapter_path:['Hintayin ang pinagsamang landas','Await the combined chapter path'],
  view_combined_award:['Tingnan ang sertipikasyon','View certification'],await_approved_contract:['Hintayin ang aprubadong patakaran','Await approved contract'],
  open_my_certifications:['Buksan ang Aking mga sertipikasyon at tapusin ang kulang','Open My certifications and complete missing steps']};
export function AssessorAwardLifecycle({rows,report,mutationEnabled,awardPage,transitionPage,locale}:{rows:AwardRow[];report:TransitionRow[];
  mutationEnabled:boolean;awardPage:number;transitionPage:number;locale:string}){
  const en=locale==='en',router=useRouter(),label=(fil:string,english:string)=>en?english:fil;
  const word=(key:string)=>words[key]?.[en?1:0]??key.replaceAll('_',' ');
  const [pending,setPending]=useState<string|null>(null),[error,setError]=useState<string|null>(null);
  const [historyPages,setHistoryPages]=useState<Record<string,{page:number;events:Event[]}>>({});
  const [pendingHistory,setPendingHistory]=useState<string|null>(null);
  async function moreHistory(row:AwardRow){
    const page=(historyPages[row.id]?.page??1)+1;setPendingHistory(row.id);setError(null);
    const {data,error:failure}=await createClient().rpc('rpc_admin_assessor_award_history',{p_award_id:row.id,p_page:page});
    if(failure)setError(label('Hindi mabasa ang kasaysayan.','Could not load history.'));
    else setHistoryPages(previous=>({...previous,[row.id]:{page,events:[...(previous[row.id]?.events??row.history),...(data as Event[])]}}));
    setPendingHistory(null);
  }
  async function change(event:FormEvent<HTMLFormElement>,row:AwardRow){
    event.preventDefault();const data=new FormData(event.currentTarget);
    const status=String(data.get('status')??''),reason=String(data.get('reason')??'').trim();
    if(reason.length<10||reason.length>1000){setError(label('Kailangan ng 10–1,000 titik na dahilan.','Reason must be 10–1,000 characters.'));return;}
    setPending(row.id);setError(null);
    const {error:failure}=await createClient().rpc('rpc_admin_assessor_award_set_status',{
      p_award_id:row.id,p_expected_status:row.status,p_expected_changed_at:row.statusChangedAt,p_status:status,p_reason:reason});
    if(failure)setError(label('Hindi nabago ang award. I-refresh at suriin ang kasalukuyang katayuan, saklaw at patakaran.',
      'Award unchanged. Refresh and check its current status, scope and policy.'));
    else router.refresh();setPending(null);
  }
  return <div className="space-y-8">
    <section aria-labelledby="combined-awards" className="space-y-4">
      <h2 id="combined-awards" className="text-xl font-semibold">{label('Pinagsamang Chapter 1 awards','Combined Chapter 1 awards')}</h2>
      {!mutationEnabled&&<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{label('Hindi pa aktibo ang pagbabago ng katayuan habang hinihintay ang patakaran sa lifecycle.','Status changes are disabled pending lifecycle policy approval.')}</p>}
      {error&&<p role="alert" className="text-danger">{error}</p>}
      {!rows.length&&<p>{label('Wala pang award sa iyong saklaw.','No awards in your scope yet.')}</p>}
      {rows.map(row=><article key={row.id} className="rounded-xl border border-ink/15 p-4">
        <h3 className="font-semibold">{row.name}</h3><p className="text-sm">{label('Katayuan','Status')}: {word(row.status)} · {label('Ibinigay','Issued')}: {new Date(row.issuedAt).toLocaleDateString(en?'en-PH':'fil-PH')}</p>
        <p className="break-all text-xs">{label('Certificate ID','Certificate ID')}: {row.certificateId}</p>
        {mutationEnabled&&row.status!=='revoked'&&<form onSubmit={event=>change(event,row)} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-col text-sm">{label('Bagong katayuan','New status')}<select name="status" required className="min-h-11 rounded border px-2" defaultValue="">
            <option value="" disabled>{label('Pumili','Choose')}</option>
            {row.status==='active'?<><option value="suspended">{label('Sinuspinde','Suspend')}</option><option value="revoked">{label('Binawi','Revoke')}</option></>:<><option value="active">{label('Ibalik','Restore')}</option><option value="revoked">{label('Binawi','Revoke')}</option></>}
          </select></label>
          <label className="flex flex-1 flex-col text-sm">{label('Dahilan','Reason')}<input name="reason" required minLength={10} maxLength={1000} className="min-h-11 rounded border px-2"/></label>
          <button disabled={pending===row.id} className="min-h-11 rounded bg-primary px-4 text-on-primary disabled:opacity-60">{label('I-save','Save')}</button>
        </form>}
        <details className="mt-3"><summary className="cursor-pointer text-sm underline">{label('Kasaysayan ng pagbabago','Lifecycle history')}</summary>
          {(historyPages[row.id]?.events??row.history).length?<ol className="mt-2 space-y-2">{(historyPages[row.id]?.events??row.history).map(event=><li key={event.id} className="text-sm">
            {new Date(event.at).toLocaleString(en?'en-PH':'fil-PH')} · {word(event.previousStatus)} → {word(event.nextStatus)} · {event.reason}</li>)}</ol>:<p className="mt-2 text-sm">{label('Wala pang pagbabago.','No changes yet.')}</p>}
          {((historyPages[row.id]?.events??row.history).length===20*(historyPages[row.id]?.page??1))&&<button type="button" disabled={pendingHistory===row.id} onClick={()=>moreHistory(row)} className="mt-2 text-sm underline disabled:opacity-60">{label('Mas lumang kasaysayan','Older history')}</button>}
        </details>
      </article>)}
      <nav className="flex gap-4 text-sm" aria-label={label('Mga pahina ng award','Award pages')}>
        {awardPage>1&&<Link className="underline" prefetch={false} href={`?awardPage=${awardPage-1}&transitionPage=${transitionPage}`}>{label('Nakaraan','Previous')}</Link>}
        {rows.length===30&&<Link className="underline" prefetch={false} href={`?awardPage=${awardPage+1}&transitionPage=${transitionPage}`}>{label('Susunod','Next')}</Link>}
      </nav>
    </section>
    <section aria-labelledby="reconciliation" className="space-y-4"><h2 id="reconciliation" className="text-xl font-semibold">{label('Ulat sa paglipat ng dating kwalipikasyon','Legacy transition report')}</h2>
      <p className="text-sm">{label('Basahin lamang. Hindi nag-iisyu o nagko-convert ang ulat. Ang Chapter 2 ay dating landas; hindi pa available ang Chapter 3.','Read only. This report does not issue or convert awards. Chapter 2 remains legacy; Chapter 3 is unavailable.')}</p>
      {!report.length&&<p>{label('Walang dating kwalipikasyon sa iyong saklaw.','No legacy qualifications in your scope.')}</p>}
      {report.map(row=><article key={row.legacyId} className="rounded-xl border border-ink/15 p-4">
        <h3 className="font-semibold">{row.name} · {row.chapterKey}</h3><p className="text-sm">{word(row.category)} · {word(row.status)}</p>
        <p className="text-sm">{label('Kurikulum','Curriculum')}: {row.curriculumVersion} · {label('Oryentasyon','Orientation')}: {row.orientationVersion}</p>
        {row.blockers.length>0&&<p className="text-sm">{label('Mga hadlang','Blockers')}: {row.blockers.map(word).join(', ')}</p>}
        <p className="text-sm">{label('Susunod','Next')}: {word(row.nextStep)}</p>
      </article>)}
      <nav className="flex gap-4 text-sm" aria-label={label('Mga pahina ng ulat','Report pages')}>
        {transitionPage>1&&<Link className="underline" prefetch={false} href={`?awardPage=${awardPage}&transitionPage=${transitionPage-1}`}>{label('Nakaraan','Previous')}</Link>}
        {report.length===30&&<Link className="underline" prefetch={false} href={`?awardPage=${awardPage}&transitionPage=${transitionPage+1}`}>{label('Susunod','Next')}</Link>}
      </nav>
    </section>
  </div>;
}
