import { defineStore } from "pinia";
import { computed, ref, readonly } from "vue";
import type { Language } from "@/types/common";
import { device } from "@/js/device";

// Единый префикс для всех настроек
const SETTINGS_PREFIX = "valaam-prayers-";

// Ключи настроек
const SETTINGS_KEYS = {
  LANGUAGE: `${SETTINGS_PREFIX}language`,
  APP_THEME: `${SETTINGS_PREFIX}app-theme`,
  TEXT_THEME: `${SETTINGS_PREFIX}text-theme`,
  FONT_FAMILY: `${SETTINGS_PREFIX}font-family`,
  FONT_SIZE: `${SETTINGS_PREFIX}font-size`,
  LINE_HEIGHT: `${SETTINGS_PREFIX}line-height`,
  FONT_FAMILY_CS: `${SETTINGS_PREFIX}font-family-cs`,
  FONT_SIZE_CS: `${SETTINGS_PREFIX}font-size-cs`,
  LINE_HEIGHT_CS: `${SETTINGS_PREFIX}line-height-cs`,
  TEXT_ALIGN_JUSTIFIED: `${SETTINGS_PREFIX}text-align-justified`,
  TEXT_WORDS_BREAK: `${SETTINGS_PREFIX}text-words-break`,
  TEXT_PAGE_PADDING: `${SETTINGS_PREFIX}text-page-padding`,
  TEXT_BOLD: `${SETTINGS_PREFIX}text-bold`,
  READING_BRIGHTNESS: `${SETTINGS_PREFIX}reading-brightness`,
  KEEP_SCREEN_ON: `${SETTINGS_PREFIX}keep-screen-on`,
  IS_STATUS_BAR_VISIBLE: `${SETTINGS_PREFIX}is-status-bar-visible`,
  PAGE_MODE: `${SETTINGS_PREFIX}page-mode`,
  VOLUME_BUTTONS_SCROLL: `${SETTINGS_PREFIX}volume-buttons-scroll`,
} as const;

// Интерфейс настроек приложения
interface AppSettings {
  // Язык
  language: Language;

  // Темы
  appTheme: "light" | "dark" | "auto";
  textTheme:
    | "light"
    | "dark"
    | "grey"
    | "sepia"
    | "sepia-contrast"
    | "cream"
    | "yellow";

  // Шрифты
  fontFamily:
    | "PT Sans"
    | "PT Serif"
    | "Circe"
    | "Literata"
    | "Noto Sans"
    | "Noto Serif"
    | "Roboto"
    | "Системный";

   // Шрифты ЦС
   fontFamilyCs:
   | "Triodion"
   | "Ponomar"
   | "Acathist"
   | "Fedorovsk"
   | "Monomakh"
   | "Pochaevsk"
   | "Vilnius";

  fontSize: number;
  lineHeight: number;

  fontSizeCs: number;
  lineHeightCs: number;

  // Настройки отображения текста
  isTextAlignJustified: boolean;
  isTextWordsBreak: boolean;
  isTextPagePadding: boolean;
  isTextBold: boolean;

  // Режим чтения
  readingBrightness: number;
  keepScreenOn: boolean;
  pageMode: "horizontal" | "vertical";

  // Интерфейс
  isStatusBarVisible: boolean;

  // Другие настройки
  isVolumeButtonsScrollEnabled: boolean;
}

// Настройки по умолчанию
const DEFAULT_SETTINGS: AppSettings = {
  language: "cs-cf",
  appTheme: "auto",
  textTheme: "grey",
  fontFamily: "PT Sans",
  fontSize: 20,
  lineHeight: 1.3,
  fontFamilyCs: "Triodion",
  fontSizeCs: 22,
  lineHeightCs: 1.25,
  isTextAlignJustified: true,
  isTextWordsBreak: true,
  isTextPagePadding: true,
  isTextBold: false,
  readingBrightness: -1,
  keepScreenOn: false,
  pageMode: "horizontal",
  isStatusBarVisible: true,
  isVolumeButtonsScrollEnabled: false,
};

export const useSettingsStore = defineStore("settings", () => {
  const version = import.meta.env.VITE_APP_VER;
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });

  // Загрузка всех настроек из localStorage
  const loadSettings = () => {
    // Миграция старых настроек
    Object.keys(DEFAULT_SETTINGS).forEach((key) => {
      const storageKey = getStorageKey(key as keyof AppSettings);
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        try {
          const parsedValue = JSON.parse(saved);
          (settings.value as any)[key] = parsedValue;
        } catch {
          // Для строковых значений
          (settings.value as any)[key] = saved;
        }
      }
    });
  };

  // Получение ключа для localStorage
  const getStorageKey = (key: keyof AppSettings): string => {
    const keyMap: Record<keyof AppSettings, string> = {
      language: SETTINGS_KEYS.LANGUAGE,
      appTheme: SETTINGS_KEYS.APP_THEME,
      textTheme: SETTINGS_KEYS.TEXT_THEME,
      fontFamily: SETTINGS_KEYS.FONT_FAMILY,
      fontSize: SETTINGS_KEYS.FONT_SIZE,
      lineHeight: SETTINGS_KEYS.LINE_HEIGHT,
      fontFamilyCs: SETTINGS_KEYS.FONT_FAMILY_CS,
      fontSizeCs: SETTINGS_KEYS.FONT_SIZE_CS,
      lineHeightCs: SETTINGS_KEYS.LINE_HEIGHT_CS,
      isTextAlignJustified: SETTINGS_KEYS.TEXT_ALIGN_JUSTIFIED,
      isTextWordsBreak: SETTINGS_KEYS.TEXT_WORDS_BREAK,
      isTextPagePadding: SETTINGS_KEYS.TEXT_PAGE_PADDING,
      isTextBold: SETTINGS_KEYS.TEXT_BOLD,
      readingBrightness: SETTINGS_KEYS.READING_BRIGHTNESS,
      keepScreenOn: SETTINGS_KEYS.KEEP_SCREEN_ON,
      pageMode: SETTINGS_KEYS.PAGE_MODE,
      isStatusBarVisible: SETTINGS_KEYS.IS_STATUS_BAR_VISIBLE,
      isVolumeButtonsScrollEnabled: SETTINGS_KEYS.VOLUME_BUTTONS_SCROLL,
    };
    return keyMap[key];
  };

  // Универсальный метод для сохранения настройки
  const setSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    settings.value[key] = value;
    const storageKey = getStorageKey(key);
    localStorage.setItem(storageKey, JSON.stringify(value));
      };

  // Удобные геттеры
  const currentLanguage = computed(() => settings.value.language);
  const appTheme = computed(() => settings.value.appTheme);
  const textTheme = computed(() => settings.value.textTheme);
  const fontFamily = computed(() => settings.value.fontFamily);
  const fontSize = computed(() => settings.value.fontSize);
  const lineHeight = computed(() => settings.value.lineHeight);
  const fontFamilyCs = computed(() => settings.value.fontFamilyCs);
  const fontSizeCs = computed(() => settings.value.fontSizeCs);
  const lineHeightCs = computed(() => settings.value.lineHeightCs);
  const isTextAlignJustified = computed(() => settings.value.isTextAlignJustified);
  const isTextWordsBreak = computed(() => settings.value.isTextWordsBreak);
  const isTextPagePadding = computed(() => settings.value.isTextPagePadding);
  const isTextBold = computed(() => settings.value.isTextBold);
  const readingBrightness = computed(() => settings.value.readingBrightness);
  const pageMode = computed(() => settings.value.pageMode);
  const isStatusBarVisible = computed(() => settings.value.isStatusBarVisible);

  // Получение языка с приоритетом из доступных языков
  const getLanguageFromAvailable = (
    availableLanguages: Language[]
  ): Language | null => {
    const priority: Language[] = ["cs-cf", "cs", "ru"];

    // Проверяем, есть ли текущий язык в доступных
    if (availableLanguages.includes(currentLanguage.value)) {
      return currentLanguage.value;
    }

    // Если нет, выбираем по приоритету
    for (const lang of priority) {
      if (availableLanguages.includes(lang)) {
        return lang;
      }
    }

    // Если ни один из приоритетных языков не найден, берем первый доступный
    if (availableLanguages.length > 0) {
      return availableLanguages[0];
    }

    // Если доступных языков нет, возвращаем по умолчанию
    return null;
  };

  const initStore = async () => {
    loadSettings();
    console.log("Settings store initialized");
  };

  return {
    version,
    settings: readonly(settings),

    // Геттеры
    currentLanguage,
    appTheme,
    textTheme,
    fontFamily,
    fontSize,
    lineHeight,
    fontFamilyCs,
    fontSizeCs,
    lineHeightCs,
    isTextAlignJustified,
    isTextWordsBreak,
    isTextPagePadding,
    isTextBold,
    readingBrightness,
    pageMode,
    isStatusBarVisible,

    // Универсальный метод
    setSetting,

    // Специфичные методы для удобства
    setLanguage: (lang: Language) => setSetting("language", lang),
    setAppTheme: (theme: AppSettings["appTheme"]) =>
      setSetting("appTheme", theme),
    setTextTheme: (theme: AppSettings["textTheme"]) => {
      setSetting("textTheme", theme);
    },
    setFontFamily: (family: AppSettings["fontFamily"]) =>
      setSetting("fontFamily", family),
    setFontSize: (size: number) => setSetting("fontSize", size),
    setLineHeight: (height: number) => setSetting("lineHeight", height),
    setFontFamilyCs: (family: AppSettings["fontFamilyCs"]) =>
      setSetting("fontFamilyCs", family),
    setFontSizeCs: (size: number) => setSetting("fontSizeCs", size),
    setLineHeightCs: (height: number) => setSetting("lineHeightCs", height),
    setIsTextAlignJustified: (justified: boolean) => setSetting("isTextAlignJustified", justified),
    setIsTextWordsBreak: (wordsBreak: boolean) => setSetting("isTextWordsBreak", wordsBreak),
    setIsTextPagePadding: (pagePadding: boolean) => setSetting("isTextPagePadding", pagePadding),
    setIsTextBold: (bold: boolean) => setSetting("isTextBold", bold),
    setReadingBrightness: (brightness: number) => {
      setSetting("readingBrightness", brightness);
      device.setBrightness(brightness);
    },
    setKeepScreenOn: (keepOn: boolean) => {
      setSetting("keepScreenOn", keepOn);
      device.keepScreenOn(keepOn);
    },
    setIsStatusBarVisible: (visible: boolean) => {
      setSetting("isStatusBarVisible", visible);
      device.showStatusBar(visible);
    },
    setIsVolumeButtonsScrollEnabled: (
      enabled: boolean,
      callback: (keyCode: number, event: any) => void
    ) => {
      setSetting("isVolumeButtonsScrollEnabled", enabled);
      if (enabled) {
        device.onVolumeKey(callback);
      } else {
        device.offVolumeKey();
      }
    },
    setPageMode: (mode: AppSettings["pageMode"]) =>
      setSetting("pageMode", mode),

    // Утилиты
    getLanguageFromAvailable,
    initStore,
  };
});

// Экспорт типов для использования в других файлах
export type { AppSettings };
export { SETTINGS_KEYS };
