<template>
  <f7-navbar 
    ref="navbar" 
    large 
    hidden 
    class="prayers-text-navbar navbar-large-collapsed">
    <f7-nav-left :back-link="true"></f7-nav-left>
    <f7-nav-title sliding></f7-nav-title>
    <f7-nav-right>
      <f7-link icon-only>
        <SvgIcon icon="menu" color="baige-90" :size="24" />
      </f7-link>
      <LanguageSelector 
        v-if="currentLanguage && availableLanguages.length > 1"
        v-model="currentLanguage" 
        :available-languages="availableLanguages" />
      <f7-link icon-only>
        <SvgIcon 
          :icon="isElementFavorite ? 'favorite-filled' : 'favorite'" 
          color="baige-90" 
          :size="24"
          @click="toggleFavorite" />
      </f7-link>
      <f7-link icon-only>
        <SvgIcon 
          icon="settings-2" 
          color="baige-90" 
          :size="24" 
          @click="$emit('toggle-text-settings')" />
      </f7-link>
      <f7-link icon-only>
        <SvgIcon icon="share" color="baige-90" :size="24" @click="shareItem" />
      </f7-link>
      <f7-link icon-only>
        <SvgIcon icon="search" color="baige-90" :size="24" />
      </f7-link>
    </f7-nav-right>
    <f7-nav-title-large>{{ title }}</f7-nav-title-large>
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
</template>

<script setup lang="ts">
import { ref, computed, watch, useTemplateRef, watchEffect, ComponentPublicInstance, readonly } from "vue";
import { f7 } from "framework7-vue";
import type { Language } from "@/types/common";

import { usePrayersStore } from "@/stores/prayers";
import { useComponentsStore } from "@/stores/components";
import { useSettingsStore } from "@/stores/settings";
import { useFavoritesStore } from "@/stores/favorites";
import { useInfoToast } from "@/composables/useInfoToast";
import { device } from "@/js/device";

import SvgIcon from "@/components/SvgIcon.vue";
import LanguageSelector from "@/components/LanguageSelector.vue";

interface Props {
  title: string;
  itemId: string;
  itemUrl: string;
  availableLanguages: Language[];
  textTheme: string;
  isHidden: boolean;
}

interface Emits {
  (e: 'toggle-text-settings'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const navbarRef = useTemplateRef<ComponentPublicInstance>("navbar");

const prayersStore = usePrayersStore();
const settingsStore = useSettingsStore();
const { getComponent } = useComponentsStore();
const { addFavorite, deleteFavorite, isFavorite } = useFavoritesStore();

const currentLanguage = defineModel<Language | null>();

// Управление видимостью navbar
watch(() => props.isHidden, (isHidden) => {
  if (!navbarRef.value) return;
  const navbarEl = navbarRef.value.$el;

  if (isHidden) {
    f7.navbar.hide(navbarEl, true);
    f7.navbar.collapseLargeTitle(navbarEl);
  } else {
    f7.navbar.show(navbarEl, true);
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

// Поделиться
const shareItem = (e: Event) => {
  const target = (e.target as HTMLElement).closest("a") as HTMLElement;

  const sharePopover = getComponent("sharePopover");
  if (!sharePopover) return;

  sharePopover.open({
    title: props.title,
    url: props.itemUrl,
  }, target, false);
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
watch(() => isBrightnessTouching, (isTouching) => {
  const navbarEl = navbarRef.value?.$el;
  if (!navbarEl) return;

  if (isTouching) {
    navbarEl.classList.add("navbar-hidden-with-brightness");
  } else {
    navbarEl.classList.remove("navbar-hidden-with-brightness");
  }
});

// Экспортируем ref для внешнего доступа
defineExpose({
  isBrightnessTouching: readonly(isBrightnessTouching)
});
</script>

<style scoped lang="less">
.navbar-hidden-with-brightness {
  :deep(.navbar-bg), 
  :deep(.navbar-inner > *) {
    opacity: 0;
  }

  .navbar-footer {
    opacity: 1;
  }
}

.navbar-footer {
  --f7-range-bar-bg-color: var(--content-color-black-20);
  --f7-range-bar-active-bg-color: var(--brand-color-primary-accent-70);
  --f7-range-knob-color: var(--brand-color-primary-accent-70);

  position: absolute;
  top: calc(100% + var(--f7-navbar-large-title-height) - 1px);
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