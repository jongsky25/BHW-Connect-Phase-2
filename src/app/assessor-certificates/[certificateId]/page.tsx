import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {getLocale} from 'next-intl/server';
import {createClient} from '@/lib/supabase/server';
import {getViewer} from '@/lib/auth/viewer';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {CERTIFICATE_ID, certificateOutputReady, certificateStatusText, verificationPath, type Certificate} from '@/lib/assessor/certifications';
import {AssessorCertificatePrint} from '@/components/elearning/assessor-certificate-print';

export const dynamic = 'force-dynamic';
export default async function AssessorCertificatePage({params}: {params: Promise<{certificateId: string}>}) {
  const [{certificateId}, viewer, flags, locale] = await Promise.all([params, getViewer(), getRequestFeatureFlags(), getLocale()]);
  if (!viewer.appUser || viewer.appUser.status !== 'active') redirect('/login');
  if (!flags.elearning || viewer.role !== 'assessor' || viewer.appUser.role !== 'assessor' || viewer.isPreview) redirect('/home');
  if (!CERTIFICATE_ID.test(certificateId)) notFound();
  const db = await createClient();
  const {data, error} = await db.rpc('rpc_assessor_certificate_owner', {p_certificate_id: certificateId});
  if (error) throw new Error('Unable to read certificate');
  if (!data) notFound();
  const c = data as Certificate;
  const en = locale === 'en';
  const text = (fil: string, english: string) => en ? english : fil;
  const ready = certificateOutputReady(c);
  return <section data-assessor-certificate aria-labelledby="assessor-certificate-title" className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
    <div className="assessor-certificate-actions flex flex-wrap gap-4">
      <Link prefetch={false} href={`/training/${c.programId}/assessor/qualifications`} className="py-3 underline">{text('Aking mga sertipikasyon', 'My certifications')}</Link>
      {ready && <><AssessorCertificatePrint en={en}/><a href={`/api/assessor-certificates/${certificateId}/pdf`} className="rounded bg-primary px-4 py-3 text-on-primary">{text('I-download ang PDF', 'Download PDF')}</a></>}
    </div>
    <article className="assessor-certificate-document space-y-5 rounded-xl border border-ink/20 p-6 sm:p-10">
      <p className="text-sm font-semibold">{text('Sertipiko ng pagkamit', 'Certificate of achievement')}</p>
      <h1 id="assessor-certificate-title" className="break-words text-2xl font-semibold">{ready ? en ? c.titleEn : c.titleFil : text('BHW Reference Manual — Tagatasa/Tagapagpadaloy, Kabanata 1', 'BHW Reference Manual — Assessor/Facilitator, Chapter 1')}</h1>
      {ready ? <>
        <p className="break-words text-2xl font-medium">{c.holderName}</p>
        <p>{text('Ibinigay noong', 'Issued')}: {new Date(c.issuedAt).toLocaleDateString(en ? 'en-PH' : 'fil-PH')}</p>
        <div className="break-words"><p>{text('Nagbigay', 'Issuer')}: {c.issuerOrganization}</p><p>{c.issuerSignatory} · {c.issuerTitle}</p></div>
      </> : <p role="status">{text('Napanatili ang iyong pagkamit at certificate ID. Hindi pa available ang mga detalye ng sertipiko; walang bagong award na ibibigay sa pagtingin o pag-download.', 'Your achievement and certificate ID are retained. Certificate details are not yet available; viewing or downloading does not issue another award.')}</p>}
      <p className="break-all text-sm">{text('Certificate ID', 'Certificate ID')}: {certificateId}</p>
      <p className="font-semibold">{text('Kasalukuyang katayuan', 'Current status')}: {certificateStatusText(c.status, en)}</p>
      <p>{text('Kabanata 1 lamang. Ang dokumentong ito ay tala ng pagkamit at hindi nagbibigay ng kasalukuyang pahintulot sa pagtatasa o pagpapadaloy. Tingnan ang kasalukuyang katayuan sa verification link.', 'Chapter 1 only. This document records achievement and does not grant current assessment or facilitation authority. Check current status at the verification link.')}</p>
      <Link prefetch={false} href={verificationPath(certificateId)} className="block break-all underline">{text('Kasalukuyang verification', 'Current verification')}: {verificationPath(certificateId)}</Link>
      <p className="text-sm">{text('Maaaring hindi pa available ang pampublikong verification habang hinihintay ang pag-apruba sa disclosure.', 'Public verification may be unavailable pending disclosure approval.')}</p>
    </article>
  </section>;
}
