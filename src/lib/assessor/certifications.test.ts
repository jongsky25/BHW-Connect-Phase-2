import {describe, expect, it} from 'vitest';
import {CERTIFICATE_ID, certificationCardStatus, certificateOutputReady, verificationPath, type AwardSummary, type Certificate} from './certifications';
const award: AwardSummary = {certificateId: '00000000-0000-4000-8000-000000000001', issuedAt: '2026-10-12T00:00:00Z', status: 'active', requirementsVersion: 'chapter-1:v1', outputAvailable: true};
describe('My certifications projection', () => {
  it('separates read failure, missing publication and incomplete evidence', () => {
    expect(certificationCardStatus('chapter-1', true, true, [])).toBe('read_failed');
    expect(certificationCardStatus('chapter-1', false, false, [])).toBe('unavailable');
    expect(certificationCardStatus('chapter-1', true, false, [])).toBe('in_progress');
    expect(certificationCardStatus('chapter-3', true, false, [award])).toBe('certified');
  });
  it('preserves historical lifecycle when current content is unavailable', () => {
    for (const status of ['active', 'suspended', 'revoked', 'update_required'] as const)
      expect(certificationCardStatus('chapter-1', false, false, [{...award, status}])).toBe(status === 'active' ? 'certified' : status);
  });
  it('rejects sample and malformed identity and incomplete output without replacing the award', () => {
    for (const id of ['SAMPLE', 'maria', '1234', `${award.certificateId}/pdf`, '']) expect(CERTIFICATE_ID.test(id)).toBe(false);
    expect(CERTIFICATE_ID.test(award.certificateId)).toBe(true);
    expect(verificationPath(award.certificateId)).toBe(`/certificates/assessor/${award.certificateId}`);
    expect(certificateOutputReady({displayVersion: null} as Certificate)).toBe(false);
  });
});
