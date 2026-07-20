import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
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

  const t = await getTranslations("admin");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <nav className="flex gap-4 border-b border-ink/10 pb-3 text-sm font-medium">
        <Link href="/admin/users" className="text-secondary hover:underline">
          {t("nav.users")}
        </Link>
        <Link href="/admin/audit" className="text-secondary hover:underline">
          {t("nav.audit")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
