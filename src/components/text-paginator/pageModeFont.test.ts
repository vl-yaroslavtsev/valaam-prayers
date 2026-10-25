import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, type App } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useSettingsStore } from "@/stores/settings";
import TextPaginator from "@/components/TextPaginator.vue";
import "@/css/reading-text.less";

vi.mock("@/text-processing-v3", () => ({
  paginateText: vi.fn(async () => ({ pages: ["<p>Молитва</p>"], headers: [] })),
}));

vi.mock("@/components/SvgIcon.vue", () => ({
  default: { name: "SvgIcon", render: () => null },
}));

// Как у .list в Framework7: свой font-size перекрывает размер чтения.
const LIST_FONT_SIZE = "var(--f7-list-font-size)";
const READING_FONT_SIZE = "var(--text-font-size)";

const F7ListStub = defineComponent({
  name: "f7-list",
  props: {
    virtualList: Boolean,
    virtualListParams: Object,
  },
  setup(_props, { slots }) {
    return () =>
      h("div", { class: "list" }, [
        h("ul", [slots.default?.(), h("p", { class: "font-probe" }, "Текст")]),
      ]);
  },
});

// jsdom отдаёт указанное значение, а не использованное:
// var(--text-font-size) не становится «25px». Зато шрифт списка и шрифт чтения
// различимы, поэтому регрессия «.list затёр размер» здесь видна.
function fontSizeOf(selector: string): string {
  return computedOf(selector).fontSize;
}

function readingVariable(name: string): string {
  return document.documentElement.style.getPropertyValue(name).trim();
}

function computedOf(selector: string): CSSStyleDeclaration {
  const el = document.querySelector(selector);
  expect(el, selector).not.toBeNull();
  return getComputedStyle(el!);
}

// Свойства, которые .reading-text задаёт через свои переменные.
// На вертикальной странице их не должен подменять .list.
function expectReadingCascade(selector: string) {
  const style = computedOf(selector);
  expect(style.fontSize).toBe(READING_FONT_SIZE);
  expect(style.fontFamily).toBe("var(--text-font-family)");
  expect(style.fontWeight).toBe("var(--text-font-weight)");
  expect(style.lineHeight).toBe("var(--text-line-height)");
  expect(style.hyphens).toBe("var(--text-hyphens)");
}

let app: App<Element> | undefined;

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function installListFont(): void {
  const style = document.createElement("style");
  style.id = "f7-list-font";
  style.textContent = `
    :root { --f7-list-font-size: 20px; }
    .list { font-size: ${LIST_FONT_SIZE}; }
  `;
  document.head.appendChild(style);
}

async function mountReading() {
  installListFont();
  const pinia = createPinia();
  setActivePinia(pinia);
  const settings = useSettingsStore();

  const root = document.createElement("div");
  document.body.appendChild(root);
  app = createApp({
    setup() {
      return () => h(TextPaginator, { text: "<p>Молитва</p>", itemId: 1, lang: "ru" });
    },
  });
  app.use(pinia);
  app.component("f7-list", F7ListStub);
  app.component("f7-progressbar", { name: "f7-progressbar", render: () => null });
  app.mount(root);
  await settle();
  return settings;
}

describe("настройки чтения при смене режима листания", () => {
  afterEach(() => {
    app?.unmount();
    app = undefined;
    document.body.innerHTML = "";
    document.getElementById("f7-list-font")?.remove();
    localStorage.clear();
  });

  it("размер, заданный в горизонтальном режиме, остаётся тем же в вертикальном", async () => {
    const settings = await mountReading();
    expect(settings.pageMode).toBe("horizontal");

    settings.setFontSize(25);
    await settle();

    expect(readingVariable("--reading-text-font-size")).toBe("25px");
    expect(fontSizeOf(".mode-horizontal")).toBe(READING_FONT_SIZE);

    settings.setPageMode("vertical");
    await settle();

    expect(settings.pageMode).toBe("vertical");
    expect(fontSizeOf(".mode-vertical .font-probe")).toBe(READING_FONT_SIZE);
    expect(readingVariable("--reading-text-font-size")).toBe("25px");

    settings.setFontSize(30);
    await settle();
    expect(readingVariable("--reading-text-font-size")).toBe("30px");
    expect(fontSizeOf(".mode-vertical .font-probe")).toBe(READING_FONT_SIZE);

    settings.setPageMode("horizontal");
    await settle();

    expect(fontSizeOf(".mode-horizontal")).toBe(READING_FONT_SIZE);
    expect(readingVariable("--reading-text-font-size")).toBe("30px");
  });

  it("жирность, переносы, гарнитура и интервал сохраняются при переходе с вертикального режима на горизонтальный", async () => {
    const settings = await mountReading();

    settings.setPageMode("vertical");
    await settle();

    settings.setIsTextBold(true);
    settings.setIsTextWordsBreak(false);
    settings.setFontFamily("Literata");
    settings.setLineHeight(1.8);
    await settle();

    expect(readingVariable("--reading-text-font-weight")).toBe("700");
    expect(readingVariable("--reading-text-hyphens")).toBe("none");
    expect(readingVariable("--reading-text-font-family")).toBe('"Literata", serif');
    expect(readingVariable("--reading-text-line-height")).toBe("1.8");
    expectReadingCascade(".mode-vertical .font-probe");

    settings.setPageMode("horizontal");
    await settle();

    expect(readingVariable("--reading-text-font-weight")).toBe("700");
    expect(readingVariable("--reading-text-hyphens")).toBe("none");
    expect(readingVariable("--reading-text-font-family")).toBe('"Literata", serif');
    expect(readingVariable("--reading-text-line-height")).toBe("1.8");
    expectReadingCascade(".mode-horizontal");
  });
});
