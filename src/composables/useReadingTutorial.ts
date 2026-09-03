import { computed, ref } from "vue";
import { useSettingsStore } from "@/stores/settings";

// Количество шагов обязательного тура "Основы" (см. ReadingBasicsTutorial.vue):
// 1) листание назад, 2) листание вперёд, 3) показ меню, 4) угол — добавление закладки
const BASICS_TUTORIAL_STEPS_COUNT = 4;

/**
 * Обучающий режим читалки — два независимых механизма (см. src/pages/prayersText.vue):
 *
 * - Уровень 1 "Основы" — обязательный короткий тур из BASICS_TUTORIAL_STEPS_COUNT шагов,
 *   показывается один раз при первом тапе пользователя по области чтения.
 * - Уровень 2 — одноразовая подсказка по иконкам верхнего и нижнего меню,
 *   появляется при первом раскрытии панелей (см. SpotlightHint.vue).
 */
export function useReadingTutorial() {
  const settingsStore = useSettingsStore();

  // --- Уровень 1: обязательный тур "Основы" ---
  const isBasicsTutorialActive = ref(false);
  const basicsStep = ref(0);

  const shouldShowBasicsTutorial = computed(
    () => !settingsStore.hasSeenReadingBasicsTutorial
  );

  const startBasicsTutorial = () => {
    basicsStep.value = 0;
    isBasicsTutorialActive.value = true;
  };

  const finishBasicsTutorial = () => {
    isBasicsTutorialActive.value = false;
    settingsStore.setHasSeenReadingBasicsTutorial(true);
  };

  const nextBasicsStep = () => {
    if (basicsStep.value >= BASICS_TUTORIAL_STEPS_COUNT - 1) {
      finishBasicsTutorial();
      return;
    }
    basicsStep.value += 1;
  };

  const prevBasicsStep = () => {
    if (basicsStep.value > 0) {
      basicsStep.value -= 1;
    }
  };

  // --- Уровень 2: контекстные подсказки по иконкам меню (один раз) ---
  const shouldShowBarsHint = computed(
    () =>
      !settingsStore.hasSeenTopMenuHint ||
      !settingsStore.hasSeenResetProgressHint
  );

  const markBarsHintSeen = () => {
    settingsStore.setHasSeenTopMenuHint(true);
    settingsStore.setHasSeenResetProgressHint(true);
  };

  // Сброс всех флагов сразу — используется пунктом "Обучение" в настройках
  const resetAllTutorialFlags = () => {
    settingsStore.setHasSeenReadingBasicsTutorial(false);
    settingsStore.setHasSeenTopMenuHint(false);
    settingsStore.setHasSeenResetProgressHint(false);
  };

  return {
    // Уровень 1
    isBasicsTutorialActive,
    basicsStep,
    basicsStepsCount: BASICS_TUTORIAL_STEPS_COUNT,
    shouldShowBasicsTutorial,
    startBasicsTutorial,
    nextBasicsStep,
    prevBasicsStep,
    finishBasicsTutorial,
    skipBasicsTutorial: finishBasicsTutorial,

    // Уровень 2
    shouldShowBarsHint,
    markBarsHintSeen,

    resetAllTutorialFlags,
  };
}
