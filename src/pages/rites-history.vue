<template>
  <f7-page
    name="rites-history"
    class="rites-page history-page"
    infinite
    :infinite-distance="200"
    :infinite-preloader="hasMore"
    @infinite="loadMore"
    @page:beforein="onPageBeforeIn"
    @page:afterin="onPageShown"
  >
    <f7-navbar large transparent>
      <f7-nav-left :back-link="!isFirstPage">
        <f7-link v-if="isFirstPage" panel-open="left" v-html="BurgerIcon"></f7-link>
      </f7-nav-left>
      <f7-nav-title sliding>История записок</f7-nav-title>
      <f7-nav-title-large>История записок</f7-nav-title-large>
    </f7-navbar>

    <div class="history" :class="{ 'history--empty': isEmptyHistory }">
      <!-- Первая загрузка -->
      <div v-if="!isLoaded && !error" class="history-state" aria-busy="true">
        <f7-skeleton-block class="history-skeleton history-skeleton--button" effect="wave" />
        <f7-skeleton-block class="history-skeleton history-skeleton--filters" effect="wave" />
        <f7-skeleton-block class="history-skeleton history-skeleton--alert" effect="wave" />
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
          <p class="rites-empty__title">История записок пуста</p>
          <p class="rites-empty__hint">
            Если Вы подавали записки ранее, то можете перейти в историю записок по ссылке из
            сообщения, отправленного на указанную Вами почту при оформлении записок.
          </p>
        </div>
        <div class="rites-empty__actions">
          <f7-button fill large class="rites-primary-button" @click="openPopup('create')">
            Подать записку
          </f7-button>
        </div>
      </div>

      <template v-else>
        <f7-button
          v-if="items.length > 0"
          outline
          large
          class="history-button history-add"
          @click="openPopup('create')"
        >
          Подать записку
        </f7-button>

        <!-- Фильтры: на телефоне окно с двумя полями, на планшете поля в строку -->
        <div class="history-filters" :class="{ 'history-filters--tablet': isTablet }">
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
          </template>
          <div v-else class="history-filters__row">
            <f7-link
              class="history-filters__open"
              aria-haspopup="dialog"
              @click="filterSheetOpened = true"
            >
              <SvgIcon icon="sliders" :size="24" :color="iconColor" />
              <span>Фильтры</span>
            </f7-link>
            <f7-link v-if="isFilterActive" class="history-filters__reset" @click="clearFilter">
              Сбросить
            </f7-link>
          </div>

          <RitesHistorySelect
            v-model="order"
            name="historyOrder"
            label="Сортировка по дате"
            icon="arrow-up-down"
            :options="orderOptions"
          />

          <f7-link
            v-if="isTablet"
            class="history-filters__reset history-filters__reset--tablet"
            :class="{ 'history-filters__reset--hidden': !isFilterActive }"
            :tabindex="isFilterActive ? 0 : -1"
            @click="clearFilter"
          >
            Сбросить
          </f7-link>
        </div>

        <div v-if="items.length > 0" class="history-alert" role="note">
          Вы можете внести правки в поданную записку до того, как она попадет в церковную лавку
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
              @edit="openPopup('edit', item)"
              @copy="openPopup('copy', item)"
            />
          </template>
        </f7-list>
      </template>
    </div>

    <RitesHistoryFilterSheet
      v-if="!isTablet"
      v-model:opened="filterSheetOpened"
      v-model:type="selectedType"
      v-model:status="selectedStatus"
      :type-options="typeOptions"
      :status-options="statusOptions"
    />

    <RitePopup
      v-model:opened="popupOpened"
      :mode="popupMode"
      :item="popupItem"
      @saved="onRiteSaved"
    />
  </f7-page>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import BurgerIcon from "@/assets/icons/burger.svg?raw";
import RitePopup, { type RitePopupMode } from "@/components/rites/RitePopup.vue";
import RitesHistoryFilterSheet from "@/components/rites/RitesHistoryFilterSheet.vue";
import RitesHistoryItem from "@/components/rites/RitesHistoryItem.vue";
import RitesHistorySelect, {
  type HistorySelectOption,
} from "@/components/rites/RitesHistorySelect.vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { useTheme } from "@/composables/useTheme";
import {
  loadHistoryFilter,
  loadHistoryRites,
  type HistoryFilter,
  type Rite,
  type RitesOrder,
} from "@/services/rites/ritesApi";
import { useRitesCartStore } from "@/stores/ritesCart";

const { f7router } = defineProps<{
  f7router: Router.Router;
}>();

const cartStore = useRitesCartStore();
const { isDarkMode } = useTheme();
const iconColor = computed(() => (isDarkMode.value ? "white" : "black-primary"));

// Корневая страница вкладки открывает левую панель, открытая из корзины: кнопку «Назад»
const isFirstPage = ref(true);
const onPageBeforeIn = () => {
  isFirstPage.value = f7router.history.length <= 1;
};

// Планшетная вёрстка как в корзине: от 744px
const TABLET_QUERY = "(min-width: 744px)";
const isTablet = ref(false);
let tabletMedia: MediaQueryList | null = null;
const onTabletChange = (event: MediaQueryListEvent) => {
  isTablet.value = event.matches;
};

onMounted(() => {
  tabletMedia = window.matchMedia(TABLET_QUERY);
  isTablet.value = tabletMedia.matches;
  tabletMedia.addEventListener("change", onTabletChange);
});

onBeforeUnmount(() => {
  tabletMedia?.removeEventListener("change", onTabletChange);
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
  { value: "DESC", label: "По новизне" },
  { value: "ASC", label: "Сначала старые" },
];

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

const isFilterActive = computed(() => selectedType.value !== "" || selectedStatus.value !== "");
const isEmptyHistory = computed(
  () => isLoaded.value && !isLoading.value && !error.value && items.value.length === 0 && !isFilterActive.value,
);

const filterSheetOpened = ref(false);

const popupOpened = ref(false);
const popupMode = ref<RitePopupMode>("create");
const popupItem = ref<Rite | null>(null);

// Счётчик запросов: ответ устаревшего запроса (фильтр уже сменился) отбрасывается
let requestId = 0;

const toId = (value: string): number | null => (value ? Number(value) : null);

function currentQuery() {
  return {
    order: order.value,
    typeId: toId(selectedType.value),
    statusId: toId(selectedStatus.value),
  };
}

/**
 * silent: список остаётся на экране, пока приходит свежая первая страница.
 * Смена фильтра тоже не очищает список заранее: пустой скелетон меняет высоту страницы.
 */
async function loadFirst(silent = false): Promise<void> {
  const id = ++requestId;
  isLoadingMore.value = false;
  error.value = null;
  const initial = !isLoaded.value;
  if (initial) {
    isLoading.value = true;
    isRefreshing.value = false;
    items.value = [];
    hasMore.value = false;
  } else {
    isRefreshing.value = !silent;
  }

  try {
    const result = await loadHistoryRites({ page: 1, ...currentQuery() });
    if (id !== requestId) return;
    items.value = result.items;
    page.value = 1;
    hasMore.value = result.hasMore;
    isLoaded.value = true;
  } catch (ex) {
    if (id !== requestId) return;
    console.error("Не удалось загрузить историю записок:", ex);
    if (!silent) error.value = "Не удалось загрузить историю записок";
  } finally {
    if (id === requestId) {
      isLoading.value = false;
      isRefreshing.value = false;
    }
  }
}

async function loadMore(): Promise<void> {
  if (!hasMore.value || isLoading.value || isRefreshing.value || isLoadingMore.value) return;

  const id = requestId;
  isLoadingMore.value = true;
  try {
    const result = await loadHistoryRites({ page: page.value + 1, ...currentQuery() });
    if (id !== requestId) return;
    const known = new Set(items.value.map((item) => item.id));
    items.value = [...items.value, ...result.items.filter((item) => !known.has(item.id))];
    page.value += 1;
    hasMore.value = result.hasMore;
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

watch([selectedType, selectedStatus], () => {
  void loadFirst();
  void refreshFilter();
});
watch(order, () => void loadFirst());

function onPageShown(): void {
  // Возврат на страницу обновляет первую порцию тихо: статусы записок со временем меняются
  void loadFirst(isLoaded.value);
  void refreshFilter();
}

function openPopup(mode: RitePopupMode, item: Rite | null = null): void {
  popupMode.value = mode;
  popupItem.value = item;
  popupOpened.value = true;
}

function onRiteSaved(rite: Rite): void {
  popupOpened.value = false;
  if (popupMode.value === "edit") {
    items.value = items.value.map((item) => (item.id === rite.id ? rite : item));
    return;
  }
  // Новая записка (подача, повтор) попадает в корзину
  cartStore.addItem(rite);
  f7router.navigate("/rites/");
}
</script>

<style lang="less">
.history-page {
  --history-alert-border: var(--brand-color-primary-accent-50);
  --history-alert-text: #000;
  --history-link: var(--brand-color-primary-accent-50);
}

.dark .history-page {
  --history-alert-border: var(--brand-color-primary-accent-70);
  --history-alert-text: var(--content-color-white-100);
  --history-link: var(--brand-color-primary-accent-70);
}

.history-page {
  .history {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px 15px 30px;
    color: var(--rites-text);
  }

  .history--empty {
    padding-top: 30px;
  }

  .history-state {
    display: flex;
    flex-direction: column;
    gap: 20px;

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

    &--button {
      height: 52px;
    }

    &--filters {
      height: 90px;
      border-radius: 8px;
    }

    &--alert {
      height: 84px;
    }

    &--card {
      height: 260px;
    }
  }

  // Кнопки: контур по макету (кнопка в пустой истории стилизуется стилями корзины)
  .history-button.button {
    --f7-button-height: 52px;
    --f7-button-border-radius: 10px;

    padding: 0 30px;
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
  }

  .history-button.button {
    --f7-button-border-color: var(--rites-text);
    --f7-button-text-color: var(--rites-text);
    --f7-button-border-width: 1px;
  }

  .history-filters {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;

    &__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 40px;
      padding-right: 20px;
      border-radius: 8px;
      background: var(--rites-field-bg);
    }

    &__open.link {
      flex: 1;
      justify-content: flex-start;
      gap: 8px;
      height: 40px;
      padding: 8px 0 8px 16px;
      font-size: 16px;
      line-height: 20px;
      font-weight: 400;
      letter-spacing: normal;
      text-transform: none;
      color: var(--rites-text);
    }

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

  .history-alert {
    padding: 15px 20px;
    border: 1px solid var(--history-alert-border);
    border-radius: 16px;
    background: var(--rites-card-bg);
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
    color: var(--history-alert-text);
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
      gap: 20px;
      padding: 0;
      background: none;

      &::before,
      &::after {
        display: none;
      }
    }
  }

  .infinite-scroll-preloader {
    margin: 0 auto 30px;
  }
}

@media (min-width: 744px) {
  .history-page {
    --f7-navbar-large-title-font-size: 32px;
    --f7-navbar-large-title-line-height: 34px;

    .history {
      max-width: 924px;
      margin: 0 auto;
      padding: 30px;
      gap: 30px;
    }

    .history--empty {
      padding-top: 30px;
    }

    .history-add.button {
      align-self: center;
      width: 243px;
      padding: 0 30px;
      font-size: 12px;
      letter-spacing: 1.38px;
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
