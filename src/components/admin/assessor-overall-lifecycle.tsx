'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState, type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import {overallStatusText, type OverallStatus} from '@/lib/assessor/overall-certifications';

export type OverallAwardRow = {id: string; certificateId: string; name: string; status: 'active' | 'suspended' | 'revoked';
  currentStatus: OverallStatus; issuedAt: string; statusChangedAt: string | null};

export function AssessorOverallLifecycle({rows, mutationEnabled, page, locale}: {rows: OverallAwardRow[]; mutationEnabled: boolean; page: number; locale: string}) {
  const en = locale === 'en';
  const t = (fil: string, english: string) => en ? english : fil;
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function change(event: FormEvent<HTMLFormElement>, row: OverallAwardRow) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const status = String(data.get('status') ?? '');
    const reason = String(data.get('reason') ?? '').trim();
    if (reason.length < 10 || reason.length > 1000) {setError(t('Kailangan ng 10–1,000 titik na dahilan.', 'Reason must be 10–1,000 characters.')); return;}
    setPending(row.id); setError(null);
    const {error: failure} = await createClient().rpc('rpc_admin_assessor_overall_award_set_status', {
      p_award_id: row.id, p_expected_status: row.status, p_expected_changed_at: row.statusChangedAt,
      p_status: status, p_reason: reason,
    });
    if (failure) setError(t('Hindi nabago ang award. I-refresh at suriin ang katayuan, saklaw at patakaran.', 'Award unchanged. Refresh and check status, scope and policy.'));
    else router.refresh();
    setPending(null);
  }
  return <section aria-labelledby="overall-awards" className="space-y-4">
    <h2 id="overall-awards" className="text-xl font-semibold">{t('Pangkalahatang mga award', 'Overall awards')}</h2>
    {!mutationEnabled && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{t('Hindi pa aktibo ang pagbabago ng katayuan habang hinihintay ang patakaran sa lifecycle.', 'Status changes are disabled pending lifecycle policy approval.')}</p>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    {!rows.length && <p>{t('Wala pang pangkalahatang award sa iyong saklaw.', 'No overall awards in your scope yet.')}</p>}
    {rows.map(row => <article key={row.id} className="rounded-xl border border-ink/15 p-4">
      <h3 className="font-semibold">{row.name}</h3>
      <p className="text-sm">{t('Kasalukuyang katayuan', 'Current status')}: {overallStatusText(row.currentStatus, en)} · {t('Ibinigay', 'Issued')}: {new Date(row.issuedAt).toLocaleDateString(en ? 'en-PH' : 'fil-PH')}</p>
      <p className="break-all text-xs">Certificate ID: {row.certificateId}</p>
      {mutationEnabled && row.status !== 'revoked' && <form onSubmit={event => change(event, row)} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-col text-sm">{t('Bagong katayuan', 'New status')}<select name="status" required defaultValue="" className="min-h-11 rounded border px-2">
          <option value="" disabled>{t('Pumili', 'Choose')}</option>
          {row.status === 'active' ? <><option value="suspended">{t('Sinuspinde', 'Suspend')}</option><option value="revoked">{t('Binawi', 'Revoke')}</option></> : <><option value="active">{t('Ibalik', 'Restore')}</option><option value="revoked">{t('Binawi', 'Revoke')}</option></>}
        </select></label>
        <label className="flex flex-1 flex-col text-sm">{t('Dahilan', 'Reason')}<input name="reason" required minLength={10} maxLength={1000} className="min-h-11 rounded border px-2"/></label>
        <button disabled={pending === row.id} className="min-h-11 rounded bg-primary px-4 text-on-primary disabled:opacity-60">{t('I-save', 'Save')}</button>
      </form>}
    </article>)}
    <nav className="flex gap-4 text-sm" aria-label={t('Mga pahina ng pangkalahatang award', 'Overall award pages')}>
      {page > 1 && <Link className="underline" prefetch={false} href={`?overallPage=${page - 1}`}>{t('Nakaraan', 'Previous')}</Link>}
      {rows.length === 30 && <Link className="underline" prefetch={false} href={`?overallPage=${page + 1}`}>{t('Susunod', 'Next')}</Link>}
    </nav>
  </section>;
}
