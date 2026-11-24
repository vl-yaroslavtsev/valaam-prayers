import { describe, expect, it, vi } from "vitest";
import {
  createTextActions,
  htmlHasElementId,
  prepareReadingHtml,
  textActionFromEvent,
} from "./readingAnnotations";

const mount = (html: string): HTMLElement => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
};

describe("prepareReadingHtml", () => {
  const footnotes = { "1": "<p>Пояснение</p>" };

  it("заменяет метку сноски бейджем внутри того же абзаца и переносит якорь службы", () => {
    const html = [
      '<p>Служба знака<sup class="fn-ref" data-fn="1">1</sup> <a href="#v-a">(А)</a>.</p>',
      '<p><a id="v-a"></a><strong>А. На вечерне</strong> кафизма.</p>',
    ].join("");

    const root = mount(prepareReadingHtml(html, footnotes));
    const paragraph = root.querySelector("p");
    const badge = paragraph?.querySelector("span.fn-badge.badge");
    const word = badge?.closest(".fn-word");

    expect(badge?.tagName).toBe("SPAN");
    expect(badge?.getAttribute("data-fn")).toBe("1");
    expect(badge?.textContent?.trim()).toBe("1");
    expect(word?.textContent?.replace(/\s/g, "")).toBe("знака1");
    expect(paragraph?.querySelector('a[href="#v-a"]')).not.toBeNull();
    expect(root.querySelector("sup.fn-ref")).toBeNull();
    expect(root.querySelector("p#v-a")?.textContent).toContain("А. На вечерне");
    expect(root.querySelector("a#v-a")).toBeNull();
  });

  it("не делает бейдж, если текста сноски нет", () => {
    const root = mount(prepareReadingHtml('<p><sup class="fn-ref" data-fn="9">9</sup></p>', footnotes));
    expect(root.querySelector("sup.fn-ref")).not.toBeNull();
    expect(root.querySelector(".fn-badge")).toBeNull();
  });

  it("оставляет якорь на месте, если он не в начале абзаца", () => {
    const root = mount(prepareReadingHtml('<p>Текст <a id="v-b"></a> дальше</p>'));
    const anchor = root.querySelector("a#v-b");
    expect(anchor).not.toBeNull();
    expect(root.querySelector("p")?.id).toBe("");
    expect(anchor?.textContent).not.toBe("");
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

describe("createTextActions", () => {
  it("повторное событие того же касания не открывает сноску второй раз", () => {
    const emit = vi.fn();
    const actions = createTextActions(emit);
    const chip = document.createElement("div");
    chip.className = "badge fn-badge";
    chip.dataset.fn = "1";
    document.body.append(chip);

    const fire = (type: string) => {
      let handled = false;
      const listener = (event: Event) => {
        handled = actions.handle(event);
      };
      chip.addEventListener(type, listener);
      chip.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
      chip.removeEventListener(type, listener);
      return handled;
    };

    expect(fire("pointerup")).toBe(true);
    expect(fire("click")).toBe(true);
    expect(emit).toHaveBeenCalledTimes(1);
    chip.remove();
  });

  it("после выделения текста касание бейджа сноску не открывает", () => {
    const emit = vi.fn();
    const actions = createTextActions(emit);
    const chip = document.createElement("div");
    chip.className = "badge fn-badge";
    chip.dataset.fn = "1";
    document.body.append(chip);
    actions.suppress();

    chip.addEventListener("click", (event) => {
      actions.handle(event);
    });
    chip.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(emit).not.toHaveBeenCalled();
    chip.remove();
  });
});
