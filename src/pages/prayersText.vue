<template>
  <TextReaderPage
    :item-id="config.itemId"
    :initial-title="config.initialTitle"
    :item-url="config.itemUrl"
    :load="load"
    :favorite="config.favorite"
    :history="config.history"
    :f7router="f7router"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Router } from "framework7/types";
import TextReaderPage from "@/components/TextReaderPage.vue";
import type { ReaderTextDocument } from "@/components/textReader";
import { resolvePrayerTextReaderConfig } from "@/components/prayers/prayerTextConfig";
import { usePrayersStore } from "@/stores/prayers";

const { elementId, sectionId, f7router } = defineProps<{
  elementId?: string;
  sectionId?: string;
  f7router: Router.Router;
}>();

const prayersStore = usePrayersStore();

const config = computed(() =>
  resolvePrayerTextReaderConfig({ elementId, sectionId }, prayersStore)
);

const load = async (): Promise<ReaderTextDocument> => {
  const { rawId, isSection, initialTitle } = config.value;
  const prayerText = isSection
    ? await prayersStore.getComposedPrayerText(rawId)
    : await prayersStore.getPrayerText(rawId);
  return {
    ...prayerText,
    title: prayerText.name || initialTitle,
  };
};
</script>
