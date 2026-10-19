/** Кэш иконок календаря. Без срока жизни, см. src/service-worker.js */
export const CALENDAR_ICONS_CACHE = "offline-icons-calendar";

/** Кэш иконок святых */
export const SAINT_ICONS_CACHE = "offline-icons-saints";

export const OFFLINE_ICON_CACHES = [CALENDAR_ICONS_CACHE, SAINT_ICONS_CACHE] as const;

const ICON_ALIAS_HEADER = "X-Icon-Alias";

/**
 * Ключ кэша по имени файла, общее для s/m/l одной иконки.
 * В значении лежит URL скачанного файла, не само изображение.
 */
export function iconAliasUrl(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url, "https://app.valaam.ru").pathname;
  } catch {
    return null;
  }
  if (!pathname.includes("/upload/")) return null;

  const file = pathname.split("/").pop() ?? "";
  const dot = file.lastIndexOf(".");
  const id = (dot > 0 ? file.slice(0, dot) : file).trim();
  if (!id) return null;
  return `https://app.valaam.ru/__icon__/${id}`;
}

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

    const alias = iconAliasUrl(url);
    if (!alias) return;
    await cache.put(
      alias,
      new Response(url, { status: 200, headers: { [ICON_ALIAS_HEADER]: "1" } })
    );
  }

  async hasIcon(url: string): Promise<boolean> {
    const cached = await caches.match(url, { cacheName: this.cacheName });
    return cached != null && cached.headers.get(ICON_ALIAS_HEADER) !== "1";
  }

  async clear(): Promise<void> {
    await caches.delete(this.cacheName);
  }
}

/**
 * Сначала точный URL. Если браузер запросил другой размер той же иконки,
 * один caches.match по имени файла (не перебор всех записей кэша).
 */
export async function matchOfflineIcon(request: Request): Promise<Response | undefined> {
  for (const cacheName of OFFLINE_ICON_CACHES) {
    const cached = await caches.match(request, { cacheName });
    if (cached && cached.headers.get(ICON_ALIAS_HEADER) !== "1") return cached;
  }

  const alias = iconAliasUrl(request.url);
  if (!alias) return undefined;

  for (const cacheName of OFFLINE_ICON_CACHES) {
    const pointer = await caches.match(alias, { cacheName });
    if (!pointer || pointer.headers.get(ICON_ALIAS_HEADER) !== "1") continue;

    const target = (await pointer.text()).trim();
    if (!target) continue;
    const image = await caches.match(target, { cacheName });
    if (image && image.headers.get(ICON_ALIAS_HEADER) !== "1") return image;
  }

  return undefined;
}
