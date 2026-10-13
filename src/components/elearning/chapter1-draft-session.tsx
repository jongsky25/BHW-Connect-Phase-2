"use client";

import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import type {ActivityRun} from "@/lib/elearning/activities";

export function Chapter1DraftSession({id,lang,returnHref,runs}: {id:string;lang:"en"|"fil";returnHref?:string;runs:ActivityRun[]}) {
  const pick=(fil:string,en:string)=>lang==="en"?en:fil;
  const router=useRouter();
  const [when,setWhen]=useState("");
  const [place,setPlace]=useState("");
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  async function schedule(e:React.FormEvent) {
    e.preventDefault();if(pending)return;
    setPending(true);setError("");
    const date=new Date(when);
    if(!when||!Number.isFinite(date.getTime())||date<=new Date()){
      setError(pick("Pumili ng petsa at oras sa hinaharap.","Choose a future date and time."));setPending(false);return;
    }
    const {error:rpcError}=await createClient().rpc("rpc_course_lesson_plan_schedule",{
      p_session_id:id,p_scheduled_at:date.toISOString(),p_location_note:place,
    });
    if(rpcError)setError(pick("Hindi ma-iskedyul ang draft. I-refresh at subukan muli.","Could not schedule the draft. Refresh and try again."));
    else router.refresh();
    setPending(false);
  }
  return <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6">
    <h1 className="text-2xl font-semibold">{pick("Draft na plano ng session","Draft session plan")}</h1>
    <p>{pick("Plano lamang ito. Walang BHW na nakatala, attendance, delivery, o marka.","This is a plan only. No BHW enrollment, attendance, delivery, or grade has been recorded.")}</p>
    {returnHref&&<Link prefetch={false} className="inline-block min-h-11 content-center underline" href={returnHref}>{pick("Bumalik sa gabay ng aralin","Return to lesson guide")}</Link>}
    <section className="rounded border p-4"><h2 className="font-semibold">{pick("Mga na-save na gawain","Saved activities")}</h2>
      {runs.length?<ul className="mt-2 list-disc pl-5">{runs.map(r=><li key={r.id}>{r.activity_snapshot.title[lang]} · {pick("bersiyon","version")} {r.activity_snapshot.version}</li>)}</ul>
        :<p className="mt-2">{pick("Wala pang na-save. Pumili sa gabay ng aralin.","None saved yet. Choose activities in the lesson guide.")}</p>}
    </section>
    <form onSubmit={e=>void schedule(e)} className="space-y-3 rounded border p-4">
      <h2 className="font-semibold">{pick("I-schedule kapag handa na","Schedule when ready")}</h2>
      <p className="text-sm">{pick("Pagkatapos lamang ng pag-iskedyul maaaring mag-enroll at magtala ng delivery.","Enrollment and delivery recording become available only after scheduling.")}</p>
      <label className="grid gap-1">{pick("Petsa at oras","Date and time")}<input required type="datetime-local" className="min-h-11 rounded border bg-canvas p-2" value={when} onChange={e=>setWhen(e.target.value)}/></label>
      <label className="grid gap-1">{pick("Lugar (opsyonal)","Location (optional)")}<input maxLength={500} className="min-h-11 rounded border bg-canvas p-2" value={place} onChange={e=>setPlace(e.target.value)}/></label>
      {error&&<p role="alert" className="text-danger">{error}</p>}
      <button disabled={pending} className="min-h-11 rounded border px-4 disabled:opacity-50">{pick("I-schedule ang session","Schedule session")}</button>
    </form>
  </main>;
}
