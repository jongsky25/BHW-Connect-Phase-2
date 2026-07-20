import { useTranslations } from "next-intl";
import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { SignOutButton } from "@/components/sign-out-button";

export function SiteHeader({
  signedIn = false,
  isAdmin = false,
}: {
  signedIn?: boolean;
  isAdmin?: boolean;
}) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");

  return (
    <header className="border-b border-ink/10 bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold text-primary">{t("appName")}</span>
          {isAdmin ? (
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/admin/users" className="text-ink/70 hover:text-ink">
                {tNav("users")}
              </Link>
              <Link href="/admin/audit" className="text-ink/70 hover:text-ink">
                {tNav("audit")}
              </Link>
              <Link href="/admin/kb/entries" className="text-ink/70 hover:text-ink">
                {tNav("kb")}
              </Link>
            </nav>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          {signedIn ? <SignOutButton /> : null}
        </div>
      </div>
    </header>
  );
}
