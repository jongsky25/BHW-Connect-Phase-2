"use server";

import { redirect } from "next/navigation";
import { PROFILE_SELECT_COLUMNS, type UserProfile } from "@/lib/auth/session";
import { isValidUsername, normalizeUsername, toAuthEmail } from "@/lib/auth/username";
import { createClient } from "@/lib/supabase/server";

export type LoginErrorCode = "missingFields" | "invalidCredentials" | "locked" | "deactivated";

export type LoginState = {
  error?: LoginErrorCode;
  lockedMinutes?: number;
};

type LoginPrecheckRow = {
  auth_email: string;
  status: string;
  locked: boolean;
  locked_until: string | null;
};

type RecordAttemptRow = {
  locked: boolean;
  locked_until: string | null;
};

function minutesUntil(isoTimestamp: string | null): number {
  if (!isoTimestamp) return 15;
  const ms = new Date(isoTimestamp).getTime() - Date.now();
  return Math.max(1, Math.ceil(ms / 60000));
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const usernameInput = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const username = normalizeUsername(usernameInput);

  if (!username || !password) {
    return { error: "missingFields" };
  }
  if (!isValidUsername(username)) {
    return { error: "invalidCredentials" };
  }

  const supabase = await createClient();

  const { data: precheckRows } = await supabase.rpc("rpc_login_precheck", { p_username: username });
  const precheck = (precheckRows?.[0] as LoginPrecheckRow | undefined) ?? undefined;

  if (precheck?.locked) {
    return { error: "locked", lockedMinutes: minutesUntil(precheck.locked_until) };
  }

  if (precheck?.status === "deactivated") {
    return { error: "deactivated" };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: toAuthEmail(username),
    password,
  });

  if (signInError) {
    const { data: attemptRows } = await supabase.rpc("rpc_record_login_attempt", {
      p_username: username,
      p_success: false,
    });
    const attempt = (attemptRows?.[0] as RecordAttemptRow | undefined) ?? undefined;
    if (attempt?.locked) {
      return { error: "locked", lockedMinutes: minutesUntil(attempt.locked_until) };
    }
    return { error: "invalidCredentials" };
  }

  await supabase.rpc("rpc_record_login_attempt", { p_username: username, p_success: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("auth_user_id", user?.id ?? "")
    .single<UserProfile>();

  if (profile?.must_change_password) {
    redirect("/change-password");
  }
  if (!profile?.consented_at) {
    redirect("/consent");
  }
  redirect("/");
}
