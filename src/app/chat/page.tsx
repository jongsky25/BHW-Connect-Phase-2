import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ChatGuide } from "@/components/chat/chat-guide";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage() {
  const supabase = await createClient();
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

  const t = await getTranslations("chat");
  const tCrumbs = await getTranslations("breadcrumbs");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: tCrumbs("home"), href: "/home" }, { label: t("heading") }]} />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>
      <p className="mt-1 text-ink/70">{t("intro")}</p>
      <ChatGuide />
    </div>
  );
}
