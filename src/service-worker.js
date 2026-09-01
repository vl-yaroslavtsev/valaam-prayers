import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

const ALLOWED_DOMAIN = ['app.valaam.ru', 'localhost', '172.21.117.5'];

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.destination === "image",
  // Use a cache-first strategy with the following config:
  new CacheFirst({
    // You need to provide a cache name when using expiration.
    cacheName: "images",
    plugins: [
      new ExpirationPlugin({
        // Keep at most 100 entries.
        maxEntries: 100,
        // Don't keep any entries for more than 30 days.
        maxAgeSeconds: 30 * 24 * 60 * 60,
        // Automatically cleanup if quota is exceeded.
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) => /^\/api\/prayers\/\d+$/.test(url.pathname),
  // Use a cache-first strategy with the following config:
  new StaleWhileRevalidate({
    // You need to provide a cache name when using expiration.
    cacheName: "prayer-texts",
    plugins: [
      new ExpirationPlugin({
        // Keep at most 100 entries.
        maxEntries: 100,
        // Automatically cleanup if quota is exceeded.
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.pathname === '/api/prayers/list' && url.searchParams.get('section_id') && url.searchParams.get('composed'),
  // Use a cache-first strategy with the following config:
  new StaleWhileRevalidate({
    // You need to provide a cache name when using expiration.
    cacheName: "prayer-composed-texts",
    plugins: [
      new ExpirationPlugin({
        // Keep at most 100 entries.
        maxEntries: 100,
        // Automatically cleanup if quota is exceeded.
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// Разовое чтение карточки святого не из офлайн-набора (см. src/stores/saints.ts getSaintDetails)
registerRoute(
  ({ url }) => /^\/api\/saints\/\d+$/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: "saint-details",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// Разовое чтение дня календаря не из офлайн-набора (см. src/stores/calendar.ts getDayByCode)
registerRoute(
  ({ url }) => /^\/api\/days\/[0-9]{8}$/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: "calendar-days",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
