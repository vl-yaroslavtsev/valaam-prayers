import { ref, computed, watch } from "vue";
import type { Language } from "@/types/common";
import { useSettingsStore } from "@/stores/settings";
import { useApiState } from "@/composables/useApiState";
import { prepareReadingHtml } from "@/text-processing-v3/readingAnnotations";
import type { ReaderTextDocument } from "@/components/textReader";

const LANGUAGE_TEXT_FIELD: Record<Language, "text_cs_cf" | "text_cs" | "text_ru"> = {
  "cs-cf": "text_cs_cf",
  cs: "text_cs",
  ru: "text_ru",
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Подготавливает HTML текста документа для читалки и извлекает сноски.
 */
export function buildReaderText(
  doc: ReaderTextDocument,
  language: Language | null,
  title: string
): { html: string; footnotes: Record<string, string> } {
  const field = language ? LANGUAGE_TEXT_FIELD[language] : undefined;
  const rawSource = (field ? doc[field] : doc.text) || "";

  const prepared = prepareReadingHtml(rawSource);
  let html = prepared.html;

  if (/^\s*<h[12]/.test(html)) {
    html = html.replace(/^(\s*)<h2([^>]*)>/i, "$1<h1$2>").replace(/<\/h2>/i, "</h1>");
  } else {
    html = `<h1>${escapeHtml(title)}</h1>\n\n${html}`;
  }

  return { html, footnotes: prepared.footnotes };
}

export interface UseReaderTextOptions {
  initialTitle: string;
  load: () => Promise<ReaderTextDocument>;
}

/**
 * Композабл загрузки документа читалки, выбора языка и подготовки HTML/сносок.
 */
export function useReaderText({ initialTitle, load }: UseReaderTextOptions) {
  const settingsStore = useSettingsStore();
  const { isLoading, error, data } = useApiState(load());

  const title = computed(() => data.value?.title || initialTitle);
  const favoriteTitle = computed(() => data.value?.favoriteTitle ?? title.value);
  const availableLanguages = computed<Language[]>(() => data.value?.lang ?? []);

  // Предпочтение языка живёт в настройках и меняется только явным выбором в селекторе.
  // Если у текста этого языка нет, показываем запасной и настройку не перезаписываем.
  const selectedLanguage = ref<Language | null>(null);
  const currentLanguage = computed<Language | null>({
    get: () => {
      if (selectedLanguage.value) return selectedLanguage.value;
      if (data.value) {
        return settingsStore.getLanguageFromAvailable(data.value.lang);
      }
      return settingsStore.currentLanguage;
    },
    set: (language: Language | null) => {
      const previous = currentLanguage.value;
      selectedLanguage.value = language;
      if (language && language !== previous) {
        settingsStore.setLanguage(language);
      }
    },
  });

  const prepared = computed(() => {
    if (error.value) {
      return { html: "Данные не найдены", footnotes: {} as Record<string, string> };
    }
    if (!data.value) {
      return { html: "", footnotes: {} as Record<string, string> };
    }
    return buildReaderText(data.value, currentLanguage.value, title.value);
  });

  const text = computed(() => prepared.value.html);
  const footnotes = computed(() => prepared.value.footnotes);

  watch(error, (err) => {
    if (err) {
      console.error("Failed to load reader text:", err);
    }
  });

  return {
    title,
    favoriteTitle,
    text,
    footnotes,
    currentLanguage,
    availableLanguages,
    isLoading,
    data,
  };
}
