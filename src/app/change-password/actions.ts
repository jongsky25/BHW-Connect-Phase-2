"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface ChangePasswordState {
  error?: "missing" | "tooShort" | "mismatch" | "weak" | "unknown";
}

// NIST SP 800-63B (delivery-plan.md §5.1): length over composition — no
// forced symbols/numbers/rotation. A full common-password blocklist is a
// follow-up hardening item; Supabase Auth's own weak-password check (if
// enabled on the project) still applies via the updateUser call below.
const MIN_LENGTH = 8;

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!password || !confirm) {
    return { error: "missing" };
  }

  if (password.length < MIN_LENGTH) {
    return { error: "tooShort" };
  }

  if (password !== confirm) {
    return { error: "mismatch" };
  }

  const supabase = await createClient();

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: "weak" };
  }

  const { error: rpcError } = await supabase.rpc("rpc_complete_password_change");
  if (rpcError) {
    return { error: "unknown" };
  }

  redirect("/");
}
