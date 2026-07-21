import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { onboardingSteps, type OnboardingStep } from "@/lib/settings/types";

const STEP_HREF: Record<OnboardingStep, string> = {
  language: "/settings",
  chat: "/chat",
  kb: "/kb",
};

export async function OnboardingChecklist({ progress }: { progress: Record<OnboardingStep, boolean> }) {
  const t = await getTranslations("onboarding");

  return (
    <div className="flex w-full flex-col gap-3 rounded-md border border-ink/10 bg-ink/5 px-4 py-4">
      <p className="font-medium text-ink">{t("checklistHeading")}</p>
      <ul className="flex flex-col gap-2">
        {onboardingSteps.map((step) => {
          const done = progress[step];
          return (
            <li key={step}>
              <Link
                href={STEP_HREF[step]}
                className="flex min-h-[44px] items-center gap-3 rounded-md px-2 py-1 text-ink hover:bg-ink/5"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                    done ? "border-success bg-success text-canvas" : "border-ink/30"
                  }`}
                >
                  {done ? "✓" : ""}
                </span>
                <span className={done ? "text-ink/60 line-through" : ""}>{t(`step_${step}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
