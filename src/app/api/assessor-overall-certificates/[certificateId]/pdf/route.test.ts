// @vitest-environment node
import {NextRequest} from 'next/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {OverallCertificate} from '@/lib/assessor/overall-certifications';

const mocks = vi.hoisted(() => ({viewer: vi.fn(), flags: vi.fn(), rpc: vi.fn(), renderer: vi.fn()}));
vi.mock('@/lib/auth/viewer', () => ({getViewer: mocks.viewer}));
vi.mock('@/lib/supabase/request', () => ({getRequestFeatureFlags: mocks.flags}));
vi.mock('@/lib/supabase/server', () => ({createClient: async () => ({rpc: mocks.rpc})}));
vi.mock('next-intl/server', () => ({getLocale: async () => 'en'}));
vi.mock('@/lib/assessor/overall-certificate-pdf', () => ({renderOverallCertificatePdf: mocks.renderer}));
const {GET} = await import('./route');
const id = '00000000-0000-4000-8000-000000000001';
const c: OverallCertificate = {certificateId: id, programId: 'p', ruleVersion: 'v1', issuedAt: '2026-10-12', status: 'revoked',
  currentPermission: false, displayVersion: 1, holderName: 'Fictional Peña', programTitleFil: 'Manwal', programTitleEn: 'Manual',
  issuerOrganization: 'LOCAL TEST ONLY', issuerSignatory: 'Fixture', issuerTitle: 'Fixture issuer',
  sources: [1, 2, 3].map(n => ({chapterKey: `chapter-${n}` as 'chapter-1' | 'chapter-2' | 'chapter-3',
    sourceType: 'legacy' as const, sourceId: id, chapterCertificateId: null, status: 'active'}))};
const download = (certificateId = id) => GET(new NextRequest(`https://example.test/api/assessor-overall-certificates/${certificateId}/pdf`), {params: Promise.resolve({certificateId})});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.viewer.mockResolvedValue({appUser: {role: 'assessor', status: 'active'}, role: 'assessor', isPreview: false});
  mocks.flags.mockResolvedValue({elearning: true});
  mocks.rpc.mockResolvedValue({data: c, error: null});
  mocks.renderer.mockResolvedValue(new TextEncoder().encode('%PDF-fixture'));
});
describe('overall PDF owner boundary', () => {
  it('returns private PDF and reads only the owner certificate', async () => {
    const response = await download();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.text()).toBe('%PDF-fixture');
    expect(mocks.renderer).toHaveBeenCalledWith(c, true, `https://example.test/certificates/assessor-overall/${id}`);
    expect(mocks.rpc.mock.calls).toEqual([['rpc_assessor_overall_certificate_owner', {p_certificate_id: id}]]);
  });
  it('rejects unauthorized viewers before reading and keeps absent snapshots unavailable', async () => {
    mocks.viewer.mockResolvedValue({appUser: null});
    expect((await download()).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.viewer.mockResolvedValue({appUser: {role: 'assessor', status: 'active'}, role: 'assessor', isPreview: false});
    mocks.rpc.mockResolvedValue({data: {...c, displayVersion: null}, error: null});
    expect((await download()).status).toBe(409);
    expect(mocks.renderer).not.toHaveBeenCalled();
  });
});
