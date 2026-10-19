import { beforeEach, describe, expect, it } from "vitest";
import {
  CALENDAR_ICONS_CACHE,
  IconCacheStorage,
  matchOfflineIcon,
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

  it("другой размер той же иконки находится по имени файла", async () => {
    const downloaded =
      "https://app.valaam.ru/upload/iblock/5e3/5e3fe6842571aa7695a712dbc3284561.jpg";
    const requested =
      "https://app.valaam.ru/upload/resize_cache/iblock/5e3/414_999999_1/5e3fe6842571aa7695a712dbc3284561.jpg";
    await saints.putIcon(downloaded, new Blob([new Uint8Array([7, 8])], { type: "image/jpeg" }));

    const fallback = await matchOfflineIcon(new Request(requested));
    const exact = await matchOfflineIcon(new Request(downloaded));
    const fallbackText = await fallback!.text();

    expect(fallback?.headers.get("Content-Type")).toBe("image/jpeg");
    expect(fallbackText).toBe(await exact!.text());
    expect(fallbackText).not.toContain("5e3fe684");
  });

  it("чужой файл по имени не подменяется", async () => {
    await saints.putIcon(
      "https://app.valaam.ru/upload/iblock/5e3/5e3fe6842571aa7695a712dbc3284561.jpg",
      new Blob([new Uint8Array([1])])
    );

    expect(
      await matchOfflineIcon(
        new Request("https://app.valaam.ru/upload/iblock/6af/6af3c677c1408fa177f0bfeba227826c.jpg")
      )
    ).toBeUndefined();
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
