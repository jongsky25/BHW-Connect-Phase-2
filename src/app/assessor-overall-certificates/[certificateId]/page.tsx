import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {getLocale} from 'next-intl/server';
import {createClient} from '@/lib/supabase/server';
import {getViewer} from '@/lib/auth/viewer';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {AssessorCertificatePrint} from '@/components/elearning/assessor-certificate-print';
import {CERTIFICATE_ID, overallCertificateReady, overallStatusText, overallVerificationPath, type OverallCertificate} from '@/lib/assessor/overall-certifications';

export const dynamic = 'force-dynamic';
export default async function OverallCertificatePage({params}: {params: Promise<{certificateId: string}>}) {
  const [{certificateId}, viewer, flags, locale] = await Promise.all([params, getViewer(), getRequestFeatureFlags(), getLocale()]);
  if (!viewer.appUser || viewer.appUser.status !== 'active') redirect('/login');
  if (!flags.elearning || viewer.role !== 'assessor' || viewer.appUser.role !== 'assessor' || viewer.isPreview) redirect('/home');
  if (!CERTIFICATE_ID.test(certificateId)) notFound();
  const db = await createClient();
  const {data, error} = await db.rpc('rpc_assessor_overall_certificate_owner', {p_certificate_id: certificateId});
  if (error) throw new Error('Unable to read overall certificate');
  if (!data) notFound();
  const c = data as OverallCertificate;
  const en = locale === 'en';
  const text = (fil: string, english: string) => en ? english : fil;
  const ready = overallCertificateReady(c);
  return <section aria-labelledby="overall-certificate-title" className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
    <div className="assessor-certificate-actions flex flex-wrap gap-4">
      <Link prefetch={false} href={`/training/${c.programId}/assessor/qualifications`} className="py-3 underline">{text('Aking mga sertipikasyon', 'My certifications')}</Link>
      {ready && <><AssessorCertificatePrint en={en}/><a href={`/api/assessor-overall-certificates/${certificateId}/pdf`} className="rounded bg-primary px-4 py-3 text-on-primary">{text('I-download ang PDF', 'Download PDF')}</a></>}
    </div>
    <article className="assessor-certificate-document space-y-5 rounded-xl border border-ink/20 p-6 sm:p-10">
      <p className="text-sm font-semibold">{text('Pangkalahatang sertipiko ng pagkamit', 'Overall certificate of achievement')}</p>
      <h1 id="overall-certificate-title" className="break-words text-2xl font-semibold">{ready ? en ? c.programTitleEn : c.programTitleFil : text('Pangkalahatang sertipiko ng tagatasa/tagapagpadaloy', 'Overall assessor/facilitator certificate')}</h1>
      <p>{text('Kabanata 1, 2 at 3', 'Chapters 1, 2 and 3')}</p>
      {ready ? <><p className="break-words text-2xl font-medium">{c.holderName}</p>
        <p>{text('Ibinigay noong', 'Issued')}: {new Date(c.issuedAt).toLocaleDateString(en ? 'en-PH' : 'fil-PH')}</p>
        <p className="break-words">{text('Nagbigay', 'Issuer')}: {c.issuerOrganization}<br/>{c.issuerSignatory} · {c.issuerTitle}</p></> :
        <p role="status">{text('Napanatili ang award at certificate ID. Hindi pa available ang aprubadong display; walang bagong award na ibibigay sa pagtingin.',
          'The award and certificate ID are retained. Approved display details are unavailable; viewing does not issue another award.')}</p>}
      <p className="break-all text-sm">Certificate ID: {c.certificateId}</p>
      <p className="font-semibold">{text('Kasalukuyang katayuan', 'Current status')}: {overallStatusText(c.status, en)}</p>
      <div><h2 className="font-semibold">{text('Mga pinagbatayang kabanata', 'Source chapter records')}</h2>
        <ul className="mt-2 space-y-2">{c.sources.map(source => <li key={source.chapterKey} className="break-words">
          <Link prefetch={false} className="underline" href={source.chapterCertificateId ? `/assessor-certificates/${source.chapterCertificateId}` : `/training/${c.programId}/assessor/qualifications#${source.chapterKey}`}>
            {text('Kabanata', 'Chapter')} {source.chapterKey.slice(-1)}
          </Link> · {source.sourceType === 'legacy' ? text('Naunang kwalipikasyon', 'Legacy qualification') : text('Sertipiko ng kabanata', 'Chapter certificate')} · {source.status}
          <span className="block break-all text-xs">{source.sourceId}</span>
        </li>)}</ul>
      </div>
      <p>{text('Tala ito ng pagkamit sa tatlong kabanata ng programang ito. Hindi ito panlabas na akreditasyon at hindi nagbibigay ng kasalukuyang pahintulot sa alinmang kabanata o saklaw.',
        'This records achievement across this program’s three chapters. It is not external accreditation and does not grant current authority in any chapter or catchment.')}</p>
      <Link prefetch={false} href={overallVerificationPath(certificateId)} className="block break-all underline">{text('Kasalukuyang verification', 'Current verification')}: {overallVerificationPath(certificateId)}</Link>
      <p className="text-sm">{text('Maaaring hindi pa available ang pampublikong verification habang hinihintay ang pag-apruba sa disclosure.', 'Public verification may be unavailable pending disclosure approval.')}</p>
    </article>
  </section>;
}
