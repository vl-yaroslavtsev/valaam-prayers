import { computed, ref } from "vue";
import { useSettingsStore } from "@/stores/settings";

/**
 * Обучающий режим главной — одноразовый тур по избранному
 * (см. src/pages/home.vue и SpotlightHint.vue):
 * 1) подсветка строки, 2) свайп влево, 3–5) кнопки swipeout
 *    (вырез — вся строка, caret — на кнопке).
 */
export function useHomeTutorial() {
  const settingsStore = useSettingsStore();
  const isTutorialActive = ref(false);

  const shouldShowTutorial = computed(
    () => !settingsStore.hasSeenHomeFavoritesTutorial
  );

  const startTutorial = () => {
    isTutorialActive.value = true;
  };

  const finishTutorial = () => {
    isTutorialActive.value = false;
    settingsStore.setHasSeenHomeFavoritesTutorial(true);
  };

  const resetTutorialFlag = () => {
    settingsStore.setHasSeenHomeFavoritesTutorial(false);
  };

  return {
    isTutorialActive,
    shouldShowTutorial,
    startTutorial,
    finishTutorial,
    resetTutorialFlag,
  };
}
