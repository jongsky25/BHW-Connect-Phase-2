import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const {
    data: { user },
  } = await getRequestAuthUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await getRequestAppUser(user.id);

  if (!appUser || appUser.role !== "admin") {
    redirect("/home");
  }

  // Tolerant of the RPC failing (e.g. the super admin migration not yet
  // applied): the link just doesn't show.
  const [flags, { data: superAdminContext }] = await Promise.all([
    getRequestFeatureFlags(),
    (await createClient()).rpc("rpc_super_admin_context"),
  ]);
  const isSuperAdmin =
    ((superAdminContext as { is_super_admin: boolean }[] | null) ?? [])[0]?.is_super_admin === true;
  const t = await getTranslations("admin");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
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
        {flags.surveys ? (
          <Link href="/admin/surveys" className="text-secondary hover:underline">
            {t("nav.surveys")}
          </Link>
        ) : null}
        {flags.elearning ? (
          <Link href="/admin/courses" className="text-secondary hover:underline">
            {t("nav.courses")}
          </Link>
        ) : null}
        {flags.elearning ? (
          <Link href="/admin/course-progress" className="text-secondary hover:underline">
            {t("nav.courseProgress")}
          </Link>
        ) : null}
        {flags.elearning ? (
          <Link href="/admin/training-progress" className="text-secondary hover:underline">
            {t("nav.trainingProgress")}
          </Link>
        ) : null}
        {flags.forum ? (
          <Link href="/admin/forum" className="text-secondary hover:underline">
            {t("nav.forum")}
          </Link>
        ) : null}
        {flags.flipcharts ? (
          <Link href="/admin/flipcharts" className="text-secondary hover:underline">
            {t("nav.flipcharts")}
          </Link>
        ) : null}
        <Link href="/admin/flags" className="text-secondary hover:underline">
          {t("nav.flags")}
        </Link>
        <Link href="/settings" className="text-secondary hover:underline">
          {t("nav.settings")}
        </Link>
        {isSuperAdmin ? (
          <Link href="/super-admin" className="font-semibold text-secondary hover:underline">
            {t("nav.superAdmin")}
          </Link>
        ) : null}
      </nav>
      {children}
    </div>
  );
}
