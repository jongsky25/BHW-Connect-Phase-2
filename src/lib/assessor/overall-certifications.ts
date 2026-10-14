import {CERTIFICATE_ID} from './certifications';

export {CERTIFICATE_ID};
export type OverallStatus = 'active' | 'suspended' | 'revoked' | 'update_required' | 'unavailable' | 'incomplete';
export type OverallSource = {chapterKey: 'chapter-1' | 'chapter-2' | 'chapter-3'; sourceType: 'combined' | 'legacy';
  sourceId: string; chapterCertificateId: string | null; status: string};
export type OverallCertificate = {certificateId: string; programId: string; ruleVersion: string; issuedAt: string;
  status: OverallStatus; currentPermission: false; displayVersion: 1 | null; holderName: string | null;
  programTitleFil: string | null; programTitleEn: string | null; issuerOrganization: string | null;
  issuerSignatory: string | null; issuerTitle: string | null; sources: OverallSource[]};
export type PublicOverallCertificate = Pick<OverallCertificate, 'certificateId' | 'issuedAt' | 'status' |
  'programTitleFil' | 'programTitleEn' | 'issuerOrganization' | 'currentPermission'> & {
  available: boolean; found: boolean; certificateType: 'assessor_facilitator_overall'; chapterKeys: string[]};
export type OverallProgress = {ruleAvailable: boolean; qualifiedCount: number; requiredCount: 3; nextStep: string | null;
  chapters: {chapterKey: string; status: 'qualified' | 'missing' | 'unavailable' | 'await_rule' | 'update_or_resolve'}[];
  awards: {certificateId: string; ruleVersion: string; issuedAt: string; status: OverallStatus; outputAvailable: boolean}[]};

export function overallStatusText(status: OverallStatus, en: boolean) {
  return ({active: ['Aktibo', 'Active'], suspended: ['Sinuspinde', 'Suspended'], revoked: ['Binawi', 'Revoked'],
    update_required: ['Kailangan ng pag-update', 'Update required'], unavailable: ['Hindi available', 'Unavailable'],
    incomplete: ['Hindi kumpleto', 'Incomplete']} as const)[status][en ? 1 : 0];
}
export function overallNextStep(step: string | null, en: boolean) {
  if (!step) return en ? 'All three compatible chapter awards are recorded.' : 'Naitala ang tatlong katugmang sertipikasyon ng kabanata.';
  if (step === 'await_rule') return en ? 'Await an approved overall award rule.' : 'Hintayin ang aprubadong tuntunin para sa pangkalahatang sertipiko.';
  const match = /^(await|complete|review)_chapter-([123])$/.exec(step);
  if (!match) return en ? 'Review the next chapter requirement.' : 'Suriin ang susunod na kinakailangan sa kabanata.';
  const chapter = match[2];
  if (match[1] === 'await') return en ? `Chapter ${chapter} certification is not yet available.` : `Hindi pa available ang sertipikasyon sa Kabanata ${chapter}.`;
  if (match[1] === 'review') return en ? `Review Chapter ${chapter} status or version.` : `Suriin ang katayuan o bersyon ng Kabanata ${chapter}.`;
  return en ? `Complete Chapter ${chapter} certification.` : `Kumpletuhin ang sertipikasyon sa Kabanata ${chapter}.`;
}
export function overallCertificateReady(c: OverallCertificate) {
  return c.displayVersion === 1 && [c.holderName,c.programTitleFil,c.programTitleEn,c.issuerOrganization,c.issuerSignatory,c.issuerTitle]
    .every(v => typeof v === 'string' && v.trim().length > 0) && c.sources.length === 3;
}
export const overallVerificationPath = (id: string) => `/certificates/assessor-overall/${id}`;
