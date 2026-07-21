import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { headers } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { parseA11ySettings } from "@/lib/settings/types";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BHW Connect",
  description: "A companion app for Barangay Health Workers.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const a11y = await getRequestA11ySettings();

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
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
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
