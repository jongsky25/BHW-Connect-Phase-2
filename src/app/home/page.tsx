import * as Sentry from "@sentry/nextjs";
import { getLocale, getTranslations } from "next-intl/server";
import { DestinationLink } from "@/components/nav/destination-link";
import { redirect } from "next/navigation";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { MyTrainingCard } from "@/components/progress/my-training-card";
import { SignOutButton } from "@/components/sign-out-button";
import { getViewer } from "@/lib/auth/viewer";
import { getNavItems } from "@/lib/nav/nav-items";
import { loadManualProgress } from "@/lib/progress/load-manual-progress";
import type { ManualProgress } from "@/lib/progress/manual-progress";
import { parseOnboardingProgress } from "@/lib/settings/types";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const viewer = await getViewer();

  if (!viewer.appUser || !viewer.role) {
    redirect("/login");
  }
  const appUser = viewer.appUser;
  const role = viewer.role;

  const t = await getTranslations("authHome");
  const tDest = await getTranslations("destinations");
  const flags = await getRequestFeatureFlags();
  const locale = (await getLocale()) === "en" ? "en" : "fil";
  const navItems = getNavItems({ role, flags });

  // "My training" is a convenience: if progress cannot load, the rest of
  // home still renders and the manual itself remains reachable via Courses.
  let training: ManualProgress[] = [];
  if (flags.elearning && role === "bhw") {
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

      {role === "bhw" && !appUser.onboarding_completed_at ? (
        <OnboardingChecklist progress={parseOnboardingProgress(appUser.onboarding_progress)} />
      ) : null}

      {training.map((progress) => (
        <MyTrainingCard key={progress.programId} progress={progress} locale={locale} />
      ))}

      <nav aria-labelledby="home-destinations-heading" className="w-full space-y-3">
        <h2 id="home-destinations-heading" className="text-xl font-semibold">{tDest("heading")}</h2>
        <p className="text-ink/80">{tDest("intro")}</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navItems.map((item) => <li key={item.id} className="min-w-0">
            <DestinationLink href={item.href} label={t(item.labelKey)} description={tDest(item.id)} idPrefix={`home-nav-${item.id}`}
              className={`block h-full min-h-11 break-words rounded-lg px-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                item.variant === "primary" ? "bg-primary text-on-primary" : "border border-ink/20 text-ink hover:bg-ink/5"
              }`} />
          </li>)}
        </ul>
      </nav>
      <SignOutButton />
    </div>
  );
}
