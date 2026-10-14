export const CERTIFICATE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const CHAPTERS = ['chapter-1', 'chapter-2', 'chapter-3'] as const;
export type CertificateStatus = 'active' | 'suspended' | 'revoked' | 'update_required';
export type AwardSummary = {certificateId: string; issuedAt: string; status: CertificateStatus; requirementsVersion: string; outputAvailable: boolean};
export type LegacySummary = {id: string; status: 'active' | 'suspended' | 'revoked'; issuedAt: string; curriculumVersion: string; orientationVersion: string};
export type ChapterCertifications = {chapterKey: string; publicationAvailable: boolean; revisedPath: boolean; awards: AwardSummary[]; legacy: LegacySummary[]};
export type Certificate = {
  certificateId: string; programId: string; chapterKey: 'chapter-1'; issuedAt: string;
  status: CertificateStatus; currentPermission: false; displayVersion: 1 | null;
  holderName: string | null; titleFil: string | null; titleEn: string | null;
  issuerOrganization: string | null; issuerSignatory: string | null; issuerTitle: string | null;
};
export type PublicCertificate = Pick<Certificate, 'certificateId' | 'chapterKey' | 'issuedAt' | 'status' | 'titleFil' | 'titleEn' | 'issuerOrganization' | 'currentPermission'> & {
  available: boolean; found: boolean; certificateType: 'assessor_facilitator_chapter';
};
export type CertificationCardStatus = 'certified' | 'in_progress' | 'unavailable' | 'read_failed' | 'update_required' | 'suspended' | 'revoked';
export function certificationCardStatus(chapterKey: string, published: boolean, readFailed: boolean, awards: AwardSummary[]): CertificationCardStatus {
  if (readFailed) return 'read_failed';
  const latest = awards[0];
  if (latest) return latest.status === 'active' ? 'certified' : latest.status;
  return published ? 'in_progress' : 'unavailable';
}
export function certificateStatusText(status: CertificateStatus, en: boolean) {
  return ({active: ['Aktibong tala ng pagkamit', 'Active achievement record'], suspended: ['Sinuspinde', 'Suspended'], revoked: ['Binawi', 'Revoked'], update_required: ['Kailangan ng pag-update', 'Update required']} as const)[status][en ? 1 : 0];
}
export function verificationPath(id: string) {return `/certificates/assessor/${id}`;}
export function certificateOutputReady(c: Certificate): boolean {
  return c.displayVersion === 1 && [c.holderName, c.titleFil, c.titleEn, c.issuerOrganization, c.issuerSignatory, c.issuerTitle].every(v => typeof v === 'string' && v.trim().length > 0);
}
