import { collectionIds, kbCollection, kbCollectionTitle, kbTopicContext, kbTopicTitle } from "@/lib/kb/collections";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

type CategoryRow = {
  name_fil: string;
  name_en: string;
  slug: string;
};

export default async function KbBrowsePage() {
  const supabase = await createClient();
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

  const t = await getTranslations("kb");
  const tCrumbs = await getTranslations("breadcrumbs");
  const locale = await getLocale();
  const flags = await getRequestFeatureFlags();

  const { data: categories } = await supabase
    .from("kb_categories")
    .select("name_fil, name_en, slug")
    .order("sort_order")
    .returns<CategoryRow[]>();

  const rows = categories ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: tCrumbs("home"), href: "/home" }, { label: t("browseHeading") }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("browseHeading")}</h1>
        <p className="mt-1 text-ink/70">{t("browseIntro")}</p>
        <p className="mt-2 text-sm text-ink/80">{t("collectionHelp")}</p>
        {flags.elearning && <Link prefetch={false} href="/courses" className="mt-2 inline-flex min-h-11 items-center underline">{t("openCourses")}</Link>}
      </div>

      {rows.length === 0 ? (
        <EmptyState message={t("browseEmpty")} actionLabel={t("tryChatCta")} actionHref="/chat" />
      ) : (
        <div className="space-y-6">
          {collectionIds.map(id => {
            const topics = rows.filter(category => kbCollection(category.slug).id === id);
            if (!topics.length) return null;
            return <section key={id} aria-labelledby={`kb-collection-${id}`}>
              <h2 id={`kb-collection-${id}`} className="mb-3 text-xl font-semibold">{kbCollectionTitle(id, locale)}</h2>
              <ul className="divide-y divide-ink/10 rounded-lg border border-ink/15">
                {topics.map(category => <li key={category.slug}>
                  <Link prefetch={false} href={`/kb/${category.slug}`} aria-labelledby={`kb-topic-${category.slug}`}
                    aria-describedby={`kb-context-${category.slug}`}
                    className="block min-h-11 break-words px-4 py-3 text-ink hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                    <span id={`kb-context-${category.slug}`} className="mb-1 block text-sm">{kbTopicContext(category.slug, locale)}</span>
                    <span id={`kb-topic-${category.slug}`} className="block font-semibold" title={locale === "en" ? category.name_en : category.name_fil}>
                      {kbTopicTitle(locale === "en" ? category.name_en : category.name_fil)}
                    </span>
                  </Link>
                </li>)}
              </ul>
            </section>;
          })}
        </div>
      )}
    </div>
  );
}
