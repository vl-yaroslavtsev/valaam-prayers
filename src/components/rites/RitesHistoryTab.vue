<template>
  <div ref="rootRef" class="history" :class="{ 'history--empty': isEmptyHistory }">
    <!-- Первая загрузка -->
    <div v-if="!isLoaded && !error" class="history-state" aria-busy="true">
      <f7-skeleton-block class="history-skeleton history-skeleton--filters" effect="wave" />
      <f7-skeleton-block
        v-if="isTablet"
        class="history-skeleton history-skeleton--alert"
        effect="wave"
      />
      <f7-skeleton-block class="history-skeleton history-skeleton--card" effect="wave" />
      <f7-skeleton-block class="history-skeleton history-skeleton--card" effect="wave" />
    </div>

    <!-- Ошибка первой загрузки -->
    <div v-else-if="error && !isLoaded" class="history-state history-state--center">
      <p class="history-state__text">{{ error }}</p>
      <f7-button outline large class="history-button" @click="loadFirst()">Повторить</f7-button>
    </div>

    <!-- История пуста: нет записок и фильтр не задан -->
    <div v-else-if="isEmptyHistory" class="rites-empty">
      <div class="rites-empty__text">
        <p class="rites-empty__title">Поданных записок нет</p>
        <p class="rites-empty__hint">
          Если Вы подавали записки ранее, то можете открыть их по ссылке из сообщения,
          отправленного на указанную Вами почту при оформлении записок.
        </p>
      </div>
      <div class="rites-empty__actions">
        <f7-button fill large @click="emit('create')">
          Подать записку
        </f7-button>
      </div>
    </div>

    <template v-else>
      <!-- Фильтры и сортировка: на телефоне в одну строку, на планшете три поля в ряд -->
      <div ref="filtersRef" class="history-filters" :class="{ 'history-filters--tablet': isTablet }">
        <template v-if="isTablet">
          <RitesHistorySelect
            v-model="selectedType"
            name="historyType"
            label="Требы"
            all-label="Все требы"
            :options="typeOptions"
          />
          <RitesHistorySelect
            v-model="selectedStatus"
            name="historyStatus"
            label="Статус"
            all-label="Статус любой"
            :options="statusOptions"
          />
          <RitesHistorySelect
            v-model="order"
            name="historyOrder"
            label="Сортировка по дате"
            icon="arrow-up-down"
            :options="orderOptions"
          />
          <f7-link
            class="history-filters__reset history-filters__reset--tablet"
            :class="{ 'history-filters__reset--hidden': !isFilterActive }"
            :tabindex="isFilterActive ? 0 : -1"
            @click="clearFilter"
          >
            Сбросить
          </f7-link>
        </template>
        <div v-else class="history-controls">
          <f7-link
            class="history-controls__filter ripple-blur"
            :class="{ 'history-controls__filter--active': isFilterActive }"
            aria-haspopup="dialog"
            @click="filterSheetOpened = true"
          >
            <SvgIcon icon="sliders" :size="20" :color="iconColor" />
            <span>Фильтры</span>
            <span v-if="activeFilterCount > 0" class="history-controls__badge">
              {{ activeFilterCount }}
            </span>
          </f7-link>
          <f7-link
            class="history-controls__sort ripple-blur"
            popover-open=".history-order-popover"
            aria-haspopup="listbox"
            :aria-label="`Сортировка: ${currentOrderLabel}`"
          >
            <SvgIcon icon="arrow-up-down" :size="20" :color="iconColor" />
            <span class="history-controls__sort-label">{{ currentOrderLabel }}</span>
            <SvgIcon class="history-controls__chevron" icon="chevron-down" :size="20" :color="iconColor" />
          </f7-link>
        </div>
      </div>

      <div v-if="showEditAlert" class="history-alert" role="note">
        <span class="history-alert__text">
          Вы можете внести правки в поданную записку до того, как она попадет в церковную лавку
        </span>
        <f7-link
          icon-only
          class="history-alert__close ripple-blur"
          aria-label="Скрыть подсказку"
          @click="dismissEditHint"
        >
          <SvgIcon icon="cancel" :size="12" :color="iconColor" />
        </f7-link>
      </div>

      <div v-if="error" class="history-state history-state--center">
        <p class="history-state__text">{{ error }}</p>
        <f7-button outline large class="history-button" @click="loadFirst()">Повторить</f7-button>
      </div>

      <!-- Фильтр ничего не нашёл -->
      <div v-else-if="items.length === 0" class="history-state history-state--center">
        <p class="history-state__text">Записок не найдено</p>
        <f7-button outline large class="history-button" @click="clearFilter">Сбросить</f7-button>
      </div>

      <f7-list
        v-else
        class="history-list"
        :class="{ 'history-list--busy': isRefreshing }"
        no-hairlines
        no-hairlines-between
      >
        <template #list>
          <RitesHistoryItem
            v-for="item in items"
            :key="item.id"
            :item="item"
            @edit="emit('edit', item)"
            @copy="emit('copy', item)"
          />
        </template>
      </f7-list>
    </template>

    <f7-popover class="history-order-popover">
      <f7-list no-hairlines no-hairlines-between>
        <f7-list-item
          v-for="option in orderOptions"
          :key="option.value"
          link
          no-chevron
          popover-close
          :title="option.label"
          :class="{ 'history-order-popover__item--active': order === option.value }"
          @click="order = option.value as RitesOrder"
        />
      </f7-list>
    </f7-popover>

    <RitesHistoryFilterSheet
      v-model:opened="filterSheetOpened"
      v-model:type="selectedType"
      v-model:status="selectedStatus"
      :type-options="typeOptions"
      :status-options="statusOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import RitesHistoryFilterSheet from "@/components/rites/RitesHistoryFilterSheet.vue";
import RitesHistoryItem from "@/components/rites/RitesHistoryItem.vue";
import RitesHistorySelect, {
  type HistorySelectOption,
} from "@/components/rites/RitesHistorySelect.vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";
import {
  loadHistoryFilter,
  loadHistoryPages,
  loadHistoryRites,
  type HistoryFilter,
  type Rite,
  type RitesOrder,
} from "@/services/rites/ritesApi";

export interface HistoryNavState {
  showControls: boolean;
  showNavActions: boolean;
  isFilterActive: boolean;
  currentOrderLabel: string;
  hasMore: boolean;
}

const props = defineProps<{
  active: boolean;
}>();

const emit = defineEmits<{
  create: [];
  edit: [item: Rite];
  copy: [item: Rite];
  navState: [state: HistoryNavState];
}>();

const { isDarkMode } = useTheme();
const iconColor = computed(() => (isDarkMode.value ? "white" : "black-primary"));

const HISTORY_EDIT_HINT_DISMISSED_KEY = "rites_history_edit_hint_dismissed";

function readEditHintDismissed(): boolean {
  try {
    return localStorage.getItem(HISTORY_EDIT_HINT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

const editHintDismissed = ref(readEditHintDismissed());

function dismissEditHint(): void {
  editHintDismissed.value = true;
  try {
    localStorage.setItem(HISTORY_EDIT_HINT_DISMISSED_KEY, "1");
  } catch {
    // Игнорируем ограничения хранилища
  }
}

// Планшетная вёрстка как в корзине: от 744px
const TABLET_QUERY = "(min-width: 744px)";
const isTablet = ref(false);
let tabletMedia: MediaQueryList | null = null;
const onTabletChange = (event: MediaQueryListEvent) => {
  isTablet.value = event.matches;
};

const rootRef = ref<HTMLElement | null>(null);
const filtersRef = ref<HTMLElement | null>(null);
const showNavActions = ref(false);
let scrollEl: HTMLElement | null = null;

function syncNavActions(): void {
  if (!props.active || !showControls.value || !filtersRef.value || !scrollEl) {
    showNavActions.value = false;
    return;
  }
  const pageEl = scrollEl.closest(".page");
  const topBar =
    pageEl?.querySelector<HTMLElement>(".rites-tabbar") ??
    pageEl?.querySelector<HTMLElement>(".navbar-inner");
  const barBottom = topBar ? topBar.getBoundingClientRect().bottom : 98;
  const filtersRect = filtersRef.value.getBoundingClientRect();
  showNavActions.value = filtersRect.bottom <= barBottom + 4;
}

onMounted(() => {
  tabletMedia = window.matchMedia(TABLET_QUERY);
  isTablet.value = tabletMedia.matches;
  tabletMedia.addEventListener("change", onTabletChange);

  scrollEl = rootRef.value?.closest<HTMLElement>(".page-content") ?? null;
  scrollEl?.addEventListener("scroll", syncNavActions, { passive: true });
});

onBeforeUnmount(() => {
  tabletMedia?.removeEventListener("change", onTabletChange);
  scrollEl?.removeEventListener("scroll", syncNavActions);
});

const items = ref<Rite[]>([]);
const page = ref(1);
const hasMore = ref(false);
/** Первая страница уже приходила: дальше при смене фильтра страница не мигает целиком */
const isLoaded = ref(false);
const isLoading = ref(false);
/** Смена фильтра или порядка: список остаётся на месте, чтобы страница не схлопывалась */
const isRefreshing = ref(false);
const isLoadingMore = ref(false);
const error = ref<string | null>(null);

// "" значит «не выбрано»
const selectedType = ref("");
const selectedStatus = ref("");
const order = ref<RitesOrder>("DESC");
const filter = ref<HistoryFilter>({ types: [], statuses: [] });

const orderOptions: HistorySelectOption[] = [
  { value: "DESC", label: "Сначала новые" },
  { value: "ASC", label: "Сначала старые" },
];
const currentOrderLabel = computed(
  () => orderOptions.find((option) => option.value === order.value)?.label ?? orderOptions[0].label,
);

const typeOptions = computed<HistorySelectOption[]>(() =>
  filter.value.types.map((type) => ({
    value: String(type.id),
    label: type.name,
    disabled: type.disabled,
  })),
);
const statusOptions = computed<HistorySelectOption[]>(() =>
  filter.value.statuses.map((status) => ({
    value: String(status.id),
    label: status.name ?? status.xmlId,
    disabled: status.disabled,
  })),
);

const activeFilterCount = computed(
  () => (selectedType.value !== "" ? 1 : 0) + (selectedStatus.value !== "" ? 1 : 0),
);
const isFilterActive = computed(() => activeFilterCount.value > 0);
const isEmptyHistory = computed(
  () => isLoaded.value && !isLoading.value && !error.value && items.value.length === 0 && !isFilterActive.value,
);
const showControls = computed(
  () => isLoaded.value && !isEmptyHistory.value && !(error.value && !isLoaded.value),
);
const hasEditableItems = computed(() => items.value.some((item) => item.canChange));
const showEditAlert = computed(() => hasEditableItems.value && !editHintDismissed.value);

const filterSheetOpened = ref(false);

/** Сколько история считается свежей при переключении вкладок «Корзина ↔ Поданные» */
const HISTORY_REFRESH_TTL_MS = 60 * 1000;

// Счётчик запросов: ответ устаревшего запроса (фильтр уже сменился) отбрасывается
let requestId = 0;
let lastLoadedAt = 0;
let isSilentRefreshing = false;

const toId = (value: string): number | null => (value ? Number(value) : null);

function currentQuery() {
  return {
    order: order.value,
    typeId: toId(selectedType.value),
    statusId: toId(selectedStatus.value),
  };
}

/**
 * Первичная загрузка или перезагрузка при смене фильтра/сортировки:
 * список остаётся на месте, пока приходит свежая первая страница, чтобы страница не схлопывалась.
 */
async function loadFirst(): Promise<void> {
  const id = ++requestId;
  isLoadingMore.value = false;
  isSilentRefreshing = false;
  error.value = null;
  const initial = !isLoaded.value;
  if (initial) {
    isLoading.value = true;
    isRefreshing.value = false;
    items.value = [];
    hasMore.value = false;
  } else {
    isRefreshing.value = true;
  }

  try {
    const result = await loadHistoryRites({ page: 1, ...currentQuery() });
    if (id !== requestId) return;
    items.value = result.items;
    page.value = 1;
    hasMore.value = result.hasMore;
    isLoaded.value = true;
    lastLoadedAt = Date.now();
  } catch (ex) {
    if (id !== requestId) return;
    console.error("Не удалось загрузить поданные записки:", ex);
    error.value = "Не удалось загрузить поданные записки";
  } finally {
    if (id === requestId) {
      isLoading.value = false;
      isRefreshing.value = false;
    }
  }
}

/**
 * Тихое обновление уже загруженных страниц: сначала скачиваем все страницы 1..page,
 * и только потом одним шагом обновляем items, чтобы скролл не прыгал.
 */
async function silentRefresh(): Promise<void> {
  const id = ++requestId;
  const targetPages = Math.max(1, page.value);
  isLoadingMore.value = false;
  isSilentRefreshing = true;

  try {
    const result = await loadHistoryPages(targetPages, currentQuery());
    if (id !== requestId) return;
    items.value = result.items;
    page.value = result.page;
    hasMore.value = result.hasMore;
    error.value = null;
    lastLoadedAt = Date.now();
  } catch (ex) {
    if (id !== requestId) return;
    console.error("Не удалось обновить поданные записки:", ex);
  } finally {
    if (id === requestId) {
      isSilentRefreshing = false;
    }
  }
}

async function loadMore(): Promise<void> {
  if (
    !hasMore.value ||
    isLoading.value ||
    isRefreshing.value ||
    isSilentRefreshing ||
    isLoadingMore.value
  ) {
    return;
  }

  const id = requestId;
  isLoadingMore.value = true;
  try {
    const result = await loadHistoryRites({ page: page.value + 1, ...currentQuery() });
    if (id !== requestId) return;
    const known = new Set(items.value.map((item) => item.id));
    items.value = [...items.value, ...result.items.filter((item) => !known.has(item.id))];
    page.value += 1;
    hasMore.value = result.hasMore;
    lastLoadedAt = Date.now();
  } catch (ex) {
    // Очередная порция не пришла: останавливаем подгрузку, чтобы не крутить запросы
    console.error("Не удалось подгрузить историю записок:", ex);
    if (id === requestId) hasMore.value = false;
  } finally {
    if (id === requestId) isLoadingMore.value = false;
  }
}

let filterRequestId = 0;

/** Доступность вариантов зависит от выбранных фильтров, поэтому обновляется после каждого выбора */
async function refreshFilter(): Promise<void> {
  const id = ++filterRequestId;
  try {
    const result = await loadHistoryFilter({
      typeId: toId(selectedType.value),
      statusId: toId(selectedStatus.value),
    });
    if (id === filterRequestId) filter.value = result;
  } catch (ex) {
    console.error("Не удалось загрузить фильтры истории:", ex);
  }
}

function clearFilter(): void {
  selectedType.value = "";
  selectedStatus.value = "";
}

/** Сбрасывает кэш свежести, чтобы следующее открытие истории гарантированно обновило список */
function invalidate(): void {
  lastLoadedAt = 0;
}

/** Сбрасывает фильтры, сортировку и скролл перед показом только что поданных записок */
function resetForNewest(): void {
  selectedType.value = "";
  selectedStatus.value = "";
  order.value = "DESC";
  page.value = 1;
  lastLoadedAt = 0;
  if (scrollEl) scrollEl.scrollTop = 0;
}

function refresh({ force = false } = {}): void {
  void nextTick(syncNavActions);
  if (isLoaded.value && !force && Date.now() - lastLoadedAt < HISTORY_REFRESH_TTL_MS) {
    return;
  }
  if (isLoaded.value) {
    void silentRefresh();
  } else {
    void loadFirst();
  }
  void refreshFilter();
}

function openFilters(): void {
  filterSheetOpened.value = true;
}

function applyEdited(rite: Rite): void {
  items.value = items.value.map((item) => (item.id === rite.id ? rite : item));
}

watch([selectedType, selectedStatus], () => {
  if (!props.active) return;
  void loadFirst();
  void refreshFilter();
});
watch(order, () => {
  if (!props.active) return;
  void loadFirst();
});
watch(
  [items, isTablet, showControls, () => props.active],
  () => {
    void nextTick(syncNavActions);
  },
);
watch(
  [showControls, showNavActions, isFilterActive, currentOrderLabel, hasMore],
  () => {
    emit("navState", {
      showControls: showControls.value,
      showNavActions: showNavActions.value,
      isFilterActive: isFilterActive.value,
      currentOrderLabel: currentOrderLabel.value,
      hasMore: hasMore.value,
    });
  },
  { immediate: true },
);

defineExpose({
  refresh,
  invalidate,
  resetForNewest,
  loadMore,
  openFilters,
  applyEdited,
});
</script>

<style lang="less">
.rites-page {
  --history-alert-border: var(--brand-color-primary-accent-50);
  --history-alert-text: #000;
  --history-link: var(--brand-color-primary-accent-50);
}

.dark .rites-page {
  --history-alert-border: var(--brand-color-primary-accent-70);
  --history-alert-text: var(--content-color-white-100);
  --history-link: var(--brand-color-primary-accent-70);
}

.rites-page {
  .history {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 16px 30px;
    color: var(--rites-text);
  }

  .history--empty {
    padding-top: 24px;
  }

  .history-state {
    display: flex;
    flex-direction: column;
    gap: 16px;

    &--center {
      align-items: center;
      padding-top: 20px;
      text-align: center;
    }

    &__text {
      margin: 0;
      font-size: var(--mobile-main-text-regular-b3);
      line-height: 20px;
      color: var(--rites-muted);
    }
  }

  .history-skeleton {
    border-radius: 16px;

    &--filters {
      height: 40px;
      border-radius: 8px;
    }

    &--alert {
      height: 84px;
    }

    &--card {
      height: 260px;
    }
  }

  .history-button.button {
    --f7-button-height: 52px;
    --f7-button-border-radius: 10px;
    --f7-button-border-color: var(--rites-text);
    --f7-button-text-color: var(--rites-text);
    --f7-button-border-width: 1px;

    padding: 0 30px;
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
  }

  .history-filters {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;

    &__reset.link {
      height: auto;
      padding: 0;
      font-size: 14px;
      line-height: 18px;
      font-weight: 400;
      letter-spacing: normal;
      text-transform: none;
      color: var(--history-link);
    }

    &__reset--tablet.link {
      align-self: flex-start;
      justify-content: flex-start;
      font-size: 16px;
      line-height: 20px;
      font-weight: 700;
      letter-spacing: normal;
      text-transform: none;
    }

    &__reset--hidden {
      visibility: hidden;
    }
  }

  .history-controls {
    display: flex;
    align-items: center;
    gap: 8px;

    &__filter.link,
    &__sort.link {
      height: 40px;
      padding: 0 12px;
      overflow: hidden;
      border-radius: 8px;
      background: var(--rites-field-bg);
      font-size: 15px;
      line-height: 20px;
      font-weight: 400;
      letter-spacing: normal;
      text-transform: none;
      color: var(--rites-text);
    }

    &__filter.link {
      flex: 0 0 auto;
      gap: 6px;
    }

    &__sort.link {
      flex: 1 1 0;
      min-width: 0;
      justify-content: flex-start;
      gap: 6px;
    }

    &__sort-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    }

    &__chevron {
      flex-shrink: 0;
      margin-left: auto;
    }

    &__badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      background: var(--history-link);
      font-size: 12px;
      line-height: 1;
      font-weight: 700;
      color: var(--f7-button-fill-text-color);
    }
  }

  .history-alert {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--history-alert-border);
    border-radius: 16px;
    background: var(--rites-card-bg);
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
    color: var(--history-alert-text);

    &__text {
      flex: 1;
      min-width: 0;
    }

    &__close.link {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      margin: -4px -4px -4px 0;
      padding: 0;
      overflow: hidden;
      border-radius: 50%;
      opacity: 0.65;
    }
  }

  .history-list--busy {
    opacity: 0.5;
    pointer-events: none;
  }

  .history-list {
    margin: 0;

    ul {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0;
      background: none;

      &::before,
      &::after {
        display: none;
      }
    }
  }
}

// Поповер сортировки переносится в корень приложения, поэтому стили вне .rites-page
.history-order-popover.popover {
  --f7-popover-width: 220px;
  --f7-popover-border-radius: 8px;
  --f7-list-item-min-height: 42px;
  --selected-item-bg-color: var(--content-color-black-10);

  .popover-arrow {
    display: none;
  }

  .popover-inner {
    padding: 4px 8px;
  }

  .list {
    margin: 0;

    ul {
      padding: 0;
      background: transparent;
    }
  }

  .item-link .item-content {
    padding: 0;
    margin: 4px 0;
  }

  .item-inner {
    padding: 8px 12px;
    border-radius: 8px;

    &::before,
    &::after {
      display: none;
    }
  }

  .history-order-popover__item--active .item-inner {
    background: var(--selected-item-bg-color);
    font-weight: 700;
  }
}

.dark .history-order-popover.popover {
  --selected-item-bg-color: var(--content-color-baige-10);
}

@media (min-width: 744px) {
  .rites-page {
    .history {
      max-width: 924px;
      margin: 0 auto;
      padding: 24px 30px 30px;
      gap: 24px;
    }

    .history--empty {
      padding-top: 30px;
    }

    .history-skeleton--filters {
      height: 70px;
    }

    .history-skeleton--alert {
      height: 50px;
    }

    .history-filters--tablet {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px 16px;
      align-items: start;

      .history-filters__reset--tablet {
        grid-column: 1 / -1;
      }
    }
  }
}
</style>
