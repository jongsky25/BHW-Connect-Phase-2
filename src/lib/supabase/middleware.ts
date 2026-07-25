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

// Certificate verification is meant to work for anyone with the code —
// employers, program officers — without requiring a BHW Connect account.
function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/certificates/");
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

  if (!user) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!isPublicPath(pathname)) {
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

  return withAppUserHeaders(response, request, appUser);
}

// The root layout and i18n config need the signed-in user's language/a11y
// prefs on every request, but appUser is already fetched above — forward
// it as request headers instead of making them re-fetch it a second time
// inside the page render. That second fetch was adding an extra Supabase
// round trip to every request (including the public "/" this middleware
// already lets through), which was enough to blow the Lighthouse
// performance budget.
function withAppUserHeaders(
  response: NextResponse,
  request: NextRequest,
  appUser: NonNullable<Awaited<ReturnType<typeof getAppUser>>>,
) {
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-app-language", appUser.language);
  forwardedHeaders.set("x-app-a11y", JSON.stringify(appUser.a11y_settings ?? {}));

  const next = NextResponse.next({ request: { headers: forwardedHeaders } });
  for (const cookie of response.cookies.getAll()) {
    next.cookies.set(cookie);
  }
  return next;
}
