import {readFile} from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument, rgb, type PDFFont} from 'pdf-lib';
import QRCode from 'qrcode';
import {certificateOutputReady, certificateStatusText, type Certificate} from './certifications';

// Wrap every line, including unbroken names and IDs. Long approved issuer fields
// can continue onto a second page rather than clipping or losing information.
export function wrapCertificateText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/u)) {
    if (!word) continue;
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {line = candidate; continue;}
    if (line) {lines.push(line); line = '';}
    for (const character of word) {
      if (line && font.widthOfTextAtSize(line + character, size) > width) {lines.push(line); line = '';}
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}
export async function renderAssessorCertificatePdf(c: Certificate, en: boolean, verifyUrl: string) {
  if (!certificateOutputReady(c)) throw new Error('Certificate display unavailable');
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await readFile(path.join(process.cwd(), 'src/lib/assessor/fonts/DejaVuSans.ttf')), {subset: true});
  pdf.setTitle(en ? c.titleEn! : c.titleFil!);
  pdf.setSubject(`Assessor/facilitator Chapter 1 achievement ${c.certificateId}`);
  let page = pdf.addPage([595.28, 841.89]); // A4, enough space for bilingual scope.
  let y = 785;
  const draw = (value: string, size = 12) => {
    for (const line of wrapCertificateText(value, font, size, 487)) {
      if (y < 65) {page = pdf.addPage([595.28, 841.89]); y = 785;}
      page.drawText(line, {x: 54, y, size, font, color: rgb(0.16, 0.14, 0.12)});
      y -= size * 1.5;
    }
    y -= 12;
  };
  draw(en ? 'Certificate of achievement' : 'Sertipiko ng pagkamit', 20);
  draw(en ? c.titleEn! : c.titleFil!, 17);
  draw(c.holderName!, 20);
  draw(`${en ? 'Issued' : 'Ibinigay noong'}: ${new Date(c.issuedAt).toLocaleDateString(en ? 'en-PH' : 'fil-PH', {timeZone: 'UTC'})}`);
  draw(`${en ? 'Issuer' : 'Nagbigay'}: ${c.issuerOrganization}`);
  draw(`${c.issuerSignatory} · ${c.issuerTitle}`);
  draw(`Certificate ID: ${c.certificateId}`, 10);
  draw(`${en ? 'Status at download' : 'Katayuan sa pag-download'}: ${certificateStatusText(c.status, en)}`);
  draw(en ? 'Chapter 1 only. This document records historical achievement and does not grant current assessment or facilitation authority. Check current status using the verification link.' :
    'Kabanata 1 lamang. Tala ito ng pagkamit at hindi nagbibigay ng kasalukuyang pahintulot sa pagtatasa o pagpapadaloy. Tingnan ang kasalukuyang katayuan sa verification link.');
  draw(en ? 'Public verification may be unavailable pending disclosure approval.' : 'Maaaring hindi pa available ang pampublikong verification habang hinihintay ang pag-apruba sa disclosure.', 10);
  draw(verifyUrl, 9);
  if (y < 175) {page = pdf.addPage([595.28, 841.89]); y = 785;}
  const qr = await pdf.embedPng(await QRCode.toBuffer(verifyUrl, {type: 'png', width: 240, margin: 2}));
  page.drawImage(qr, {x: 54, y: y - 120, width: 120, height: 120});
  page.drawText(en ? 'Scan for current status' : 'I-scan para sa kasalukuyang katayuan', {x: 54, y: y - 139, size: 9, font});
  return pdf.save();
}
