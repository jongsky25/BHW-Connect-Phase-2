import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PROFILE_SELECT_COLUMNS, SESSION_ACTIVITY_COOKIE, SESSION_IDLE_TIMEOUT_MS, type UserProfile } from "@/lib/auth/session";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// Routes reachable with no session at all.
const PUBLIC_PATHS = new Set(["/privacy"]);
// Routes reachable with a session that hasn't finished onboarding yet.
const ONBOARDING_PATHS = new Set(["/login", "/change-password", "/consent"]);

function redirectTo(request: NextRequest, pathname: string, searchParams?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const pathname = request.nextUrl.pathname;

  if (PUBLIC_PATHS.has(pathname)) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname === "/login") {
      return response;
    }
    return redirectTo(request, "/login");
  }

  const lastActive = request.cookies.get(SESSION_ACTIVITY_COOKIE)?.value;
  const now = Date.now();
  if (lastActive && now - Number(lastActive) > SESSION_IDLE_TIMEOUT_MS) {
    await supabase.auth.signOut();
    return redirectTo(request, "/login", { reason: "timeout" });
  }

  const { data: profile } = await supabase
    .from("users")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("auth_user_id", user.id)
    .single<UserProfile>();

  if (!profile || profile.status === "deactivated") {
    await supabase.auth.signOut();
    return redirectTo(request, "/login", { reason: profile ? "deactivated" : "no_profile" });
  }

  if (profile.must_change_password && pathname !== "/change-password") {
    return redirectTo(request, "/change-password");
  }

  if (!profile.must_change_password && !profile.consented_at && pathname !== "/consent") {
    return redirectTo(request, "/consent");
  }

  const fullyOnboarded = !profile.must_change_password && Boolean(profile.consented_at);
  if (fullyOnboarded && ONBOARDING_PATHS.has(pathname)) {
    return redirectTo(request, "/");
  }

  response.cookies.set(SESSION_ACTIVITY_COOKIE, String(now), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_IDLE_TIMEOUT_MS / 1000,
  });

  return response;
}
