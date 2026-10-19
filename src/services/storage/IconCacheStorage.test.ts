import { beforeEach, describe, expect, it } from "vitest";
import {
  CALENDAR_ICONS_CACHE,
  IconCacheStorage,
  SAINT_ICONS_CACHE,
} from "@/services/storage/IconCacheStorage";

describe("IconCacheStorage", () => {
  const calendar = new IconCacheStorage(CALENDAR_ICONS_CACHE);
  const saints = new IconCacheStorage(SAINT_ICONS_CACHE);

  beforeEach(async () => {
    await calendar.clear();
    await saints.clear();
  });

  it("putIcon виден только в своём кэше и только по этому url", async () => {
    const url = "https://app.valaam.ru/a.png";
    await calendar.putIcon(url, new Blob([new Uint8Array([1])], { type: "image/png" }));

    expect(await calendar.hasIcon(url)).toBe(true);
    expect(await calendar.hasIcon("https://app.valaam.ru/other.png")).toBe(false);
    expect(await saints.hasIcon(url)).toBe(false);

    const cached = await caches.match(url, { cacheName: CALENDAR_ICONS_CACHE });
    expect(cached?.headers.get("Content-Type")).toBe("image/png");
  });

  it("clear удаляет только свой кэш", async () => {
    const url = "https://app.valaam.ru/a.png";
    await calendar.putIcon(url, new Blob([new Uint8Array([1])]));
    await saints.putIcon(url, new Blob([new Uint8Array([2])]));

    await calendar.clear();

    expect(await calendar.hasIcon(url)).toBe(false);
    expect(await saints.hasIcon(url)).toBe(true);
  });
});
