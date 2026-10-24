import Link from "next/link";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";
import { PersonalTestResults } from "@/components/elearning/personal-test-results";
import { PreviewNote } from "@/components/preview/preview-note";
import type { PersonalTestHistory } from "@/lib/elearning/test-results";

export default async function MyResultsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [viewer, flags, locale, query] = await Promise.all([getViewer(), getRequestFeatureFlags(), getLocale(), searchParams]);
  if (!viewer.appUser || viewer.appUser.status !== "active") redirect("/login");
  if (!flags.elearning || !["bhw", "assessor"].includes(viewer.role ?? "")) redirect("/home");
  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isInteger(page) || page < 1 || page > 501) notFound();
  if (viewer.isPreview) return <div className="mx-auto max-w-4xl space-y-4 px-4 py-10"><PreviewNote /><p>{locale === "en" ? "Return to your own account to view personal test results." : "Bumalik sa sarili mong account upang makita ang personal na resulta."}</p></div>;
  const { data, error } = await (await createClient()).rpc("rpc_my_test_history", { p_limit: 20, p_offset: (page - 1) * 20 });
  return <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8 sm:px-6">
    <Link prefetch={false} href="/courses" className="inline-flex min-h-[44px] items-center underline">{locale === "en" ? "← Courses" : "← Mga kurso"}</Link>
    {error || !Array.isArray(data?.items) ? <section role="alert" className="rounded-lg border border-danger/30 p-5">
      <h1 className="text-xl font-semibold">{locale === "en" ? "Results could not be loaded" : "Hindi makuha ang mga resulta"}</h1>
      <p>{locale === "en" ? "Your saved scores are unchanged. Try again." : "Hindi nagbago ang mga naka-save na iskor. Subukan muli."}</p>
      <Link href="/my-results" className="inline-flex min-h-[44px] items-center underline">{locale === "en" ? "Reload results" : "I-load muli ang resulta"}</Link>
    </section> : <PersonalTestResults history={data as PersonalTestHistory} locale={locale} page={page} />}
  </div>;
}
