"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CreateUserState {
  error?: "usernameTaken" | "outOfScope" | "unknown";
  result?: { username: string; tempPassword: string };
}

interface CreateUserResult {
  user_id: string;
  temp_password: string;
}

export async function createUser(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const username = String(formData.get("username") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "bhw");
  const orgUnitId = String(formData.get("orgUnitId") ?? "");
  const contactNumber = String(formData.get("contactNumber") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!username || !fullName || !orgUnitId) {
    return { error: "unknown" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("rpc_admin_create_user", {
      p_username: username,
      p_full_name: fullName,
      p_role: role,
      p_org_unit_id: orgUnitId,
      p_contact_number: contactNumber,
      p_email: email,
      p_address: address,
    })
    .maybeSingle<CreateUserResult>();

  if (error || !data) {
    if (error?.code === "23505") {
      return { error: "usernameTaken" };
    }
    if (error?.message.includes("out of scope")) {
      return { error: "outOfScope" };
    }
    return { error: "unknown" };
  }

  revalidatePath("/admin/users");
  return { result: { username, tempPassword: data.temp_password } };
}

export interface SimpleActionState {
  error?: "lastAdmin" | "outOfScope" | "unknown";
  tempPassword?: string;
}

export async function resetPassword(
  _prevState: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const userId = String(formData.get("userId") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("rpc_admin_reset_password", { p_user_id: userId })
    .maybeSingle<{ temp_password: string }>();

  if (error || !data) {
    return { error: error?.message.includes("out of scope") ? "outOfScope" : "unknown" };
  }

  revalidatePath("/admin/users");
  return { tempPassword: data.temp_password };
}

export async function setStatus(
  _prevState: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("rpc_admin_set_status", {
    p_user_id: userId,
    p_status: status,
  });

  if (error) {
    if (error.message.includes("last active admin")) {
      return { error: "lastAdmin" };
    }
    if (error.message.includes("out of scope")) {
      return { error: "outOfScope" };
    }
    return { error: "unknown" };
  }

  revalidatePath("/admin/users");
  return {};
}
