<template>
  <f7-navbar 
    ref="navbar" 
    large
    hidden 
    class="prayers-text-navbar navbar-large-collapsed">
    <f7-nav-left :back-link="true"></f7-nav-left>
    <f7-nav-title sliding></f7-nav-title>
    <f7-nav-right>
      <f7-link ref="menuLink" icon-only @click="emit('open-content-popup')">
        <SvgIcon icon="menu" :color="navIconColor" :size="24" />
      </f7-link>
      <LanguageSelector 
        v-if="currentLanguage && availableLanguages.length > 1"
        ref="languageSelector"
        v-model="currentLanguage" 
        :available-languages="availableLanguages" />
      <f7-link ref="favoriteLink" icon-only>
        <SvgIcon 
          :icon="isElementFavorite ? 'favorite-filled' : 'favorite'" 
          :color="navIconColor" 
          :size="24"
          @click="toggleFavorite" />
      </f7-link>
      <f7-link ref="settingsLink" icon-only>
        <SvgIcon 
          icon="letter-tt" 
          :color="navIconColor" 
          :size="24" 
          @click="$emit('toggle-text-settings')" />
      </f7-link>
      <f7-link ref="moreLink" icon-only aria-label="Ещё" @click="isMorePopupOpened = true">
        <SvgIcon icon="more-vertical" :color="navIconColor" :size="24" />
      </f7-link>
    </f7-nav-right>
    <f7-nav-title-large>{{ title }}
      <div class="subtitle-large" :class="{ 'lang-cs': currentLanguage === 'cs' }">
        <div class="subtitle-large-item"
          v-for="item in subtitle">
          {{ item }}
        </div>
      </div>
    </f7-nav-title-large>
    <div :class="`navbar-footer theme-${textTheme}`">
      <SvgIcon
        icon="sun" 
        :color="textTheme === 'dark' ? 'baige-60' : 'black-40'" 
        class="flex-shrink-0" 
        :size="24" />
      <f7-range
        :min="0"
        :max="100"
        :step="1"
        @range:change="onBrightnessChange"
        @touchstart.passive="onBrightnessTouchStart"
        @touchend.passive="onBrightnessTouchEnd"
        :value="currentBrightness"          
      />
      <div class="navbar-footer-text">
        {{ currentBrightness }}
      </div>
    </div>
  </f7-navbar>
  <PrayersTextMorePopup
    v-model:isOpened="isMorePopupOpened"
    :title="title"
    :item-url="itemUrl"
    :target-el="moreLinkEl"
    @open-search="emit('open-search')"
    @start-tutorial="emit('start-tutorial')"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, useTemplateRef, watchEffect, onBeforeUnmount, ComponentPublicInstance, readonly } from "vue";
import { f7 } from "framework7-vue";
import type { Router } from "framework7/types";
import type { Language } from "@/types/common";

import { usePrayersStore } from "@/stores/prayers";
import { useSettingsStore } from "@/stores/settings";
import { useFavoritesStore } from "@/stores/favorites";
import { useInfoToast } from "@/composables/useInfoToast";
import { useTheme } from "@/composables/useTheme";
import { device } from "@/js/device";

import SvgIcon from "@/components/SvgIcon.vue";
import LanguageSelector from "@/components/LanguageSelector.vue";
import PrayersTextMorePopup from "@/components/PrayersTextMorePopup.vue";

interface Props {
  title: string;
  subtitle: string[];
  itemId: number;
  itemUrl: string;
  availableLanguages: Language[];
  textTheme: string;
  isHidden: boolean;
  animateVisibility?: boolean;
}

interface Emits {
  (e: 'toggle-text-settings'): void;
  (e: 'open-content-popup'): void;
  (e: 'open-search'): void;
  (e: 'start-tutorial'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const navbarRef = useTemplateRef<ComponentPublicInstance>("navbar");

// Refs на иконки верхнего меню — используются обучающим режимом читалки
// для точечной подсветки (см. SpotlightHint.vue)
const menuLinkRef = useTemplateRef<ComponentPublicInstance>("menuLink");
const languageSelectorRef = useTemplateRef<ComponentPublicInstance>("languageSelector");
const favoriteLinkRef = useTemplateRef<ComponentPublicInstance>("favoriteLink");
const settingsLinkRef = useTemplateRef<ComponentPublicInstance>("settingsLink");
const moreLinkRef = useTemplateRef<ComponentPublicInstance>("moreLink");
const isMorePopupOpened = ref(false);
const moreLinkEl = computed(() => (moreLinkRef.value?.$el as HTMLElement | undefined) ?? null);

onBeforeUnmount(() => {
  isMorePopupOpened.value = false;
});

const { isDarkMode } = useTheme();
const navIconColor = computed(() => (isDarkMode.value ? "baige-90" : "black-primary"));

const prayersStore = usePrayersStore();
const settingsStore = useSettingsStore();
const { addFavorite, deleteFavorite, isFavorite } = useFavoritesStore();

const currentLanguage = defineModel<Language | null>('current-language');

// Управление видимостью navbar
watch(() => props.isHidden, (isHidden) => {
  if (!navbarRef.value) return;
  const navbarEl = navbarRef.value.$el;
  const animate = props.animateVisibility !== false;

  if (isHidden) {
    isMorePopupOpened.value = false;
    f7.navbar.hide(navbarEl, animate);
    f7.navbar.collapseLargeTitle(navbarEl);
  } else {
    f7.navbar.show(navbarEl, animate);
    f7.navbar.expandLargeTitle(navbarEl);
  }
});

// Управление избранными
const { showInfoToast: showAddedToFavoritesToast } = useInfoToast({
  text: "Добавлено на главный экран",
});

const { showInfoToast: showRemovedFromFavoritesToast } = useInfoToast({
  text: "Удалено с главного экрана",
});

const isElementFavorite = computed(() => isFavorite(props.itemId));

const toggleFavorite = async () => {
  const type = prayersStore.isBook(props.itemId) ? "books" : "prayers";

  if (isFavorite(props.itemId)) {
    await deleteFavorite(props.itemId);
    showRemovedFromFavoritesToast();
  } else {
    await addFavorite(props.itemId, type);
    showAddedToFavoritesToast();
  }
};

// Управление яркостью
const currentBrightness = ref(
  settingsStore.readingBrightness !== -1 
    ? settingsStore.readingBrightness 
    : 0
);

watchEffect(async () => {
  if (settingsStore.readingBrightness !== -1) {
    return;
  }

  const brightness = await device.getBrightness();
  currentBrightness.value = brightness;
});

const isBrightnessTouching = ref(false);

const onBrightnessChange = (value: number) => {
  if (!isBrightnessTouching.value) {
    return;
  }

  settingsStore.setReadingBrightness(value);
  currentBrightness.value = value;
};

const onBrightnessTouchStart = () => {
  isBrightnessTouching.value = true;
};

const onBrightnessTouchEnd = () => {
  isBrightnessTouching.value = false;
};

// Управление классами при касании яркости
watch(isBrightnessTouching, (isTouching) => {
  const navbarEl = navbarRef.value?.$el;

  if (!navbarEl) return;

  if (isTouching) {
    navbarEl.classList.add("navbar-hidden-with-brightness");
  } else {
    navbarEl.classList.remove("navbar-hidden-with-brightness");
  }
});

// Ключи иконок верхнего меню в порядке их отображения в navbar
export type NavbarIconKey =
  | "menu"
  | "language"
  | "favorite"
  | "settings"
  | "more";

// Возвращает DOM-элементы иконок верхнего меню для точечной подсветки в обучающем режиме
const getIconTargets = (): { key: NavbarIconKey; el: HTMLElement | null }[] => [
  { key: "menu", el: menuLinkRef.value?.$el ?? null },
  { key: "language", el: languageSelectorRef.value?.$el ?? null },
  { key: "favorite", el: favoriteLinkRef.value?.$el ?? null },
  { key: "settings", el: settingsLinkRef.value?.$el ?? null },
  { key: "more", el: moreLinkRef.value?.$el ?? null },
];

// Экспортируем ref для внешнего доступа
defineExpose({
  isBrightnessTouching: readonly(isBrightnessTouching),
  getIconTargets,
  closeMorePopup: () => {
    isMorePopupOpened.value = false;
  },
});
</script>

<style scoped lang="less">
.prayers-text-navbar {
  --f7-navbar-large-title-height: 80px;

  --f7-range-bar-size: 4px;
  --f7-range-bar-border-radius: 2px;
  --f7-range-knob-width: 16px;
  --f7-range-knob-height: 24px;
}

.navbar-hidden-with-brightness {
  :deep(.navbar-bg), 
  :deep(.navbar-inner > *) {
    opacity: 0;
  }

  .navbar-footer {
    opacity: 1;
  }
}

.subtitle-large {
  display: flex;

  flex-direction: row;
  gap: 20px;
  justify-content: left;
  align-items: center;

  font-size: 16px;
  font-weight: 400;
  color: var(--f7-navbar-subtitle-text-color);

  &.lang-cs {
    font-family: 'Triodion Unicode';
  }
}

.subtitle-large-item {
  position: relative;

  &:after {
    content: "";
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: -12.5px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: var(--f7-navbar-subtitle-text-color);
  }

  &:last-child:after {
    background-color: transparent;
  }
}

.navbar-footer {
  --f7-range-bar-bg-color: var(--content-color-black-20);
  --f7-range-bar-active-bg-color: var(--brand-color-primary-accent-70);
  --f7-range-knob-color: var(--brand-color-primary-accent-70);

  position: absolute;
  top: calc(100% + var(--f7-navbar-large-title-height));
  left: 0;
  right: 0;
  height: 30px;
  color: var(--content-color-black-40);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  font-size: 14px;
  // transition-duration: var(--f7-page-swipeback-transition-duration) !important;
  transform: translate3d(
    0px,
    calc(-1 * var(--f7-navbar-large-collapse-progress) * var(--f7-navbar-large-title-height)),
    0
  );  

  .navbar-footer-text {
    width: 24px;
    text-align: right;
    flex-shrink: 0;
  }

  &.theme-dark {
    color: var(--content-color-baige-60);
    --f7-range-bar-bg-color: var(--content-color-baige-30);
    --f7-range-bar-active-bg-color: var(--brand-color-primary-accent-70);
    --f7-range-knob-color: var(--brand-color-primary-accent-70);
  }
}

.navbar-transitioning {
  .navbar-footer {
    transition-duration: var(--f7-navbar-hide-show-transition-duration);
  }
}
</style>