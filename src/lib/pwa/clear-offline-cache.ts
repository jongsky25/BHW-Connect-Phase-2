// Cached pages can include another BHW's data on a shared device. Called
// on sign-out so a logged-out session doesn't leave them sitting in
// Cache Storage — a no-op wherever offline_pwa was never on.
export async function clearOfflineCache() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  registration?.active?.postMessage("clear-cache");
}
