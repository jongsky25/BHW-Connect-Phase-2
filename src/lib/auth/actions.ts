"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { recordAuditEvent } from "./audit";
import { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS } from "./lockout";
import { validatePassword } from "./password-policy";
import { isValidUsername, usernameToSynthesizedEmail } from "./username";

export interface SignInState {
  error?: "invalid_credentials" | "deactivated" | "locked_out";
}

export async function signInAction(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password || !isValidUsername(username)) {
    return { error: "invalid_credentials" };
  }

  const service = createServiceClient();
  const { data: appUser } = await service
    .from("users")
    .select("id, status, failed_login_attempts, locked_until")
    .ilike("username", username)
    .maybeSingle();

  // Same generic error for "no such username" as for "wrong password" —
  // don't let the login form reveal which usernames are provisioned.
  if (!appUser) {
    return { error: "invalid_credentials" };
  }

  if (appUser.status === "deactivated") {
    return { error: "deactivated" };
  }

  if (appUser.locked_until && new Date(appUser.locked_until).getTime() > Date.now()) {
    return { error: "locked_out" };
  }

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: usernameToSynthesizedEmail(username),
    password,
  });

  if (authError) {
    const attempts = appUser.failed_login_attempts + 1;

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await service
        .from("users")
        .update({
          failed_login_attempts: 0,
          locked_until: new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString(),
        })
        .eq("id", appUser.id);
      await recordAuditEvent({
        actorUserId: appUser.id,
        eventType: "auth.lockout",
        metadata: { attempts },
        plainSummaryFil: `Na-lock ang account pagkatapos ng ${attempts} magkakasunod na maling password.`,
        plainSummaryEn: `Account locked after ${attempts} consecutive failed password attempts.`,
      });
      return { error: "locked_out" };
    }

    await service.from("users").update({ failed_login_attempts: attempts }).eq("id", appUser.id);
    await recordAuditEvent({
      actorUserId: appUser.id,
      eventType: "auth.login_failed",
      metadata: { attempts },
      plainSummaryFil: "Nagkamali ng password sa pag-login.",
      plainSummaryEn: "Login attempt failed with the wrong password.",
    });
    return { error: "invalid_credentials" };
  }

  const updates: Record<string, unknown> = { failed_login_attempts: 0, locked_until: null };
  if (appUser.status === "invited") {
    updates.status = "active";
  }
  await service.from("users").update(updates).eq("id", appUser.id);

  await recordAuditEvent({
    actorUserId: appUser.id,
    eventType: "auth.login",
    plainSummaryFil: "Matagumpay na naka-login.",
    plainSummaryEn: "Logged in successfully.",
  });

  // Onboarding-flow routing (forced change -> consent -> home) is decided
  // by middleware on the next request, not duplicated here.
  redirect("/");
}

export interface ChangePasswordState {
  error?: "mismatch" | "too_short" | "too_common" | "update_failed";
}

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    return { error: "mismatch" };
  }

  const validationError = validatePassword(password);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: "update_failed" };
  }

  const service = createServiceClient();
  await service.from("users").update({ must_change_password: false }).eq("auth_user_id", user.id);

  redirect("/");
}

export async function consentAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const service = createServiceClient();
  const { data: appUser } = await service
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  await service.from("users").update({ consented_at: new Date().toISOString() }).eq("auth_user_id", user.id);

  if (appUser) {
    await recordAuditEvent({
      actorUserId: appUser.id,
      eventType: "user.consent_given",
      plainSummaryFil: "Pumayag sa Patakaran sa Privacy (DPA).",
      plainSummaryEn: "Gave Data Privacy Act consent.",
    });
  }

  redirect("/");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
