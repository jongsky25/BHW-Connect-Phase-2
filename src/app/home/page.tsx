import * as Sentry from "@sentry/nextjs";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { MyTrainingCard } from "@/components/progress/my-training-card";
import { SignOutButton } from "@/components/sign-out-button";
import { getNavItems } from "@/lib/nav/nav-items";
import { loadManualProgress } from "@/lib/progress/load-manual-progress";
import type { ManualProgress } from "@/lib/progress/manual-progress";
import { parseOnboardingProgress } from "@/lib/settings/types";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const {
    data: { user },
  } = await getRequestAuthUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await getRequestAppUser(user.id);

  if (!appUser) {
    redirect("/login");
  }

  const t = await getTranslations("authHome");
  const flags = await getRequestFeatureFlags();
  const locale = (await getLocale()) === "en" ? "en" : "fil";
  const navItems = getNavItems({ role: appUser.role, flags });

  // "My training" is a convenience: if progress cannot load, the rest of
  // home still renders and the manual itself remains reachable via Courses.
  let training: ManualProgress[] = [];
  if (flags.elearning && appUser.role === "bhw") {
    try {
      training = (await loadManualProgress(await createClient(), appUser.id)).filter((p) =>
        p.chapters.some((ch) => ch.state !== "unavailable"),
      );
    } catch (error) {
      Sentry.captureException(error);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {t("heading", { name: appUser.full_name })}
      </h1>
      <p className="max-w-xl text-lg text-ink/70">{t("body")}</p>

      {appUser.role === "bhw" && !appUser.onboarding_completed_at ? (
        <OnboardingChecklist progress={parseOnboardingProgress(appUser.onboarding_progress)} />
      ) : null}

      {training.map((progress) => (
        <MyTrainingCard key={progress.programId} progress={progress} locale={locale} />
      ))}

      <div className="flex flex-wrap gap-3">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={
              item.variant === "primary"
                ? "rounded-md bg-primary px-6 py-3 font-medium text-on-primary"
                : "rounded-md border border-ink/20 px-4 py-2 font-medium text-ink"
            }
          >
            {t(item.labelKey)}
          </Link>
        ))}
        <SignOutButton />
      </div>
    </div>
  );
}
