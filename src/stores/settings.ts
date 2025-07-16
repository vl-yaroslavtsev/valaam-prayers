import { defineStore } from "pinia";
import { computed, ref, readonly } from "vue";
import type { Language } from "@/types/common";

// Единый префикс для всех настроек
const SETTINGS_PREFIX = 'valaam-prayers-';

// Ключи настроек
const SETTINGS_KEYS = {
  LANGUAGE: `${SETTINGS_PREFIX}language`,
  APP_THEME: `${SETTINGS_PREFIX}app-theme`,
  TEXT_THEME: `${SETTINGS_PREFIX}text-theme`,
  FONT_FAMILY: `${SETTINGS_PREFIX}font-family`,
  FONT_SIZE: `${SETTINGS_PREFIX}font-size`,
  LINE_HEIGHT: `${SETTINGS_PREFIX}line-height`,
  READING_BRIGHTNESS: `${SETTINGS_PREFIX}reading-brightness`,
  KEEP_SCREEN_ON: `${SETTINGS_PREFIX}keep-screen-on`,
  SHOW_STATUS_BAR: `${SETTINGS_PREFIX}show-status-bar`,
  FULL_SCREEN: `${SETTINGS_PREFIX}full-screen`,
  VOLUME_BUTTONS_SCROLL: `${SETTINGS_PREFIX}volume-buttons-scroll`,
} as const;

// Интерфейс настроек приложения
interface AppSettings {
  // Язык
  language: Language;
  
  // Темы
  appTheme: 'light' | 'dark' | 'auto';
  textTheme: 'light' | 'dark' | 'grey' | 'sepia' | 'sepia-contrast' | 'cream' | 'yellow';
  
  // Шрифты
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  
  // Режим чтения
  readingBrightness: number;
  keepScreenOn: boolean;
  
  // Интерфейс
  showStatusBar: boolean;
  fullScreen: boolean;
  
  // Другие настройки
  volumeButtonsScroll: boolean;
}

// Настройки по умолчанию
const DEFAULT_SETTINGS: AppSettings = {
  language: 'cs-cf',
  appTheme: 'auto',
  textTheme: 'grey',
  fontFamily: 'system',
  fontSize: 16,
  lineHeight: 1.5,
  readingBrightness: 50,
  keepScreenOn: false,
  showStatusBar: true,
  fullScreen: false,
  volumeButtonsScroll: false,
};

export const useSettingsStore = defineStore("settings", () => {
  const version = import.meta.env.VITE_APP_VER;
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });

  // Загрузка всех настроек из localStorage
  const loadSettings = () => {
    // Миграция старых настроек
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
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
      readingBrightness: SETTINGS_KEYS.READING_BRIGHTNESS,
      keepScreenOn: SETTINGS_KEYS.KEEP_SCREEN_ON,
      showStatusBar: SETTINGS_KEYS.SHOW_STATUS_BAR,
      fullScreen: SETTINGS_KEYS.FULL_SCREEN,
      volumeButtonsScroll: SETTINGS_KEYS.VOLUME_BUTTONS_SCROLL,
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
  const fontSize = computed(() => settings.value.fontSize);
  const lineHeight = computed(() => settings.value.lineHeight);
  const readingBrightness = computed(() => settings.value.readingBrightness);

  // Получение языка с приоритетом из доступных языков
  const getLanguageFromAvailable = (availableLanguages: Language[]): Language => {
    const priority: Language[] = ['cs-cf', 'cs', 'ru'];
    
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
    return 'cs-cf';
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
    fontSize,
    lineHeight,
    readingBrightness,
    
    // Универсальный метод
    setSetting,
    
    // Специфичные методы для удобства
    setLanguage: (lang: Language) => setSetting('language', lang),
    setAppTheme: (theme: AppSettings['appTheme']) => setSetting('appTheme', theme),
    setTextTheme: (theme: AppSettings['textTheme']) => setSetting('textTheme', theme),
    setFontSize: (size: number) => setSetting('fontSize', size),
    setLineHeight: (height: number) => setSetting('lineHeight', height),
    setReadingBrightness: (brightness: number) => setSetting('readingBrightness', brightness),
    setKeepScreenOn: (keepOn: boolean) => setSetting('keepScreenOn', keepOn),
    setShowStatusBar: (show: boolean) => setSetting('showStatusBar', show),
    setFullScreen: (fullScreen: boolean) => setSetting('fullScreen', fullScreen),
    setVolumeButtonsScroll: (enabled: boolean) => setSetting('volumeButtonsScroll', enabled),
    
    // Утилиты
    getLanguageFromAvailable,
    initStore,
  };
});

// Экспорт типов для использования в других файлах
export type { AppSettings };
export { SETTINGS_KEYS };