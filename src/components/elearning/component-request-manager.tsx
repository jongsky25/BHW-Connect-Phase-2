'use client';

import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useRef,useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import {type ComponentReadiness} from '@/lib/assessor/component-readiness';
import {type ComponentRequestQueueItem} from '@/lib/assessor/component-requests';

type Lang='fil'|'en';
const field='min-h-11 w-full rounded border border-ink/30 bg-canvas px-3 py-2';

function RequestButton({programId,learnerId,moduleId,lang}:{programId:string;learnerId:string;moduleId:string;lang:Lang}){
  const router=useRouter();const key=useRef<string|null>(null);
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const en=lang==='en';
  async function create(){
    if(busy)return;key.current??=crypto.randomUUID();setBusy(true);setMessage('');
    try{const {error}=await createClient().rpc('rpc_assessor_component_request_create',{
      p_key:key.current,p_program_id:programId,p_bhw_user_id:learnerId,p_module_id:moduleId,
    });if(error)throw error;setMessage(en?'Request recorded.':'Naitala ang kahilingan.');router.refresh();}
    catch{setMessage(en?'Request could not be recorded. Recheck readiness and try again.':'Hindi naitala ang kahilingan. Suriin ang kahandaan at subukang muli.');}
    finally{setBusy(false);}
  }
  return <div className="mt-2"><button type="button" disabled={busy} onClick={create}
    className="min-h-11 rounded bg-primary px-4 text-on-primary disabled:opacity-50">{en?'Request assessment':'Humiling ng pagtatasa'}</button>
    {message&&<p role="status" className="mt-2 text-sm">{message}</p>}</div>;
}

function QueueAction({item,lang,programId}:{item:ComponentRequestQueueItem;lang:Lang;programId:string}){
  const router=useRouter();const key=useRef<string|null>(null);const lastAction=useRef<string|null>(null);
  const [date,setDate]=useState('');const [location,setLocation]=useState(item.location??'');
  const [note,setNote]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const en=lang==='en';const reset=()=>{key.current=null;setMessage('');};
  async function act(action:'claim'|'arrange'|'cancel'|'release',event?:FormEvent){
    event?.preventDefault();if(busy)return;
    if(lastAction.current!==action){key.current=null;lastAction.current=action;}
    key.current??=crypto.randomUUID();setBusy(true);setMessage('');
    try{
      const db=createClient();
      const call=action==='claim'?db.rpc('rpc_assessor_component_request_claim',{p_key:key.current,p_request_id:item.id})
        :action==='arrange'?db.rpc('rpc_assessor_component_arrangement_set',{
          p_key:key.current,p_request_id:item.id,p_agreed_at:date?new Date(date).toISOString():null,
          p_location:location,p_note:note.trim()||null,
        }):db.rpc('rpc_assessor_component_request_close',{
          p_key:key.current,p_request_id:item.id,p_action:action,
        });
      const {error}=await call;if(error)throw error;
      setMessage(en?'Updated.':'Na-update.');router.refresh();
    }catch{setMessage(en?'Update failed. Check current authority and readiness, then retry.':'Hindi na-update. Suriin ang pahintulot at kahandaan, saka subukang muli.');}
    finally{setBusy(false);}
  }
  return <div className="mt-3 space-y-3">
    {item.assignedToMe&&item.status==='arranged'&&<Link prefetch={false}
      href={`/training/${programId}/assessor/formal?request=${item.id}`}
      className="inline-block min-h-11 content-center rounded bg-primary px-4 text-on-primary">
      {en?'Open formal assessment':'Buksan ang pormal na pagtatasa'}</Link>}
    {item.status==='pending'&&<div className="flex flex-wrap gap-3">
      <button disabled={busy} onClick={()=>act('claim')} className="min-h-11 rounded bg-primary px-4 text-on-primary disabled:opacity-50">{en?'Claim request':'Akuin ang kahilingan'}</button>
      {item.requestedByMe&&<button disabled={busy} onClick={()=>act('cancel')} className="min-h-11 underline disabled:opacity-50">{en?'Cancel request':'Kanselahin ang kahilingan'}</button>}
    </div>}
    {item.assignedToMe&&<>
      <form className="grid gap-2 sm:grid-cols-2" onSubmit={event=>act('arrange',event)}>
        <label className="text-sm">{en?'Agreed date and time':'Napagkasunduang petsa at oras'}<input required type="datetime-local" className={field} value={date} onChange={e=>{setDate(e.target.value);reset();}}/></label>
        <label className="text-sm">{en?'Place or agreed channel':'Lugar o napagkasunduang paraan'}<input required maxLength={200} className={field} value={location} onChange={e=>{setLocation(e.target.value);reset();}}/></label>
        <label className="text-sm sm:col-span-2">{en?'Additional arrangement (optional)':'Dagdag na kasunduan (opsyonal)'}<input maxLength={1000} className={field} value={note} onChange={e=>{setNote(e.target.value);reset();}}/></label>
        <button disabled={busy} className="min-h-11 w-fit rounded bg-primary px-4 text-on-primary disabled:opacity-50">{item.status==='arranged'?(en?'Reschedule':'Baguhin ang iskedyul'):(en?'Save arrangement':'Itala ang kasunduan')}</button>
      </form>
      <div className="flex gap-3"><button disabled={busy} onClick={()=>act('release')} className="min-h-11 underline disabled:opacity-50">{en?'Release claim':'Bitawan ang pagtatalaga'}</button>
        <button disabled={busy} onClick={()=>act('cancel')} className="min-h-11 underline disabled:opacity-50">{en?'Cancel request':'Kanselahin ang kahilingan'}</button></div>
    </>}
    {item.assignedUnavailable&&!item.assignedToMe&&<button disabled={busy}
      onClick={()=>act('release')} className="min-h-11 underline disabled:opacity-50">
      {en?'Release unavailable assessor’s claim':'Bitawan ang pagtatalaga sa assessor na hindi available'}</button>}
    {message&&<p role="status" className="text-sm">{message}</p>}
  </div>;
}

export function ComponentRequestManager({programId,learnerId,readiness,queue,lang}:{
  programId:string;learnerId:string|null;readiness:ComponentReadiness[]|null;
  queue:ComponentRequestQueueItem[];lang:Lang;
}){
  const en=lang==='en';
  return <div className="mt-3 space-y-4">
    {learnerId&&readiness?.some(item=>item.canArrange)&&<section>
      <h3 className="font-semibold">{en?'Request for selected BHW':'Kahilingan para sa napiling BHW'}</h3>
      <ul className="mt-2 space-y-2">{readiness.filter(item=>item.canArrange).map(item=><li key={item.moduleId} className="rounded border border-ink/20 p-3">
        <p>{en?item.titleEn:item.titleFil}</p><RequestButton programId={programId} learnerId={learnerId} moduleId={item.moduleId} lang={lang}/>
      </li>)}</ul>
    </section>}
    {!queue.length?<p role="status">{en?'No open assessment requests.':'Wala pang bukas na kahilingan sa pagtatasa.'}</p>
      :<ul className="space-y-3">{queue.map(item=><li key={item.id} className="rounded border border-ink/20 p-4">
        <h3 className="font-semibold">{item.learnerName} · {en?item.moduleTitleEn:item.moduleTitleFil}</h3>
        <p className="text-sm">{item.status==='pending'?(en?'Pending claim':'Naghihintay ng assessor')
          :item.status==='arranged'?(en?'Arranged':'May kasunduan'):(en?'Claimed':'May assessor')}</p>
        {item.agreedAt&&<p className="text-sm">{new Date(item.agreedAt).toLocaleString(en?'en-PH':'fil-PH')}{item.location&&` · ${item.location}`}</p>}
        <QueueAction item={item} lang={lang} programId={programId}/>
      </li>)}</ul>}
    <p className="text-sm text-ink/70">{en?'Claiming or scheduling does not complete a formal assessment.':'Ang pag-ako o pag-iskedyul ay hindi pagkumpleto ng pormal na pagtatasa.'}</p>
  </div>;
}
