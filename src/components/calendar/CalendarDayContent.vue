<template>
  <div class="day-content" @click="onContentClick">
    <section class="day-card day-header-card">
      <div class="day-date">
        <div v-if="pictureSrc" class="day-image">
          <img class="day-image-bg" :src="pictureSrc" alt="" aria-hidden="true" />
          <img class="day-image-fg" :src="pictureSrc" :alt="day.picture_desc ?? ''" />
        </div>
        <div class="day-date-text">
          <p class="day-old-style">{{ header.oldStyle }}</p>
          <div class="day-number">
            <p class="day-number-date">
              <span class="day-number-day">{{ header.day }}&nbsp;</span
              ><span class="day-number-month">{{ header.month }}</span>
            </p>
            <p class="day-weekday">{{ header.weekday }}</p>
          </div>
          <p class="day-tone">{{ day.tone ? `Глас ${day.tone}.` : "" }}</p>
        </div>
      </div>

      <div class="day-nav">
        <button
          class="day-nav-button is-prev"
          type="button"
          aria-label="Предыдущий день"
          :disabled="!hasPrev"
          @click="emit('prev')"
        >
          <SvgIcon icon="arrow-circle" :size="32" :color="arrowCircleColor" />
        </button>
        <p v-if="day.week" class="day-week" v-html="`${day.week}.`"></p>
        <span v-else class="day-week"></span>
        <button
          class="day-nav-button"
          type="button"
          aria-label="Следующий день"
          :disabled="!hasNext"
          @click="emit('next')"
        >
          <SvgIcon icon="arrow-circle" :size="32" :color="arrowCircleColor" />
        </button>
      </div>
    </section>

    <section class="day-card day-fasting-card">
      <SvgIcon :icon="fastingIcon" :size="42" :color="mutedColor" />
      <div class="day-fasting-text">
        <p class="day-fasting-title">{{ day.fasting.title }}</p>
        <p v-if="fastingRule" class="day-fasting-rule">{{ fastingRule }}</p>
      </div>
    </section>

    <section v-if="saintBlocks.length" class="day-card day-saints-card">
      <template v-for="(block, blockIndex) in saintBlocks" :key="blockIndex">
        <!-- Разделитель блоков: тонкая линия, как в списках тропарей и чтений -->
        <hr v-if="blockIndex > 0" class="day-line" />
        <div class="day-saints-block">
          <div v-for="(line, lineIndex) in block" :key="lineIndex" class="day-saint-line">
            <SvgIcon
              v-if="line.sign"
              class="day-saint-sign"
              :icon="SIGN_ICONS[line.sign]"
              :size="26"
              :color="signColor(line.sign)"
            />
            <span class="day-saint-text" v-html="line.html"></span>
          </div>
        </div>
      </template>
    </section>

    <a v-if="day.thought.text" class="day-section day-link" :href="getDayTextUrl(day.code, 'thought')">
      <span class="day-section-header">
        <span class="day-section-title">Мысли на каждый день года</span>
        <SvgIcon icon="arrow-small" :size="24" :color="arrowColor" />
      </span>
      <span v-if="day.thought.title" class="day-preview">{{ day.thought.title }}</span>
    </a>

    <a v-if="parabelPreview" class="day-section day-link" :href="getDayTextUrl(day.code, 'parabel')">
      <span class="day-section-header">
        <span class="day-section-title">Притча дня</span>
        <SvgIcon icon="arrow-small" :size="24" :color="arrowColor" />
      </span>
      <span class="day-preview is-clamped">{{ parabelPreview }}</span>
    </a>

    <a
      v-if="day.instructions"
      class="day-section day-link"
      :href="getDayTextUrl(day.code, 'instructions')"
    >
      <span class="day-section-header">
        <span class="day-section-title">Богослужебные указания</span>
        <SvgIcon icon="arrow-small" :size="24" :color="arrowColor" />
      </span>
      <span class="day-preview is-single-line">{{ header.fullDate }}</span>
    </a>

    <section v-if="day.taks.length" class="day-section">
      <p class="day-section-title">Тропари и кондаки</p>
      <div class="day-list">
        <template v-for="(tak, index) in day.taks" :key="tak.id">
          <hr v-if="index > 0" class="day-line" />
          <a class="day-list-row" :href="`/prayers/text/${tak.id}`">
            <span class="day-list-text">{{ tak.name }}</span>
            <SvgIcon icon="arrow-small" :size="24" :color="arrowColor" />
          </a>
        </template>
      </div>
    </section>

    <template v-if="schedule.sections.length">
      <section class="day-section">
        <p class="day-section-title">Чтения Священного писания</p>
        <div class="day-list">
          <div
            v-for="(section, sectionIndex) in visibleSections.sections"
            :key="sectionIndex"
            class="day-readings-section"
          >
            <p v-if="getSectionTitle(section)" class="day-readings-title">
              {{ getSectionTitle(section) }}
            </p>
            <template v-for="(item, itemIndex) in section.items" :key="itemIndex">
              <hr v-if="itemIndex > 0" class="day-line" />
              <component
                :is="item.id != null ? 'a' : 'div'"
                class="day-list-row"
                :href="item.id != null ? getReadingUrl(day.code, item.id) : undefined"
              >
                <span class="day-list-text">
                  <span v-if="item.prefix" class="day-muted">{{ item.prefix }}&nbsp;</span
                  >{{ item.ref }}<span v-if="item.note" class="day-muted"> ({{ item.note }})</span
                  ><sup v-if="item.footnote">{{ item.footnote }}</sup>
                </span>
                <SvgIcon v-if="item.id != null" icon="arrow-small" :size="24" :color="arrowColor" />
              </component>
            </template>
          </div>
        </div>
        <button
          v-if="visibleSections.isCollapsible && !isScheduleExpanded"
          class="day-readings-more"
          type="button"
          @click="isScheduleExpanded = true"
        >
          Показать все
        </button>
      </section>
      <div v-if="notesHtml" class="day-readings-notes" v-html="notesHtml"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { Router } from "framework7/types";
import { useTheme } from "@/composables/useTheme";
import SvgIcon from "@/components/SvgIcon.vue";
import type { CalendarDayApiElement } from "@/services/api/DaysApi";
import {
  getDayHeader,
  getSectionTitle,
  getVisibleSections,
  htmlToText,
  parseSaintLine,
  resolveImageUrl,
  rewriteReadingLinks,
  type HolidaySign,
} from "./dayFormat";
import { getDayTextUrl, getReadingUrl } from "./dayText";

const { day, hasPrev = true, hasNext = true, f7router } = defineProps<{
  day: CalendarDayApiElement;
  hasPrev?: boolean;
  hasNext?: boolean;
  f7router: Router.Router;
}>();

const emit = defineEmits<{ prev: []; next: [] }>();

const { isDarkMode } = useTheme();

const SIGN_ICONS = {
  great: "holiday-great",
  vigil: "holiday-vigil",
  polyeleos: "holiday-polyeleos",
  doxology: "holiday-doxology",
  six: "holiday-six",
} as const;

// Иконка зависит от правила монастырского устава
const FASTING_ICONS = {
  none: "fasting-none",
  no_meat: "fasting-no-meat",
  oil: "fasting-oil",
  fish: "fasting-fish",
  no_oil: "fasting-no-oil",
  dry: "fasting-dry",
  no_food: "fasting-no-food",
} as const;

const fastingIcon = computed(() => FASTING_ICONS[day.fasting.rules.monastic?.code ?? "none"]);

const header = computed(() => getDayHeader(day.code));
const pictureSrc = computed(() => resolveImageUrl(day.picture));

// Название правила совпадает с названием поста у дней без поста («Поста нет»), второй раз не повторяем
const fastingRule = computed(() => {
  const title = day.fasting.rules.monastic?.title;
  return title && title !== day.fasting.title ? title : null;
});

const saintBlocks = computed(() =>
  day.saints_blocks
    .map((block) => block.map(parseSaintLine))
    .filter((block) => block.length > 0)
);

const parabelPreview = computed(() => htmlToText(day.parabel));

const schedule = computed(() => day.readings_schedule);
const isScheduleExpanded = ref(false);
const visibleSections = computed(() => getVisibleSections(schedule.value, isScheduleExpanded.value));
const notesHtml = computed(() =>
  schedule.value.notes ? rewriteReadingLinks(schedule.value.notes, day.code) : null
);

const mutedColor = computed(() => (isDarkMode.value ? "baige-60" : "black-60"));
const arrowColor = computed(() => (isDarkMode.value ? "baige-40" : "black-40"));
const arrowCircleColor = computed(() => (isDarkMode.value ? "white" : "black-primary"));

// Шестеричная служба - чёрный знак, остальные - акцентным цветом
const signColor = (sign: HolidaySign) => {
  if (sign === "six") return isDarkMode.value ? "baige-90" : "black-primary";
  return isDarkMode.value ? "primary-accent-70" : "primary-accent-50";
};

// Внутренние ссылки (святые, чтения, карточки) открываем через роутер Framework7
const onContentClick = (event: MouseEvent) => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
  const href = link?.getAttribute("href");
  if (!href?.startsWith("/")) return;

  event.preventDefault();
  event.stopPropagation();
  f7router.navigate(href);
};
</script>

<style scoped lang="less">
.day-content {
  --day-card-bg: var(--content-color-white-100);
  --day-section-bg: var(--content-color-black-5);
  --day-text: var(--content-color-black-primary);
  --day-title: var(--content-color-black-secondary);
  --day-muted: var(--content-color-black-60);
  --day-accent: var(--brand-color-primary-accent-50);
  --day-line: var(--content-color-black-10);

  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 15px;
  font-family: var(--font-family);
  color: var(--day-text);

  p {
    margin: 0;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
}

.dark .day-content {
  --day-card-bg: var(--content-color-baige-10);
  --day-section-bg: var(--content-color-baige-5);
  --day-text: var(--content-color-white-100);
  --day-title: var(--content-color-white-100);
  --day-muted: var(--content-color-baige-60);
  --day-accent: var(--brand-color-primary-accent-70);
  --day-line: var(--content-color-baige-10);

  .day-nav-button {
    --arrow-circle-opacity: 0.3;
  }
}

.day-card {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: var(--day-card-bg);
}

.day-line {
  flex-shrink: 0;
  width: 100%;
  height: 1px;
  margin: 0;
  border: 0;
  background: var(--day-line);
}

// Шапка: фото дня, дата и переключение дней
.day-header-card {
  gap: 14px;
  padding: 10px 14px;
  overflow: hidden;
}

.day-date {
  display: flex;
  align-items: center;
  gap: 10px;
}

.day-image {
  position: relative;
  flex-shrink: 0;
  width: 117px;
  height: 156px;
  overflow: hidden;
  border-radius: 10px;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
}

.day-image-bg {
  object-fit: cover;
  filter: blur(12px);
}

.day-image-fg {
  object-fit: contain;
}

.day-date-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  align-self: stretch;
  min-width: 0;
}

.day-old-style {
  font-size: var(--mobile-main-text-bold-b3);
  font-weight: 700;
  line-height: var(--mobile-main-text-bold-b3-line-height);
  color: var(--day-muted);
}

.day-number {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}

.day-number-date {
  font-weight: 700;
  line-height: 45px;
}

.day-number-day {
  font-size: 40px;
}

.day-number-month {
  font-size: 28px;
}

.day-weekday {
  font-size: var(--mobile-main-text-regular-b1);
  line-height: 28px;
}

.day-tone {
  font-size: var(--mobile-main-text-regular-b2);
  line-height: var(--mobile-main-text-regular-b2-line-height);
  color: var(--day-muted);
}

.day-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--day-line);
}

.day-nav-button {
  flex-shrink: 0;
  display: flex;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;

  &.is-prev {
    transform: rotate(180deg);
  }

  &:disabled {
    opacity: 0.3;
    pointer-events: none;
  }
}

.day-week {
  flex: 1;
  min-width: 0;
  font-size: var(--mobile-main-text-regular-b2);
  line-height: var(--mobile-main-text-regular-b2-line-height);
  text-align: center;
  color: var(--day-muted);
}

// Пост
.day-fasting-card {
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 20px 14px;
}

.day-fasting-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.day-fasting-title {
  font-size: var(--mobile-main-text-bold-b3);
  font-weight: 700;
  line-height: var(--mobile-main-text-bold-b3-line-height);
  color: var(--day-title);
}

.day-fasting-rule {
  font-size: 17px;
  line-height: 1.1;
  color: var(--day-muted);
}

// Святые и праздники
.day-saints-card {
  gap: 14px;
  padding: 20px 14px;
  overflow: clip;
}

.day-saints-block {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.day-saint-line {
  font-size: var(--mobile-main-text-regular-b2);
  line-height: var(--mobile-main-text-regular-b2-line-height);
  color: var(--day-muted);

  // Заканчивается блок после обтекания, чтобы знак не залезал на следующую строку
  &::after {
    content: "";
    display: block;
    clear: both;
  }
}

// Знак праздника обтекается текстом: первая строка рядом со знаком, остальные - под ним
.day-saint-sign {
  float: left;
  margin-right: 6px;
}

.day-saint-text {
  // Ссылка на святого жирная, только если святой обёрнут в <strong>
  :deep(a) {
    color: var(--day-accent);
  }

  :deep(strong) {
    font-weight: 700;
  }

  // Двунадесятый праздник (<strong><em>): жирный, крупный, не курсив - как заголовок праздника в макете
  :deep(strong em) {
    font-size: var(--mobile-main-text-bold-b1);
    font-style: normal;
    line-height: var(--mobile-main-text-bold-b1-line-height);
    color: var(--day-accent);
  }
}

// Карточки-ссылки и списки
.day-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--day-section-bg);
}

.day-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.day-section-title {
  font-size: var(--mobile-main-text-bold-b1);
  font-weight: 700;
  line-height: var(--mobile-main-text-bold-b1-line-height);
  color: var(--day-title);
}

.day-preview {
  font-size: var(--mobile-main-text-regular-b2);
  line-height: var(--mobile-main-text-regular-b2-line-height);
  color: var(--day-muted);

  &.is-clamped {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  &.is-single-line {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.day-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.day-list-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.day-list-text {
  flex: 1;
  min-width: 0;
  font-size: var(--mobile-main-text-regular-b2);
  line-height: var(--mobile-main-text-regular-b2-line-height);
  color: var(--day-text);
}

.day-muted {
  color: var(--day-muted);
}

// Чтения
.day-readings-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 6px 0;
}

.day-readings-title {
  font-size: var(--mobile-main-text-regular-b2);
  line-height: var(--mobile-main-text-regular-b2-line-height);
  color: var(--day-muted);
}

.day-readings-more {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  font-family: inherit;
  font-size: var(--mobile-main-text-bold-b2);
  font-weight: 700;
  line-height: var(--mobile-main-text-bold-b2-line-height);
  color: var(--day-accent);
  cursor: pointer;
}

.day-readings-notes {
  padding: 0 14px;
  font-size: var(--mobile-main-text-regular-b3);
  line-height: var(--mobile-main-text-regular-b3-line-height);
  color: var(--day-muted);

  :deep(a) {
    font-weight: 700;
    color: var(--day-accent);
  }
}
</style>
