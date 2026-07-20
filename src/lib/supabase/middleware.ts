import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// 8-hour idle timeout, sliding on activity (delivery-plan.md §5.1). This is
// enforced here independently of Supabase's own JWT/refresh-token expiry,
// which is a project-dashboard setting outside this codebase.
const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const LAST_ACTIVITY_COOKIE = "BHW_LAST_ACTIVITY";

// Reachable without a session.
const PUBLIC_PATHS = new Set(["/login", "/privacy"]);

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return PUBLIC_PATHS.has(pathname) ? response : redirectTo(request, "/login");
  }

  const lastActivity = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
  const now = Date.now();
  if (lastActivity && now - Number(lastActivity) > IDLE_TIMEOUT_MS) {
    await supabase.auth.signOut();
    const idleResponse = redirectTo(request, "/login", "idle_timeout");
    idleResponse.cookies.delete(LAST_ACTIVITY_COOKIE);
    return idleResponse;
  }
  response.cookies.set(LAST_ACTIVITY_COOKIE, String(now), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: IDLE_TIMEOUT_MS / 1000,
  });

  if (pathname === "/privacy") {
    return response;
  }
  if (pathname === "/login") {
    return redirectTo(request, "/");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("must_change_password, consented_at, status")
    .eq("auth_user_id", user.id)
    .single();

  if (!appUser || appUser.status === "deactivated") {
    await supabase.auth.signOut();
    return redirectTo(request, "/login", "deactivated");
  }

  if (appUser.must_change_password) {
    return pathname === "/change-password" ? response : redirectTo(request, "/change-password");
  }
  if (pathname === "/change-password") {
    return redirectTo(request, "/");
  }

  if (!appUser.consented_at) {
    return pathname === "/consent" ? response : redirectTo(request, "/consent");
  }
  if (pathname === "/consent") {
    return redirectTo(request, "/");
  }

  return response;
}

function redirectTo(request: NextRequest, pathname: string, reason?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = reason ? `?reason=${reason}` : "";
  return NextResponse.redirect(url);
}
