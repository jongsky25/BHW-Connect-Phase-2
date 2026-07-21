import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";
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
// pages, where there's no profile to read yet.
async function profileLocale() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const appUser = await getAppUser(supabase, user.id);
  return appUser?.language ?? null;
}
