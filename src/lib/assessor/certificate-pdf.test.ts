// @vitest-environment node
import {PDFDocument} from 'pdf-lib';
import {describe, expect, it} from 'vitest';
import {renderAssessorCertificatePdf} from './certificate-pdf';
import {verificationPath, type Certificate} from './certifications';
const c: Certificate = {certificateId: '00000000-0000-4000-8000-000000000001', programId: 'program', chapterKey: 'chapter-1', issuedAt: '2026-10-12T00:00:00Z',
  status: 'suspended', currentPermission: false, displayVersion: 1, holderName: 'Fictional Peña — Élise ' + 'LongName'.repeat(25),
  titleFil: 'BHW Reference Manual — Tagatasa/Tagapagpadaloy, Kabanata 1', titleEn: 'BHW Reference Manual — Assessor/Facilitator, Chapter 1',
  issuerOrganization: 'LOCAL TEST ONLY', issuerSignatory: 'Fixture signatory', issuerTitle: 'Fixture issuer ' + 'long title '.repeat(70)};
describe('earned certificate PDF', () => {
  for (const en of [true, false]) it(`renders readable PDF with Unicode, long fields, preserved ID and scoped metadata (${en})`, async () => {
    const before = structuredClone(c);
    const bytes = await renderAssessorCertificatePdf(c, en, `https://example.test${verificationPath(c.certificateId)}`);
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.getTitle()).toBe(en ? c.titleEn : c.titleFil);
    expect(pdf.getSubject()).toContain(c.certificateId);
    expect(c).toEqual(before);
  });
  it('fails safely on missing historical display without changing the award', async () => {
    const old = {...c, displayVersion: null, holderName: null};
    await expect(renderAssessorCertificatePdf(old, true, 'https://example.test')).rejects.toThrow('display unavailable');
    expect(old.certificateId).toBe(c.certificateId);
  });
});
