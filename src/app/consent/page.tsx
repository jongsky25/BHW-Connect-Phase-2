import { useTranslations } from "next-intl";
import { giveConsent } from "./actions";

export default function ConsentPage() {
  const t = useTranslations("consent");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <p className="text-ink/70">{t("intro")}</p>
      </div>
      <ul className="flex flex-col gap-3 rounded-md border border-ink/10 bg-ink/5 p-4 text-sm text-ink">
        <li>
          <strong>{t("whatLabel")}</strong> {t("whatBody")}
        </li>
        <li>
          <strong>{t("whyLabel")}</strong> {t("whyBody")}
        </li>
        <li>
          <strong>{t("retentionLabel")}</strong> {t("retentionBody")}
        </li>
        <li>
          <strong>{t("rightsLabel")}</strong> {t("rightsBody")}
        </li>
      </ul>
      <a href="/privacy" className="text-sm text-secondary hover:underline">
        {t("readFullNotice")}
      </a>
      <form action={giveConsent}>
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 font-medium text-canvas transition-opacity"
        >
          {t("agree")}
        </button>
      </form>
    </div>
  );
}
