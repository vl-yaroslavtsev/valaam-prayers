<template>
  <f7-page
    name="home"
    :class="{ 'home-tutorial-lock-navbar': lockHomeNavbar }"
    @page:afterin="isHomeVisible = true"
    @page:tabshow="isHomeVisible = true"
    @page:afterout="isHomeVisible = false"
    @page:tabhide="isHomeVisible = false"
  >
    <!-- Top Navbar -->
    <f7-navbar transparent>
      <f7-nav-left>
        <f7-link panel-open="left">
          <SvgIcon icon="burger" :size="32" />
        </f7-link>
      </f7-nav-left>
      <f7-nav-title sliding>Избранное</f7-nav-title>
      <f7-nav-right>
        <f7-link
          ref="editButtonRef"
          class="home-edit-link"
          @click="toggleSortable"
        >
          <SvgIcon
            icon="pencil"
            :color="sortableEnabled ? 'primary-accent-50' : pencilInactiveColor"
            :size="24"
          />
        </f7-link>
      </f7-nav-right>
      <!-- <f7-nav-title-large>
        Сейчас читаю
      </f7-nav-title-large> -->
    </f7-navbar>
    <f7-block-title class="now-reading-title">Сейчас читаю</f7-block-title>
    <HistorySlider :items="lastReadings" :isLoading="isHistoryLoading" />
    <f7-block-title class="favorites-title">Избранное</f7-block-title>
    <f7-block v-if="chips.length > 0" ref="chipsBlockRef" class="chips-block">
      <f7-chip
        v-for="chip in chips"
        :key="chip.id"
        :text="chip.title"
        :class="{ 'chip-selected': selectedFilter === chip.id }"
        @click="onFilterClick(chip.id)"
      />
    </f7-block>
    <f7-block v-if="isEmptyList"
      >Отметьте звездочкой молитвы, книги, святые, мысли и они появятся здесь.</f7-block
    >
    <div
      ref="favoritesSectionRef"
      class="favorites-section"
      :style="favoritesSectionMinHeight ? { minHeight: favoritesSectionMinHeight } : undefined"
    >
      <FavoritesList
        ref="favoritesList"
        :isLoading="isLoading"
        sortable
        :sortable-enabled="sortableEnabled"
        :favorites="currentFavorites"
        :tutorial-item-id="tutorialItemId"
        @delete-item="onDeleteItem"
        @undo-delete-item="onUndoDeleteItem"
        @reset-item-progress="onResetItemProgress"
        @undo-reset-item-progress="onUndoResetItemProgress"
        @sorted="onSorted"
      />
    </div>
    <SeparatorLine
      class="separator"
      :color="isDarkMode ? 'baige-10' : 'black-10'"
    />
    <SpotlightHint
      v-if="isTutorialActive && hintTargets"
      :targets="hintTargets"
      @close="onHomeTutorialClose"
    />
  </f7-page>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect, computed, nextTick, useTemplateRef } from "vue";
import { useTheme } from "@/composables/useTheme";
import { useFavoritesStore } from "@/stores/favorites";
import { usePrayersStore, type PrayerElement, type PrayerSection } from "@/stores/prayers";
import { useSaintsStore } from "@/stores/saints";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useErrorToast } from "@/composables/useErrorToast";
import {
  useHomeTutorial,
  type HomeTutorialKind,
} from "@/composables/useHomeTutorial";

import {
  buildLastReadingItems,
  filterFavoritesByChip,
  getAvailableFavoriteChips,
  hydrateFavoriteItem,
  type FavoriteFilterId,
} from "@/components/home/favoritesFilter";
import SvgIcon from "@/components/SvgIcon.vue";
import SeparatorLine from "@/components/SeparatorLine.vue";
import HistorySlider from "@/components/HistorySlider.vue";
import { FavoritesList } from "@/components/prayers";
import SpotlightHint, {
  type SpotlightTarget,
} from "@/components/reading-tutorial/SpotlightHint.vue";

const { isDarkMode } = useTheme();
const pencilInactiveColor = computed(() => (isDarkMode.value ? "baige-90" : "black-60"));

// Используем Pinia store
const favoritesStore = useFavoritesStore();
const prayersStore = usePrayersStore();
const saintsStore = useSaintsStore();
const historyStore = useReadingHistoryStore();

/** Только фильтры, для которых есть избранное; при одной категории чипсы не показываются. */
const chips = computed(() => getAvailableFavoriteChips(favoritesStore.favorites));

const selectedFilter = ref<FavoriteFilterId>("all");

watch(chips, (availableChips) => {
  if (!availableChips.some((chip) => chip.id === selectedFilter.value)) {
    selectedFilter.value = "all";
  }
});

const chipsBlockRef = useTemplateRef("chipsBlockRef");
const editButtonRef = useTemplateRef("editButtonRef");
const favoritesSectionRef = useTemplateRef<HTMLElement>("favoritesSectionRef");
const favoritesListRef = useTemplateRef("favoritesList");
const favoritesSectionMinHeight = ref<string | null>(null);

const isHomeVisible = ref(true);
const tutorialItemId = ref<string | null>(null);
const hintTargets = ref<SpotlightTarget[] | null>(null);
const lockHomeNavbar = ref(false);
const isTutorialStarting = ref(false);

const {
  isTutorialActive,
  activeTutorial,
  shouldShowFavoritesTutorial,
  shouldShowSortTutorial,
  startTutorial,
  finishTutorial,
} = useHomeTutorial();

const TUTORIAL_NAVBAR_SETTLE_MS = 500;
const SORTABLE_TRANSITION_MS = 320;

const waitMs = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isTutorialItemInView = (el: HTMLElement) => {
  const pageContent = el.closest(".page-content") as HTMLElement | null;
  const elRect = el.getBoundingClientRect();
  const box = pageContent?.getBoundingClientRect() ?? {
    top: 0,
    bottom: window.innerHeight,
  };
  return elRect.top >= box.top && elRect.bottom <= box.bottom;
};

const buildHomeTutorialTargets = (): SpotlightTarget[] => {
  const list = favoritesListRef.value;
  return [
    {
      title: "Избранное",
      text: "Вы добавили этот текст в Избранное. Нажмите на него, чтобы открыть и продолжить чтение.",
      shape: "rounded",
      getTargetEl: () => list?.getTutorialItemEl(),
      prepare: async () => {
        await list?.closeTutorialSwipeout();
      },
    },
    {
      title: "Скрытое меню",
      text: "Смахните строку влево, чтобы открыть быстрые действия с текстом.",
      shape: "rounded",
      hand: "swipe-left",
      getTargetEl: () => list?.getTutorialItemEl(),
      prepare: async () => {
        await list?.openTutorialSwipeout();
      },
    },
    {
      title: "Поделиться",
      text: "Отправьте ссылку на этот текст близким.",
      shape: "rounded",
      getTargetEl: () => list?.getTutorialItemEl(),
      getCaretEl: () => list?.getTutorialActionEl("share"),
      prepare: async () => {
        await list?.openTutorialSwipeout();
      },
    },
    {
      title: "Читать сначала",
      text: "Удобно, если вы дочитали молитвы до конца и хотите, чтобы завтра они открылись с первой страницы.",
      shape: "rounded",
      getTargetEl: () => list?.getTutorialItemEl(),
      getCaretEl: () => list?.getTutorialActionEl("reset"),
      prepare: async () => {
        await list?.openTutorialSwipeout();
      },
    },
    {
      title: "Убрать из Избранного",
      text: "Убирает текст из списка. Вы по-прежнему сможете найти его в основных разделах приложения.",
      shape: "rounded",
      getTargetEl: () => list?.getTutorialItemEl(),
      getCaretEl: () => list?.getTutorialActionEl("delete"),
      prepare: async () => {
        await list?.openTutorialSwipeout();
      },
    },
    {
      title: "Настройка Избранного",
      text: "Нажмите на этот карандаш, если захотите поменять тексты местами или убрать лишние.",
      shape: "circle",
      getTargetEl: () => getEditButtonEl(),
      prepare: async () => {
        await list?.closeTutorialSwipeout();
      },
    },
  ];
};

const getEditButtonEl = (): HTMLElement | null => {
  return getF7El(editButtonRef.value);
};

const setTutorialSortable = async (enabled: boolean) => {
  if (sortableEnabled.value === enabled) return;
  sortableEnabled.value = enabled;
  await nextTick();
  await waitMs(SORTABLE_TRANSITION_MS);
};

const buildSortTutorialTargets = (): SpotlightTarget[] => {
  const list = favoritesListRef.value;
  return [
    {
      title: "Убрать из Избранного",
      text: "Нажмите на корзину слева, чтобы убрать этот текст из списка. Вы по-прежнему сможете найти его в основных разделах приложения.",
      shape: "rounded",
      getTargetEl: () => list?.getTutorialItemEl(),
      getCaretEl: () => list?.getTutorialDeleteHandlerEl(),
      prepare: async () => {
        await list?.closeTutorialSwipeout();
        await setTutorialSortable(true);
      },
    },
    {
      title: "Изменение порядка",
      text: "Потяните за значок с двумя полосками справа, чтобы переместить текст выше или ниже.",
      shape: "rounded",
      getTargetEl: () => list?.getTutorialItemEl(),
      getCaretEl: () => list?.getTutorialSortHandlerEl(),
      prepare: async () => {
        await list?.closeTutorialSwipeout();
        await setTutorialSortable(true);
      },
    },
    {
      title: "Готово",
      text: "Когда закончите настройку, нажмите сюда еще раз, чтобы сохранить изменения.",
      shape: "circle",
      getTargetEl: () => getEditButtonEl(),
      prepare: async () => {
        await list?.closeTutorialSwipeout();
        await setTutorialSortable(true);
      },
    },
  ];
};

const abortTutorialPrepare = () => {
  lockHomeNavbar.value = false;
  tutorialItemId.value = null;
  isTutorialStarting.value = false;
};

const tryStartHomeTutorial = async (kind: HomeTutorialKind = "favorites") => {
  if (
    isTutorialActive.value ||
    isTutorialStarting.value ||
    tutorialItemId.value != null ||
    !isHomeVisible.value ||
    isLoading.value ||
    currentFavorites.value.length === 0
  ) {
    return;
  }

  if (kind === "favorites") {
    if (!shouldShowFavoritesTutorial.value || sortableEnabled.value) return;
  } else if (!shouldShowSortTutorial.value || !sortableEnabled.value) {
    return;
  }

  const tutorialItem =
    currentFavorites.value.find((item) => item.canResetProgress) ??
    currentFavorites.value[0];
  if (!tutorialItem) return;

  isTutorialStarting.value = true;
  if (kind === "favorites") {
    sortableEnabled.value = false;
    // Сначала даём navbar доехать до конца collapse/expand — оверлей иначе
    // фиксирует его в промежуточном положении («Избранное» + «Сейчас читаю»).
    await waitMs(TUTORIAL_NAVBAR_SETTLE_MS);
  } else {
    await waitMs(SORTABLE_TRANSITION_MS);
  }

  const stillWanted =
    kind === "favorites"
      ? shouldShowFavoritesTutorial.value && !sortableEnabled.value
      : shouldShowSortTutorial.value && sortableEnabled.value;

  if (
    !stillWanted ||
    !isHomeVisible.value ||
    isTutorialActive.value ||
    tutorialItemId.value != null
  ) {
    isTutorialStarting.value = false;
    return;
  }

  lockHomeNavbar.value = true;
  tutorialItemId.value = tutorialItem.id;
  await nextTick();

  const itemEl = favoritesListRef.value?.getTutorialItemEl();
  if (!itemEl || !getEditButtonEl()) {
    abortTutorialPrepare();
    return;
  }

  if (!isTutorialItemInView(itemEl)) {
    itemEl.scrollIntoView({ block: "nearest", behavior: "auto" });
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  if (!isHomeVisible.value || !stillWanted) {
    abortTutorialPrepare();
    return;
  }
  if (!favoritesListRef.value?.getTutorialItemEl() || !getEditButtonEl()) {
    abortTutorialPrepare();
    return;
  }

  hintTargets.value =
    kind === "favorites"
      ? buildHomeTutorialTargets()
      : buildSortTutorialTargets();
  startTutorial(kind);
  isTutorialStarting.value = false;
};

const onHomeTutorialClose = async () => {
  await favoritesListRef.value?.closeTutorialSwipeout();
  if (activeTutorial.value !== "sort") {
    sortableEnabled.value = false;
  }
  hintTargets.value = null;
  tutorialItemId.value = null;
  lockHomeNavbar.value = false;
  isTutorialStarting.value = false;
  finishTutorial();
  await nextTick();
  void tryStartHomeTutorial();
};

const getF7El = (refValue: unknown): HTMLElement | null => {
  if (!refValue) return null;
  if (refValue instanceof HTMLElement) return refValue;
  const el = (refValue as { $el?: HTMLElement }).$el;
  return el instanceof HTMLElement ? el : null;
};

/** Сохраняет позицию chips при смене фильтра: короткие списки не схлопывают scrollHeight. */
const onFilterClick = async (id: FavoriteFilterId) => {
  if (selectedFilter.value === id) return;

  const chipsEl = getF7El(chipsBlockRef.value);
  const favoritesSection = favoritesSectionRef.value;
  const pageContent = chipsEl?.closest(".page-content") as HTMLElement | null;

  if (pageContent && favoritesSection) {
    // min-height секции = место от её начала до низа видимой области при текущем scrollTop
    const needed =
      pageContent.scrollTop +
      pageContent.clientHeight -
      favoritesSection.offsetTop;
    favoritesSectionMinHeight.value = `${Math.max(needed, 0)}px`;
  }

  const anchorTop = chipsEl?.getBoundingClientRect().top ?? null;
  selectedFilter.value = id;

  await nextTick();

  if (!pageContent || !chipsEl || anchorTop == null) return;

  const delta = chipsEl.getBoundingClientRect().top - anchorTop;
  if (Math.abs(delta) > 1) {
    pageContent.scrollTop += delta;
  }
};

const isLoading = computed(() => {
  if (selectedFilter.value === "prayers" || selectedFilter.value === "books") {
    return prayersStore.isLoading;
  }
  if (selectedFilter.value === "scripture") {
    const hasBible = favoritesStore.favorites.some((f) => f.type === "bible");
    return hasBible && prayersStore.isLoading;
  }
  if (selectedFilter.value === "saints") {
    return saintsStore.isLoading;
  }
  if (
    selectedFilter.value === "thoughts" ||
    selectedFilter.value === "instructions"
  ) {
    return false;
  }
  return prayersStore.isLoading || saintsStore.isLoading;
});

const isHistoryLoading = computed(
  () => prayersStore.isLoading || saintsStore.isLoading
);

const lastReadings = computed(() =>
  buildLastReadingItems(historyStore.getRecentItems(10), (id) =>
    prayersStore.getItemById(id)
  )
);

const homeDataLookups = {
  getPrayerById: (id: number) => prayersStore.getItemById(id),
  getPrayerLanguages: (item: { name: string; url: string }) =>
    prayersStore.getItemLanguages(item as PrayerElement | PrayerSection),
  getSaintById: (id: number) => saintsStore.getSaintById(id),
  getHistoryItem: (id: string) => historyStore.getItem(id),
};

const currentFavorites = computed(() =>
  filterFavoritesByChip(favoritesStore.favorites, selectedFilter.value).map((f) =>
    hydrateFavoriteItem(f, homeDataLookups)
  )
);

const isEmptyList = computed(
  () => !isLoading.value && currentFavorites.value.length === 0
);

const showErrorToast = useErrorToast({
  text: "Ошибка при загрузке данных. Пожалуйста, проверьте интернет соединение.",
});

const isError = computed(() => {
  return (
    (prayersStore.error && prayersStore.elements.length === 0) ||
    (saintsStore.error && saintsStore.saints.length === 0)
  );
});

watchEffect(() => {
  if (isError.value) {
    showErrorToast.showErrorToast();
  }
});

const onDeleteItem = favoritesStore.deleteFavorite;
const onUndoDeleteItem = favoritesStore.undoDeleteFavorite;

const onResetItemProgress = historyStore.resetProgress;
const onUndoResetItemProgress = historyStore.undoResetProgress;

const sortableEnabled = ref(false);

const toggleSortable = () => {
  if (isTutorialActive.value || isTutorialStarting.value) return;
  sortableEnabled.value = !sortableEnabled.value;
  if (sortableEnabled.value) {
    void tryStartHomeTutorial("sort");
  }
};

watch(
  [
    shouldShowFavoritesTutorial,
    isHomeVisible,
    isLoading,
    currentFavorites,
    sortableEnabled,
  ],
  () => {
    void tryStartHomeTutorial();
  },
  { immediate: true, flush: "post" }
);

const onSorted = (id: string, prevId: string | null) => {
  favoritesStore.moveFavorite(id, prevId);
};
</script>

<style scoped lang="less">
.chips-block {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  gap: 8px;
  margin-bottom: 0;

  &::-webkit-scrollbar {
    display: none;
  }

  :deep(.chip) {
    flex-shrink: 0;
  }
}

.favorites-section {
  overflow-anchor: none;
}

.separator {
  margin-top: 30px;
}

.home-tutorial-lock-navbar {
  :deep(.navbar),
  :deep(.navbar-bg),
  :deep(.navbar-inner),
  :deep(.title),
  :deep(.title-large) {
    transition: none !important;
  }
}

.now-reading-title {
  --f7-block-margin-vertical: 16px;
  --f7-block-title-margin-bottom: -4px;
}

.favorites-title {
  --f7-block-margin-vertical: 22px;
}

.home-edit-link {
  width: 44px;
  height: 44px;
  justify-content: center;
}
</style>
