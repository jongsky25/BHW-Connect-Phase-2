import {readFile} from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument, rgb} from 'pdf-lib';
import QRCode from 'qrcode';
import {wrapCertificateText} from './certificate-pdf';
import {overallCertificateReady, overallStatusText, type OverallCertificate} from './overall-certifications';

export async function renderOverallCertificatePdf(c: OverallCertificate, en: boolean, verifyUrl: string) {
  if (!overallCertificateReady(c)) throw new Error('Overall certificate display unavailable');
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await readFile(path.join(process.cwd(), 'src/lib/assessor/fonts/DejaVuSans.ttf')), {subset: true});
  pdf.setTitle(en ? 'Overall assessor/facilitator certificate' : 'Pangkalahatang sertipiko ng tagatasa/tagapagpadaloy');
  pdf.setSubject(`Three-chapter achievement ${c.certificateId}`);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 785;
  const draw = (value: string, size = 12) => {
    for (const line of wrapCertificateText(value, font, size, 487)) {
      if (y < 70) {page = pdf.addPage([595.28, 841.89]); y = 785;}
      page.drawText(line, {x: 54, y, size, font, color: rgb(0.16, 0.14, 0.12)});
      y -= size * 1.5;
    }
    y -= 10;
  };
  draw(en ? 'Overall certificate of achievement' : 'Pangkalahatang sertipiko ng pagkamit', 19);
  draw(en ? c.programTitleEn! : c.programTitleFil!, 17);
  draw(c.holderName!, 19);
  draw(en ? 'Assessor/facilitator · Chapters 1, 2 and 3' : 'Tagatasa/tagapagpadaloy · Kabanata 1, 2 at 3');
  draw(`${en ? 'Issued' : 'Ibinigay noong'}: ${new Date(c.issuedAt).toLocaleDateString(en ? 'en-PH' : 'fil-PH', {timeZone: 'UTC'})}`);
  draw(`${en ? 'Issuer' : 'Nagbigay'}: ${c.issuerOrganization}`);
  draw(`${c.issuerSignatory} · ${c.issuerTitle}`);
  draw(`Certificate ID: ${c.certificateId}`, 10);
  draw(`${en ? 'Status at download' : 'Katayuan sa pag-download'}: ${overallStatusText(c.status, en)}`);
  draw(en ? 'Source chapter records' : 'Mga pinagbatayang tala ng kabanata', 12);
  for (const source of c.sources) draw(`${source.chapterKey}: ${source.sourceType} · ${source.sourceId} · ${source.status}`, 9);
  draw(en ? 'This records achievement across this program’s three chapters. It is not external accreditation and does not grant current authority in any chapter or catchment. Check the verification link for current status.' :
    'Tala ito ng pagkamit sa tatlong kabanata ng programang ito. Hindi ito panlabas na akreditasyon at hindi nagbibigay ng kasalukuyang pahintulot sa alinmang kabanata o saklaw. Tingnan ang verification link para sa kasalukuyang katayuan.', 10);
  draw(en ? 'Public verification may be unavailable pending disclosure approval.' : 'Maaaring hindi pa available ang pampublikong verification habang hinihintay ang pag-apruba sa disclosure.', 9);
  draw(verifyUrl, 9);
  if (y < 180) {page = pdf.addPage([595.28, 841.89]); y = 785;}
  const qr = await pdf.embedPng(await QRCode.toBuffer(verifyUrl, {type: 'png', width: 240, margin: 2}));
  page.drawImage(qr, {x: 54, y: y - 120, width: 120, height: 120});
  page.drawText(en ? 'Scan for current status' : 'I-scan para sa kasalukuyang katayuan', {x: 54, y: y - 139, size: 9, font});
  return pdf.save();
}
