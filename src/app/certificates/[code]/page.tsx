import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

type VerifyResult = {
  valid: boolean;
  bhw_full_name: string | null;
  course_title_fil: string | null;
  course_title_en: string | null;
  issued_at: string | null;
};

export default async function CertificateVerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const t = await getTranslations("certificates");
  const locale = await getLocale();

  const { data } = await supabase.rpc("rpc_certificate_verify", { p_code: code }).maybeSingle<VerifyResult>();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>

      {data?.valid ? (
        <div className="flex flex-col gap-2 rounded-md border border-success/40 bg-success/5 p-4">
          <p className="font-medium text-success">{t("validHeading")}</p>
          <p className="text-ink">{data.bhw_full_name}</p>
          <p className="text-sm text-ink/70">
            {t("courseLabel")}: {locale === "en" ? data.course_title_en : data.course_title_fil}
          </p>
          {data.issued_at ? (
            <p className="text-sm text-ink/70">
              {t("issuedOnLabel")}: {new Date(data.issued_at).toLocaleDateString()}
            </p>
          ) : null}
          <a
            href={`/api/certificates/${code}/pdf`}
            className="mt-1 self-start text-sm font-medium text-secondary underline"
          >
            {t("downloadPdfAction")}
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-danger/40 bg-danger/5 p-4">
          <p className="font-medium text-danger">{t("invalidHeading")}</p>
          <p className="text-sm text-ink/70">{t("invalidBody")}</p>
        </div>
      )}
    </div>
  );
}
