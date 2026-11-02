import { describe, expect, it } from "vitest";
import { bookmarkProgressToPage, pageToProgress, progressToPage } from "@/composables/useBookmarks";

describe("bookmark page mapping", () => {
  it("возвращает страницу, с которой сохранили закладку", () => {
    for (const total of [2, 5, 12, 40]) {
      for (let page = 1; page <= total; page += 1) {
        expect(bookmarkProgressToPage(pageToProgress(page, total), total)).toBe(page);
      }
    }
  });

  it("не относит границу страницы на предыдущую, в отличие от floor", () => {
    const progress = pageToProgress(32, 40);
    expect(progressToPage(progress, 40)).toBe(31);
    expect(bookmarkProgressToPage(progress, 40)).toBe(32);
  });

  it("не сдвигает закладку на предыдущую страницу из-за погрешности float", () => {
    const total = 12;
    const progress = pageToProgress(5, total);
    const justBelow = progress * (total - 1) - 1e-10;
    const nudged = justBelow / (total - 1);
    expect(bookmarkProgressToPage(nudged, total)).toBe(5);
  });
});
