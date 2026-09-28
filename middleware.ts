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
  //
  // Static files in public/ (lesson narration mp3s, clips, captions, PDFs)
  // are excluded too: each request used to run getUser + the profile, flags
  // and unread-count reads, and the bhw_last_activity Set-Cookie made the
  // response uncacheable at the CDN. They are public training material,
  // content-hashed and cached as immutable (next.config.ts headers()).
  // Excluded by extension, not by the /training prefix — /training/... is
  // also the manual's page route.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|mp4|webm|vtt|pdf|txt|woff2?)$).*)",
  ],
};
