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
import type { Router } from "framework7/types";
import TextReaderPage from "@/components/TextReaderPage.vue";
import type { ReaderTextDocument } from "@/components/textReader";
import {
  buildSaintLifeText,
  resolveSaintLifeReaderConfig,
} from "@/components/saint/saintText";
import { useSaintsStore } from "@/stores/saints";

const { saintId, f7router } = defineProps<{
  saintId?: string;
  f7router: Router.Router;
}>();

const saintsStore = useSaintsStore();
const initialTitle = saintsStore.getSaintById(Number(saintId))?.name ?? "";
const config = resolveSaintLifeReaderConfig(saintId, initialTitle);

const load = async (): Promise<ReaderTextDocument> => {
  const saint = await saintsStore.getSaintDetails(config.saintId);
  if (!saint) {
    throw new Error(`Saint not found: ${config.saintId}`);
  }
  const lifeText = buildSaintLifeText(saint);
  return {
    ...lifeText,
    title: saint.name,
  };
};
</script>
