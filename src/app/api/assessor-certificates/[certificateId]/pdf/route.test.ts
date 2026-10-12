// @vitest-environment node
import {NextRequest} from 'next/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Certificate} from '@/lib/assessor/certifications';
const mocks = vi.hoisted(() => ({viewer: vi.fn(), flags: vi.fn(), rpc: vi.fn(), renderer: vi.fn()}));
vi.mock('@/lib/auth/viewer', () => ({getViewer: mocks.viewer}));
vi.mock('@/lib/supabase/request', () => ({getRequestFeatureFlags: mocks.flags}));
vi.mock('@/lib/supabase/server', () => ({createClient: async () => ({rpc: mocks.rpc})}));
vi.mock('next-intl/server', () => ({getLocale: async () => 'en'}));
vi.mock('@/lib/assessor/certificate-pdf', () => ({renderAssessorCertificatePdf: mocks.renderer}));
const {GET} = await import('./route');
const id = '00000000-0000-4000-8000-000000000001';
const c: Certificate = {certificateId: id, programId: 'p', chapterKey: 'chapter-1', issuedAt: '2026-10-12', status: 'revoked', currentPermission: false, displayVersion: 1,
  holderName: 'Fictional Peña', titleFil: 'Kabanata 1', titleEn: 'Chapter 1', issuerOrganization: 'LOCAL TEST ONLY', issuerSignatory: 'Fixture', issuerTitle: 'Fixture issuer'};
const download = (certificateId = id) => GET(new NextRequest(`https://example.test/api/assessor-certificates/${certificateId}/pdf`), {params: Promise.resolve({certificateId})});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.viewer.mockResolvedValue({appUser: {role: 'assessor', status: 'active'}, role: 'assessor', isPreview: false});
  mocks.flags.mockResolvedValue({elearning: true});
  mocks.rpc.mockResolvedValue({data: c, error: null});
  mocks.renderer.mockResolvedValue(new TextEncoder().encode('%PDF-fixture'));
});
describe('owner certificate PDF boundary', () => {
  it('returns private bytes and filename with the same certificate ID and distinct verification URL', async () => {
    const r = await download();
    expect(r.status).toBe(200);expect(r.headers.get('Content-Type')).toBe('application/pdf');
    expect(r.headers.get('Cache-Control')).toBe('private, no-store');
    expect(r.headers.get('Content-Disposition')).toContain(id);
    expect(await r.text()).toBe('%PDF-fixture');
    expect(mocks.renderer).toHaveBeenCalledWith(c, true, `https://example.test/certificates/assessor/${id}`);
    expect(mocks.rpc.mock.calls).toEqual([['rpc_assessor_certificate_owner', {p_certificate_id: id}]]);
  });
  it('rejects anonymous, preview, non-assessor and inactive viewers before certificate reads', async () => {
    const viewers = [{appUser: null}, {appUser: {role: 'assessor', status: 'active'}, role: 'assessor', isPreview: true},
      {appUser: {role: 'admin', status: 'active'}, role: 'assessor', isPreview: true}, {appUser: {role: 'assessor', status: 'deactivated'}, role: 'assessor', isPreview: false}];
    for (const viewer of viewers) {mocks.viewer.mockResolvedValue(viewer);expect([401, 403]).toContain((await download()).status);}
    expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.renderer).not.toHaveBeenCalled();
  });
  it('keeps malformed, foreign, read error and absent snapshot distinct', async () => {
    expect((await download('SAMPLE')).status).toBe(404);expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({data: null, error: null});expect((await download()).status).toBe(404);
    mocks.rpc.mockResolvedValue({data: null, error: {message: 'failed'}});expect((await download()).status).toBe(503);
    mocks.rpc.mockResolvedValue({data: {...c, displayVersion: null}, error: null});expect((await download()).status).toBe(409);
    expect(mocks.renderer).not.toHaveBeenCalled();
  });
  it('renderer failure leaves earned data intact and never calls recovery or issuance', async () => {
    mocks.renderer.mockRejectedValue(new Error('render failed'));
    expect((await download()).status).toBe(503);
    expect(mocks.rpc.mock.calls).toEqual([['rpc_assessor_certificate_owner', {p_certificate_id: id}]]);
    expect(c.status).toBe('revoked');expect(c.certificateId).toBe(id);
  });
});
