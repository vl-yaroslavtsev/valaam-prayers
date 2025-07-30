<template>
  <f7-page :page-content="false" @page:beforein="onPageBeforeIn" @page:afterout="onPageAfterOut">
    <PrayersTextNavbar
      ref="navbar"
      :title="title"
      :item-id="itemId"
      :item-url="item?.url || ''"
      v-model:current-language="currentLanguage"
      :available-languages="availableLanguages"
      :text-theme="textTheme"
      v-model:is-hidden="isNavbarHidden"
      @toggle-text-settings="toggleTextSettingsSheet"
    />
    <f7-page-content class="">
      <TextPaginator 
        :isLoading="isLoading" 
        :text="text" 
        :initialProgress="initialProgress"
        :lang="currentLanguage"
        :itemId="itemId"
        ref="textPaginator" 
        @tap="onTextPaginatorTap"
        @touchstart="onTextPaginatorTouchStart" />
       
    </f7-page-content>
    <TextSettingsSelector 
      v-model:isOpened="isTextSettingsSheetOpened"
      :disabled="isTextCalculating"
      :language="currentLanguage"
    />
    
    <!-- Всплывающий тулбар для навигации по страницам -->
     
    <PageNavigationToolbar
      v-show="!isBrightnessTouching"
      :current-page="currentPage"
      :total-pages="totalPages"
      :is-hidden="isPageNavHidden"
      @reset-progress="resetProgress"
      @page-change="onPageSliderChange"
    />

  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, useTemplateRef, ComponentPublicInstance, watch } from "vue";
import type { Router } from "framework7/types";
import { f7 } from "framework7-vue";
import type { Swiper } from "swiper";
import type { Language } from "@/types/common";

import { useTheme } from "@/composables/useTheme";
import { 
  usePrayersStore, 
  BOOKS_SECTION_ID,
  type PrayerElement 
} from "@/stores/prayers";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useComponentsStore } from "@/stores/components";
import { useSettingsStore } from "@/stores/settings";
import { useUndoToast } from "@/composables/useUndoToast";

import TextPaginator from "@/components/TextPaginator.vue"
import TextSettingsSelector from "@/components/TextSettingsSelector.vue";
import PrayersTextNavbar from "@/components/PrayersTextNavbar.vue";
import PageNavigationToolbar from "@/components/PageNavigationToolbar.vue";
import { useApiState } from "@/composables/useApiState";
import { device } from "@/js/device";

const { elementId, sectionId, f7router } = defineProps<{
  elementId?: string;
  sectionId?: string;
  f7router: Router.Router;
}>();

const { isDarkMode } = useTheme();
const navbarRef = useTemplateRef<InstanceType<typeof PrayersTextNavbar>>("navbar");

const prayersStore = usePrayersStore();
const historyStore = useReadingHistoryStore();
const settingsStore = useSettingsStore();
const { getComponent } = useComponentsStore();

// Определяем ID и тип элемента
const itemId = elementId || sectionId;
const isSection = !!sectionId;

if (!itemId) {
  throw new Error("Neither elementId nor sectionId provided");
}

const item = prayersStore.getItemById(itemId);
const subtitle = computed(() => {
  if (!item || isSection) return '';
  return 'parent' in item ? prayersStore.getItemById(item.parent)?.name : '';
});
const title = item?.name || '';
const text = ref<string>("");

const isTextSettingsSheetOpened = ref(false);
const toggleTextSettingsSheet = () => {
  isTextSettingsSheetOpened.value = !isTextSettingsSheetOpened.value;
};

watch(isTextSettingsSheetOpened, (isOpen) => {
  if (isOpen) {
    isNavbarHidden.value = true;
    isPageNavHidden.value = true;
  }
});

// Языковые настройки из store
const currentLanguage = ref<Language | null>(settingsStore.currentLanguage);
const availableLanguages = ref<Language[]>([]);

// Выбираем подходящий метод API в зависимости от типа
const apiCall = isSection 
  ? prayersStore.getComposedPrayerText(itemId)
  : prayersStore.getPrayerText(itemId);

const { isLoading, isError, error, data } = useApiState(null, apiCall);

watch(data, async () => {
  if (!data.value) return;
   
  // Обновляем доступные языки
  availableLanguages.value = data.value.lang;
  
  // Получаем подходящий язык из доступных
  currentLanguage.value = settingsStore.getLanguageFromAvailable(availableLanguages.value);

  updatePrayerText(currentLanguage.value);
});

// Функция для обновления текста молитвы
const updatePrayerText = (language: Language | null) => {
  if (!data.value) return;

  console.log("updatePrayerText", data.value);

  let prayerText = '';
  
  // Теперь оба типа возвращают одинаковую структуру
  switch (language) {
    case 'cs-cf':
      prayerText = data.value.text_cs_cf || '';
      break;
    case 'cs':
      prayerText = data.value.text_cs || '';
      break;
    case 'ru':
      prayerText = data.value.text_ru || '';
      break;
    default:
      prayerText = data.value.text || '';
  }

  // Для отдельных молитв
  const hasExistingHeader = /^\s*<h[12]/.test(prayerText);
  
  if (hasExistingHeader) {
    // Заменяем h2 на h1 если есть
    prayerText = prayerText.replace(/^(\s*)<h2([^>]*)>/i, '$1<h1$2>').replace(/<\/h2>/i, '</h1>');
    text.value = prayerText;
  } else {
    text.value = `<h1>${title}</h1>\n\n${prayerText}`;
  }
};

const initialProgress = computed(() => historyStore.getItem(itemId)?.progress || 0);

watch(error, async () => {
  if (!error.value) return;
  console.log("error", error.value);
  text.value = `Данные не найдены`;
});

// Отслеживание изменений языка
watch(currentLanguage, (newLanguage) => {
  updatePrayerText(newLanguage);
  if (newLanguage) {
    settingsStore.setLanguage(newLanguage);
  }
});

const isNavbarHidden = ref(true);

const onPageBeforeIn = () => {
  const bottomTabBar = getComponent("bottomTabBar");
  bottomTabBar?.hide(true);

  if (settingsStore.readingBrightness !== -1) {
    device.setBrightness(settingsStore.readingBrightness);
    return;
  }
};

const onPageAfterOut = () => {
  const bottomTabBar = getComponent("bottomTabBar");
  bottomTabBar?.show(true);
  device.resetBrightness();
};

const toggleNavbar = () => {
  isNavbarHidden.value = !isNavbarHidden.value;
};

const textPaginator = useTemplateRef<InstanceType<typeof TextPaginator>>("textPaginator");

const isTextCalculating = computed(() => {
  return textPaginator.value?.isCalculating || false;
});

const textTheme = computed(() => {
  return textPaginator.value?.theme || "light";
});

const textMode = computed(() => {
  return textPaginator.value?.mode || "horizontal";
});

const onTextPaginatorTap = (payload: { type: "center" | "left" | "right" | "top" | "bottom"; x: number; y: number }) => {
  const { type, x, y } = payload;

  console.log("onTextPaginatorTap", payload);

  if (!isNavbarHidden.value || !isPageNavHidden.value) {
    return;

  } else if (type === "center" && !textPaginator.value?.isTransitioning) {
    togglePageNavigation();
    toggleNavbar();

  } else if (type === "left" || type === "top") {
    textPaginator.value?.slidePrev();

  } else if (type === "right" || type === "bottom") {
    textPaginator.value?.slideNext();
  }
};

const onTextPaginatorTouchStart = (payload: { swiper: Swiper, event: PointerEvent }) => {
  console.log("onTextPaginatorTouchStart", payload);
  if (!isNavbarHidden.value || !isPageNavHidden.value) {
    setTimeout(() => {
      isNavbarHidden.value = true;
      isPageNavHidden.value = true;
    }, 0);
  }
};

// Состояние навигации по страницам
const totalPages = computed(() => textPaginator.value?.pagesCount || 0);
const progress = computed(() => textPaginator.value?.progress || 0);
const currentPage = computed(() => Math.min(Math.floor(progress.value * totalPages.value) + 1, totalPages.value));

watch(progress, () => {
  if (!textPaginator.value || !totalPages.value) return;
  console.log("watch progress", progress.value, totalPages.value);
  const type = prayersStore.isBook(itemId) ? "books" : "prayers";
  historyStore.updateProgress(itemId, progress.value, totalPages.value, type);
});

const isPageNavHidden = ref(true);

// Показать/скрыть навигацию по страницам
const togglePageNavigation = () => {
  isPageNavHidden.value = !isPageNavHidden.value;
};

const onPageSliderChange = (value: number) => {
  isNavbarHidden.value = true;
  textPaginator.value?.goToPage(value, textMode.value === "vertical");
};

const { showUndoToast: showUndoResetToast } = useUndoToast({
  text: "Прогресс сброшен",
  onUndo: () => {    
    historyStore.undoResetProgress();
    const { progress } = historyStore.getItem(itemId) || {};

    console.log("showUndoResetToast onUndo, progress = ", progress);
    if (progress) {
      textPaginator.value?.setProgress(progress);
    }
  },
});

const resetProgress = () => {
  if (!itemId) {
    return;
  }

  textPaginator.value?.goToPage(1);
  showUndoResetToast();
}

// Управление яркостью
const isBrightnessTouching = computed(() => navbarRef.value?.isBrightnessTouching || false);

</script>
<style scoped lang="less">
// Стили перенесены в компонент PrayersTextNavbar
.dark .page {
  --f7-bars-bg-color: var(--content-color-baige-5-no-opacity);
}
</style>
