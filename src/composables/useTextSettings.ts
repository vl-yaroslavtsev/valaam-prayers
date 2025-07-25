import { watch, onMounted, onUnmounted, Ref, toValue } from 'vue';
import { AppSettings, useSettingsStore } from '@/stores/settings';
import { setCSSVariable } from '@/js/utils';

/**
 * Композабл для синхронизации настроек текста с CSS переменными
 * Автоматически обновляет CSS переменные при изменении настроек в store
 */
export function useTextSettings() {
  const settingsStore = useSettingsStore();

  // Мапинг семейств шрифтов на CSS значения
  const fontFamilyMap: Record<AppSettings['fontFamily'], string> = {
    'PT Sans': '"PT Sans", sans-serif',
    'PT Serif': '"PT Serif", serif', 
    'Circe': '"Circe", sans-serif',
    'Literata': '"Literata", serif',
    'Noto Sans': '"Noto Sans", sans-serif',
    'Noto Serif': '"Noto Serif", serif',
    'Roboto': '"Roboto", sans-serif',
    'Системный': 'system-ui, -apple-system, sans-serif'
  };

    // Мапинг семейств шрифтов на CSS значения
    const fontFamilyCsMap: Record<AppSettings['fontFamilyCs'], string> = {
      'Triodion': '"Triodion Unicode"',
      'Ponomar': '"Ponomar Unicode"', 
      'Acathist': '"Acathist"',
      'Fedorovsk': '"Fedorovsk Unicode"',
      'Monomakh': '"Monomakh Unicode"',
      'Pochaevsk': '"Pochaevsk Unicode"',
      'Vilnius': '"Vilnius"'
    };

  /**
   * Обновляет CSS переменные для настроек текста
   */
  const updateTextCSSVariables = () => {

    // Обновляем семейство шрифта
    const fontFamily = fontFamilyMap[settingsStore.fontFamily] || fontFamilyMap['PT Sans'];
    setCSSVariable('--reading-text-font-family', fontFamily  );

    // Обновляем размер шрифта
    setCSSVariable('--reading-text-font-size', `${settingsStore.fontSize}px`);

    // Обновляем высоту строки
    setCSSVariable('--reading-text-line-height', settingsStore.lineHeight.toString());

    // Обновляем семейство шрифта
    const fontFamilyCs = fontFamilyCsMap[settingsStore.fontFamilyCs] || fontFamilyCsMap['Triodion'];
    setCSSVariable('--reading-text-font-family-cs', fontFamilyCs  );

    // Обновляем размер шрифта
    setCSSVariable('--reading-text-font-size-cs', `${settingsStore.fontSizeCs}px`);

    // Обновляем высоту строки
    setCSSVariable('--reading-text-line-height-cs', settingsStore.lineHeightCs.toString());


    // Обновляем выравнивание текста
    setCSSVariable('--reading-text-align', settingsStore.isTextAlignJustified ? 'justify' : 'left');

    // Обновляем переносы слов
    setCSSVariable('--reading-text-hyphens', settingsStore.isTextWordsBreak ? 'manual' : 'none');

    // Обновляем отступы страницы
    const padding = settingsStore.isTextPagePadding ? '16px 24px calc(16px + var(--f7-safe-area-bottom)) 24px' : '8px 12px calc(8px + var(--f7-safe-area-bottom)) 12px';
    setCSSVariable('--reading-text-page-padding', padding);

    // Обновляем жирность шрифта
    setCSSVariable('--reading-text-font-weight', settingsStore.isTextBold ? '700' : '400');
  };

  // Наблюдатели за изменениями настроек
  let unwatchFontFamily: (() => void) | undefined;
  let unwatchFontSize: (() => void) | undefined; 
  let unwatchLineHeight: (() => void) | undefined;
  let unwatchFontFamilyCs: (() => void) | undefined;
  let unwatchFontSizeCs: (() => void) | undefined; 
  let unwatchLineHeightCs: (() => void) | undefined;
  let unwatchTextAlign: (() => void) | undefined;
  let unwatchWordsBreak: (() => void) | undefined;
  let unwatchPagePadding: (() => void) | undefined;
  let unwatchTextBold: (() => void) | undefined;

  /**
   * Инициализирует синхронизацию настроек с CSS переменными
   */
  const initTextSettings = () => {
    // Устанавливаем начальные значения
    updateTextCSSVariables();

    // Отслеживаем изменения семейства шрифта
    unwatchFontFamily = watch(
      () => settingsStore.fontFamily,
      (newFontFamily) => {
        const fontFamily = fontFamilyMap[newFontFamily] || fontFamilyMap['PT Sans'];
        setCSSVariable('--reading-text-font-family', fontFamily);
      }
    );

    // Отслеживаем изменения размера шрифта  
    unwatchFontSize = watch(
      () => settingsStore.fontSize,
      (newFontSize) => {
        setCSSVariable('--reading-text-font-size', `${newFontSize}px`);
      }
    );

    // Отслеживаем изменения высоты строки
    unwatchLineHeight = watch(
      () => settingsStore.lineHeight,
      (newLineHeight) => {
        setCSSVariable('--reading-text-line-height', newLineHeight.toString());
      }
    );


    // Отслеживаем изменения семейства шрифта
    unwatchFontFamilyCs = watch(
      () => settingsStore.fontFamilyCs,
      (newFontFamily) => {
        const fontFamily = fontFamilyCsMap[newFontFamily] || fontFamilyCsMap['Triodion'];
        setCSSVariable('--reading-text-font-family-cs', fontFamily);
      }
    );

    // Отслеживаем изменения размера шрифта  
    unwatchFontSizeCs = watch(
      () => settingsStore.fontSizeCs,
      (newFontSize) => {
        setCSSVariable('--reading-text-font-size-cs', `${newFontSize}px`);
      }
    );

    // Отслеживаем изменения высоты строки
    unwatchLineHeightCs = watch(
      () => settingsStore.lineHeightCs,
      (newLineHeight) => {
        setCSSVariable('--reading-text-line-height-cs', newLineHeight.toString());
      }
    );

    // Отслеживаем изменения выравнивания текста
    unwatchTextAlign = watch(
      () => settingsStore.isTextAlignJustified,
      (newTextAlign) => {
        setCSSVariable('--reading-text-align', newTextAlign ? 'justify' : 'left');
      }
    );

    // Отслеживаем изменения переносов слов
    unwatchWordsBreak = watch(
      () => settingsStore.isTextWordsBreak,
      (newWordsBreak) => {
        setCSSVariable('--reading-text-hyphens', newWordsBreak ? 'auto' : 'manual');
      }
    );

    // Отслеживаем изменения отступов страницы
    unwatchPagePadding = watch(
      () => settingsStore.isTextPagePadding,
      (newPagePadding) => {
        const padding = newPagePadding ? '16px 24px calc(16px + var(--f7-safe-area-bottom)) 24px' : '8px 12px calc(8px + var(--f7-safe-area-bottom)) 12px';
        setCSSVariable('--reading-text-page-padding', padding);
      }
    );

    // Отслеживаем изменения жирности шрифта
    unwatchTextBold = watch(
      () => settingsStore.isTextBold,
      (newTextBold) => {
        setCSSVariable('--reading-text-font-weight', newTextBold ? '700' : '400');
      }
    );

    // Отслеживаем изменения выравнивания текста
    unwatchTextAlign = watch(
      () => settingsStore.isTextAlignJustified,
      (newTextAlign) => {
        setCSSVariable('--reading-text-align', newTextAlign ? 'justify' : 'left');
      }
    );

    // Отслеживаем изменения переносов слов
    unwatchWordsBreak = watch(
      () => settingsStore.isTextWordsBreak,
      (newWordsBreak) => {
        setCSSVariable('--reading-text-hyphens', newWordsBreak ? 'manual' : 'none');
      }
    );

    // Отслеживаем изменения отступов страницы
    unwatchPagePadding = watch(
      () => settingsStore.isTextPagePadding,
      (newPagePadding) => {
        const padding = newPagePadding ? '16px 24px calc(16px + var(--f7-safe-area-bottom)) 24px' : '8px 12px calc(8px + var(--f7-safe-area-bottom)) 12px';
        setCSSVariable('--reading-text-page-padding', padding);
      }
    );

    // Отслеживаем изменения жирности шрифта
    unwatchTextBold = watch(
      () => settingsStore.isTextBold,
      (newTextBold) => {
        setCSSVariable('--reading-text-font-weight', newTextBold ? '700' : '400');
      }
    );
  };

  /**
   * Очищает наблюдатели
   */
  const cleanupTextSettings = () => {
    unwatchFontFamily?.();
    unwatchFontSize?.();
    unwatchLineHeight?.();
    unwatchFontFamilyCs?.();
    unwatchFontSizeCs?.();
    unwatchLineHeightCs?.();
    unwatchTextAlign?.();
    unwatchWordsBreak?.();
    unwatchPagePadding?.();
    unwatchTextBold?.();
  };

  // Автоматическая инициализация при монтировании
  onMounted(() => {
    initTextSettings();
  });

  // Автоматическая очистка при размонтировании
  onUnmounted(() => {
    cleanupTextSettings();
  });

  return {
    initTextSettings,
    cleanupTextSettings,
    updateTextCSSVariables
  };
} 