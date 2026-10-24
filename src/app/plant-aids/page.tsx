import Link from "next/link";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { PlantAidLibrary } from "@/components/elearning/plant-aid-library";
import { getViewer } from "@/lib/auth/viewer";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

export default async function PlantAidsPage() {
  const { appUser, isPreview } = await getViewer();
  if (!appUser) redirect("/login");
  const flags = await getRequestFeatureFlags();
  if (!flags.elearning) redirect("/home");
  const locale = await getLocale();
  const feedbackAvailable = flags.spot_feedback && !isPreview
    ? (await (await createClient()).rpc("spot_feedback_access")).data === true
    : false;
  return <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8 sm:px-6">
    <Link href="/courses" className="inline-flex min-h-[44px] items-center underline print:hidden">{locale === "en" ? "← Courses" : "← Mga kurso"}</Link>
    <PlantAidLibrary initialLanguage={locale === "en" ? "en" : "fil"} feedbackAvailable={feedbackAvailable} />
  </div>;
}
