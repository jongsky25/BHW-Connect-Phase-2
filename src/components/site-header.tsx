import { useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/language-toggle";
import { SignOutButton } from "@/components/sign-out-button";

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  const t = useTranslations("common");

  return (
    <header className="border-b border-ink/10 bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <span className="text-lg font-semibold text-primary">{t("appName")}</span>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          {signedIn ? <SignOutButton /> : null}
        </div>
      </div>
    </header>
  );
}
