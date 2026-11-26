import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSettingsStore } from "@/stores/settings";
import * as readingAnnotations from "@/text-processing-v3/readingAnnotations";
import { buildReaderText, useReaderText } from "@/composables/useReaderText";

describe("buildReaderText", () => {
  it("выбирает поле по языку и экранирует HTML в title при вставке h1", () => {
    const res = buildReaderText(
      {
        lang: ["ru", "cs"],
        text_ru: "<p>Русский текст</p>",
        text_cs: "<p>ЦСЯ текст</p>",
      },
      "ru",
      'Слово <A> & "B"'
    );

    expect(res.html).toContain("<h1>Слово &lt;A&gt; &amp; &quot;B&quot;</h1>");
    expect(res.html).toContain("<p>Русский текст</p>");
  });

  it("повышает ведущий h2 до h1 и не добавляет дублирующий заголовок", () => {
    const res = buildReaderText(
      {
        lang: ["cs-cf"],
        text_cs_cf: '  <h2 class="lead">Заголовок</h2><p>Текст</p>',
      },
      "cs-cf",
      "Игнорируется"
    );

    expect(res.html).toBe('  <h1 class="lead">Заголовок</h1><p>Текст</p>');
  });
});

describe("useReaderText", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("готовит HTML ровно один раз, даже если язык документа отличается от сохранённого в настройках", async () => {
    const settingsStore = useSettingsStore();
    settingsStore.setLanguage("cs");

    const prepareSpy = vi.spyOn(readingAnnotations, "prepareReadingHtml");

    const reader = useReaderText({
      initialTitle: "Начальный",
      load: () =>
        Promise.resolve({
          title: "Утренние молитвы",
          lang: ["ru"],
          text_ru: "<p>Текст</p>",
        }),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();

    expect(reader.title.value).toBe("Утренние молитвы");
    expect(reader.currentLanguage.value).toBe("ru");
    expect(reader.text.value).toContain("<p>Текст</p>");
    // Запасной язык не перезаписывает настройку пользователя
    expect(settingsStore.currentLanguage).toBe("cs");
    // prepareReadingHtml отработал ровно 1 раз (без двойного прогона)
    expect(prepareSpy).toHaveBeenCalledTimes(1);

    prepareSpy.mockRestore();
  });

  it("явная смена языка обновляет текст и сохраняет настройку", async () => {
    const settingsStore = useSettingsStore();
    settingsStore.setLanguage("ru");

    const reader = useReaderText({
      initialTitle: "Молитва",
      load: () =>
        Promise.resolve({
          lang: ["ru", "cs"],
          text_ru: "<p>По-русски</p>",
          text_cs: "<p>По-церковнославянски</p>",
        }),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();

    reader.currentLanguage.value = "cs";
    await nextTick();

    expect(settingsStore.currentLanguage).toBe("cs");
    expect(reader.text.value).toContain("<p>По-церковнославянски</p>");
  });

  it("при ошибке загрузки очищает сноски и показывает сообщение об ошибке", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reader = useReaderText({
      initialTitle: "Молитва",
      load: () => Promise.reject(new Error("offline")),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();

    expect(reader.text.value).toBe("Данные не найдены");
    expect(reader.footnotes.value).toEqual({});
    errorSpy.mockRestore();
  });
});
