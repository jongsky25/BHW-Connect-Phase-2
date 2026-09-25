import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-ink/10 bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-ink/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>{t("copyright", { year: new Date().getFullYear() })}</span>
        <a href="/privacy" className="text-ink underline">
          {t("privacyNotice")}
        </a>
      </div>
    </footer>
  );
}
