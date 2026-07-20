import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/language-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentAppUser } from "@/lib/auth/session";

export async function SiteHeader() {
  const t = await getTranslations("common");
  const appUser = isSupabaseConfigured() ? await getCurrentAppUser() : null;

  return (
    <header className="border-b border-ink/10 bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <span className="text-lg font-semibold text-primary">{t("appName")}</span>
        <div className="flex items-center gap-4">
          {appUser && <SignOutButton />}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
