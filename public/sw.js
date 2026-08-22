// Installability and update delivery only — no offline caching.
//
// This worker used to cache the app shell so the app could open with no
// network. That promise no longer holds: the vault lives in Postgres, so a
// shell served from cache would render a lock screen that then fails to reach
// the server. An honest network error beats a shell that looks alive and
// isn't, so there is deliberately no `fetch` handler here.
//
// It stays registered because it is what makes the app installable to a home
// screen and drives the "a new version is ready" banner.

self.addEventListener("install", () => {
  // Nothing to precache.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // Drop every cache this worker used to populate, so an upgrading client
      // isn't left with a stale shell from the previous strategy.
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
