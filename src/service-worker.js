import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";

const ALLOWED_DOMAIN = 'molitvoslov.valaam.ru';

// Перехватываем все запросы
self.addEventListener('fetch', (event) => {

  if (event.request.mode === 'navigate') {
    const url = new URL(event.request.url);

    console.log('fetch navigate', url);
    
    // Проверяем, соответствует ли домен разрешенному
    if (url.hostname !== ALLOWED_DOMAIN) {
      console.log('fetch navigate', url, 'blocked');
      // Если домен не разрешен, блокируем запрос
      event.respondWith(
        new Response('Доступ к внешним ресурсам заблокирован', {
          status: 403,
          statusText: 'Forbidden',
          headers: {
            'Content-Type': 'text/plain'
          }
        })
      );
      return;
    }
  }
  
  // Для разрешенного домена пропускаем запрос как обычно
  // Workbox обработает его согласно другим правилам кэширования
});

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

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
