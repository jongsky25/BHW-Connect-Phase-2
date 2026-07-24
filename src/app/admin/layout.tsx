import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await getAppUser(supabase, user.id);

  if (!appUser || appUser.role !== "admin") {
    redirect("/home");
  }

  const flags = await getFeatureFlags(supabase);
  const t = await getTranslations("admin");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <nav className="flex flex-wrap gap-4 border-b border-ink/10 pb-3 text-sm font-medium">
        <Link href="/admin/dashboard" className="text-secondary hover:underline">
          {t("nav.dashboard")}
        </Link>
        <Link href="/admin/users" className="text-secondary hover:underline">
          {t("nav.users")}
        </Link>
        <Link href="/admin/audit" className="text-secondary hover:underline">
          {t("nav.audit")}
        </Link>
        <Link href="/admin/kb/categories" className="text-secondary hover:underline">
          {t("nav.kbCategories")}
        </Link>
        <Link href="/admin/kb/entries" className="text-secondary hover:underline">
          {t("nav.kbEntries")}
        </Link>
        {flags.kb_articles ? (
          <Link href="/admin/kb/articles" className="text-secondary hover:underline">
            {t("nav.kbArticles")}
          </Link>
        ) : null}
        <Link href="/admin/kb/synonyms" className="text-secondary hover:underline">
          {t("nav.kbSynonyms")}
        </Link>
        {flags.announcements ? (
          <Link href="/admin/announcements" className="text-secondary hover:underline">
            {t("nav.announcements")}
          </Link>
        ) : null}
        <Link href="/admin/flags" className="text-secondary hover:underline">
          {t("nav.flags")}
        </Link>
        <Link href="/settings" className="text-secondary hover:underline">
          {t("nav.settings")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
