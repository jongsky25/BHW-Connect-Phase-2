import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppUser } from "./app-user";
import { getFeatureFlags } from "../flags/get-flags";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// A BHW's working day session: idle 8h with no requests signs them out,
// refreshed on every request that carries an active session (§5.1).
const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const LAST_ACTIVITY_COOKIE = "bhw_last_activity";

const PUBLIC_PATHS = new Set(["/", "/privacy", "/login", "/offline"]);

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

function cleanAppHeaders(request: NextRequest) {
  const forwardedHeaders = new Headers(request.headers);
  for (const name of forwardedHeaders.keys()) {
    if (name.startsWith("x-app-")) forwardedHeaders.delete(name);
  }
  return forwardedHeaders;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: cleanAppHeaders(request) } });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request: { headers: cleanAppHeaders(request) } });
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

  // Pages need feature_flags for the layout headers below; start that read
  // alongside the profile lookup instead of after it, so the two cost one
  // round trip instead of two. API routes never use the flags (or the
  // unread count), so they skip both reads entirely.
  const flagsPromise = isApiPath(pathname) ? null : getFeatureFlags(supabase);
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

  // A BHW provisioned at their city/municipality chooses their PSGC barangay
  // before anything else (rpc_bhw_select_barangay).
  if (appUser.role === "bhw" && appUser.org_unit_level && appUser.org_unit_level !== "barangay") {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "barangay selection required" }, { status: 403 });
    }
    if (pathname !== "/select-barangay") {
      return redirectTo(request, "/select-barangay", response);
    }
    return response;
  }

  if (
    pathname === "/login" ||
    pathname === "/change-password" ||
    pathname === "/consent" ||
    pathname === "/select-barangay"
  ) {
    return redirectTo(request, "/home", response);
  }

  if (pathname.startsWith("/admin") && appUser.role !== "admin") {
    return redirectTo(request, "/home", response);
  }

  if (!flagsPromise) {
    // API routes still read x-app-language (via next-intl) for localized
    // exports/PDFs, so keep forwarding the profile headers.
    return withAppUserHeaders(response, request, appUser, false, false, 0);
  }

  const flags = await flagsPromise;

  let notifUnreadCount = 0;
  if (flags.notifications) {
    const since = appUser.notifications_last_read_at ?? "1970-01-01T00:00:00Z";
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .gt("created_at", since);
    notifUnreadCount = count ?? 0;
  }

  return withAppUserHeaders(response, request, appUser, flags.offline_pwa, flags.notifications, notifUnreadCount);
}

// The root layout and i18n config need the signed-in user's language/a11y
// prefs (and, since INC-15, whether offline_pwa is on; since INC-16, the
// notifications flag + unread count for the header bell) on every request,
// but appUser/flags are already fetched above — forward them as request
// headers instead of making the layout re-fetch a second time inside the
// page render. That second fetch was adding an extra Supabase round trip to
// every request (including the public "/" this middleware already lets
// through), which was enough to blow the Lighthouse performance budget.
function withAppUserHeaders(
  response: NextResponse,
  request: NextRequest,
  appUser: NonNullable<Awaited<ReturnType<typeof getAppUser>>>,
  offlinePwaEnabled: boolean,
  notificationsEnabled: boolean,
  notifUnreadCount: number,
) {
  const forwardedHeaders = cleanAppHeaders(request);
  forwardedHeaders.set("x-app-language", appUser.language);
  forwardedHeaders.set("x-app-a11y", JSON.stringify(appUser.a11y_settings ?? {}));
  forwardedHeaders.set("x-app-offline-pwa", offlinePwaEnabled ? "1" : "0");
  forwardedHeaders.set("x-app-notifications", notificationsEnabled ? "1" : "0");
  forwardedHeaders.set("x-app-notif-unread", String(notifUnreadCount));
  // Signed-in users landed here with a fully set-up account (active, password
  // set, consented) — the site header's app-name link should take them back
  // to their /home, not the signed-out "/" marketing page it defaults to.
  forwardedHeaders.set("x-app-signed-in", "1");
  forwardedHeaders.set("x-app-username", appUser.username);
  forwardedHeaders.set("x-app-role", appUser.role);
  // Lets the root layout tell whether the signed-in user is one of the
  // super admin's test personas (the persona bar) without another lookup.
  forwardedHeaders.set("x-app-user-id", appUser.id);

  const next = NextResponse.next({ request: { headers: forwardedHeaders } });
  for (const cookie of response.cookies.getAll()) {
    next.cookies.set(cookie);
  }
  return next;
}
