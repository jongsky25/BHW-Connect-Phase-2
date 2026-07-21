import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppUser } from "./app-user";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// A BHW's working day session: idle 8h with no requests signs them out,
// refreshed on every request that carries an active session (§5.1).
const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const LAST_ACTIVITY_COOKIE = "bhw_last_activity";

const PUBLIC_PATHS = new Set(["/", "/privacy", "/login"]);

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function redirectTo(request: NextRequest, path: string, response: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  if (!user) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!isPublicPath) {
      return redirectTo(request, "/login", response);
    }
    return response;
  }

  const lastActivity = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
  const idleExpired = lastActivity ? Date.now() - Number(lastActivity) > IDLE_TIMEOUT_MS : false;

  if (idleExpired) {
    await supabase.auth.signOut();
    const redirect = redirectTo(request, "/login?timeout=1", response);
    redirect.cookies.delete(LAST_ACTIVITY_COOKIE);
    return redirect;
  }

  response.cookies.set(LAST_ACTIVITY_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  const appUser = await getAppUser(supabase, user.id);

  if (!appUser || appUser.status !== "active") {
    await supabase.auth.signOut();
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "account inactive" }, { status: 403 });
    }
    return redirectTo(request, "/login?blocked=1", response);
  }

  if (appUser.must_change_password) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "password change required" }, { status: 403 });
    }
    if (pathname !== "/change-password") {
      return redirectTo(request, "/change-password", response);
    }
    return response;
  }

  if (!appUser.consented_at) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "consent required" }, { status: 403 });
    }
    if (pathname !== "/consent") {
      return redirectTo(request, "/consent", response);
    }
    return response;
  }

  if (pathname === "/login" || pathname === "/change-password" || pathname === "/consent") {
    return redirectTo(request, "/home", response);
  }

  if (pathname.startsWith("/admin") && appUser.role !== "admin") {
    return redirectTo(request, "/home", response);
  }

  return response;
}
