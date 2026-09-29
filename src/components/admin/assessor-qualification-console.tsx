'use client';

import {useRouter} from 'next/navigation';
import {useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';

export type QualificationRow={id:string;assessor_user_id:string;chapter_id:string;curriculum_version:string;
  status:'active'|'suspended'|'revoked';issued_at:string;assessor_name:string;chapter_name:string};

export function AssessorQualificationConsole({rows,locale}:{rows:QualificationRow[];locale:string}){
  const en=locale==='en',router=useRouter();
  const text=(fil:string,english:string)=>en?english:fil;
  const [pending,setPending]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  async function change(event:FormEvent<HTMLFormElement>,id:string){
    event.preventDefault();
    const data=new FormData(event.currentTarget),status=String(data.get('status')??''),reason=String(data.get('reason')??'').trim();
    if(reason.length<10){setError(text('Maglagay ng dahilang hindi bababa sa 10 titik.','Enter a reason of at least 10 characters.'));return;}
    setPending(id);setError(null);
    const {error:rpcError}=await createClient().rpc('rpc_admin_assessor_qualification_set_status',{
      p_qualification_id:id,p_status:status,p_reason:reason,
    });
    if(rpcError)setError(text('Hindi mabago ang katayuan. Suriin ang saklaw at subukan muli.','Could not change status. Check your scope and try again.'));
    else router.refresh();
    setPending(null);
  }
  return <div className="space-y-4">
    {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
    {!rows.length&&<p>{text('Wala pang kwalipikasyon sa iyong saklaw.','No qualifications in your scope yet.')}</p>}
    {rows.map(row=><article key={row.id} className="rounded-xl border border-ink/15 p-4">
      <h2 className="font-semibold">{row.assessor_name} · {row.chapter_name}</h2>
      <p className="mt-1 text-sm">{text('Katayuan','Status')}: {row.status} · {text('Kurikulum','Curriculum')}: {row.curriculum_version}</p>
      <p className="text-sm">{text('Ibinigay noong','Issued')}: {new Date(row.issued_at).toLocaleDateString(en?'en-PH':'fil-PH')}</p>
      <form onSubmit={event=>change(event,row.id)} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-sm">{text('Bagong katayuan','New status')}
          <select name="status" defaultValue={row.status} className="min-h-11 rounded border border-ink/25 px-2">
            <option value="active">{text('Aktibo','Active')}</option><option value="suspended">{text('Sinuspinde','Suspended')}</option><option value="revoked">{text('Binawi','Revoked')}</option>
          </select></label>
        <label className="flex flex-1 flex-col gap-1 text-sm">{text('Dahilan para sa audit','Reason for audit')}
          <input name="reason" required minLength={10} maxLength={1000} className="min-h-11 rounded border border-ink/25 px-3"/></label>
        <button type="submit" disabled={pending===row.id} className="min-h-11 rounded bg-primary px-4 text-on-primary disabled:opacity-60">{text('I-save ang katayuan','Save status')}</button>
      </form>
    </article>)}
  </div>;
}
