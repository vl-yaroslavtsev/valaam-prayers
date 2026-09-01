<template>
  <f7-page name="settings-offline-test">
    <f7-navbar title="Офлайн данные (тест)" back-link></f7-navbar>

    <template v-for="item in visibleSections" :key="item.key">
      <f7-block-title>{{ item.title }}</f7-block-title>
      <f7-block strong-ios outline-ios>
        <p>Статус: {{ statusText(item) }}</p>
        <p>{{ item.sizeLabel }}: {{ sizeText(item) }}</p>
        <div class="grid grid-cols-2 grid-gap">
          <f7-button fill :disabled="isDownloading(item.moduleId)" @click="onDownload(item)">
            Скачать
          </f7-button>
          <f7-button
            outline
            color="red"
            :disabled="!isDownloading(item.moduleId)"
            @click="onCancel(item)"
          >
            Отмена
          </f7-button>
        </div>
        <p>
          <f7-button
            fill
            color="red"
            :disabled="!canDelete(item)"
            @click="onDelete(item)"
          >
            Удалить скачанное
          </f7-button>
        </p>
        <p>Прогресс: {{ downloadedText(item) }}</p>
        <p v-if="errorText(item)" class="text-color-red">{{ errorText(item) }}</p>
        <hr/>
      </f7-block>
    </template>
  </f7-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useDownloadsStore } from "@/stores/downloads";
import type { DownloadModuleId } from "@/services/download/types";

type SectionKind = "full" | "update";

interface DownloadSection {
  key: string;
  moduleId: DownloadModuleId;
  title: string;
  kind: SectionKind;
  sizeLabel: string;
}

const BYTES_IN_MB = 1024 * 1024;

const DOWNLOAD_SECTIONS: DownloadSection[] = [
  {
    key: "molitvoslov",
    moduleId: "molitvoslov",
    title: "Молитвослов - тексты",
    kind: "full",
    sizeLabel: "Размер",
  },
  {
    key: "molitvoslov-update",
    moduleId: "molitvoslov",
    title: "Молитвослов - тексты - обновление",
    kind: "update",
    sizeLabel: "Доступно обновление",
  },
  {
    key: "spiritualLiterature",
    moduleId: "spiritualLiterature",
    title: "Духовная литература",
    kind: "full",
    sizeLabel: "Размер",
  },
  {
    key: "liturgicalBooks",
    moduleId: "liturgicalBooks",
    title: "Книги",
    kind: "full",
    sizeLabel: "Размер",
  },
  {
    key: "saints",
    moduleId: "saints",
    title: "Святые",
    kind: "full",
    sizeLabel: "Размер",
  },
  {
    key: "saintIcons",
    moduleId: "saintIcons",
    title: "Святые - иконы",
    kind: "full",
    sizeLabel: "Размер",
  },
  {
    key: "calendar",
    moduleId: "calendar",
    title: "Календарь",
    kind: "full",
    sizeLabel: "Размер",
  },
  {
    key: "calendarIcons",
    moduleId: "calendarIcons",
    title: "Календарь - иконы",
    kind: "full",
    sizeLabel: "Размер",
  },
];

const downloadsStore = useDownloadsStore();
const activeKey = ref<string | null>(null);
const sizes = reactive<Record<string, number | undefined>>({});
const sizeErrors = reactive<Record<string, string | undefined>>({});
const actionErrors = reactive<Record<string, string | undefined>>({});
const downloaded = reactive<Partial<Record<DownloadModuleId, boolean>>>({});

const visibleSections = computed(() =>
  DOWNLOAD_SECTIONS.filter((item) => item.kind !== "update" || downloaded.molitvoslov)
);

function startOfCurrentYear(): Date {
  return new Date(new Date().getFullYear(), 0, 1);
}

function formatMb(bytes: number): string {
  return `${(bytes / BYTES_IN_MB).toFixed(2)} Мб`;
}

function isDownloading(moduleId: DownloadModuleId): boolean {
  return downloadsStore.progress[moduleId]?.status === "downloading";
}

function isItemDownloaded(item: DownloadSection): boolean {
  return !!downloaded[item.moduleId];
}

function statusText(item: DownloadSection): string {
  return isItemDownloaded(item) ? "Скачано" : "Не скачано";
}

function canDelete(item: DownloadSection): boolean {
  return isItemDownloaded(item) && !isDownloading(item.moduleId);
}

function sizeText(item: DownloadSection): string {
  if (sizeErrors[item.key]) return "ошибка";
  if (sizes[item.key] == null) return "…";
  return formatMb(sizes[item.key]!);
}

function downloadedText(item: DownloadSection): string {
  const totalFallback = sizes[item.key] ?? 0;
  const progress = downloadsStore.progress[item.moduleId];

  if (item.kind === "update") {
    if (activeKey.value !== item.key) {
      return `${formatMb(0)} из ${formatMb(totalFallback)}`;
    }
    const downloaded = progress?.downloadedBytes ?? 0;
    const total = progress?.totalBytes || totalFallback;
    return `${formatMb(downloaded)} из ${formatMb(total)}`;
  }

  if (activeKey.value === "molitvoslov-update" && item.moduleId === "molitvoslov") {
    return `${formatMb(totalFallback)} из ${formatMb(totalFallback)}`;
  }

  if (!progress) {
    return `${formatMb(0)} из ${formatMb(totalFallback)}`;
  }

  const downloadedBytes = progress.downloadedBytes ?? 0;
  const total = progress.totalBytes || totalFallback;
  return `${formatMb(downloadedBytes)} из ${formatMb(total)}`;
}

function errorText(item: DownloadSection): string {
  if (actionErrors[item.key]) return actionErrors[item.key]!;
  if (sizeErrors[item.key]) return sizeErrors[item.key]!;
  if (item.kind === "update" && activeKey.value !== item.key) return "";
  if (item.kind === "full" && activeKey.value === "molitvoslov-update" && item.moduleId === "molitvoslov") {
    return "";
  }
  return downloadsStore.progress[item.moduleId]?.error ?? "";
}

async function loadSize(item: DownloadSection): Promise<void> {
  sizeErrors[item.key] = undefined;
  try {
    const since = item.kind === "update" ? startOfCurrentYear() : undefined;
    sizes[item.key] = await downloadsStore.getModuleSize(item.moduleId, since);
  } catch (err) {
    sizeErrors[item.key] = err instanceof Error ? err.message : String(err);
  }
}

async function refreshDownloaded(moduleId: DownloadModuleId): Promise<void> {
  downloaded[moduleId] = await downloadsStore.isDownloaded(moduleId);
  if (moduleId === "molitvoslov" && downloaded.molitvoslov) {
    const updateItem = DOWNLOAD_SECTIONS.find((item) => item.kind === "update");
    if (updateItem) await loadSize(updateItem);
  }
}

async function onDownload(item: DownloadSection): Promise<void> {
  activeKey.value = item.key;
  actionErrors[item.key] = undefined;
  try {
    if (item.kind === "update") {
      await downloadsStore.checkForUpdate(item.moduleId, startOfCurrentYear());
    } else {
      await downloadsStore.startDownload(item.moduleId);
    }
  } catch (err) {
    actionErrors[item.key] = err instanceof Error ? err.message : String(err);
    console.error(`Download failed for ${item.key}:`, err);
  } finally {
    await refreshDownloaded(item.moduleId);
  }
}

async function onCancel(item: DownloadSection): Promise<void> {
  actionErrors[item.key] = undefined;
  await downloadsStore.cancelDownload(item.moduleId);
  if (activeKey.value === item.key || (item.moduleId === "molitvoslov" && activeKey.value === "molitvoslov-update")) {
    activeKey.value = null;
  }
  await refreshDownloaded(item.moduleId);
}

async function onDelete(item: DownloadSection): Promise<void> {
  actionErrors[item.key] = undefined;
  await downloadsStore.deleteDownload(item.moduleId);
  if (
    activeKey.value === item.key ||
    (item.moduleId === "molitvoslov" &&
      (activeKey.value === "molitvoslov" || activeKey.value === "molitvoslov-update"))
  ) {
    activeKey.value = null;
  }
  await refreshDownloaded(item.moduleId);
}

onMounted(async () => {
  for (const item of DOWNLOAD_SECTIONS) {
    if (item.kind === "full" && downloadsStore.progress[item.moduleId]?.status === "downloading") {
      activeKey.value = item.key;
    }
  }

  const fullItems = DOWNLOAD_SECTIONS.filter((item) => item.kind === "full");
  await Promise.all(fullItems.map(loadSize));
  await Promise.all(fullItems.map((item) => refreshDownloaded(item.moduleId)));
});
</script>
