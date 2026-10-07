<template>
  <f7-page name="settings-offline">
    <f7-navbar large transparent title="Доступ без интернета" back-link></f7-navbar>
    <f7-block>
      <p>
        Скачайте нужные разделы, чтобы молитвослов и календарь открывались даже там, где нет мобильной связи (например, в храме или в дороге)
      </p>
    </f7-block>

    <f7-list no-hairlines class="offline-list offline-list-auto-update">
      <f7-list-item title="Обновлять автоматически">
        <template #media>
          <SvgIcon icon="sync" :color="neutralColor" :size="24" />
        </template>
        <template #after>
          <f7-toggle small v-model:checked="autoUpdate" />
        </template>
      </f7-list-item>
    </f7-list>

    <template v-for="group in GROUPS" :key="group.key">
      <f7-block-title class="offline-group-title">{{ group.title }}</f7-block-title>
      <f7-list no-hairlines class="offline-list">
        <f7-list-item v-for="item in group.items" :key="item.moduleId" :title="item.title">
          <template #footer>
            <f7-progressbar
              v-show="showProgress(item.moduleId)"
              class="offline-progress"
              :progress="progressPercent(item.moduleId)"
            />
            <div class="offline-footer">
              <span v-if="showProgress(item.moduleId)" class="offline-accent offline-progress-text">{{ progressText(item.moduleId) }}</span>
              <span v-else-if="hasError(item.moduleId)" class="text-color-red">Не удалось скачать. Попробуйте ещё раз</span>
              <template v-else>
                <span v-if="sizeText(item.moduleId)">{{ sizeText(item.moduleId) }}</span>
                <span v-if="updateText(item.moduleId)" class="offline-accent">{{ updateText(item.moduleId) }}</span>
              </template>
            </div>
          </template>

          <template #after>
            <f7-button
              v-if="actionKind(item.moduleId) !== 'none'"
              class="offline-action"
              :aria-label="actionLabel(item.moduleId)"
              @click="onAction(item)"
            >
              <SvgIcon v-bind="actionIcon(item.moduleId)" />
            </f7-button>
          </template>
        </f7-list-item>
      </f7-list>
    </template>
  </f7-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from "vue";
import { f7 } from "framework7-vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";
import { useSettingsStore } from "@/stores/settings";
import { useDownloadsStore } from "@/stores/downloads";
import { startAutoUpdate, stopAutoUpdate } from "@/services/download/AutoUpdate";
import { ALL_MODULE_IDS } from "@/services/download/types";
import type { DownloadModuleId } from "@/services/download/types";
import type { IconName } from "@/types/icon-name";

type ActionKind = "download" | "update" | "cancel" | "delete" | "none";
type ActionIconColor = "baige-60" | "black-60" | "primary-accent-50";

interface ActionIcon {
  icon: IconName;
  color: ActionIconColor;
  size: number;
}

interface OfflineItem {
  moduleId: DownloadModuleId;
  title: string;
}

interface OfflineGroup {
  key: string;
  title: string;
  items: OfflineItem[];
}

const BYTES_IN_MB = 1024 * 1024;

const currentYear = new Date().getFullYear();

const GROUPS: OfflineGroup[] = [
  {
    key: "texts",
    title: "Тексты",
    items: [
      { moduleId: "molitvoslov", title: "Молитвослов" },
      { moduleId: "liturgicalBooks", title: "Богослужебные книги" },
      { moduleId: "spiritualLiterature", title: "Духовная литература" },
    ],
  },
  {
    key: "calendar",
    title: "Календарь",
    items: [
      { moduleId: "calendar", title: `Календарь на ${currentYear} год` },
      { moduleId: "calendarIcons", title: "Иконы календаря" },
    ],
  },
  {
    key: "saints",
    title: "Святые",
    items: [
      { moduleId: "saints", title: "Жития святых" },
      { moduleId: "saintIcons", title: "Иконы святых" },
    ],
  },
];

const { isDarkMode } = useTheme();
const settingsStore = useSettingsStore();
const downloadsStore = useDownloadsStore();

const neutralColor = computed<ActionIconColor>(() => (isDarkMode.value ? "baige-60" : "black-60"));

const autoUpdate = computed({
  get: () => settingsStore.isAutoUpdateOfflineDataEnabled,
  set: (value: boolean) => {
    settingsStore.setIsAutoUpdateOfflineDataEnabled(value);
    if (value) startAutoUpdate();
    else stopAutoUpdate();
  },
});

// undefined в downloaded - ещё не прочитано из хранилища
const downloaded = reactive<Partial<Record<DownloadModuleId, boolean>>>({});
// Размер скачанного модуля - из локального хранилища, без сети
const savedSizes = reactive<Partial<Record<DownloadModuleId, number>>>({});
// Размер ещё не скачанного модуля и размер доступного обновления - из API, нужна сеть
const remoteSizes = reactive<Partial<Record<DownloadModuleId, number>>>({});
const updateSizes = reactive<Partial<Record<DownloadModuleId, number>>>({});

function formatMb(bytes: number): string {
  const mb = Math.round((bytes / BYTES_IN_MB) * 10) / 10;
  return `${bytes > 0 ? Math.max(mb, 0.1) : 0} МБ`;
}

function isDownloading(moduleId: DownloadModuleId): boolean {
  return downloadsStore.progress[moduleId]?.status === "downloading";
}

// Пока общий размер неизвестен, строку не переключаем на прогресс: «0 из 0 МБ» не показываем
function showProgress(moduleId: DownloadModuleId): boolean {
  const progress = downloadsStore.progress[moduleId];
  return progress?.status === "downloading" && progress.totalBytes > 0;
}

function hasError(moduleId: DownloadModuleId): boolean {
  return downloadsStore.progress[moduleId]?.status === "error";
}

function hasUpdate(moduleId: DownloadModuleId): boolean {
  return !!downloaded[moduleId] && (updateSizes[moduleId] ?? 0) > 0;
}

function progressPercent(moduleId: DownloadModuleId): number {
  const progress = downloadsStore.progress[moduleId];
  if (!progress?.totalBytes) return 0;
  return Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100));
}

// Десятые всегда на месте, а текущее значение дополнено до ширины общего размера,
// чтобы «1.2 МБ из 36.0 МБ» не прыгало при смене цифр
function formatProgressMb(bytes: number): string {
  return (Math.round((bytes / BYTES_IN_MB) * 10) / 10).toFixed(1);
}

function progressText(moduleId: DownloadModuleId): string {
  const progress = downloadsStore.progress[moduleId];
  const total = formatProgressMb(progress?.totalBytes ?? 0);
  const current = formatProgressMb(progress?.downloadedBytes ?? 0).padStart(total.length, "\u00a0");
  return `${current} МБ из ${total} МБ`;
}

function sizeText(moduleId: DownloadModuleId): string {
  const bytes = downloaded[moduleId] ? savedSizes[moduleId] : remoteSizes[moduleId];
  return bytes == null ? "" : formatMb(bytes);
}

function updateText(moduleId: DownloadModuleId): string {
  return hasUpdate(moduleId) ? `Обновление: ${formatMb(updateSizes[moduleId]!)}` : "";
}

function actionKind(moduleId: DownloadModuleId): ActionKind {
  if (isDownloading(moduleId)) {
    // Идущее обновление не отменяем: cancelDownload откатывает модуль целиком и удалил бы скачанное
    return downloaded[moduleId] ? "none" : "cancel";
  }
  if (downloaded[moduleId] === undefined) return "none";
  if (hasUpdate(moduleId)) return "update";
  return downloaded[moduleId] ? "delete" : "download";
}

function actionLabel(moduleId: DownloadModuleId): string {
  const labels: Record<ActionKind, string> = {
    download: "Скачать",
    update: "Обновить",
    cancel: "Отменить скачивание",
    delete: "Удалить",
    none: "",
  };
  return labels[actionKind(moduleId)];
}

function actionIcon(moduleId: DownloadModuleId): ActionIcon {
  switch (actionKind(moduleId)) {
    case "cancel":
      return { icon: "cancel", color: "primary-accent-50", size: 18 };
    case "delete":
      return { icon: "delete", color: neutralColor.value, size: 24 };
    case "update":
      return { icon: "download", color: "primary-accent-50", size: 32 };
    default:
      return { icon: "download", color: neutralColor.value, size: 32 };
  }
}

async function refreshModule(moduleId: DownloadModuleId): Promise<void> {
  const isDownloaded = await downloadsStore.isDownloaded(moduleId);
  downloaded[moduleId] = isDownloaded;
  savedSizes[moduleId] = isDownloaded ? ((await downloadsStore.getDownloadedSize(moduleId)) ?? undefined) : undefined;
  updateSizes[moduleId] = undefined;

  try {
    if (isDownloaded) {
      updateSizes[moduleId] = (await downloadsStore.getUpdateSize(moduleId)) ?? undefined;
    } else {
      remoteSizes[moduleId] = await downloadsStore.getModuleSize(moduleId);
    }
  } catch {
    // Без сети размер нескачанного модуля и обновления не показываем
  }
}

function confirmDelete(item: OfflineItem): Promise<boolean> {
  return new Promise((resolve) => {
    f7.dialog
      .create({
        title: item.title,
        text: "Удалить скачанные данные? Чтобы читать их без интернета, их придётся скачать заново.",
        destroyOnClose: true,
        closeByBackdropClick: true,
        buttons: [
          { text: "Отмена", onClick: () => resolve(false) },
          { text: "Удалить", strong: true, onClick: () => resolve(true) },
        ],
        on: { closed: () => resolve(false) },
      })
      .open();
  });
}

async function onAction(item: OfflineItem): Promise<void> {
  const { moduleId } = item;
  try {
    switch (actionKind(moduleId)) {
      case "download":
        await downloadsStore.startDownload(moduleId);
        break;
      case "update":
        await downloadsStore.checkForUpdate(moduleId);
        break;
      case "cancel":
        await downloadsStore.cancelDownload(moduleId);
        await refreshModule(moduleId);
        break;
      case "delete":
        if (await confirmDelete(item)) {
          await downloadsStore.deleteDownload(moduleId);
          await refreshModule(moduleId);
        }
        break;
    }
  } catch (err) {
    // Статус error и текст для пользователя приходят через downloadsStore.progress
    console.error(`Offline action failed for ${moduleId}:`, err);
  }
}

// Завершение, отмена и удаление могут прийти не со страницы (автообновление, докачка) -
// следим за статусами и перечитываем состояние модуля
watch(
  () => ALL_MODULE_IDS.map((moduleId) => downloadsStore.progress[moduleId]?.status),
  (statuses, previous) => {
    ALL_MODULE_IDS.forEach((moduleId, index) => {
      if (statuses[index] !== previous[index] && statuses[index] !== "downloading") {
        void refreshModule(moduleId);
      }
    });
  }
);

onMounted(() => {
  void Promise.allSettled(ALL_MODULE_IDS.map(refreshModule));
});
</script>

<style scoped lang="less">
.offline-list {
  --f7-list-item-padding-vertical: 8px;
  --f7-list-item-title-white-space: normal;

  :deep(.item-title) {
    flex: 1 1 auto;
  }

  // Высота футера постоянная: смена размера, прогресса и ошибки не сдвигает строки ниже.
  // Прогресс-бар вынесен из потока и стоит в зазоре над текстом.
  :deep(.item-footer) {
    position: relative;
    height: 1.2em;
    margin-top: 6px;
    white-space: nowrap;
  }
}

.offline-list-auto-update {
  --f7-list-item-title-font-size: var(--mobile-main-text-regular-b1);
  --f7-list-item-title-line-height: var(--mobile-main-text-regular-b1-line-height);
  --f7-list-item-media-margin: 8px;
}

.offline-group-title {
  --f7-block-title-font-weight: 400;

  margin-top: 50px;
  margin-bottom: 10px;
}

.offline-footer {
  display: flex;
  flex-wrap: nowrap;
  column-gap: 16px;
  overflow: hidden;
  white-space: nowrap;

  > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  > span:first-child:not(:only-child) {
    flex-shrink: 0;
  }
}

.offline-accent {
  color: var(--brand-color-primary-accent-50);
}

.offline-progress-text {
  font-family: ui-monospace, "Cascadia Mono", "Segoe UI Mono", Consolas, monospace;
}

.offline-progress {
  --f7-progressbar-height: 1px;
  --f7-progressbar-progress-color: var(--brand-color-primary-accent-50);
  --f7-progressbar-bg-color: transparent;

  position: absolute;
  top: -4px;
  right: 0;
  left: 0;

  // В MD-теме F7 рисует точку на правом краю дорожки - в макете её нет
  &::after {
    display: none;
  }
}

// Визуально иконка 32px, а область нажатия 44px - отрицательный margin не раздувает строку
.offline-action {
  --f7-button-height: 44px;
  --f7-button-padding-horizontal: 0;
  --f7-button-border-radius: 50%;

  flex-shrink: 0;
  width: 44px;
  min-width: 44px;
  margin: -6px -6px -6px 0;
}
</style>
