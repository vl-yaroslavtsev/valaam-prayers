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
  buildDayText,
  buildReadingText,
  resolveDayTextReaderConfig,
} from "@/components/calendar/dayText";
import { useCalendarStore } from "@/stores/calendar";

const { code, kind, readingId, f7router } = defineProps<{
  code?: string;
  kind?: string;
  readingId?: string;
  f7router: Router.Router;
}>();

const calendarStore = useCalendarStore();
const config = resolveDayTextReaderConfig({ code, kind, readingId });

const load = async (): Promise<ReaderTextDocument> => {
  const day = await calendarStore.getDayByCode(config.code);
  const dayText = day
    ? config.kind
      ? buildDayText(day, config.kind)
      : buildReadingText(day, config.readingId!)
    : null;
  if (!dayText) {
    throw new Error(`Day text not found: ${config.code}`);
  }
  return {
    ...dayText.prayerText,
    title: dayText.name,
    favoriteTitle: dayText.favoriteTitle,
  };
};
</script>
