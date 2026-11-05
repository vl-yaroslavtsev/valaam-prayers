import { describe, expect, it } from "vitest";
import {
  alignSearchAnchors,
  normalizeSearchContext,
  searchMatchContext,
  type SearchMatch,
} from "./textSearch";

const match = (snippet: string, matchStart: number, matchLength: number): SearchMatch => ({
  id: 0,
  page: 1,
  ordinalOnPage: 0,
  snippet,
  matchStart,
  matchLength,
});

describe("normalizeSearchContext", () => {
  it("схлопывает пробелы, мягкие переносы и дефис разрыва колонки", () => {
    expect(normalizeSearchContext("Бла\u00ADгосло-вение   Господи")).toBe("благословение господи");
  });
});

describe("searchMatchContext", () => {
  it("берёт окружение совпадения без служебного многоточия", () => {
    const snippet = "…помози рабу твоему и спаси его…";
    const word = "рабу";
    const start = snippet.indexOf(word);
    expect(searchMatchContext(match(snippet, start, word.length))).toBe(
      normalizeSearchContext("помози рабу твоему и спаси его"),
    );
  });
});

describe("alignSearchAnchors", () => {
  it("связывает совпадения по окружающему тексту, даже если их поровну", () => {
    const first = "альфа господи помилуй бета";
    const second = "гамма господи помилуй дельта";
    expect(
      alignSearchAnchors(
        [first, second],
        [`xx ${first} yy`, `zz ${second} ww`],
      ),
    ).toEqual([0, 1]);
  });

  it("не цепляет чужой контекст", () => {
    expect(
      alignSearchAnchors(
        ["альфа господи помилуй бета", "гамма господи помилуй дельта"],
        ["совсем другой текст вокруг", "ещё один посторонний фрагмент"],
      ),
    ).toEqual([-1, -1]);
  });

  it("пропускает лишнюю подсветку между одинаковыми фразами", () => {
    const phrase = "господи помилуй мя раба твоего";
    expect(
      alignSearchAnchors(
        [phrase, phrase],
        [`xx ${phrase} yy`, "совсем другое слово в этом месте текста", `zz ${phrase} ww`],
      ),
    ).toEqual([0, 2]);
  });

  it("короткий контекст сдвигает курсор на одну подсветку", () => {
    expect(alignSearchAnchors(["аминь.", "аминь."], ["a", "b", "c"])).toEqual([0, 1]);
  });
});
