<template>
  <!-- Вне .view/.page: иначе tabbar (.views > .tabbar, z-index 5001) остаётся
       поверх затемнения и принимает клики. #framework7-root — тот же stacking
       context, что у sheet/popup/dialog. -->
  <Teleport to="#framework7-root">
  <div v-if="rect" class="spotlight-hint">
    <div class="sh-backdrop"></div>

    <div class="sh-hole" :style="holeStyle"></div>

    <SvgIcon
      v-if="currentTarget?.hand === 'swipe-left' && rect"
      icon="cursor-hand"
      :size="46"
      class="sh-hand sh-hand--swipe-left"
      :style="handStyle"
    />

    <div class="dialog modal-in sh-swipeout-safe">
    <div
      class="sh-card modal-in"
      :class="placeBelow ? 'sh-card--caret-top' : 'sh-card--caret-bottom'"
      :style="cardStyle"
    >
      <div class="sh-caret" :style="caretStyle"></div>
      <f7-link class="sh-close modal-in" icon-only @click="close">
        <SvgIcon icon="cancel" :size="20" color="black-40" />
      </f7-link>

      <div v-if="targets.length > 1" class="sh-progress">
        {{ activeIndex + 1 }} из {{ targets.length }}
      </div>

      <h3 class="sh-title">{{ currentTarget?.title }}</h3>
      <p v-if="currentTarget?.text" class="sh-text">
        <template v-for="(part, i) in textParts" :key="i">
          <template v-if="part.type === 'text'">{{ part.value }}</template>
          <f7-link
            v-else
            href="#"
            class="sh-text-link no-ripple"
            @click.prevent="onLinkClick"
          >
            {{ part.value }}
          </f7-link>
        </template>
      </p>

      <div class="sh-actions">
        <f7-button
          v-if="activeIndex > 0"
          outline
          round
          class="sh-button modal-in"
          @click="prev"
        >
          Назад
        </f7-button>
        <f7-button fill round class="sh-button modal-in" @click="next">
          {{ isLastTarget ? "Понятно" : "Далее" }}
        </f7-button>
      </div>
    </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { isAndroid } from "@/js/device";
import SvgIcon from "@/components/SvgIcon.vue";

export interface SpotlightLink {
  label: string;
  onClick: () => void;
}

export interface SpotlightTarget {
  title: string;
  text: string;
  getTargetEl: () => HTMLElement | null | undefined;
  // "circle" — для круглых/квадратных иконок-кнопок, "rounded" — для прямоугольных
  // блоков (переключатель вкладок, пункт списка настроек, строка списка)
  shape: "circle" | "rounded";
  // Вставка в text на место {link} — например ссылка на настройки
  link?: SpotlightLink;
  // Перед измерением цели: открыть swipeout, проскроллить элемент и т.п.
  prepare?: () => void | Promise<void>;
  // Декоративная лапка — шаг «смахните влево» на главной
  hand?: "swipe-left";
}

// Отступ вокруг подсвечиваемого элемента (px)
const HOLE_PADDING = 6;
const CARD_MARGIN = 16;
const CARD_SIDE_INSET = 16;
const MIN_SPACE_BELOW = 160;
const CARET_EDGE_PAD = 20;

const { targets } = defineProps<{
  targets: SpotlightTarget[];
}>();

// close — единственный сигнал наружу: и естественное завершение (Понятно на
// последнем таргете), и досрочный пропуск помечают подсказку увиденной одинаково
const emit = defineEmits<{ close: [] }>();

const activeIndex = ref(0);
const rect = ref<DOMRect | null>(null);

const currentTarget = computed(() => targets[activeIndex.value]);
const isLastTarget = computed(() => activeIndex.value >= targets.length - 1);

const textParts = computed(() => {
  const target = currentTarget.value;
  if (!target) return [];
  if (!target.link || !target.text.includes("{link}")) {
    return [{ type: "text" as const, value: target.text }];
  }
  const [before, after = ""] = target.text.split("{link}");
  return [
    { type: "text" as const, value: before },
    { type: "link" as const, value: target.link.label },
    { type: "text" as const, value: after },
  ];
});

const close = () => emit("close");

const onLinkClick = () => {
  currentTarget.value?.link?.onClick();
};

const updateRect = async () => {
  const target = currentTarget.value;
  if (!target) {
    rect.value = null;
    close();
    return;
  }

  if (target.prepare) {
    await target.prepare();
    await nextTick();
    if (currentTarget.value !== target) return;
  }

  const el = target.getTargetEl();
  const nextRect = el ? el.getBoundingClientRect() : null;
  // Элемент-цель может быть недоступен (например, скрыт другим взаимодействием
  // между шагами) — в этом случае просто закрываем подсказку, а не показываем пустоту
  if (!nextRect || (nextRect.width === 0 && nextRect.height === 0)) {
    rect.value = null;
    close();
    return;
  }
  rect.value = nextRect;
};

const next = () => {
  if (isLastTarget.value) {
    close();
    return;
  }
  activeIndex.value += 1;
};

const prev = () => {
  if (activeIndex.value > 0) {
    activeIndex.value -= 1;
  }
};

watch(activeIndex, () => {
  void updateRect();
});

const handStyle = computed(() => {
  if (!rect.value) return {};
  return {
    left: `${rect.value.left + rect.value.width * 0.62}px`,
    top: `${rect.value.top + rect.value.height / 2}px`,
  };
});

// Аппаратная кнопка "Назад" на Android должна закрывать подсказку.
// device.onBackKey — единственный глобальный слот (см. src/js/viewsManager.ts)
let previousOnBackPressed: (() => boolean) | undefined;

onMounted(() => {
  void updateRect();
  window.addEventListener("resize", updateRect);
  window.addEventListener("orientationchange", updateRect);
  // Tabbar (.views > .tabbar, transform + z-index 5001) рисуется своим
  // compositing-слоем поверх оверлея — класс глушит клики и даёт ::after.
  document.documentElement.classList.add("spotlight-hint-open");

  if (!isAndroid || typeof window === "undefined") return;
  previousOnBackPressed = window.onBackPressed;
  window.onBackPressed = () => {
    close();
    return true;
  };
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateRect);
  window.removeEventListener("orientationchange", updateRect);
  document.documentElement.classList.remove("spotlight-hint-open");

  if (!isAndroid || typeof window === "undefined") return;
  window.onBackPressed = previousOnBackPressed;
});

// "Вырез" в затемнении — реализован через box-shadow с огромным растяжением
// вместо отдельного затемняющего слоя: сам div остаётся прозрачным, поэтому
// настоящий элемент интерфейса виден под ним в своём реальном цвете/фоне
const holeStyle = computed(() => {
  if (!rect.value || !currentTarget.value) return {};
  const padding = HOLE_PADDING;
  if (currentTarget.value.shape === "circle") {
    const diameter = Math.max(rect.value.width, rect.value.height) + padding * 2;
    const centerX = rect.value.left + rect.value.width / 2;
    const centerY = rect.value.top + rect.value.height / 2;
    return {
      left: `${centerX - diameter / 2}px`,
      top: `${centerY - diameter / 2}px`,
      width: `${diameter}px`,
      height: `${diameter}px`,
      borderRadius: "50%",
    };
  }
  return {
    left: `${rect.value.left - padding}px`,
    top: `${rect.value.top - padding}px`,
    width: `${rect.value.width + padding * 2}px`,
    height: `${rect.value.height + padding * 2}px`,
    borderRadius: "12px",
  };
});

// Карточка размещается под целью, если снизу достаточно места, иначе — над ней.
// Уголок caret указывает на центр подсвеченного элемента.
const placeBelow = computed(() => {
  if (!rect.value) return true;
  return window.innerHeight - rect.value.bottom >= MIN_SPACE_BELOW;
});

const cardStyle = computed(() => {
  if (!rect.value) return {};
  return placeBelow.value
    ? { top: `${rect.value.bottom + CARD_MARGIN}px` }
    : { bottom: `${window.innerHeight - rect.value.top + CARD_MARGIN}px` };
});

const caretStyle = computed(() => {
  if (!rect.value) return {};
  const centerX = rect.value.left + rect.value.width / 2;
  const cardWidth = window.innerWidth - CARD_SIDE_INSET * 2;
  const minLeft = CARET_EDGE_PAD;
  const maxLeft = cardWidth - CARET_EDGE_PAD;
  const left = Math.min(maxLeft, Math.max(minLeft, centerX - CARD_SIDE_INSET));
  return { left: `${left}px` };
});
</script>

<style scoped lang="less">
.spotlight-hint {
  position: fixed;
  inset: 0;
  // На #framework7-root: выше .views (5000), tabbar (5001), sheet/popup,
  // ниже f7-dialog. Иначе затемнение не накрывает нижнее меню.
  z-index: 13000;
  // Тень выреза 9999px не должна раздувать документ и сдвигать navbar
  overflow: hidden;
}

.sh-backdrop {
  position: fixed;
  inset: 0;
  // Само затемнение рисует .sh-hole через box-shadow — здесь только перехват
  // кликов, чтобы они не прошли в UI под оверлеем. Закрытие — крестик,
  // системная «Назад» или кнопка на карточке, как в ReadingBasicsTutorial.
  background-color: transparent;
}

// F7 закрывает swipeout на тап снаружи, кроме .dialog.modal-in (см. swipeout.js).
// display:contents — только для обхода этой проверки, на раскладку карточки не влияет.
.spotlight-hint .sh-swipeout-safe.dialog.modal-in {
  display: contents !important;
  position: static;
  transform: none;
  width: auto;
  height: auto;
  margin: 0;
  background: none;
  box-shadow: none;
}

.sh-hole {
  position: fixed;
  background-color: transparent;
  box-shadow: 0 0 0 9999px rgba(69, 69, 69, 0.5);
  pointer-events: none;
}

.dark .sh-hole {
  box-shadow: 0 0 0 9999px rgba(217, 217, 217, 0.1);
}

.sh-card {
  position: fixed;
  left: 16px;
  right: 16px;
  background-color: var(--content-color-white-100);
  border-radius: 12px;
  padding: 12px 16px 16px;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15);
}

.sh-caret {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
}

.sh-card--caret-top .sh-caret {
  top: -10px;
  border-bottom: 12px solid var(--content-color-white-100);
}

.sh-card--caret-bottom .sh-caret {
  bottom: -10px;
  border-top: 12px solid var(--content-color-white-100);
}

.sh-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  padding: 0;
}

.sh-progress {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--content-color-black-40);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.sh-hand {
  position: fixed;
  pointer-events: none;
  z-index: 13001;
  transform: translate(-50%, -50%);
}

.sh-hand--swipe-left {
  animation: sh-swipe-left 1.6s ease-in-out infinite;
}

@keyframes sh-swipe-left {
  0%,
  100% {
    transform: translate(-20%, -50%);
  }
  50% {
    transform: translate(-80%, -50%);
  }
}

.sh-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  color: var(--content-color-black-primary);
  padding-right: 28px;
}

.sh-title + .sh-actions {
  margin-top: 10px;
}

.sh-text {
  margin: 0 0 16px;
  font-size: 16px;
  line-height: 1.4;
  color: var(--content-color-black-secondary);
}

.sh-text :deep(.sh-text-link) {
  display: inline-block;
  height: auto;
  min-height: 0;
  margin: 0;
  padding: 0;
  vertical-align: baseline;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  letter-spacing: inherit;
  color: var(--brand-color-primary-accent-50);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.sh-actions {
  display: flex;
  gap: 10px;
}

.sh-button {
  flex: 1 0 0;
}

.dark {
  .sh-card {
    background-color: var(--content-color-black-primary);
    box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.5);
  }

  .sh-card--caret-top .sh-caret {
    border-bottom-color: var(--content-color-black-primary);
  }

  .sh-card--caret-bottom .sh-caret {
    border-top-color: var(--content-color-black-primary);
  }

  .sh-close :deep(.icon) {
    color: var(--content-color-baige-60);
  }

  .sh-progress {
    color: var(--content-color-baige-60);
  }

  .sh-title {
    color: var(--content-color-baige-100);
  }

  .sh-text {
    color: var(--content-color-baige-60);
  }

  .sh-text :deep(.sh-text-link) {
    color: var(--brand-color-primary-accent-70);
  }
}
</style>
