import { redirect } from "next/navigation";
import { DesignerFlipchartConsole } from "@/components/flipcharts/designer-console";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import type { FlipChart } from "@/lib/flipcharts/types";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function DesignerFlipchartsPage() {
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.flipcharts) {
    redirect("/home");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getAppUser(supabase, user.id);
  if (!appUser || appUser.role !== "designer") {
    redirect("/home");
  }

  const { data: charts } = await supabase
    .from("flip_charts")
    .select("id, author_user_id, author_full_name, author_username, title_fil, title_en, status, review_note, created_at")
    .eq("author_user_id", appUser.id)
    .order("created_at", { ascending: false })
    .returns<FlipChart[]>();

  return (
    <DesignerFlipchartConsole
      initialCharts={charts ?? []}
      authorUserId={appUser.id}
      authorFullName={appUser.full_name}
      authorUsername={appUser.username}
    />
  );
}
