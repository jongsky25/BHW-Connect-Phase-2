import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

function optionalText(value: FormDataEntryValue | null, max: number): string | null {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max) || null;
}

function coordinate(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const appUser = await getAppUser(supabase, user.id);
  if (!appUser || appUser.status !== "active") {
    return NextResponse.json({ error: "account inactive" }, { status: 403 });
  }
  const { data: allowed, error: accessError } = await supabase.rpc("spot_feedback_access");
  if (accessError || allowed !== true) {
    return NextResponse.json({ error: "feedback unavailable" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const message = optionalText(form?.get("message") ?? null, 4000);
  const pagePath = optionalText(form?.get("page_path") ?? null, 300);
  if (!message || !pagePath || !pagePath.startsWith("/") || pagePath.startsWith("//") || pagePath.includes("?")) {
    return NextResponse.json({ error: "invalid comment or page" }, { status: 400 });
  }

  const screenshot = form?.get("screenshot");
  let screenshotPath: string | null = null;
  if (screenshot instanceof File && screenshot.size > 0) {
    if (screenshot.size > MAX_SCREENSHOT_BYTES || screenshot.type !== "image/png") {
      return NextResponse.json({ error: "invalid screenshot" }, { status: 400 });
    }
    const bytes = new Uint8Array(await screenshot.arrayBuffer());
    const pngMagic = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!pngMagic.every((byte, index) => bytes[index] === byte)) {
      return NextResponse.json({ error: "invalid screenshot" }, { status: 400 });
    }
    screenshotPath = `${user.id}/${crypto.randomUUID()}.png`;
    const { error } = await supabase.storage.from("spot-feedback").upload(screenshotPath, bytes, {
      contentType: "image/png", upsert: false,
    });
    if (error) return NextResponse.json({ error: "screenshot upload failed" }, { status: 400 });
  }

  const { data, error } = await supabase.from("spot_feedback").insert({
    submitted_by: appUser.id,
    org_unit_id: appUser.org_unit_id,
    page_path: pagePath,
    message,
    element_selector: optionalText(form?.get("element_selector") ?? null, 500),
    element_label: optionalText(form?.get("element_label") ?? null, 160),
    element_tag: optionalText(form?.get("element_tag") ?? null, 30),
    anchor_x: coordinate(form?.get("anchor_x") ?? null),
    anchor_y: coordinate(form?.get("anchor_y") ?? null),
    screenshot_path: screenshotPath,
  }).select("id").single();
  if (error || !data) {
    if (screenshotPath) await supabase.storage.from("spot-feedback").remove([screenshotPath]);
    return NextResponse.json({ error: "could not save comment" }, { status: 400 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
