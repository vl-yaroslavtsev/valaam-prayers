/**
 * Минимальный Cache Storage для jsdom: в нём нет window.caches.
 * Ключ записи — URL, как у Cache API.
 */
class MemoryCache {
  private readonly entries = new Map<string, Response>();

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    this.entries.set(requestKey(request), response.clone());
  }

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    return this.entries.get(requestKey(request))?.clone();
  }
}

class MemoryCacheStorage {
  private readonly caches = new Map<string, MemoryCache>();

  async open(cacheName: string): Promise<Cache> {
    let cache = this.caches.get(cacheName);
    if (!cache) {
      cache = new MemoryCache();
      this.caches.set(cacheName, cache);
    }
    return cache as unknown as Cache;
  }

  async match(request: RequestInfo | URL, options?: MultiCacheQueryOptions): Promise<Response | undefined> {
    if (options?.cacheName) {
      return this.caches.get(options.cacheName)?.match(request);
    }
    for (const cache of this.caches.values()) {
      const found = await cache.match(request);
      if (found) return found;
    }
    return undefined;
  }

  async delete(cacheName: string): Promise<boolean> {
    return this.caches.delete(cacheName);
  }

  async has(cacheName: string): Promise<boolean> {
    return this.caches.has(cacheName);
  }

  async keys(): Promise<string[]> {
    return Array.from(this.caches.keys());
  }
}

function requestKey(request: RequestInfo | URL): string {
  if (typeof request === "string") return request;
  if (request instanceof URL) return request.href;
  return request.url;
}

export function installMemoryCacheStorage(): void {
  if (typeof globalThis.caches !== "undefined") return;
  globalThis.caches = new MemoryCacheStorage() as unknown as CacheStorage;
}
