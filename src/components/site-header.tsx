import Link from "next/link";
import { useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/language-toggle";

export function SiteHeader() {
  const t = useTranslations("common");

  return (
    <header className="border-b border-ink/10 bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold text-primary">
          {t("appName")}
        </Link>
        <LanguageToggle />
      </div>
    </header>
  );
}
