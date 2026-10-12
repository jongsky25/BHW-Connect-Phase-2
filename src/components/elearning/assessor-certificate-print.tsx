'use client';
export function AssessorCertificatePrint({en}: {en: boolean}) {
  return <button type="button" onClick={() => window.print()} className="rounded border border-primary px-4 py-3 text-primary">{en ? 'Print certificate' : 'I-print ang sertipiko'}</button>;
}
