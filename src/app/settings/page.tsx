import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings/settings-form";
import { parseA11ySettings } from "@/lib/settings/types";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await getAppUser(supabase, user.id);
  if (!appUser) {
    redirect("/login");
  }

  const t = await getTranslations("settings");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>
        <p className="mt-1 text-ink/70">{t("intro")}</p>
      </div>
      <SettingsForm initialLanguage={appUser.language} initialA11y={parseA11ySettings(appUser.a11y_settings)} />
    </div>
  );
}
