"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function giveConsent() {
  const supabase = await createClient();
  await supabase.rpc("rpc_give_consent");
  redirect("/");
}
