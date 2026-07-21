import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, localeCookieName } from "./locales";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = (await profileLocale()) ?? (cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

// A signed-in user's profile language is the source of truth (it's what
// "persisted to profile, applied everywhere ... survives a second device"
// means in practice) — the BHW_LOCALE cookie only matters for signed-out
// pages, where there's no profile to read yet. Middleware
// (src/lib/supabase/middleware.ts) already fetches the profile for auth
// gating and forwards the language as a request header, so this doesn't
// need its own Supabase round trip.
async function profileLocale() {
  const h = await headers();
  const language = h.get("x-app-language");
  return language && isLocale(language) ? language : null;
}
