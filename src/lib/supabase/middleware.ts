import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppUser } from "@/lib/auth/app-user";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// A BHW's working day (delivery-plan.md §5.1): sign out after 8 hours with
// no observed request, refreshed on every request that isn't itself stale.
const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const LAST_SEEN_COOKIE = "BHW_LAST_SEEN";

const PUBLIC_PATHS = ["/login", "/privacy"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function redirectTo(request: NextRequest, pathWithQuery: string) {
  const url = request.nextUrl.clone();
  const [pathname, search] = pathWithQuery.split("?");
  url.pathname = pathname;
  url.search = search ?? "";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    return isPublicPath(pathname) ? response : redirectTo(request, "/login");
  }

  const lastSeenRaw = request.cookies.get(LAST_SEEN_COOKIE)?.value;
  const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : null;
  const now = Date.now();

  if (lastSeen && now - lastSeen > IDLE_TIMEOUT_MS) {
    await supabase.auth.signOut();
    const redirect = redirectTo(request, "/login?timeout=1");
    redirect.cookies.delete(LAST_SEEN_COOKIE);
    return redirect;
  }

  response.cookies.set(LAST_SEEN_COOKIE, String(now), {
    path: "/",
    sameSite: "lax",
    maxAge: IDLE_TIMEOUT_MS / 1000,
  });

  if (pathname === "/login") {
    return redirectTo(request, "/");
  }

  const appUser = await getAppUser(supabase);

  if (!appUser || appUser.status !== "active") {
    await supabase.auth.signOut();
    return redirectTo(request, "/login");
  }

  if (isPublicPath(pathname)) {
    return response;
  }

  if (appUser.must_change_password) {
    return pathname === "/change-password" ? response : redirectTo(request, "/change-password");
  }

  if (!appUser.consented_at) {
    return pathname === "/consent" ? response : redirectTo(request, "/consent");
  }

  if (pathname === "/change-password" || pathname === "/consent") {
    return redirectTo(request, "/");
  }

  return response;
}
