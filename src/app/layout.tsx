import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PersonaBar } from "@/components/super-admin/persona-bar";
import { SUPER_ADMIN_PERSONAS_COOKIE } from "@/lib/super-admin/cookies";
import { parsePersonaSnapshot } from "@/lib/super-admin/types";
import { parseA11ySettings } from "@/lib/settings/types";
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
  return offlinePwaEnabled ? { themeColor: "#b84e12" } : {};
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
  const flags = await getRequestFeatureFlags();
  const t = await getTranslations("common");

  return (
    <html
      lang={locale}
      data-theme={a11y.theme === "system" ? undefined : a11y.theme}
      data-font-scale={a11y.font_scale}
      data-contrast={a11y.high_contrast ? "high" : undefined}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <NextIntlClientProvider locale={locale} messages={messages}>
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
          />
          {persona ? <PersonaBar currentUserId={persona.userId} snapshot={persona.snapshot} /> : null}
          <main id="main" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
        <ServiceWorkerRegister enabled={offlinePwaEnabled} />
      </body>
    </html>
  );
}

// Unauthenticated pages (login, privacy, etc.) render through this layout
// too, so a signed-out visitor falls through to the CSS-only defaults
// (OS-level prefers-color-scheme, "md" font scale, no forced contrast).
// The signed-in case is populated by middleware (src/lib/supabase/middleware.ts),
// which forwards it as a request header rather than this layout re-fetching
// the profile itself on every request.
async function getRequestA11ySettings() {
  const h = await headers();
  const raw = h.get("x-app-a11y");
  if (!raw) return parseA11ySettings(null);

  try {
    return parseA11ySettings(JSON.parse(raw));
  } catch {
    return parseA11ySettings(null);
  }
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

async function getRequestAccount(): Promise<{ username: string; role: AppUser["role"] } | null> {
  const h = await headers();
  const username = h.get("x-app-username");
  const role = h.get("x-app-role");
  if (!username || (role !== "bhw" && role !== "assessor" && role !== "designer" && role !== "admin")) {
    return null;
  }
  return { username, role };
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
