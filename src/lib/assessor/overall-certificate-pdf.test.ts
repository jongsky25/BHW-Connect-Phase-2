// @vitest-environment node
import {PDFDocument} from 'pdf-lib';
import {describe, expect, it} from 'vitest';
import {renderOverallCertificatePdf} from './overall-certificate-pdf';
import {overallVerificationPath, type OverallCertificate} from './overall-certifications';

const id = '00000000-0000-4000-8000-000000000001';
const c: OverallCertificate = {certificateId: id, programId: 'program', ruleVersion: 'rule-v1', issuedAt: '2026-10-12T00:00:00Z',
  status: 'suspended', currentPermission: false, displayVersion: 1, holderName: 'Fictional Peña — Élise ' + 'LongName'.repeat(25),
  programTitleFil: 'Manwal ng BHW — Mga Kabanata 1, 2 at 3', programTitleEn: 'BHW Manual — Chapters 1, 2 and 3',
  issuerOrganization: 'LOCAL TEST ONLY', issuerSignatory: 'Fixture signatory', issuerTitle: 'Fixture issuer ' + 'long title '.repeat(70),
  sources: [1, 2, 3].map(n => ({chapterKey: `chapter-${n}` as 'chapter-1' | 'chapter-2' | 'chapter-3',
    sourceType: n === 1 ? 'combined' as const : 'legacy' as const, sourceId: id, chapterCertificateId: n === 1 ? id : null, status: 'active'}))};

describe('overall certificate PDF', () => {
  for (const en of [true, false]) it(`renders a bilingual, status-bearing PDF (${en})`, async () => {
    const before = structuredClone(c);
    const bytes = await renderOverallCertificatePdf(c, en, `https://example.test${overallVerificationPath(id)}`);
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.getSubject()).toContain(id);
    expect(c).toEqual(before);
  });
  it('does not fabricate a missing historical snapshot', async () => {
    await expect(renderOverallCertificatePdf({...c, displayVersion: null}, true, 'https://example.test')).rejects.toThrow('display unavailable');
  });
});
