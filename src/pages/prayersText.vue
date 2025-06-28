<template>
  <f7-page
    :page-content="false"
    @page:beforein="onPageBeforeIn"
    @page:afterout="onPageAfterOut"
  >
    <f7-navbar ref="navbar" hidden>
      <f7-nav-left :back-link="true"></f7-nav-left>
      <f7-nav-title sliding>{{ title }}</f7-nav-title>
      <f7-nav-right><f7-link icon-md="f7:search" /></f7-nav-right>
    </f7-navbar>
    <f7-page-content
      class=""
    >
      <TextPaginator 
        :mode="'horizontal'"
        :text="text" 
        :theme="theme"
        ref="textPaginator"
        @tap="onTextPaginatorTap"
      />
    </f7-page-content>
  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, useTemplateRef } from "vue";
import type { Router } from "framework7/types";
import { f7 } from "framework7-vue";

import { useTheme } from "@/composables/useTheme";
import { usePrayersStore, BOOKS_SECTION_ID } from "@/stores/prayers";
import { useReadingHistoryStore } from "@/stores/readingHistory";
import { useComponentsStore } from "@/stores/components";
import TextPaginator from "@/components/TextPaginator.vue"

const { elementId, f7router } = defineProps<{
  elementId: string;
  f7router: Router.Router;
}>();

interface Navbar {
  show: (animated: boolean) => void;
  hide: (animated: boolean) => void;
}

const { isDarkMode } = useTheme();
const navbarRef = useTemplateRef<Navbar>("navbar");
const theme = ref<"light" | "dark" | "grey" | "sepia" | "sepia-contrast" | "cream" | "yellow">("grey");

const prayersStore = usePrayersStore();
const historyStore = useReadingHistoryStore();

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
    text.value =
      prayersData.slavonic_text || prayersData.ru_text || prayersData.csl_text;
    // text.value = text.value.replace(/\u00AD/g, "");
  } catch (error) {
    text.value = "Данные не найдены";
  }
});

watchEffect(() => {
  theme.value = isDarkMode.value ? "dark" : "grey";
});

const { toolbar } = useComponentsStore();

let isNavbarHidden = true;

const onPageBeforeIn = () => {
  toolbar?.hide(true);
};

const onPageAfterOut = () => {
  toolbar?.show(true);
};

const toggleNavbar = () => {
  if (!navbarRef.value) return;

  if (isNavbarHidden) {
    navbarRef.value.show(true);
  } else {
    navbarRef.value.hide(true);
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
</script>
<style scoped lang="less">
</style>
