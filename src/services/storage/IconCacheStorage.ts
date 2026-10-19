/** Кэш иконок календаря. Без срока жизни, см. src/service-worker.js */
export const CALENDAR_ICONS_CACHE = "offline-icons-calendar";

/** Кэш иконок святых */
export const SAINT_ICONS_CACHE = "offline-icons-saints";

export const OFFLINE_ICON_CACHES = [CALENDAR_ICONS_CACHE, SAINT_ICONS_CACHE] as const;

/**
 * Скачанные файлы иконок в Cache Storage, по одному кэшу на модуль.
 * Удаление модуля — caches.delete(cacheName).
 */
export class IconCacheStorage {
  private readonly cacheName: string;

  constructor(cacheName: string) {
    this.cacheName = cacheName;
  }

  async putIcon(url: string, blob: Blob): Promise<void> {
    const cache = await caches.open(this.cacheName);
    const headers = new Headers();
    if (blob.type) headers.set("Content-Type", blob.type);
    await cache.put(url, new Response(blob, { status: 200, headers }));
  }

  async hasIcon(url: string): Promise<boolean> {
    const cached = await caches.match(url, { cacheName: this.cacheName });
    return cached != null;
  }

  async clear(): Promise<void> {
    await caches.delete(this.cacheName);
  }
}
