'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {createClient} from '@/lib/supabase/client';

export type QualificationState={status:'active'|'suspended'|'revoked'|'in_progress'|'unavailable';
  next_step:string;issued_at?:string;curriculum_version?:string;rubric_version?:string;orientation_version?:string};

export function AssessorQualificationCard({chapterId,chapterTitle,chapterHref,locale,state}:{chapterId:string;chapterTitle:string;chapterHref:string;locale:string;state:QualificationState}){
  const en=locale==='en';
  const text=(fil:string,english:string)=>en?english:fil;
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const next:Record<string,[string,string,string?]>={
    pretest:['Kunin ang diagnostic pretest','Take the diagnostic pretest','/exam/pretest'],
    study:['Ipagpatuloy ang mga aralin','Continue chapter lessons',''],
    posttest:['Kunin ang pangwakas na pagsusulit','Take the chapter post-test','/exam/posttest'],
    orientation_lessons:['Tapusin ang mga aralin sa oryentasyon','Complete orientation lessons','/orientation'],
    scoring_exercise:['Sagutan ang scoring exercise','Complete the scoring exercise','/orientation'],
    await_chapter_requirements:['Naghihintay ng aprubadong exam at oryentasyon','Awaiting approved exam and orientation'],
    contact_admin:['Makipag-ugnayan sa administrator tungkol sa katayuan','Contact an administrator about this status'],
    qualified:['Maaari nang gamitin ang kwalipikasyong ito sa susunod na assessment workflow','This qualification is ready for the assessment workflow'],
    issue:['Naitala ang pagpasa. Ibigay ang kwalipikasyon','Pass recorded. Issue qualification'],
  };
  const step=next[state.next_step]??next.await_chapter_requirements;
  const status:Record<QualificationState['status'],[string,string]>={
    active:['Kwalipikado','Qualified'],suspended:['Sinuspinde','Suspended'],revoked:['Binawi','Revoked'],
    in_progress:['Isinasagawa','In progress'],unavailable:['Hindi pa available','Not yet available'],
  };
  async function ensure(){
    setBusy(true);setError(null);
    const {error:rpcError}=await createClient().rpc('rpc_assessor_qualification_ensure',{p_chapter_id:chapterId});
    if(rpcError)setError(text('Hindi maibigay ang kwalipikasyon. Subukan muli o makipag-ugnayan sa administrator.','Could not issue qualification. Try again or contact an administrator.'));
    else router.refresh();
    setBusy(false);
  }
  return <article className="rounded-xl border border-ink/15 p-5">
    <h2 className="text-lg font-semibold">{chapterTitle}</h2>
    <p className="mt-2 font-medium">{text(...status[state.status])}</p>
    {state.issued_at&&<p className="mt-2 text-sm">{text('Ibinigay noong','Issued')} {new Date(state.issued_at).toLocaleDateString(en?'en-PH':'fil-PH')}</p>}
    {state.curriculum_version&&<p className="mt-1 text-sm">{text('Kurikulum','Curriculum')}: {state.curriculum_version} · {text('Rubrik','Rubric')}: {state.rubric_version}</p>}
    {state.orientation_version&&<p className="mt-1 text-sm">{text('Oryentasyon','Orientation')}: {state.orientation_version}</p>}
    <p className="mt-3 text-sm">{text(step[0],step[1])}</p>
    {step[2]!==undefined&&<Link prefetch={false} href={`${chapterHref}${step[2]}`} className="mt-3 inline-block underline">{text('Pumunta sa susunod na hakbang','Go to next step')}</Link>}
    {state.next_step==='issue'&&<button type="button" disabled={busy} onClick={ensure} className="mt-3 rounded bg-primary px-4 py-3 text-on-primary disabled:opacity-60">{text('Ibigay ang kwalipikasyon','Issue qualification')}</button>}
    {error&&<p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
  </article>;
}
