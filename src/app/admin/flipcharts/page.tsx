import { redirect } from "next/navigation";
import { AdminFlipchartConsole } from "@/components/flipcharts/admin-console";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import type { FlipChart, FlipChartPage } from "@/lib/flipcharts/types";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function AdminFlipchartsPage() {
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.flipcharts) {
    redirect("/admin/users");
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

  const { data: charts } = await supabase
    .from("flip_charts")
    .select(
      "id, author_user_id, author_full_name, author_username, title_fil, title_en, status, review_note, created_at, flip_chart_pages(id, flip_chart_id, position, client_image_url, client_caption_fil, client_caption_en, script_fil, script_en)",
    )
    .order("created_at", { ascending: false })
    .returns<(FlipChart & { flip_chart_pages: FlipChartPage[] })[]>();

  return (
    <AdminFlipchartConsole
      initialCharts={charts ?? []}
      authorUserId={appUser.id}
      authorFullName={appUser.full_name}
      authorUsername={appUser.username}
    />
  );
}
