import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ArticleViewer } from "@/components/kb/article-viewer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

type CategoryRow = { id: string; name_fil: string; name_en: string; slug: string };
type EntryRow = { id: string; question_fil: string; question_en: string; answer_fil: string; answer_en: string };
type ArticleRow = { id: string; title_fil: string; title_en: string; body_fil: object; body_en: object };

export default async function KbCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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

  const [{ data: category }, t, tCrumbs, locale, flags] = await Promise.all([
    supabase
      .from("kb_categories")
      .select("id, name_fil, name_en, slug")
      .eq("slug", slug)
      .maybeSingle<CategoryRow>(),
    getTranslations("kb"),
    getTranslations("breadcrumbs"),
    getLocale(),
    getRequestFeatureFlags(),
  ]);

  if (!category) {
    notFound();
  }

  const [{ data: entries }, { data: articles }] = await Promise.all([
    supabase
      .from("kb_entries")
      .select("id, question_fil, question_en, answer_fil, answer_en")
      .eq("category_id", category.id)
      .eq("status", "published")
      .returns<EntryRow[]>(),
    flags.kb_articles
      ? supabase
          .from("kb_articles")
          .select("id, title_fil, title_en, body_fil, body_en")
          .eq("category_id", category.id)
          .eq("status", "published")
          .returns<ArticleRow[]>()
      : Promise.resolve({ data: [] as ArticleRow[] }),
    // Best-effort: visiting a published category satisfies the "visit a KB
    // category" onboarding step. Runs alongside the reads above so it adds
    // no extra round trip to the render.
    supabase.rpc("rpc_onboarding_complete_step", { p_step: "kb" }),
  ]);

  const entryRows = entries ?? [];
  const articleRows = articles ?? [];

  // Best-effort analytics: every published article shown on this category
  // page counts as viewed (articles render collapsed but are already
  // delivered to the client). Never blocks the page render.
  await Promise.all(
    articleRows.map((article) =>
      supabase.rpc("rpc_track_event", {
        p_event_name: "kb.article_viewed",
        p_properties: { article_id: article.id, category_id: category.id },
      }),
    ),
  );
  const isEmpty = entryRows.length === 0 && articleRows.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <Breadcrumbs
          items={[
            { label: tCrumbs("home"), href: "/home" },
            { label: t("browseHeading"), href: "/kb" },
            { label: locale === "en" ? category.name_en : category.name_fil },
          ]}
        />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {locale === "en" ? category.name_en : category.name_fil}
        </h1>
      </div>

      {isEmpty ? (
        <EmptyState message={t("categoryEmpty")} actionLabel={t("tryChatCta")} actionHref="/chat" />
      ) : (
        <div className="flex flex-col gap-6">
          {entryRows.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {entryRows.map((entry) => (
                <li key={entry.id}>
                  <details className="group rounded-md border border-ink/10 px-4 py-3">
                    <summary className="cursor-pointer font-medium text-ink marker:text-secondary">
                      {locale === "en" ? entry.question_en : entry.question_fil}
                    </summary>
                    <p className="mt-2 text-ink/80">
                      {locale === "en" ? entry.answer_en : entry.answer_fil}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          ) : null}

          {articleRows.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {articleRows.map((article) => (
                <li key={article.id}>
                  <details className="group rounded-md border border-ink/10 px-4 py-3">
                    <summary className="cursor-pointer font-medium text-ink marker:text-secondary">
                      {locale === "en" ? article.title_en : article.title_fil}
                    </summary>
                    <div className="mt-2">
                      <ArticleViewer content={locale === "en" ? article.body_en : article.body_fil} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
