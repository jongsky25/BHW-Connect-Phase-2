"use server";

import { redirect } from "next/navigation";
import { validatePassword } from "@/lib/auth/password-policy";
import { PROFILE_SELECT_COLUMNS, type UserProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ChangePasswordErrorCode = "mismatch" | "too_short" | "too_common" | "not_authenticated";

export type ChangePasswordState = {
  error?: ChangePasswordErrorCode;
};

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword !== confirmPassword) {
    return { error: "mismatch" };
  }

  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return { error: validation.errors[0] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "not_authenticated" };
  }

  await supabase.auth.updateUser({ password: newPassword });
  await supabase.rpc("rpc_complete_password_change");

  const { data: profile } = await supabase
    .from("users")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("auth_user_id", user.id)
    .single<UserProfile>();

  if (!profile?.consented_at) {
    redirect("/consent");
  }
  redirect("/");
}
