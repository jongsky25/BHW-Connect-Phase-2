import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Supabase project provisioning happens alongside INC-1 (auth). Until
  // NEXT_PUBLIC_SUPABASE_* is configured, pass requests through untouched
  // so the foundation shell keeps working without a project connected.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  // sw.js/manifest.webmanifest are static files the service worker itself
  // fetches (including during an offline-triggered update check) — they
  // must stay reachable without going through session/appUser lookups.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
