import { useTranslations } from "next-intl";
import { consentAction } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/submit-button";

export default function ConsentPage() {
  const t = useTranslations("consent");

  const points = [
    ["pointCollectionHeading", "pointCollectionBody"],
    ["pointPurposeHeading", "pointPurposeBody"],
    ["pointRetentionHeading", "pointRetentionBody"],
    ["pointRightsHeading", "pointRightsBody"],
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <p className="text-sm text-ink/70">{t("intro")}</p>
      </div>

      <dl className="flex flex-col gap-4 rounded-lg border border-ink/10 p-4">
        {points.map(([heading, body]) => (
          <div key={heading}>
            <dt className="font-medium text-ink">{t(heading)}</dt>
            <dd className="text-sm text-ink/70">{t(body)}</dd>
          </div>
        ))}
      </dl>

      <a href="/privacy" className="text-sm text-secondary hover:underline">
        {t("fullNoticeLink")}
      </a>

      <form action={consentAction} className="max-w-sm">
        <SubmitButton pendingChildren={t("submitting")}>{t("agree")}</SubmitButton>
      </form>
    </div>
  );
}
