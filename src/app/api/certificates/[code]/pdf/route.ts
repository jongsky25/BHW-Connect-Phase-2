import { getLocale, getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";

type VerifyResult = {
  valid: boolean;
  bhw_full_name: string | null;
  course_title_fil: string | null;
  course_title_en: string | null;
  issued_at: string | null;
};

// Public by design — same as /certificates/[code] and rpc_certificate_verify
// itself: anyone with the code (or the QR that encodes it) can confirm a
// certificate is genuine without a BHW Connect account.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const t = await getTranslations("certificates");
  const locale = await getLocale();

  const { data } = await supabase.rpc("rpc_certificate_verify", { p_code: code }).maybeSingle<VerifyResult>();

  if (!data?.valid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const verifyUrl = new URL(`/certificates/${code}`, request.nextUrl.origin).toString();
  const qrPngBytes = await QRCode.toBuffer(verifyUrl, { type: "png", margin: 1, width: 200 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 419.53]); // A5 landscape
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.169, 0.141, 0.125);
  const qrImage = await pdf.embedPng(qrPngBytes);

  const courseTitle = locale === "en" ? data.course_title_en : data.course_title_fil;
  const issuedDate = data.issued_at ? new Date(data.issued_at).toLocaleDateString() : "";

  page.drawText(t("pdfHeading"), { x: 50, y: 340, size: 22, font: bold, color: ink });
  page.drawText(data.bhw_full_name ?? "", { x: 50, y: 290, size: 18, font: bold, color: ink });
  page.drawText(`${t("courseLabel")}: ${courseTitle}`, { x: 50, y: 255, size: 12, font, color: ink });
  page.drawText(`${t("issuedOnLabel")}: ${issuedDate}`, { x: 50, y: 232, size: 12, font, color: ink });
  page.drawText(`${t("codeLabel")}: ${code}`, { x: 50, y: 209, size: 12, font, color: ink });

  page.drawImage(qrImage, { x: 445, y: 60, width: 100, height: 100 });
  page.drawText(t("scanToVerifyLabel"), { x: 425, y: 45, size: 8, font, color: ink });

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${code}.pdf"`,
    },
  });
}
