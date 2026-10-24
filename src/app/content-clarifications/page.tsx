import Link from "next/link";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ContentClarificationLibrary } from "@/components/elearning/content-clarification-library";
import { getViewer } from "@/lib/auth/viewer";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

export default async function ContentClarificationsPage() {
  const { appUser, isPreview } = await getViewer();
  if (!appUser) redirect("/login");
  const flags = await getRequestFeatureFlags();
  if (!flags.elearning) redirect("/home");
  const locale = await getLocale();
  const feedbackAvailable = flags.spot_feedback && !isPreview
    ? (await (await createClient()).rpc("spot_feedback_access")).data === true
    : false;
  return <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8 sm:px-6">
    <Link prefetch={false} href="/courses" className="inline-flex min-h-[44px] items-center underline">{locale === "en" ? "← Courses" : "← Mga kurso"}</Link>
    <ContentClarificationLibrary initialLanguage={locale === "en" ? "en" : "fil"} feedbackAvailable={feedbackAvailable} />
  </div>;
}
