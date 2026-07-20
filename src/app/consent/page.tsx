import { useTranslations } from "next-intl";
import { giveConsent } from "./actions";
import { ConsentSubmit } from "./consent-submit";

export default function ConsentPage() {
  const t = useTranslations("consent");

  const sections = [
    { heading: t("collectHeading"), body: t("collectBody") },
    { heading: t("whyHeading"), body: t("whyBody") },
    { heading: t("retentionHeading"), body: t("retentionBody") },
    { heading: t("rightsHeading"), body: t("rightsBody") },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t("heading")}
        </h1>
        <p className="max-w-xl text-lg text-ink/70">{t("intro")}</p>
      </div>
      <dl className="flex w-full flex-col gap-4">
        {sections.map((section) => (
          <div key={section.heading} className="rounded-lg border border-ink/10 p-4">
            <dt className="font-semibold text-ink">{section.heading}</dt>
            <dd className="mt-1 text-ink/70">{section.body}</dd>
          </div>
        ))}
      </dl>
      <form action={giveConsent} className="flex w-full justify-center">
        <ConsentSubmit />
      </form>
    </div>
  );
}
