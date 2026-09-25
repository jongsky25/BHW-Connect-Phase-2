import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser } from "@/lib/supabase/request";

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
      </div>

      {rows.length === 0 ? (
        <EmptyState message={t("browseEmpty")} actionLabel={t("tryChatCta")} actionHref="/chat" />
      ) : (
        <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
          {rows.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/kb/${category.slug}`}
                className="flex min-h-[44px] items-center px-4 py-3 text-ink hover:bg-ink/5"
              >
                {locale === "en" ? category.name_en : category.name_fil}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
