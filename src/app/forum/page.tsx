import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import type { ForumCategory } from "@/lib/forum/types";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

type ThreadListRow = {
  id: string;
  title: string;
  author_full_name: string;
  tags: string[];
  created_at: string;
  category_id: string;
  forum_categories: { name_fil: string; name_en: string } | null;
};

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string }>;
}) {
  const { category, tag } = await searchParams;
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.forum) {
    redirect("/home");
  }

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

  const t = await getTranslations("forum");

  const { data: categories } = await supabase
    .from("forum_categories")
    .select("id, slug, name_fil, name_en, description_fil, description_en, sort_order")
    .order("sort_order")
    .returns<ForumCategory[]>();

  let query = supabase
    .from("forum_threads")
    .select("id, title, author_full_name, tags, created_at, category_id, forum_categories(name_fil, name_en)")
    .eq("status", "visible")
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category_id", category);
  }
  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data: threads } = await query.returns<ThreadListRow[]>();
  const rows = threads ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>
          <p className="mt-1 text-ink/70">{t("intro")}</p>
        </div>
        <Link
          href="/forum/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-canvas"
        >
          {t("newThreadCta")}
        </Link>
      </div>

      {categories && categories.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/forum"
            className={`rounded-full border px-3 py-1 ${!category ? "border-primary text-primary" : "border-ink/20 text-ink/70"}`}
          >
            {t("allCategories")}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/forum?category=${c.id}`}
              className={`rounded-full border px-3 py-1 ${category === c.id ? "border-primary text-primary" : "border-ink/20 text-ink/70"}`}
            >
              {c.name_en}
            </Link>
          ))}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState message={t("empty")} actionLabel={t("newThreadCta")} actionHref="/forum/new" />
      ) : (
        <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
          {rows.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`/forum/${thread.id}`}
                className="flex min-h-[44px] flex-col gap-1 px-4 py-3 hover:bg-ink/5"
              >
                <span className="font-medium text-ink">{thread.title}</span>
                <span className="text-sm text-ink/70">
                  {thread.forum_categories?.name_en ?? "—"} · {thread.author_full_name}
                </span>
                {thread.tags.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {thread.tags.map((tagValue) => (
                      <span key={tagValue} className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/70">
                        #{tagValue}
                      </span>
                    ))}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
