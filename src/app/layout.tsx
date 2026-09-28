import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { isAppRole, isPreviewableRole } from "@/lib/auth/roles";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { PreviewBar } from "@/components/preview/preview-bar";
import { PreviewProvider } from "@/components/preview/preview-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PersonaBar } from "@/components/super-admin/persona-bar";
import { SUPER_ADMIN_PERSONAS_COOKIE } from "@/lib/super-admin/cookies";
import { parsePersonaSnapshot } from "@/lib/super-admin/types";
import { displayCookieName, parseDisplayCookie } from "@/lib/settings/display-cookie";
import { primaryColorHex } from "@/lib/settings/palette";
import { displayAttributes, parseA11ySettings } from "@/lib/settings/types";
import type { AppUser } from "@/lib/supabase/app-user";
import { getRequestFeatureFlags } from "@/lib/supabase/request";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Reading-font setting (Phase 4.3, docs/header-navigation-display-settings-
// plan.md §6): a dyslexia/low-vision-friendly typeface, opt-in via Settings
// -> Reading & comfort. `preload: false` keeps it out of every page's
// critical path — it only costs a network request once someone actually
// turns the setting on and `[data-reading-font="hyperlegible"]` (tokens.css)
// swaps it in; `display: "swap"` avoids an invisible-text flash for that
// same case. `latin-ext` alongside `latin` covers Filipino diacritics (e.g.
// ñ) the same way the KB/lesson content needs them rendered correctly.
const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson-hyperlegible",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  preload: false,
  display: "swap",
});

// generateMetadata/generateViewport (not the static `metadata`/`viewport`
// exports) because whether the manifest link and theme-color are present
// depends on the offline_pwa flag, which is per-request state forwarded
// from middleware — same reason a11y below reads a header instead of a
// static value.
export async function generateMetadata(): Promise<Metadata> {
  const offlinePwaEnabled = await getRequestOfflinePwaEnabled();
  return {
    title: "BHW Connect",
    description: "A companion app for Barangay Health Workers.",
    ...(offlinePwaEnabled ? { manifest: "/manifest.webmanifest" } : {}),
  };
}

export async function generateViewport(): Promise<Viewport> {
  const offlinePwaEnabled = await getRequestOfflinePwaEnabled();
  if (!offlinePwaEnabled) return {};

  const a11y = await getRequestA11ySettings();
  return { themeColor: primaryColorHex[a11y.primary_color] };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const a11y = await getRequestA11ySettings();
  const offlinePwaEnabled = await getRequestOfflinePwaEnabled();
  const notifications = await getRequestNotifications();
  const signedIn = await getRequestSignedIn();
  const account = signedIn ? await getRequestAccount() : null;
  const persona = signedIn ? await getRequestPersona() : null;
  const preview = signedIn ? await getRequestPreview() : null;
  const flags = await getRequestFeatureFlags();
  const t = await getTranslations("common");

  return (
    <html
      lang={locale}
      {...displayAttributes(a11y)}
      className={`${geistSans.variable} ${geistMono.variable} ${atkinsonHyperlegible.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PreviewProvider isPreview={Boolean(preview)}>
            <a
              href="#main"
              className="sr-only rounded-md bg-primary px-4 py-2 font-medium text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
            >
              {t("skipToContent")}
            </a>
            <SiteHeader
              signedIn={signedIn}
              account={account}
              notificationsEnabled={notifications.enabled}
              notifUnreadCount={notifications.unreadCount}
              flags={flags}
              initialA11y={a11y}
            />
            {persona ? <PersonaBar currentUserId={persona.userId} snapshot={persona.snapshot} /> : null}
            {preview ? <PreviewBar role={preview.role} /> : null}
            <main id="main" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
              {children}
            </main>
            <SiteFooter />
          </PreviewProvider>
        </NextIntlClientProvider>
        <ServiceWorkerRegister enabled={offlinePwaEnabled} />
      </body>
    </html>
  );
}

// A signed-in profile's a11y_settings is the source of truth: middleware
// (src/lib/supabase/middleware.ts) already fetches it for auth gating and
// forwards it as a request header, so this doesn't need its own Supabase
// round trip. Unauthenticated pages (login, privacy, etc.) render through
// this layout too but never get that header (middleware strips any
// client-supplied x-app-* headers before a signed-out request reaches
// here), so they fall back to the BHW_DISPLAY cookie a previous visit's
// header quick-display popover wrote (increment 3.5) — same "profile wins,
// cookie is the signed-out fallback" split as BHW_LOCALE/src/i18n/request.ts.
async function getRequestA11ySettings() {
  const h = await headers();
  const raw = h.get("x-app-a11y");
  if (raw) {
    try {
      return parseA11ySettings(JSON.parse(raw));
    } catch {
      return parseA11ySettings(null);
    }
  }

  const cookieValue = (await cookies()).get(displayCookieName)?.value;
  return parseDisplayCookie(cookieValue);
}

async function getRequestOfflinePwaEnabled() {
  const h = await headers();
  return h.get("x-app-offline-pwa") === "1";
}

async function getRequestNotifications() {
  const h = await headers();
  return {
    enabled: h.get("x-app-notifications") === "1",
    unreadCount: Number(h.get("x-app-notif-unread") ?? "0"),
  };
}

async function getRequestSignedIn() {
  const h = await headers();
  return h.get("x-app-signed-in") === "1";
}

// RFT B1 (docs/role-feature-toggles-plan.md §4.4): the header, its nav and
// the user menu gate on the effective role — the preview role while an
// admin is previewing, otherwise the signed-in user's own role — so "View
// as BHW" genuinely shows the BHW's nav and features, not the admin's own.
async function getRequestAccount(): Promise<{ username: string; role: AppUser["role"] } | null> {
  const h = await headers();
  const username = h.get("x-app-username");
  const role = h.get("x-app-effective-role") ?? h.get("x-app-role");
  if (!username || !isAppRole(role)) {
    return null;
  }
  return { username, role };
}

async function getRequestPreview() {
  const h = await headers();
  if (h.get("x-app-preview") !== "1") return null;
  const role = h.get("x-app-effective-role");
  if (!isPreviewableRole(role)) return null;
  return { role };
}

// The super admin's persona bar: only while the signed-in user is one of the
// personas in the snapshot cookie, so a stale cookie shows nothing to anyone
// else. Both inputs are already on the request; no extra lookup.
async function getRequestPersona() {
  const h = await headers();
  const userId = h.get("x-app-user-id");
  if (!userId) return null;
  const snapshot = parsePersonaSnapshot((await cookies()).get(SUPER_ADMIN_PERSONAS_COOKIE)?.value);
  if (!snapshot || !snapshot.personas.some((p) => p.id === userId)) return null;
  return { userId, snapshot };
}
