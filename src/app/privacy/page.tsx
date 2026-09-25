import { useTranslations } from "next-intl";

export default function PrivacyPage() {
  const t = useTranslations("privacy");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
      <p className="max-w-xl text-lg text-ink/70">{t("body")}</p>
      {/* free-ai-leverage-plan.md §2 requires this stated plainly in the
          privacy notice, not only in the architecture. */}
      <p className="max-w-xl text-base text-ink/70">{t("aiClause")}</p>
    </div>
  );
}
