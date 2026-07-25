// BHW Connect service worker — INC-15 (offline / PWA).
//
// Deliberately hand-rolled instead of a build-time precache manifest:
// Next.js content-hashes its static chunks per build, so a fixed list of
// asset URLs goes stale the moment a new version deploys. Caching happens
// as pages are actually visited instead ("cache-as-you-browse") — offline
// support tracks exactly what a BHW has already opened, no promise of
// availability for pages they never loaded.
//
// Scope, deliberately trimmed (documented in docs/delivery-plan.md INC-15):
// read-only GET caching only. No background sync, no offline write queue
// (a form submitted while offline just fails the same way it would on any
// other web app — retry once back online), no push notifications. Each of
// those is its own later increment, not silently bundled into this one.

const CACHE_VERSION = "bhw-connect-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // live data only, never served stale

  if (request.mode === "navigate") {
    event.respondWith(handleNavigate(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function handleNavigate(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    return offline ?? Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached ?? (await network) ?? Response.error();
}

// Signed out on a shared device: drop everything this worker cached so a
// logged-out user's cached pages (which can include another BHW's data)
// don't sit in Cache Storage past the session that fetched them.
self.addEventListener("message", (event) => {
  if (event.data === "clear-cache") {
    event.waitUntil(caches.delete(CACHE_VERSION));
  }
});
