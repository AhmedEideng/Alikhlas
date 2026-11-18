/**
 * ============================================================
 * Service Worker kill-switch — network-only PWA
 * ============================================================
 * Runtime policy is intentionally network-only: the manifest/install UI stay active,
 * but the application does not register an offline caching worker.
 * ============================================================
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clientsList = await self.clients.matchAll({ type: "window" });
      for (const client of clientsList) {
        try {
          await client.navigate(client.url);
        } catch {
          // Ignore navigation failures on background tabs
        }
      }
    })(),
  );
});
