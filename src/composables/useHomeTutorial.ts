import { computed, ref } from "vue";
import { useSettingsStore } from "@/stores/settings";

export type HomeTutorialKind = "favorites" | "sort";

/**
 * Обучающий режим главной — два одноразовых тура (см. src/pages/home.vue
 * и SpotlightHint.vue):
 * 1) favorites — строка избранного и кнопки swipeout;
 * 2) sort — долгий тап, карандаш и иконки режима редактирования.
 */
export function useHomeTutorial() {
  const settingsStore = useSettingsStore();
  const isTutorialActive = ref(false);
  const activeTutorial = ref<HomeTutorialKind | null>(null);

  const shouldShowFavoritesTutorial = computed(
    () => !settingsStore.hasSeenHomeFavoritesTutorial
  );

  const shouldShowSortTutorial = computed(
    () => !settingsStore.hasSeenHomeSortTutorial
  );

  const shouldShowTutorial = computed(
    () => shouldShowFavoritesTutorial.value || shouldShowSortTutorial.value
  );

  const startTutorial = (kind: HomeTutorialKind) => {
    activeTutorial.value = kind;
    isTutorialActive.value = true;
  };

  const finishTutorial = () => {
    const kind = activeTutorial.value;
    isTutorialActive.value = false;
    activeTutorial.value = null;
    if (kind === "favorites") {
      settingsStore.setHasSeenHomeFavoritesTutorial(true);
    } else if (kind === "sort") {
      settingsStore.setHasSeenHomeSortTutorial(true);
    }
  };

  const resetTutorialFlag = () => {
    settingsStore.setHasSeenHomeFavoritesTutorial(false);
    settingsStore.setHasSeenHomeSortTutorial(false);
  };

  return {
    isTutorialActive,
    activeTutorial,
    shouldShowFavoritesTutorial,
    shouldShowSortTutorial,
    shouldShowTutorial,
    startTutorial,
    finishTutorial,
    resetTutorialFlag,
  };
}
