"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: "missing" | "invalid" | "deactivated" | "locked";
  lockedUntil?: string;
}

interface LoginPrecheck {
  auth_email: string;
  status: "invited" | "active" | "deactivated";
  locked: boolean;
  locked_until: string | null;
}

interface LoginAttemptResult {
  locked: boolean;
  locked_until: string | null;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "missing" };
  }

  const supabase = await createClient();

  const { data: precheck } = await supabase
    .rpc("rpc_login_precheck", { p_username: username })
    .maybeSingle<LoginPrecheck>();

  if (!precheck) {
    return { error: "invalid" };
  }

  if (precheck.status === "deactivated") {
    return { error: "deactivated" };
  }

  if (precheck.status !== "active") {
    return { error: "invalid" };
  }

  if (precheck.locked) {
    return { error: "locked", lockedUntil: precheck.locked_until ?? undefined };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: precheck.auth_email,
    password,
  });

  const { data: attempt } = await supabase
    .rpc("rpc_record_login_attempt", { p_username: username, p_success: !signInError })
    .maybeSingle<LoginAttemptResult>();

  if (signInError) {
    if (attempt?.locked) {
      return { error: "locked", lockedUntil: attempt.locked_until ?? undefined };
    }
    return { error: "invalid" };
  }

  redirect("/");
}
