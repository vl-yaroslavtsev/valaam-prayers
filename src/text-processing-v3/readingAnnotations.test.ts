import { describe, expect, it } from "vitest";
import {
  htmlHasElementId,
  prepareReadingHtml,
  scopeReadingAnnotations,
  textActionFromEvent,
} from "./readingAnnotations";

const mount = (html: string): HTMLElement => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
};

describe("prepareReadingHtml", () => {
  it("извлекает сноски из section[data-footnotes], убирает backref и скрывает блок сносок", () => {
    const html = [
      '<p>Служба не имеет знака<sup class="fn-ref" data-fn="1"><a href="#fn-1" id="fnref-1" role="doc-noteref">1</a></sup>, ',
      'совершается со службой Октоиха <strong><a href="#v-a">(А)</a></strong>.</p>',
      '<p><a id="v-a"></a><strong>А. На вечерне</strong> кафизма 18-я.</p>',
      '<section class="footnotes" data-footnotes role="doc-endnotes">',
      "<ol>",
      '<li data-fn="1" id="fn-1" value="1"><p>Текст <em>сноски</em>… <a href="#fnref-1" class="footnote-backref" role="doc-backlink">↩︎</a></p></li>',
      "</ol>",
      "</section>",
    ].join("");

    const prepared = prepareReadingHtml(html);
    const root = mount(prepared.html);
    const paragraph = root.querySelector("p");
    const badge = paragraph?.querySelector("span.fn-badge.badge");
    const word = badge?.closest(".fn-word");

    expect(prepared.footnotes).toEqual({
      "1": "<p>Текст <em>сноски</em>…</p>",
    });
    expect(badge?.tagName).toBe("SPAN");
    expect(badge?.getAttribute("data-fn")).toBe("1");
    expect(badge?.textContent?.trim()).toBe("1");
    expect(word?.textContent?.replace(/\s/g, "")).toBe("знака1");
    expect(paragraph?.querySelector('a[href="#v-a"]')).not.toBeNull();
    expect(root.querySelector("sup.fn-ref")).toBeNull();
    expect(root.querySelector("[data-footnotes]")).toBeNull();
    expect(root.querySelector("p#v-a")?.textContent).toContain("А. На вечерне");
    expect(root.querySelector("a#v-a")).toBeNull();
  });

  it("сохраняет абзацы и ссылки в тексте сноски и удаляет пустой абзац после backref", () => {
    const html = [
      '<p>Слово<sup class="fn-ref" data-fn="2"><a href="#fn-2">2</a></sup>.</p>',
      '<section data-footnotes><ol>',
      '<li data-fn="2" id="fn-2" value="2"><p>Первый абзац с <a href="/prayers/text/10">ссылкой</a>.</p><p><a href="#fnref-2" class="footnote-backref">↩︎</a></p></li>',
      "</ol></section>",
    ].join("");

    const prepared = prepareReadingHtml(html);
    expect(prepared.footnotes).toEqual({
      "2": '<p>Первый абзац с <a href="/prayers/text/10">ссылкой</a>.</p>',
    });
  });

  it("не делает бейдж, если текста сноски нет, и всё равно убирает блок data-footnotes", () => {
    const html = [
      '<p>Слово<sup class="fn-ref" data-fn="9"><a href="#fn-9">9</a></sup></p>',
      '<section data-footnotes><ol><li data-fn="1"><p>Другая</p></li></ol></section>',
    ].join("");
    const prepared = prepareReadingHtml(html);
    const root = mount(prepared.html);

    expect(root.querySelector("sup.fn-ref")).not.toBeNull();
    expect(root.querySelector(".fn-badge")).toBeNull();
    expect(root.querySelector("[data-footnotes]")).toBeNull();
  });

  it("оставляет якорь на месте, если он не в начале абзаца", () => {
    const root = mount(prepareReadingHtml('<p>Текст <a id="v-b"></a> дальше</p>').html);
    const anchor = root.querySelector("a#v-b");
    expect(anchor).not.toBeNull();
    expect(root.querySelector("p")?.id).toBe("");
    expect(anchor?.textContent).not.toBe("");
  });
});

describe("scopeReadingAnnotations", () => {
  it("изолирует сноски и локальные якоря #v- между склеенными главами", () => {
    const chapter = (title: string, note: string) =>
      [
        `<p>${title}<sup class="fn-ref" data-fn="1"><a href="#fn-1" id="fnref-1">1</a></sup> <a href="#v-a">(А)</a></p>`,
        `<p><a id="v-a"></a><strong>А.</strong> ${title}</p>`,
        `<section data-footnotes><ol><li data-fn="1" id="fn-1" value="1"><p>${note} <a href="#fnref-1" class="footnote-backref">↩︎</a></p></li></ol></section>`,
      ].join("");

    const combined =
      scopeReadingAnnotations(chapter("Глава 1", "Примечание 1"), "b1") +
      scopeReadingAnnotations(chapter("Глава 2", "Примечание 2"), "b2");

    const prepared = prepareReadingHtml(combined);
    const root = mount(prepared.html);

    const badges = Array.from(root.querySelectorAll(".fn-badge"));
    expect(badges.map((b) => b.textContent?.trim())).toEqual(["1", "1"]);
    expect(badges.map((b) => b.getAttribute("data-fn"))).toEqual(["b1:1", "b2:1"]);
    expect(prepared.footnotes).toEqual({
      "b1:1": "<p>Примечание 1</p>",
      "b2:1": "<p>Примечание 2</p>",
    });

    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["#b1--v-a", "#b2--v-a"]);
    expect(root.querySelector("p#b1--v-a")?.textContent).toContain("Глава 1");
    expect(root.querySelector("p#b2--v-a")?.textContent).toContain("Глава 2");
  });
});

describe("htmlHasElementId", () => {
  it("находит id и не путает его с текстом", () => {
    expect(htmlHasElementId('<p id="v-a">про v-b</p>', "v-a")).toBe(true);
    expect(htmlHasElementId('<p id="v-a">про v-b</p>', "v-b")).toBe(false);
  });
});

describe("textActionFromEvent", () => {
  it("читает сноску и якорь из пути события", () => {
    document.body.innerHTML = `
      <span class="badge fn-badge" data-fn="2">2</span>
      <a href="#v-a">(А)</a>
    `;
    const chip = document.body.querySelector(".fn-badge")!;
    const link = document.body.querySelector("a")!;

    let footnote: ReturnType<typeof textActionFromEvent> = null;
    chip.addEventListener("click", (event) => {
      footnote = textActionFromEvent(event);
    });
    chip.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    let anchor: ReturnType<typeof textActionFromEvent> = null;
    link.addEventListener("click", (event) => {
      anchor = textActionFromEvent(event);
    });
    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(footnote).toEqual({ type: "footnote", id: "2" });
    expect(anchor).toEqual({ type: "anchor", id: "v-a" });
    document.body.innerHTML = "";
  });
});
