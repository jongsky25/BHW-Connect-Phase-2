import {NextResponse, type NextRequest} from 'next/server';
import {getLocale} from 'next-intl/server';
import {getViewer} from '@/lib/auth/viewer';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';
import {CERTIFICATE_ID, certificateOutputReady, verificationPath, type Certificate} from '@/lib/assessor/certifications';
import {renderAssessorCertificatePdf} from '@/lib/assessor/certificate-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'};
export async function GET(request: NextRequest, {params}: {params: Promise<{certificateId: string}>}) {
  const [{certificateId}, viewer, flags, locale] = await Promise.all([params, getViewer(), getRequestFeatureFlags(), getLocale()]);
  if (!viewer.appUser) return NextResponse.json({error: 'unauthorized'}, {status: 401, headers});
  if (viewer.appUser.status !== 'active' || viewer.appUser.role !== 'assessor' || viewer.role !== 'assessor' || viewer.isPreview || !flags.elearning)
    return NextResponse.json({error: 'forbidden'}, {status: 403, headers});
  if (!CERTIFICATE_ID.test(certificateId)) return NextResponse.json({error: 'not found'}, {status: 404, headers});
  const db = await createClient();
  const {data, error} = await db.rpc('rpc_assessor_certificate_owner', {p_certificate_id: certificateId});
  if (error) return NextResponse.json({error: 'certificate read unavailable'}, {status: 503, headers});
  if (!data) return NextResponse.json({error: 'not found'}, {status: 404, headers});
  const c = data as Certificate;
  if (!certificateOutputReady(c)) return NextResponse.json({error: 'certificate display unavailable'}, {status: 409, headers});
  try {
    const bytes = await renderAssessorCertificatePdf(c, locale === 'en', new URL(verificationPath(certificateId), request.nextUrl.origin).toString());
    return new NextResponse(Buffer.from(bytes), {headers: {...headers, 'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="assessor-chapter-1-${certificateId}.pdf"`}});
  } catch {
    // Output failure never performs recovery/issuance or rewrites earned evidence.
    return NextResponse.json({error: 'certificate rendering unavailable'}, {status: 503, headers});
  }
}
