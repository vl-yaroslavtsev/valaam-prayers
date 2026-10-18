<template>
  <f7-page name="settings-offline" class="offline-page" @page:beforeout="dismissErrors">
    <f7-navbar large transparent title="Доступ без интернета" back-link></f7-navbar>
    <f7-block class="offline-intro">
      <p class="offline-intro-text" :class="{ 'is-hidden': !online }">
        Скачайте нужные разделы, чтобы читать их даже там, где нет связи (например, в храме или в дороге)
      </p>
      <div class="offline-banner" :class="{ 'is-hidden': online }" role="status">
        <SvgIcon class="offline-banner-icon" icon="cloud-off" :size="24" :color="bannerIconColor" />
        <div class="offline-banner-copy">
          <div class="offline-banner-title">Вы офлайн</div>
          <div class="offline-banner-text">
            Скачанные разделы доступны для чтения. Для загрузки новых подключитесь к сети.
          </div>
        </div>
      </div>
    </f7-block>

    <f7-block class="offline-usage">
      <div class="offline-usage-label">
        <template v-if="localReady && quotaReady">
          Использовано
          <span class="offline-digits">{{ formatMbNumber(usageUsedBytes) }}</span>
          МБ
          <template v-if="storageQuotaLabel">
            из
            <span class="offline-digits">{{ storageQuotaLabel.value }}</span>
            {{ storageQuotaLabel.unit }}
          </template>
        </template>
        <span v-else class="skeleton-text skeleton-effect-wave offline-size-placeholder">Использовано 00.0 МБ из 00 МБ</span>
      </div>
      <f7-progressbar class="offline-usage-bar" :progress="usagePercent" />
    </f7-block>

    <template v-for="group in GROUPS" :key="group.key">
      <f7-block-title class="offline-group-title">{{ group.title }}</f7-block-title>
      <f7-list no-hairlines class="offline-list">
        <f7-list-item
          v-for="item in group.items"
          :key="item.moduleId"
          :title="item.title"
          :class="{ 'offline-item-downloaded': showDownloadedStyle(item.moduleId) }"
        >
          <template #footer>
            <f7-progressbar
              v-show="showProgress(item.moduleId)"
              class="offline-progress"
              :progress="progressPercent(item.moduleId)"
            />
            <div class="offline-footer">
              <span v-if="showProgress(item.moduleId)" class="offline-accent">
                <span class="offline-digits">{{ progressNumbers(item.moduleId).current }}</span>
                МБ из
                <span class="offline-digits">{{ progressNumbers(item.moduleId).total }}</span>
                МБ
              </span>
              <span v-else-if="hasError(item.moduleId)" class="text-color-red">Не удалось скачать. Попробуйте ещё раз</span>
              <template v-else>
                <span v-if="showSizePlaceholder(item.moduleId)" class="skeleton-text skeleton-effect-wave offline-size-placeholder">00.0 МБ</span>
                <span v-else-if="downloaded[item.moduleId]" class="offline-downloaded">
                  <span class="offline-downloaded-mark">✓ Скачано</span>
                  <template v-if="sizeBytes(item.moduleId) != null">
                    • <span class="offline-digits">{{ formatMbNumber(sizeBytes(item.moduleId)!) }}</span> МБ
                  </template>
                </span>
                <span v-else-if="sizeBytes(item.moduleId) != null">
                  <span class="offline-digits">{{ formatMbNumber(sizeBytes(item.moduleId)!) }}</span> МБ
                </span>
                <span v-if="updateMb(item.moduleId)" class="offline-accent">
                  Обновление: <span class="offline-digits">{{ updateMb(item.moduleId) }}</span> МБ
                </span>
              </template>
            </div>
          </template>

          <template #after>
            <f7-button
              v-if="actionKind(item.moduleId) !== 'none'"
              class="offline-action"
              :class="{ 'is-unavailable': !online && isNetworkAction(item.moduleId) }"
              :aria-label="actionLabel(item.moduleId)"
              @click="onAction(item)"
            >
              <SvgIcon v-bind="actionIcon(item.moduleId)" />
            </f7-button>
          </template>
        </f7-list-item>
      </f7-list>
    </template>

    <hr class="offline-separator" />

    <f7-list no-hairlines class="offline-list-auto-update">
      <f7-list-item
        title="Обновлять автоматически"
        footer="Загружать исправления в текстах и календаре при наличии Wi-Fi"
      >
        <template #media>
          <SvgIcon icon="sync" :color="neutralColor" :size="24" />
        </template>
        <template #after>
          <f7-toggle small v-model:checked="autoUpdate" />
        </template>
      </f7-list-item>
    </f7-list>
  </f7-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { f7 } from "framework7-vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";
import { useErrorToast } from "@/composables/useErrorToast";
import { isOnline, onNetworkChange } from "@/services/download/network";
import { useSettingsStore } from "@/stores/settings";
import { useDownloadsStore } from "@/stores/downloads";
import { startAutoUpdate, stopAutoUpdate } from "@/services/download/AutoUpdate";
import { bytesToSize, getQuota } from "@/js/device/browser-test";
import { ALL_MODULE_IDS } from "@/services/download/types";
import type { DownloadModuleId } from "@/services/download/types";
import type { IconName } from "@/types/icon-name";

type ActionKind = "download" | "update" | "cancel" | "delete" | "none";
type ActionIconColor = "baige-60" | "baige-90" | "black-60" | "black-primary" | "primary-accent-50" | "primary-accent-70";

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
const accentColor = computed<ActionIconColor>(() => (isDarkMode.value ? "primary-accent-70" : "primary-accent-50"));
const bannerIconColor = computed<ActionIconColor>(() => (isDarkMode.value ? "baige-90" : "black-primary"));

const online = ref(isOnline());
let stopNetworkWatch: (() => void) | null = null;

const { showErrorToast } = useErrorToast({ text: "Нет подключения к сети" });

const autoUpdate = computed({
  get: () => settingsStore.isAutoUpdateOfflineDataEnabled,
  set: (value: boolean) => {
    settingsStore.setIsAutoUpdateOfflineDataEnabled(value);
    if (value) startAutoUpdate();
    else stopAutoUpdate();
  },
});

let pageActive = true;

// undefined в downloaded - ещё не прочитано из хранилища
const downloaded = reactive<Partial<Record<DownloadModuleId, boolean>>>({});
// Размер скачанного модуля - из локального хранилища, без сети
const savedSizes = reactive<Partial<Record<DownloadModuleId, number>>>({});
// Размер ещё не скачанного модуля и размер доступного обновления - из API, нужна сеть
const remoteSizes = reactive<Partial<Record<DownloadModuleId, number>>>({});
const updateSizes = reactive<Partial<Record<DownloadModuleId, number>>>({});
// true, пока первый запрос размера идёт и в базе ещё нет сохранённого значения
const sizePending = reactive<Partial<Record<DownloadModuleId, boolean>>>({});
const localReady = ref(false);
const quotaReady = ref(false);
const storageQuotaBytes = ref<number | null>(null);

const usageUsedBytes = computed(() =>
  ALL_MODULE_IDS.reduce((sum, moduleId) => {
    if (!downloaded[moduleId]) return sum;
    return sum + (savedSizes[moduleId] ?? 0);
  }, 0)
);

const storageQuotaLabel = computed(() => {
  if (storageQuotaBytes.value == null) return null;
  const [value, unit = ""] = bytesToSize(storageQuotaBytes.value, { wrapDigit: false }).split(" ");
  return { value, unit };
});

const usagePercent = computed(() => {
  const quota = storageQuotaBytes.value;
  if (!quota) return 0;
  return Math.min(100, Math.round((usageUsedBytes.value / quota) * 100));
});

function formatMbNumber(bytes: number): string {
  if (bytes <= 0) return "0";
  const mb = Math.round((bytes / BYTES_IN_MB) * 10) / 10;
  return Math.max(mb, 0.1).toFixed(1);
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

function showDownloadedStyle(moduleId: DownloadModuleId): boolean {
  return !!downloaded[moduleId] && !showProgress(moduleId) && !hasError(moduleId);
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

function progressNumbers(moduleId: DownloadModuleId): { current: string; total: string } {
  const progress = downloadsStore.progress[moduleId];
  const total = formatProgressMb(progress?.totalBytes ?? 0);
  const current = formatProgressMb(progress?.downloadedBytes ?? 0).padStart(total.length, "\u00a0");
  return { current, total };
}

function sizeBytes(moduleId: DownloadModuleId): number | undefined {
  return downloaded[moduleId] ? savedSizes[moduleId] : remoteSizes[moduleId];
}

function showSizePlaceholder(moduleId: DownloadModuleId): boolean {
  return !downloaded[moduleId] && sizePending[moduleId] === true && remoteSizes[moduleId] == null;
}

function updateMb(moduleId: DownloadModuleId): string {
  return hasUpdate(moduleId) ? formatMbNumber(updateSizes[moduleId]!) : "";
}

function isNetworkAction(moduleId: DownloadModuleId): boolean {
  const kind = actionKind(moduleId);
  return kind === "download" || kind === "update";
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
    default:
      return { icon: "download", color: accentColor.value, size: 32 };
  }
}

async function loadLocal(moduleId: DownloadModuleId): Promise<void> {
  const isDownloaded = await downloadsStore.isDownloaded(moduleId);
  const savedSize = isDownloaded ? await downloadsStore.getDownloadedSize(moduleId) : null;
  const cached = isDownloaded ? null : await downloadsStore.getEstimatedSize(moduleId);
  if (!pageActive) return;

  downloaded[moduleId] = isDownloaded;
  if (isDownloaded) {
    savedSizes[moduleId] = savedSize ?? undefined;
    sizePending[moduleId] = false;
    return;
  }

  savedSizes[moduleId] = undefined;
  updateSizes[moduleId] = undefined;
  if (cached != null) {
    remoteSizes[moduleId] = cached;
    sizePending[moduleId] = false;
  } else if (remoteSizes[moduleId] == null) {
    sizePending[moduleId] = true;
  }
}

async function loadRemote(moduleId: DownloadModuleId): Promise<void> {
  try {
    if (downloaded[moduleId]) {
      const size = await downloadsStore.getUpdateSize(moduleId);
      if (!pageActive) return;
      updateSizes[moduleId] = size ?? undefined;
    } else {
      const size = await downloadsStore.getModuleSize(moduleId);
      await downloadsStore.saveEstimatedSize(moduleId, size);
      if (!pageActive) return;
      remoteSizes[moduleId] = size;
    }
  } catch {
    // Без сети оставляем сохранённый размер. Ошибку получения размера не показываем
  } finally {
    if (pageActive) sizePending[moduleId] = false;
  }
}

async function refreshModule(moduleId: DownloadModuleId): Promise<void> {
  await loadLocal(moduleId);
  await loadRemote(moduleId);
}

function dismissErrors(): void {
  for (const moduleId of ALL_MODULE_IDS) {
    if (downloadsStore.progress[moduleId]?.status === "error") {
      void downloadsStore.dismissError(moduleId);
    }
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
  const kind = actionKind(moduleId);
  if ((kind === "download" || kind === "update") && !isOnline()) {
    showErrorToast();
    return;
  }
  try {
    switch (kind) {
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
// следим за статусами и перечитываем состояние модуля. idle - это снятая при уходе ошибка, её не перечитываем
watch(
  () => ALL_MODULE_IDS.map((moduleId) => downloadsStore.progress[moduleId]?.status),
  (statuses, previous) => {
    if (!previous) return;
    ALL_MODULE_IDS.forEach((moduleId, index) => {
      const status = statuses[index];
      if (status === previous[index] || status === "downloading" || status === "idle") return;
      void refreshModule(moduleId);
    });
  }
);

onMounted(() => {
  online.value = isOnline();
  stopNetworkWatch = onNetworkChange((value) => {
    online.value = value;
  });

  void getQuota()
    .then((result) => {
      if (pageActive) storageQuotaBytes.value = result.quota;
    })
    .catch(() => {
      // Storage API недоступен — строка остаётся без «из …»
    })
    .finally(() => {
      if (pageActive) quotaReady.value = true;
    });

  void (async () => {
    await Promise.allSettled(ALL_MODULE_IDS.map(loadLocal));
    if (!pageActive) return;
    localReady.value = true;
    await Promise.allSettled(ALL_MODULE_IDS.map(loadRemote));
  })();
});

onUnmounted(() => {
  pageActive = false;
  stopNetworkWatch?.();
  dismissErrors();
});
</script>

<style scoped lang="less">
.offline-page {
  --offline-accent: var(--brand-color-primary-accent-50);
  --offline-downloaded-bg: var(--brand-color-secondary-accent);
  --offline-usage-track: var(--content-color-black-10);
}

.dark .offline-page {
  --offline-accent: var(--brand-color-primary-accent-70);
  --offline-downloaded-bg: var(--content-color-black-secondary);
  --offline-usage-track: var(--content-color-baige-10);
}

.offline-intro {
  display: grid;
  margin-top: 0;

  > .offline-intro-text,
  > .offline-banner {
    grid-area: 1 / 1;
  }
}

.offline-intro .offline-intro-text {
  display: flex;
  align-items: center;
  margin: 0;
}

.offline-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  padding: 12px 16px;
  border-radius: 16px;
  background: var(--calendar-week-band);
}

.offline-banner-icon {
  flex-shrink: 0;

  // У иконок transition-duration на все свойства, из-за него облачко
  // остаётся поверх описания ещё ~200 мс после скрытия плашки
  :deep(path) {
    transition: none;
  }
}

.offline-banner-title {
  color: var(--content-color-black-primary);
  font-size: var(--mobile-main-text-regular-b2);
  line-height: var(--mobile-main-text-regular-b2-line-height);
}

.offline-banner-text {
  color: var(--content-color-black-60);
  font-size: var(--mobile-main-text-regular-b3);
  line-height: var(--mobile-main-text-regular-b3-line-height);
}

.dark .offline-page .offline-banner-title {
  color: var(--content-color-baige-90);
}

.dark .offline-page .offline-banner-text {
  color: var(--content-color-baige-60);
}

.is-hidden {
  visibility: hidden;
}

.offline-usage {
  margin-top: 8px;
  margin-bottom: 0;
}

.offline-usage-label {
  color: var(--content-color-black-60);
  font-size: var(--mobile-detail-regular-d1);
  line-height: var(--mobile-detail-regular-d1-line-height);
}

.dark .offline-page .offline-usage-label {
  color: var(--content-color-baige-60);
}

.offline-digits {
  font-family: "PT Mono", ui-monospace, monospace;
}

.offline-size-placeholder {
  display: inline-block;
  border-radius: 4px;
  color: transparent;
  user-select: none;
}

.offline-usage-bar {
  --f7-progressbar-height: 4px;
  --f7-progressbar-border-radius: 4px;
  --f7-progressbar-progress-color: var(--offline-accent);
  --f7-progressbar-bg-color: var(--offline-usage-track);

  margin-top: 10px;

  &::after {
    display: none;
  }
}

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

.offline-item-downloaded {
  // --f7-list-item-padding-horizontal: 8px;

  :deep(.item-content) {
    // margin: 2px 8px;
    // border-radius: 12px;
    background: var(--offline-downloaded-bg);
  }
}

.offline-separator {
  height: 1px;
  margin: 8px 16px 0;
  border: 0;
  background: var(--content-color-black-10);
}

.dark .offline-page .offline-separator {
  background: var(--content-color-baige-10);
}

.offline-list-auto-update {
  --f7-list-item-title-font-size: var(--mobile-main-text-regular-b2);
  --f7-list-item-title-line-height: var(--mobile-main-text-regular-b2-line-height);
  // --f7-list-item-media-margin: 8px;
  --f7-list-item-padding-vertical: 12px;

  margin-top: 16px;
  margin-bottom: 24px;
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

.offline-downloaded-mark {
  color: var(--offline-accent);
}

.offline-accent {
  color: var(--offline-accent);
}

.offline-progress {
  --f7-progressbar-height: 1px;
  --f7-progressbar-progress-color: var(--offline-accent);
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

  &.is-unavailable {
    opacity: 0.4;
  }
}
</style>
