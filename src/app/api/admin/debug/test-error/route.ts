import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

// Manual Sentry-wiring verification (INC-9 DoD: "a thrown test error
// appears in the tracker"): once SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN are
// configured, an admin hitting this route should see the error land in
// the Sentry project within a minute or two. Admin-gated so it can't be
// used to spam events from outside the console.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const appUser = await getAppUser(supabase, user.id);
  if (!appUser || appUser.role !== "admin") {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  throw new Error("INC-9 Sentry wiring test error — safe to ignore in the tracker.");
}
