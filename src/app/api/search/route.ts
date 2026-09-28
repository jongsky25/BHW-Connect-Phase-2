import { NextResponse, type NextRequest } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { searchContent } from "@/lib/search/content";
import { getNavItems } from "@/lib/nav/nav-items";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import { isAppRole } from "@/lib/auth/roles";
import { APP_FLAGS_HEADER, forwardedAppUser, getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";
import type { FeatureFlags } from "@/lib/flags/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const db = await createClient();
  const { data } = await db.auth.getClaims();
  const authId = data?.claims?.sub;
  if (!authId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = forwardedAppUser(request.headers, authId) ?? await getAppUser(db, authId);
  if (!user || user.status !== "active") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const previewRole = request.headers.get("x-app-effective-role");
  const role = request.headers.get("x-app-preview") === "1" && isAppRole(previewRole) ? previewRole : user.role;

  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.length > 80) return NextResponse.json({ error: "query too long" }, { status: 400 });
  if (q.trim().length < 2) return NextResponse.json({ results: [] }, { headers: { "Cache-Control": "no-store" } });

  // Middleware forwards role-effective flags. Fall back to a fresh read when
  // this route is reached without that trusted header.
  let flags: FeatureFlags;
  try {
    const raw = request.headers.get(APP_FLAGS_HEADER);
    if (!raw) throw new Error("missing flags");
    flags = JSON.parse(raw) as FeatureFlags;
  } catch {
    flags = await getFeatureFlags(db, role);
  }

  try {
    const [locale, tNav] = await Promise.all([getLocale(), getTranslations("authHome")]);
    const pages = getNavItems({ role, flags })
      .filter((item) => tNav(item.labelKey).toLocaleLowerCase().includes(q.trim().toLocaleLowerCase()))
      .map((item) => ({ id: `page-${item.id}`, kind: "page" as const,
        title: tNav(item.labelKey), excerpt: "", href: item.href }));
    const content = await searchContent(db, flags, locale, q, 5);
    const results = [...pages, ...content];
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "search unavailable" }, { status: 500 });
  }
}
