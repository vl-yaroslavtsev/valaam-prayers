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
          <SvgIcon icon="language" color="baige-900" :size="30" />
        </f7-link>
        <f7-link icon-only>
          <SvgIcon icon="favorite" color="baige-900" :size="24" />
        </f7-link>
        <f7-link icon-only>
          <SvgIcon icon="settings-2" color="baige-900" :size="30" />
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
      <TextPaginator :mode="'horizontal'" :text="text" :theme="theme" ref="textPaginator" @tap="onTextPaginatorTap" />
    </f7-page-content>
  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, useTemplateRef, ComponentPublicInstance } from "vue";
import type { Router } from "framework7/types";
import { f7 } from "framework7-vue";

import { useTheme } from "@/composables/useTheme";
import { usePrayersStore, BOOKS_SECTION_ID } from "@/stores/prayers";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useComponentsStore } from "@/stores/components";
import TextPaginator from "@/components/TextPaginator.vue"
import SvgIcon from "@/components/SvgIcon.vue";

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

watchEffect(async () => {
  try {
    const prayersData = await import(
      `../../test-data/prayers-text/${elementId}.json`
    );
    // console.log(prayersData);

    text.value = `<h1>${title.value}</h1>\n\n`;
    text.value += 
      (prayersData.slavonic_text || prayersData.ru_text || prayersData.csl_text);
    // text.value = text.value.replace(/\u00AD/g, "");
  } catch (error) {
    text.value = "Данные не найдены";
  }
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

const onTextPaginatorTap = (type: "center" | "left" | "right" | "top" | "bottom", x: number, y: number) => {
  console.log("onTextPaginatorTap", type, x, y);
  if (type === "center") {
    toggleNavbar();
  }
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
</script>
<style scoped lang="less"></style>
