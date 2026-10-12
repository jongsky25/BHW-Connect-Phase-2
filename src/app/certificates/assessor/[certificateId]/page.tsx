import {getLocale} from 'next-intl/server';
import {createClient} from '@/lib/supabase/server';
import {CERTIFICATE_ID, certificateStatusText, type PublicCertificate} from '@/lib/assessor/certifications';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function AssessorCertificateVerifyPage({params}: {params: Promise<{certificateId: string}>}) {
  const [{certificateId}, locale] = await Promise.all([params, getLocale()]);
  const en = locale === 'en';
  const text = (fil: string, english: string) => en ? english : fil;
  let c: PublicCertificate | null = null;
  let failed = false;
  if (CERTIFICATE_ID.test(certificateId)) {
    const db = await createClient();
    const {data, error} = await db.rpc('rpc_assessor_certificate_verify', {p_certificate_id: certificateId});
    failed = !!error;
    c = data as PublicCertificate | null;
  }
  return <section aria-labelledby="assessor-verification-title" className="mx-auto w-full max-w-xl space-y-4 px-4 py-16">
    <h1 id="assessor-verification-title" className="text-2xl font-semibold">{text('Verification ng sertipiko ng tagatasa/tagapagpadaloy', 'Assessor/facilitator certificate verification')}</h1>
    {failed ? <p role="alert">{text('Hindi mabasa ang katayuan ngayon. Subukan muli.', 'Status could not be read. Try again.')}</p> : c?.available === false ?
      <p>{text('Hindi pa available ang pampublikong verification.', 'Public verification is not yet available.')}</p> : c?.found ? <div className="space-y-3 rounded-xl border border-ink/20 p-5">
        <h2 className="break-words text-lg font-semibold">{en ? c.titleEn : c.titleFil}</h2>
        <p>{text('Kasalukuyang katayuan', 'Current status')}: {certificateStatusText(c.status, en)}</p>
        <p>{text('Ibinigay noong', 'Issued')}: {new Date(c.issuedAt).toLocaleDateString(en ? 'en-PH' : 'fil-PH')}</p>
        <p className="break-words">{text('Organisasyong nagbigay', 'Issuing organization')}: {c.issuerOrganization}</p>
        <p className="break-all text-sm">Certificate ID: {c.certificateId}</p>
        <p>{text('Kabanata 1 lamang. Ang pagkamit ay hiwalay sa kasalukuyang pahintulot na magtasa o magpadaloy.', 'Chapter 1 only. Achievement is separate from current authority to assess or facilitate.')}</p>
      </div> : <p>{text('Walang nakitang sertipiko ng tagatasa/tagapagpadaloy para sa ID na ito.', 'No assessor/facilitator certificate was found for this ID.')}</p>}
  </section>;
}
