<template>
  <f7-page :page-content="false" @page:beforein="onPageBeforeIn" @page:afterout="onPageAfterOut">
    <f7-navbar ref="navbar" large hidden class="navbar-large-collapsed">
      <f7-nav-left :back-link="true"></f7-nav-left>
      <f7-nav-title sliding></f7-nav-title>
      <f7-nav-right>
        <f7-link icon-only>
          <SvgIcon icon="menu" color="baige-900" :size="24" />
        </f7-link>
        <f7-link icon-only>
          <SvgIcon icon="language" color="baige-900" :size="24" />
        </f7-link>
        <f7-link icon-only>
          <SvgIcon :icon="isElementFavorite ? 'favorite-filled' : 'favorite'" color="baige-900" :size="24"
            @click="toggleFavorite" />
        </f7-link>
        <f7-link icon-only>
          <SvgIcon icon="settings-2" color="baige-900" :size="24" />
        </f7-link>
        <f7-link icon-only>
          <SvgIcon icon="share" color="baige-900" :size="24" @click="shareItem" />
        </f7-link>
        <f7-link icon-only>
          <SvgIcon icon="search" color="baige-900" :size="24" />
        </f7-link>
      </f7-nav-right>
      <f7-nav-title-large>{{ title }}</f7-nav-title-large>
    </f7-navbar>
    <f7-page-content class="">
      <TextPaginator 
        :isLoading="isLoading" 
        :mode="'horizontal'" 
        :text="text" 
        :theme="theme" 
        :initialProgress="initialProgress"
        ref="textPaginator" 
        @tap="onTextPaginatorTap" 
        @progress="onTextPaginatorProgress" />
    </f7-page-content>
  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, useTemplateRef, ComponentPublicInstance, watch } from "vue";
import type { Router } from "framework7/types";
import { f7 } from "framework7-vue";
import type { Swiper } from "swiper";

import { useTheme } from "@/composables/useTheme";
import { usePrayersStore, BOOKS_SECTION_ID } from "@/stores/prayers";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useComponentsStore } from "@/stores/components";
import TextPaginator from "@/components/TextPaginator.vue"
import SvgIcon from "@/components/SvgIcon.vue";
import { useFavoritesStore } from "@/stores/favorites";
import { useInfoToast } from "@/composables/useInfoToast";
import { useApiState } from "@/composables/useApiState";

const { elementId, f7router } = defineProps<{
  elementId: string;
  f7router: Router.Router;
}>();

const { isDarkMode } = useTheme();
const navbarRef = useTemplateRef<ComponentPublicInstance>("navbar");
const theme = ref<"light" | "dark" | "grey" | "sepia" | "sepia-contrast" | "cream" | "yellow">("grey");

const prayersStore = usePrayersStore();
const historyStore = useReadingHistoryStore();
const { getComponent } = useComponentsStore();

const prayer = computed(() => prayersStore.getItemById(elementId));
const subtitle = computed(
  () => prayer.value && prayersStore.getItemById(prayer.value.parent)?.name
);
const title = computed(() => prayer.value?.name);
const text = ref<string>("");

const { isLoading, isError, error, data } = useApiState(null, prayersStore.getPrayerText(elementId));

watch(data, async () => {
  if (!data.value) return;
  text.value = `<h1>${title.value}</h1>\n\n${data.value.text_cs_cf}`;
});

const initialProgress = computed(() => historyStore.getItem(elementId)?.progress || 0);

watch(error, async () => {
  if (!error.value) return;
  console.log("error", error.value);
  text.value = `Данные не найдены`;
});

watchEffect(() => {
  theme.value = isDarkMode.value ? "dark" : "grey";
});

let isNavbarHidden = true;

const onPageBeforeIn = () => {
  const bottomTabBar = getComponent("bottomTabBar");
  bottomTabBar?.hide(true);
};

const onPageAfterOut = () => {
  const bottomTabBar = getComponent("bottomTabBar");
  bottomTabBar?.show(true);
};

const toggleNavbar = () => {
  if (!navbarRef.value) return;
  console.log("toggleNavbar", navbarRef.value);

  const navbarEl = navbarRef.value.$el;

  if (isNavbarHidden) {
    f7.navbar.show(navbarEl, true);
    f7.navbar.expandLargeTitle(navbarEl);
  } else {
    f7.navbar.hide(navbarEl, true);
    f7.navbar.collapseLargeTitle(navbarEl);
  }
  isNavbarHidden = !isNavbarHidden;
};

const textPaginator = useTemplateRef("textPaginator");

const onTextPaginatorTap = (payload: { type: "center" | "left" | "right" | "top" | "bottom"; x: number; y: number }) => {
  const { type, x, y } = payload;
  console.log("onTextPaginatorTap", type, x, y);
  if (type === "center") {
    toggleNavbar();
  }
};

const onTextPaginatorProgress = (payload: { progress: number; pages: number }) => {
  const { progress, pages } = payload;
  console.log("onTextPaginatorProgress", progress, pages);
  historyStore.updateProgress(elementId, progress, pages, "prayers");
};

const shareItem = (e: Event) => {
  const target = (e.target as HTMLElement).closest("a") as HTMLElement;

  const sharePopover = getComponent("sharePopover");
  if (!sharePopover) return;

  sharePopover.open({
    title: title.value || "",
    url: prayer.value?.url || "",
  }, target);
};


const { addFavorite, deleteFavorite, isFavorite } = useFavoritesStore();

const { showInfoToast: showAddedToFavoritesToast } = useInfoToast({
  text: "Добавлено на главный экран",
});

const { showInfoToast: showRemovedFromFavoritesToast } = useInfoToast({
  text: "Удалено с главного экрана",
});

const isElementFavorite = computed(() => isFavorite(elementId));

watchEffect(() => {
  console.log("isElementFavorite", isElementFavorite.value);
});

const toggleFavorite = async () => {
  if (isFavorite(elementId)) {
    await deleteFavorite(elementId);
    showRemovedFromFavoritesToast();
  } else {
    await addFavorite(elementId, "prayers");
    showAddedToFavoritesToast();
  }
};
</script>
<style scoped lang="less"></style>
