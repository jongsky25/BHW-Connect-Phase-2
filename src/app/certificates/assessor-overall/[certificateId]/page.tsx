import {getLocale} from 'next-intl/server';
import {createClient} from '@/lib/supabase/server';
import {CERTIFICATE_ID, overallStatusText, type PublicOverallCertificate} from '@/lib/assessor/overall-certifications';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function OverallCertificateVerifyPage({params}: {params: Promise<{certificateId: string}>}) {
  const [{certificateId}, locale] = await Promise.all([params, getLocale()]);
  const en = locale === 'en';
  const text = (fil: string, english: string) => en ? english : fil;
  let c: PublicOverallCertificate | null = null;
  let failed = false;
  if (CERTIFICATE_ID.test(certificateId)) {
    const db = await createClient();
    const {data, error} = await db.rpc('rpc_assessor_overall_certificate_verify', {p_certificate_id: certificateId});
    failed = !!error;
    c = data as PublicOverallCertificate | null;
  }
  return <section aria-labelledby="overall-verification-title" className="mx-auto w-full max-w-xl space-y-4 px-4 py-16">
    <h1 id="overall-verification-title" className="text-2xl font-semibold">{text('Verification ng pangkalahatang sertipiko', 'Overall certificate verification')}</h1>
    {failed ? <p role="alert">{text('Hindi mabasa ang katayuan ngayon. Subukan muli.', 'Status could not be read. Try again.')}</p> : c?.available === false ?
      <p>{text('Hindi pa available ang pampublikong verification.', 'Public verification is not yet available.')}</p> : c?.found ?
      <div className="space-y-3 rounded-xl border border-ink/20 p-5">
        <h2 className="break-words text-lg font-semibold">{en ? c.programTitleEn : c.programTitleFil}</h2>
        <p>{text('Tagatasa/tagapagpadaloy · Kabanata 1, 2 at 3', 'Assessor/facilitator · Chapters 1, 2 and 3')}</p>
        <p>{text('Kasalukuyang katayuan', 'Current status')}: {overallStatusText(c.status, en)}</p>
        <p>{text('Ibinigay noong', 'Issued')}: {new Date(c.issuedAt).toLocaleDateString(en ? 'en-PH' : 'fil-PH')}</p>
        <p className="break-words">{text('Organisasyong nagbigay', 'Issuing organization')}: {c.issuerOrganization}</p>
        <p className="break-all text-sm">Certificate ID: {c.certificateId}</p>
        <p>{text('Tala ito ng pagkamit sa programang ito. Hindi ito panlabas na akreditasyon o kasalukuyang pahintulot sa alinmang kabanata o saklaw.',
          'This records achievement in this program. It is not external accreditation or current authority in any chapter or catchment.')}</p>
      </div> : <p>{text('Walang nakitang pangkalahatang sertipiko para sa ID na ito.', 'No overall certificate was found for this ID.')}</p>}
  </section>;
}
