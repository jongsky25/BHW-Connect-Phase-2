import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { SignOutButton } from "@/components/sign-out-button";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import { parseOnboardingProgress } from "@/lib/settings/types";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
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

  const t = await getTranslations("authHome");
  const flags = await getFeatureFlags(supabase);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {t("heading", { name: appUser.full_name })}
      </h1>
      <p className="max-w-xl text-lg text-ink/70">{t("body")}</p>

      {appUser.role === "bhw" && !appUser.onboarding_completed_at ? (
        <OnboardingChecklist progress={parseOnboardingProgress(appUser.onboarding_progress)} />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/chat"
          className="rounded-md bg-primary px-6 py-3 font-medium text-canvas"
        >
          {t("chatGuideCta")}
        </Link>
        <Link
          href="/kb"
          className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink"
        >
          {t("kbBrowseCta")}
        </Link>
        {flags.announcements ? (
          <Link
            href="/announcements"
            className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink"
          >
            {t("announcementsCta")}
          </Link>
        ) : null}
        {flags.surveys ? (
          <Link
            href="/surveys"
            className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink"
          >
            {t("surveysCta")}
          </Link>
        ) : null}
        {flags.elearning ? (
          <Link
            href="/courses"
            className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink"
          >
            {t("coursesCta")}
          </Link>
        ) : null}
        {flags.elearning && appUser.role === "assessor" ? (
          <Link
            href="/assessments"
            className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink"
          >
            {t("assessmentsCta")}
          </Link>
        ) : null}
        {flags.forum ? (
          <Link
            href="/forum"
            className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink"
          >
            {t("forumCta")}
          </Link>
        ) : null}
        {flags.flipcharts ? (
          <Link
            href="/flipcharts"
            className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink"
          >
            {t("flipchartsCta")}
          </Link>
        ) : null}
        {flags.flipcharts && appUser.role === "designer" ? (
          <Link
            href="/designer/flipcharts"
            className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink"
          >
            {t("designerFlipchartsCta")}
          </Link>
        ) : null}
        <Link
          href="/settings"
          className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink"
        >
          {t("settingsCta")}
        </Link>
        {appUser.role === "admin" ? (
          <Link
            href="/admin/users"
            className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink"
          >
            {t("adminConsoleCta")}
          </Link>
        ) : null}
        <SignOutButton />
      </div>
    </div>
  );
}
