import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/language-toggle";
import { signOut } from "@/lib/auth/actions";
import { PROFILE_SELECT_COLUMNS, type UserProfile } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

async function getCurrentProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("auth_user_id", user.id)
    .single<UserProfile>();

  return profile ?? null;
}

export async function SiteHeader() {
  const t = await getTranslations("common");
  const profile = await getCurrentProfile();

  return (
    <header className="border-b border-ink/10 bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <span className="text-lg font-semibold text-primary">{t("appName")}</span>
        <div className="flex items-center gap-4">
          {profile && (
            <form action={signOut} className="flex items-center gap-3 text-sm">
              <span className="text-ink/70">{profile.full_name}</span>
              <button type="submit" className="text-secondary hover:underline">
                {t("signOut")}
              </button>
            </form>
          )}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
