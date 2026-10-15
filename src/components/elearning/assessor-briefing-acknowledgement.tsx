'use client';

import Link from 'next/link';
import {useId, useRef, useState, type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import {CHAPTER1_BRIEFING_VERSION, parseBriefingState, type BriefingState} from '@/lib/assessor/briefing';

export function AssessorBriefingAcknowledgement({locale, programId, actorId, chapterHref, initial}: {
  locale: string; programId: string; actorId: string; chapterHref: string; initial: BriefingState | null;
}) {
  const text = (fil: string, en: string) => locale === 'en' ? en : fil;
  const id = useId();
  const [state, setState] = useState(initial);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  async function request(save: boolean) {
    if (pending.current || (save && (!confirmed || !state || state.acknowledgedAt))) return;
    pending.current = true; setBusy(true); setError(null);
    try {
      const {data, error: rpcError} = await createClient().rpc(save ? 'rpc_assessor_briefing_acknowledge' : 'rpc_assessor_briefing_state', {
        p_program_id: programId,
        ...(save ? {p_expected_actor_id: actorId, p_requirements_version: state!.requirementsVersion, p_briefing_version: CHAPTER1_BRIEFING_VERSION,
          p_acknowledged: true, p_language: locale === 'en' ? 'en' : 'fil'} : {}),
      });
      const result = rpcError ? null : parseBriefingState(data, programId, actorId);
      if (!result || (save && !result.acknowledgedAt)) throw new Error('unconfirmed');
      setState(result);
    } catch {
      setError(save
        ? text('Hindi makumpirma ang pag-save. Maaaring naitala na ito. Maaari mong tingnan muli ang status o subukang mag-save muli; hindi madodoble ang tala.', 'We could not confirm the save. It may already be recorded. Check the status or try saving again; this will not duplicate the record.')
        : text('Hindi makuha ang status. Subukan muli. Hindi ituturing na nakilala ang briefing hangga’t hindi nakukumpirma ang tala.', 'We could not load the status. Try again. The briefing will not count as acknowledged until the record is confirmed.'));
    } finally {pending.current = false; setBusy(false);}
  }
  function submit(event: FormEvent) {event.preventDefault(); void request(true);}
  const button = 'min-h-11 rounded-lg border border-primary-text px-4 py-3 font-medium text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-text disabled:opacity-50';
  return <section aria-labelledby={`${id}-title`} className="rounded-xl border border-ink/15 p-4 sm:p-6">
    <h2 id={`${id}-title`} className="text-xl font-semibold">{text('Pagkilala sa panimulang briefing', 'Acknowledge the opening briefing')}</h2>
    <p className="mt-3">{text('Itinatala nito na naunawaan mo ang briefing. Hindi ito sertipikasyon o pahintulot para sa opisyal na pagtatasa. Maaari mong balikan ang briefing at paglilibot anumang oras.', 'This records that you understood the briefing. It is not certification or permission for official assessment. You can revisit the briefing and walkthrough at any time.')}</p>
    {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
    {error && <button type="button" className={`${button} mt-3`} disabled={busy} onClick={() => window.location.reload()}>{text('I-reload ang briefing', 'Reload briefing')}</button>}
    {!state ? <div className="mt-4">
      <p>{text('Hindi pa makumpirma ang iyong acknowledgement status. Maaari mo pa ring basahin ang briefing at ulitin ang paglilibot.', 'Your acknowledgement status could not be confirmed. You can still read the briefing and replay the walkthrough.')}</p>
      <button type="button" className={`${button} mt-3`} disabled={busy} onClick={() => void request(false)}>{text('Tingnan muli ang status', 'Check status again')}</button>
    </div> : state.acknowledgedAt ? <div className="mt-4">
      <p role="status" className="font-medium">{text('Naitala na ang iyong pagkilala sa kasalukuyang briefing. Hindi mo kailangang ulitin ito.', 'Your acknowledgement of the current briefing is recorded. You do not need to repeat it.')}</p>
      <Link prefetch={false} href={chapterHref} className={`${button} mt-3 inline-flex items-center`}>{text('Magpatuloy sa aking pag-aaral sa Kabanata 1', 'Continue my Chapter 1 study')}</Link>
    </div> : <form onSubmit={submit} className="mt-4 space-y-3">
      <label htmlFor={`${id}-confirm`} className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
        <input id={`${id}-confirm`} type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} className="mt-1 size-5 shrink-0 accent-primary"/>
        <span>{text('Naunawaan ko ang mga layunin, dalawang responsibilidad, paghahanda at sertipikasyon, at ang pagkakaiba ng practice at pormal na pagtatasa. Nakita ko rin kung saan gagamitin ang platform sa paglilibot.', 'I understand the objectives, both responsibilities, preparation and certification, and the distinction between practice and formal assessment. I have also reviewed where to use the platform in the walkthrough.')}</span>
      </label>
      <button type="submit" className={button} disabled={busy || !confirmed}>{busy ? text('Sine-save…', 'Saving…') : text('Itala ang aking pagkilala', 'Save my acknowledgement')}</button>
      {error && <button type="button" className={`${button} ml-0 sm:ml-3`} disabled={busy} onClick={() => void request(false)}>{text('Tingnan muli ang status', 'Check status again')}</button>}
    </form>}
  </section>;
}
