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
    <f7-block ref="chipsBlockRef" class="chips-block">
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
import { useFavoritesStore, type FavoritesItem } from "@/stores/favorites";
import { usePrayersStore } from "@/stores/prayers";
import { useSaintsStore } from "@/stores/saints";
import { useThoughtsStore } from "@/stores/thoughts";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useErrorToast } from "@/composables/useErrorToast";
import {
  useHomeTutorial,
  type HomeTutorialKind,
} from "@/composables/useHomeTutorial";
import type { Language } from "@/types/common";

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
const thoughtsStore = useThoughtsStore();
const historyStore = useReadingHistoryStore();

type FilterType = "all" | "prayers" | "books" | "calendar";

const ALL_CHIPS: { id: FilterType; title: string }[] = [
  { id: "all", title: "Все" },
  { id: "prayers", title: "Молитвы" },
  { id: "books", title: "Книги" },
  { id: "calendar", title: "Календарь" },
];

const hasFavoritesOfType = (filterType: Exclude<FilterType, "all">) => {
  if (filterType === "calendar") {
    return favoritesStore.favorites.some(
      (f) => f.type === "saints" || f.type === "thoughts"
    );
  }
  return favoritesStore.favorites.some((f) => f.type === filterType);
};

/** Только фильтры, для которых есть избранное; «Все» — если есть хотя бы один тип. */
const chips = computed(() => {
  const available = ALL_CHIPS.filter((chip) => {
    if (chip.id === "all") return favoritesStore.favorites.length > 0;
    return hasFavoritesOfType(chip.id);
  });
  return available;
});

const selectedFilter = ref<FilterType>("all");

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
const tutorialItemId = ref<number | null>(null);
const hintTargets = ref<SpotlightTarget[] | null>(null);
const lockHomeNavbar = ref(false);
const isTutorialStarting = ref(false);

const {
  isTutorialActive,
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
      text: "Смахните строку влево, чтобы открыть быстрые действия с этим текстом.",
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
      text: "Сбрасывает прогресс чтения. Удобно, когда вы дочитали молитвы до конца и хотите, чтобы завтра они снова открылись с первой страницы.",
      shape: "rounded",
      getTargetEl: () => list?.getTutorialItemEl(),
      getCaretEl: () => list?.getTutorialActionEl("reset"),
      prepare: async () => {
        await list?.openTutorialSwipeout();
      },
    },
    {
      title: "Убрать из Избранного",
      text: "Убирает этот текст из списка. Вы по-прежнему сможете найти его в основных разделах приложения.",
      shape: "rounded",
      getTargetEl: () => list?.getTutorialItemEl(),
      getCaretEl: () => list?.getTutorialActionEl("delete"),
      prepare: async () => {
        await list?.openTutorialSwipeout();
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
      title: "Сортировка касанием",
      text: "Нажмите и удерживайте любой текст, чтобы переместить его. Так вы сможете расставить Избранное в удобном для вас порядке.",
      shape: "rounded",
      hand: "tap-hold",
      getTargetEl: () => list?.getTutorialItemEl(),
      prepare: async () => {
        await list?.closeTutorialSwipeout();
        await setTutorialSortable(false);
      },
    },
    {
      title: "Настройка списка",
      text: "Нажмите на значок карандаша, чтобы перейти в режим управления вашим Избранным.",
      shape: "circle",
      getTargetEl: () => getEditButtonEl(),
      prepare: async () => {
        await list?.closeTutorialSwipeout();
        if (!sortableEnabled.value) {
          sortableEnabled.value = true;
          await nextTick();
        }
      },
    },
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
  ];
};

const abortTutorialPrepare = () => {
  lockHomeNavbar.value = false;
  tutorialItemId.value = null;
  isTutorialStarting.value = false;
};

const tryStartHomeTutorial = async () => {
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

  const nextKind: HomeTutorialKind | null = shouldShowFavoritesTutorial.value
    ? sortableEnabled.value
      ? null
      : "favorites"
    : shouldShowSortTutorial.value
      ? "sort"
      : null;

  if (!nextKind) return;

  const tutorialItem = currentFavorites.value[0];
  if (!tutorialItem) return;

  isTutorialStarting.value = true;
  sortableEnabled.value = false;

  // Сначала даём navbar доехать до конца collapse/expand — оверлей иначе
  // фиксирует его в промежуточном положении («Избранное» + «Сейчас читаю»).
  await waitMs(TUTORIAL_NAVBAR_SETTLE_MS);

  const stillWanted =
    nextKind === "favorites"
      ? shouldShowFavoritesTutorial.value && !sortableEnabled.value
      : shouldShowSortTutorial.value && !shouldShowFavoritesTutorial.value;

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
  if (!itemEl || (nextKind === "sort" && !getEditButtonEl())) {
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
  if (!favoritesListRef.value?.getTutorialItemEl()) {
    abortTutorialPrepare();
    return;
  }
  if (nextKind === "sort" && !getEditButtonEl()) {
    abortTutorialPrepare();
    return;
  }

  hintTargets.value =
    nextKind === "favorites"
      ? buildHomeTutorialTargets()
      : buildSortTutorialTargets();
  startTutorial(nextKind);
  isTutorialStarting.value = false;
};

const onHomeTutorialClose = async () => {
  await favoritesListRef.value?.closeTutorialSwipeout();
  sortableEnabled.value = false;
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
const onFilterClick = async (id: FilterType) => {
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
  if (selectedFilter.value === "calendar") {
    return saintsStore.isLoading || thoughtsStore.isLoading;
  }
  return (
    prayersStore.isLoading ||
    saintsStore.isLoading ||
    thoughtsStore.isLoading
  );
});

const isHistoryLoading = computed(
  () =>
    prayersStore.isLoading ||
    saintsStore.isLoading ||
    thoughtsStore.isLoading
);

const lastReadings = computed(() =>
  historyStore.getLastItems("all", 10).map((r) => {
    let name = "";
    let url = "";

    if (r.type === "prayers" || r.type === "books") {
      const item = prayersStore.getItemById(r.id);
      if (item) {
        name = item.name;
        url = item.url;
      }
    } else if (r.type === "saints") {
      const saint = saintsStore.getSaintById(r.id);
      if (saint) {
        name = saint.name;
      }
      url = "/saints/" + r.id;
    }

    return {
      name,
      url,
      ...r,
    };
  })
);

const currentFavorites = computed(() => {
  if (selectedFilter.value === "all") {
    return [
      ...getFavoritesByType("prayers"),
      ...getFavoritesByType("books"),
      ...getFavoritesByType("calendar"),
    ].sort((a, b) => a.sort - b.sort);
  }
  return getFavoritesByType(selectedFilter.value);
});

const isEmptyList = computed(
  () => !isLoading.value && currentFavorites.value.length === 0
);

const showErrorToast = useErrorToast({
  text: "Ошибка при загрузке данных. Пожалуйста, проверьте интернет соединение.",
});

const isError = computed(() => {
  return (prayersStore.error && prayersStore.elements.length === 0)
  || (saintsStore.error && saintsStore.saints.length === 0)
  || (thoughtsStore.error && thoughtsStore.thoughts.length === 0);
});

watchEffect(() => {
  if (isError.value) {
    showErrorToast.showErrorToast();
  }
});


// Используем методы из store
const getFavoritesByType = (filterType: Exclude<FilterType, "all">) => {
  let favorites: FavoritesItem[] = [];
  if (filterType === "books") {
    favorites = favoritesStore.getFavoritesByType("books");

  } else if (filterType === "prayers") {
    favorites = favoritesStore.getFavoritesByType("prayers");

  } else if (filterType === "calendar") {
    favorites = [
      ...favoritesStore.getFavoritesByType("saints"),
      ...favoritesStore.getFavoritesByType("thoughts"),
    ].sort((a, b) => a.sort - b.sort);

  }
  return favorites.map((f) => {
    const type = f.type;
    const history = historyStore.getItem(f.id);
    let extra: {
      name: string;
      url: string;
      lang: Language[];
    } = {
      name: "",
      url: "",
      lang: [],
    };

    if (["books", "prayers"].includes(type)) {
      const item = prayersStore.getItemById(f.id);
      if (item) {
        extra.name = item.name;
        extra.url = item.url;
        extra.lang = 'lang' in item ? item.lang : [];
      }
    } else if (type === "saints") {
      const saint = saintsStore.getSaintById(f.id);
      if (saint) {
        extra.name = saint.name;
      }
      extra.url = "/saints/" + f.id;
    } else if (type === "thoughts") {
      const thought = thoughtsStore.getThoughtById(String(f.id));
      if (thought) {
        extra.name = thought.name;
      }
      extra.url = "/thoughts/" + f.id;
    }

    return {
      ...f,
      progress: history?.progress,
      pages: history?.pages,
      lastReadAt: history?.lastReadAt,
      ...extra,
    };
  });
};

const onDeleteItem = favoritesStore.deleteFavorite;
const onUndoDeleteItem = favoritesStore.undoDeleteFavorite;

const onResetItemProgress = historyStore.resetProgress;
const onUndoResetItemProgress = historyStore.undoResetProgress;

const sortableEnabled = ref(false);

const toggleSortable = () => {
  if (isTutorialActive.value || isTutorialStarting.value) return;
  sortableEnabled.value = !sortableEnabled.value;
};

watch(
  [
    shouldShowFavoritesTutorial,
    shouldShowSortTutorial,
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

const onSorted = (id: number, prevId: number | null) => {
  favoritesStore.moveFavorite(id, prevId);
};
</script>

<style scoped lang="less">
.chips-block {
  --filter-chip-selected-border: var(--brand-color-primary-accent-50);
  --filter-chip-bg-color: var(--content-color-black-10);

  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 0;

  :deep(.chip) {
    background-color: var( --filter-chip-bg-color);
    border: 2px solid transparent;
  }

  :deep(.chip-selected) {
    border-color: var(--filter-chip-selected-border);
  }
}

:global(.dark .chips-block) {
  // --filter-chip-selected-border: var(--content-color-white-100);
  --filter-chip-bg-color: var(--content-color-baige-5);
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
