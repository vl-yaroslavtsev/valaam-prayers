import { describe, expect, it } from "vitest";
import {
  FLOW_CHUNK_HARD_MAX_PAGES,
  FLOW_CHUNK_TARGET_PAGES,
  countReadingHeaders,
  joinReadingPages,
  pageIsContinuation,
  planFlowChunks,
} from "./joinReadingPages";

describe("pageIsContinuation", () => {
  it("узнаёт продолжение абзаца по классу первого тега", () => {
    expect(pageIsContinuation('<p class="justify-last splitted">дальше</p>')).toBe(true);
    expect(pageIsContinuation('<p style="margin-top: 0px">новый</p>')).toBe(false);
  });
});

describe("countReadingHeaders", () => {
  it("считает непустые h2 и h3", () => {
    expect(countReadingHeaders("<p>без заголовка</p>")).toBe(0);
    expect(countReadingHeaders("<h2>Глава</h2><h3> </h3><h3>Часть</h3>")).toBe(2);
  });
});

describe("planFlowChunks", () => {
  it("режет поток на целевые куски между абзацами", () => {
    const pages = Array.from({ length: FLOW_CHUNK_TARGET_PAGES + 5 }, () => "<p>абзац</p>");
    const plans = planFlowChunks(pages);
    expect(plans.map((plan) => plan.pageEnd - plan.pageStart)).toEqual([
      FLOW_CHUNK_TARGET_PAGES,
      5,
    ]);
  });

  it("не отрывает продолжение абзаца от предыдущей страницы", () => {
    const pages = Array.from({ length: FLOW_CHUNK_TARGET_PAGES + 2 }, (_, index) =>
      index === FLOW_CHUNK_TARGET_PAGES ? '<p class="splitted">хвост</p>' : "<p>абзац</p>",
    );
    const [first] = planFlowChunks(pages);
    expect(first.pageEnd - first.pageStart).toBe(FLOW_CHUNK_TARGET_PAGES + 1);
  });

  it("останавливает очень длинный абзац на пределе куска", () => {
    const pages = Array.from({ length: FLOW_CHUNK_HARD_MAX_PAGES + 5 }, (_, index) =>
      index === 0 ? "<p>начало</p>" : '<p class="splitted">дальше</p>',
    );
    const plans = planFlowChunks(pages);
    expect(plans[0].pageEnd - plans[0].pageStart).toBe(FLOW_CHUNK_HARD_MAX_PAGES);
    expect(plans[1].pageStart).toBe(FLOW_CHUNK_HARD_MAX_PAGES);
  });
});

describe("joinReadingPages", () => {
  it("сливает разрезанное слово и нумерует страницы и заголовки", () => {
    const { html, headerCount } = joinReadingPages(
      [
        '<p class="justify-last">Благосло-</p>',
        '<p class="splitted">вение</p><p style="margin-top: 0px">Аминь</p>',
        '<h2 style="margin-top: 0px">Глава</h2>',
      ],
      4,
      2,
    );
    const root = document.createElement("div");
    root.innerHTML = html;

    expect(root.querySelectorAll("p")).toHaveLength(2);
    expect(root.querySelector(".justify-last")).toBeNull();
    expect(root.querySelector(".splitted")).toBeNull();
    expect(root.querySelector("p")?.textContent?.replace(/\u2060/g, "")).toBe("Благословение");
    expect(root.querySelector("p")?.dataset.flowPage).toBe("4");
    expect(root.querySelector(".flow-page-anchor")?.dataset.flowPage).toBe("5");
    const heading = root.querySelector("h2");
    expect(heading?.dataset.flowPage).toBe("6");
    expect(heading?.getAttribute("style")).toBeNull();
    expect(heading?.dataset.headerIndex).toBe("2");
    expect(headerCount).toBe(1);
    expect(root.textContent).toContain("Аминь");
  });

  it("оставляет продолжение абзаца, если предыдущей страницы в куске нет", () => {
    const { html } = joinReadingPages(['<p class="splitted">вение</p>'], 1, 0);
    const root = document.createElement("div");
    root.innerHTML = html;
    const paragraph = root.querySelector("p");
    expect(paragraph?.classList.contains("splitted")).toBe(true);
    expect(paragraph?.dataset.flowPage).toBe("1");
  });

  it("не снимает дефис, который не склеивает буквы", () => {
    const { html } = joinReadingPages(
      ['<p class="justify-last">конец -</p>', '<p class="splitted">начало</p>'],
      0,
      0,
    );
    const root = document.createElement("div");
    root.innerHTML = html;
    expect(root.querySelector("p")?.textContent?.replace(/\u2060/g, "")).toBe("конец - начало");
  });

  it("возвращает пробел, который пагинация не перенесла на следующую страницу", () => {
    const { html } = joinReadingPages(
      ['<p class="justify-last">непотребнаго</p>', '<p class="splitted">раба</p>'],
      0,
      0,
    );
    const root = document.createElement("div");
    root.innerHTML = html;
    expect(root.querySelector("p")?.textContent?.replace(/\u2060/g, "")).toBe("непотребнаго раба");
  });
});
