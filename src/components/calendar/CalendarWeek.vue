<template>
  <f7-page-content class="calendar-week-view">
    <div v-if="!isReady" class="calendar-week-state">
      <template v-if="markersError">
        <p>Не удалось загрузить календарь</p>
        <f7-button small outline @click="calendarStore.refreshMarkers()">Повторить</f7-button>
      </template>
      <f7-preloader v-else />
    </div>

    <template v-else>
      <f7-list class="week-list" virtual-list :virtual-list-params="vlParams">
        <li
          v-for="item in vlData.items"
          :key="item.code"
          class="week-item"
          :data-code="item.code"
          :style="{ top: `${vlData.topPosition ?? 0}px` }"
        >
          <CalendarWeekCard :day="item.day" :tint="item.tint" @select="emit('select-day', item.code)" />
        </li>
      </f7-list>

      <!-- Карточки разной высоты, а Virtual List должен знать высоту каждой заранее: новые дни
           сначала рисуются здесь (скрыто, той же ширины, что и список), и высота берётся отсюда -->
      <div class="list week-list week-measure" aria-hidden="true">
        <ul ref="measureEl">
          <li v-for="item in measureItems" :key="item.code" class="week-item">
            <CalendarWeekCard :day="item.day" :tint="item.tint" />
          </li>
        </ul>
      </div>

      <div v-if="loadError" class="calendar-week-state">
        <p>Не удалось загрузить дни</p>
        <f7-button small outline @click="retry">Повторить</f7-button>
      </div>
      <div v-else-if="isLoading" class="calendar-week-state">
        <f7-preloader />
      </div>
    </template>
  </f7-page-content>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { f7 } from "framework7-vue";
import type { VirtualList } from "framework7/types";
import type { CalendarDayApiElement } from "@/services/api/DaysApi";
import { useCalendarStore } from "@/stores/calendar";
import CalendarWeekCard from "./CalendarWeekCard.vue";
import { toDateCode } from "./calendarMarkers";
import { getWeekCardStyle, type WeekCardStyle } from "./weekCard";

const emit = defineEmits<{ "select-day": [code: string] }>();

/**
 * Код дня вверху экрана (YYYYMMDD). Вид открывается с него (null - с сегодняшнего дня),
 * а при прокрутке значение обновляется - так день не теряется при переходе в другой вид
 */
const topCode = defineModel<string | null>({ default: null });

/**
 * Грузим неделю за раз: один запрос на ~7 дней (день весит ~40 КБ), а не весь год.
 * Список всех дней календаря известен сразу из снимка раскраски (/days/calendar), но в
 * Virtual List лежат только загруженные подряд идущие дни - окно растёт вниз и вверх.
 */
const CHUNK_DAYS = 7;
/** Следующую порцию подгружаем, когда до края окна осталось меньше такого числа экранов */
const PREFETCH_SCREENS = 2;

interface WeekItem {
  code: string;
  day: CalendarDayApiElement;
  tint: WeekCardStyle;
  /** Высота li вместе с отступом под карточкой, px */
  height: number;
}

interface VirtualListData {
  fromIndex?: number;
  toIndex?: number;
  listHeight?: number;
  topPosition?: number;
  items: WeekItem[];
}

type LoadSide = "start" | "after" | "before";

const calendarStore = useCalendarStore();
const { markers, markersError } = storeToRefs(calendarStore);

const allCodes = computed(() => (markers.value ? Object.keys(markers.value.days).sort() : []));
const isReady = computed(() => allCodes.value.length > 0);

const vlData = shallowRef<VirtualListData>({ items: [] });
const measureItems = shallowRef<WeekItem[]>([]);
const measureEl = useTemplateRef<HTMLElement>("measureEl");
const isLoading = ref(false);
const loadError = ref(false);

let vl: VirtualList.VirtualList | undefined;
// Растёт при пересоздании окна: загрузки, начатые до этого, выбрасываются
let generation = 0;
let isBusy = false;
// День, с которого начинается окно
let startCode: string | null = null;
// Ширина, при которой замерены высоты. 0 - вкладка скрыта, замер недействителен
let measuredWidth = 0;
let scrollFrame = 0;
let tabEl: Element | null = null;

const vlParams = {
  items: [] as WeekItem[],
  height: (item: WeekItem) => item.height,
  renderExternal(list: VirtualList.VirtualList, data: VirtualListData) {
    vlData.value = data;
    if (!vl) {
      vl = list;
      // Первый вызов идёт из конструктора Virtual List: дальше работаем с ним уже после создания
      void nextTick(() => onListCreated(list));
    }
  },
};

const items = () => (vl?.items ?? []) as WeekItem[];

const clampCode = (code: string) => {
  const codes = allCodes.value;
  if (code < codes[0]) return codes[0];
  if (code > codes[codes.length - 1]) return codes[codes.length - 1];
  return code;
};

// Верх видимой области внутри скроллера: под навбаром, который перекрывает начало страницы
const getViewTop = (container: HTMLElement) =>
  container.getBoundingClientRect().top + parseFloat(getComputedStyle(container).paddingTop);

const getNextSide = (): LoadSide | null => {
  const list = vl;
  if (!list) return null;
  const rows = items();
  if (rows.length === 0) return "start";

  const container = list.pageContentEl;
  const offset = getViewTop(container) - list.el.getBoundingClientRect().top;
  const gap = container.clientHeight * PREFETCH_SCREENS;

  const hasAfter = allCodes.value.indexOf(rows[rows.length - 1].code) < allCodes.value.length - 1;
  const hasBefore = allCodes.value.indexOf(rows[0].code) > 0;
  const total = rows.reduce((sum, row) => sum + row.height, 0);

  if (hasAfter && total - (offset + container.clientHeight) < gap) return "after";
  if (hasBefore && offset < gap) return "before";
  return null;
};

/** Рисует дни вне списка и берёт их высоту. false - вкладка скрыта, замер не годится */
const measure = async (rows: WeekItem[]): Promise<boolean> => {
  measureItems.value = rows;
  await nextTick();
  const host = measureEl.value;
  measuredWidth = host?.clientWidth ?? 0;
  rows.forEach((row, index) => {
    row.height = host?.children[index]?.getBoundingClientRect().height ?? 0;
  });
  measureItems.value = [];
  return measuredWidth > 0;
};

const fetchRows = async (from: number, to: number): Promise<WeekItem[] | null> => {
  const codes = allCodes.value.slice(from, to);
  const days = await calendarStore.getDaysByCodes(codes);
  if (days.includes(null)) throw new Error(`Failed to load days ${codes[0]}-${codes[codes.length - 1]}`);

  const rows = days.map((day, index) => ({
    code: codes[index],
    day: day!,
    tint: getWeekCardStyle(markers.value?.days[codes[index]]),
    height: 0,
  }));
  return (await measure(rows)) ? rows : null;
};

// Дни добавились сверху: сдвигаем скролл на их высоту, чтобы то, что на экране, не уехало
const prependRows = (list: VirtualList.VirtualList, rows: WeekItem[]) => {
  const added = rows.reduce((sum, row) => sum + row.height, 0);
  list.prependItems(rows);
  list.pageContentEl.scrollTop += added;
  list.update();
};

/** Загружает очередную порцию. false - порция не добавлена (список скрыт или окно пересоздано) */
const loadSide = async (side: LoadSide, list: VirtualList.VirtualList, gen: number) => {
  const rows = items();
  const codes = allCodes.value;
  let from: number;
  let to: number;
  if (side === "start") {
    from = codes.findIndex((code) => code >= clampCode(startCode ?? toDateCode(new Date())));
    to = from + CHUNK_DAYS;
  } else if (side === "after") {
    from = codes.indexOf(rows[rows.length - 1].code) + 1;
    to = from + CHUNK_DAYS;
  } else {
    to = codes.indexOf(rows[0].code);
    from = Math.max(0, to - CHUNK_DAYS);
  }

  const loaded = await fetchRows(from, Math.min(to, codes.length));
  if (!loaded || gen !== generation) return false;

  if (side === "before") prependRows(list, loaded);
  else list.appendItems(loaded);
  // li появятся в DOM после обновления Vue
  void nextTick(updateTopCode);
  return true;
};

const fillBuffers = async () => {
  const list = vl;
  if (!list || isBusy || loadError.value) return;

  isBusy = true;
  const gen = generation;
  try {
    for (let side = getNextSide(); side && gen === generation; side = getNextSide()) {
      isLoading.value = true;
      if (!(await loadSide(side, list, gen))) break;
    }
  } catch (err) {
    console.error("Failed to load calendar week:", err);
    if (gen === generation) loadError.value = true;
  } finally {
    isBusy = false;
    isLoading.value = false;
  }
  // Окно пересоздали, пока шла загрузка: для нового окна нужна своя
  if (gen !== generation) void fillBuffers();
};

const resetWindow = (code: string | null) => {
  const list = vl;
  if (!list) return;
  generation += 1;
  startCode = code;
  loadError.value = false;
  list.replaceAllItems([]);
  list.pageContentEl.scrollTop = 0;
  void fillBuffers();
};

const retry = () => {
  loadError.value = false;
  void fillBuffers();
};

// Первый день, чей низ ниже верха видимой области - день «вверху экрана»
const updateTopCode = () => {
  const list = vl;
  if (!list?.el.isConnected) return;
  const viewTop = getViewTop(list.pageContentEl);
  for (const row of list.el.querySelectorAll<HTMLElement>("li.week-item")) {
    if (row.getBoundingClientRect().bottom > viewTop + 1) {
      if (row.dataset.code && row.dataset.code !== topCode.value) topCode.value = row.dataset.code;
      return;
    }
  }
};

const onScroll = () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    updateTopCode();
    void fillBuffers();
  });
};

// Высоты зависят от ширины: после поворота экрана или показа скрытой вкладки замеряем заново
const relayout = () => {
  const width = measureEl.value?.clientWidth ?? 0;
  if (!vl || !width || width === measuredWidth) return;
  resetWindow(topCode.value);
};

const onListCreated = (list: VirtualList.VirtualList) => {
  list.pageContentEl.addEventListener("scroll", onScroll, { passive: true });
  f7.on("resize", relayout);
  tabEl = list.el.closest(".tab");
  tabEl?.addEventListener("tab:show", relayout);
  resetWindow(topCode.value);
};

onBeforeUnmount(() => {
  updateTopCode();
  generation += 1;
  cancelAnimationFrame(scrollFrame);
  vl?.pageContentEl.removeEventListener("scroll", onScroll);
  f7.off("resize", relayout);
  tabEl?.removeEventListener("tab:show", relayout);
});
</script>

<style scoped lang="less">
.calendar-week-view {
  // Опора для скрытого блока замера высот
  position: relative;
  // В макете страница белая, иначе серая карточка дня без раскраски слилась бы с фоном
  background: var(--content-color-white-100);
}

.dark .calendar-week-view {
  background: none;
}

.week-list {
  --f7-list-bg-color: transparent;
  --f7-list-margin-vertical: 0;

  margin: 20px 0 6px;
}

.week-item {
  padding: 0 15px 14px;
  list-style: none;
}

// Не виден и не занимает места, но разложен как настоящий список
.week-measure {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0;
  margin: 0;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
}

.calendar-week-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  font-family: var(--font-family);
  font-size: var(--mobile-main-text-regular-b3);
  text-align: center;
  color: var(--content-color-black-primary);

  p {
    margin: 0;
  }
}

.dark .calendar-week-state {
  color: var(--content-color-baige-90);
}
</style>
